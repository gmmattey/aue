import { useCallback, useEffect, useRef, useState } from 'react';

import { obterBatalha, type Batalha } from '../../db/supabase';
import { batalhaExpirou } from './prazoDaBatalha';

/**
 * A batalha que se atualiza sozinha enquanto a tela está aberta.
 *
 * O DEFEITO QUE ISTO FECHA. O DoD do MVP1 (§6) pede "segundo aparelho abrir →
 * ouvir → responder → receber nota → **sequência atualizar** → revanche". A
 * tela carregava a batalha UMA vez, no mount. Se o amigo respondia enquanto
 * você estava olhando, a rodada nova só aparecia se você recarregasse a página
 * ou se VOCÊ mesmo respondesse — e o rodapé "Chamar mais gente" prometia uma
 * tela viva que não era viva.
 *
 * POR QUE POLLING, E NÃO REALTIME. O Supabase Realtime resolveria com push,
 * mas exigiria replicação ligada nas tabelas, canal por batalha e — o problema
 * real — uma policy de leitura em `batalhas`/`rodadas_batalha`, que hoje NÃO
 * TÊM POLICY NENHUMA de propósito (20260807000030, seção 2): o acesso é pelo
 * código do link, via RPC `SECURITY DEFINER`. Abrir SELECT para alimentar o
 * Realtime derrubaria a barreira inteira. Uma chamada a cada 8 segundos numa
 * tela que fica aberta por minutos é barata e não mexe em segurança.
 *
 * QUANDO ELE NÃO RODA — as duas economias que importam num celular:
 *   1. aba oculta (`visibilitychange`): telefone no bolso não precisa de
 *      requisição nenhuma. Ao voltar, busca na hora, sem esperar o intervalo;
 *   2. sessão vencida: passados os 7 dias não há o que chegar de novo.
 *
 * O QUE ELE NÃO FAZ: não mostra erro quando uma atualização falha. A batalha
 * que já está na tela continua válida, a próxima volta tenta de novo, e um
 * alerta vermelho a cada oscilação de rede seria ruído sobre um problema que se
 * resolve sozinho. Falha só vira mensagem no PRIMEIRO carregamento, que é o
 * único caso em que a pessoa fica sem nada.
 */

/**
 * Oito segundos.
 *
 * Cinco parecia mais "ao vivo" e custava 60% mais requisições para ganhar três
 * segundos numa conversa em que a outra pessoa leva um minuto para gravar. Doze
 * já dava a sensação de tela parada. Oito é o meio que ninguém percebe.
 */
export const INTERVALO_DE_ATUALIZACAO_MS = 8_000;

/**
 * As duas leituras trazem a mesma batalha?
 *
 * EXISTE PARA NÃO TROCAR O ESTADO À TOA. `obter_batalha` monta o JSON do zero a
 * cada chamada, então toda volta do intervalo devolve objetos novos — e um
 * `setBatalha` a cada 8 segundos re-renderizaria o feed inteiro sem nada ter
 * mudado, com o `AudioPlayback` de cada rodada recebendo props novas no meio de
 * uma reprodução.
 *
 * O que é comparado é o que muda a tela: quantas rodadas existem, qual é a
 * última, quem lidera, e a moderação (esconder um arroto tira o `caminho_do_audio`
 * sem mudar a contagem). Parciais e `created_at` não entram porque não
 * aparecem.
 */
export function mesmaBatalha(a: Batalha | null, b: Batalha | null): boolean {
  if (a === b) return true;
  if (!a || !b) return false;

  if (a.codigo_de_acesso !== b.codigo_de_acesso) return false;
  if (a.expira_em !== b.expira_em) return false;
  if (a.finalizada_em !== b.finalizada_em) return false;
  if (a.rodadas.length !== b.rodadas.length) return false;
  if (a.participantes.length !== b.participantes.length) return false;

  if ((a.lider?.resultado_id ?? null) !== (b.lider?.resultado_id ?? null)) return false;
  if ((a.lider?.nota ?? null) !== (b.lider?.nota ?? null)) return false;

  return a.rodadas.every((rodada, i) => {
    const outra = b.rodadas[i];
    return (
      rodada.rodada_id === outra.rodada_id &&
      rodada.caminho_do_audio === outra.caminho_do_audio &&
      rodada.esta_escondido === outra.esta_escondido &&
      rodada.nota === outra.nota
    );
  });
}

export interface BatalhaAoVivo {
  batalha: Batalha | null;
  /** Só o primeiro carregamento. Atualização automática nunca pisca a tela. */
  carregando: boolean;
  /** Falha do primeiro carregamento. Atualização que falha fica no console. */
  erro: string | null;
  /**
   * A sessão venceu com a pessoa na tela.
   *
   * DIFERENTE de `batalha === null`, e a diferença é de segurança. Código
   * inexistente e batalha expirada chegam iguais no primeiro carregamento, de
   * propósito — dizer "expirou" confirmaria a um curioso que ele acertou um
   * código real. Aqui não há o que confirmar: a pessoa JÁ estava dentro da
   * batalha, já viu o conteúdo, e merece saber por que a tela mudou.
   */
  expirou: boolean;
  /**
   * Guarda o estado que veio de `responder_batalha` — que já devolve a batalha
   * inteira, então não existe motivo para uma segunda ida ao servidor.
   */
  registrar: (batalha: Batalha) => void;
}

export function useBatalhaAoVivo(code: string | undefined): BatalhaAoVivo {
  const [batalha, setBatalha] = useState<Batalha | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [expirou, setExpirou] = useState(false);

  /*
    O laço precisa saber a batalha corrente (para conferir o prazo) sem se
    remontar a cada atualização — um `useEffect` com `[batalha]` recriaria o
    intervalo toda vez que uma rodada chegasse, e o relógio nunca completaria
    uma volta em uma batalha movimentada.
  */
  const batalhaRef = useRef<Batalha | null>(null);
  useEffect(() => {
    batalhaRef.current = batalha;
  }, [batalha]);

  const registrar = useCallback((nova: Batalha) => {
    batalhaRef.current = nova;
    setBatalha(nova);
    setExpirou(false);
  }, []);

  useEffect(() => {
    if (!code) {
      setCarregando(false);
      return;
    }

    let ativo = true;
    let relogio: ReturnType<typeof setInterval> | undefined;

    const parar = () => {
      if (relogio !== undefined) {
        clearInterval(relogio);
        relogio = undefined;
      }
    };

    const venceu = () => batalhaExpirou(batalhaRef.current?.expira_em);

    const buscar = async (primeira: boolean) => {
      try {
        const dados = await obterBatalha(code);
        if (!ativo) return;

        if (primeira) {
          setBatalha(dados);
          batalhaRef.current = dados;
          setErro(null);
          return;
        }

        if (dados === null) {
          /*
            Sumiu com a pessoa dentro. Só existe um caminho para isso: a RPC
            filtra por `expira_em > now()`, e o código na URL não mudou. Então
            é o prazo, e a tela pode dizer isso sem confirmar nada a ninguém.
          */
          if (batalhaRef.current) {
            setExpirou(true);
            parar();
          }
          return;
        }

        setBatalha((anterior) => (mesmaBatalha(anterior, dados) ? anterior : dados));
      } catch (err) {
        console.error('Falha ao carregar a batalha', err);
        if (ativo && primeira) setErro('Não foi possível carregar a batalha.');
      } finally {
        if (ativo && primeira) setCarregando(false);
      }
    };

    const agendar = () => {
      parar();
      if (document.hidden || venceu()) return;

      relogio = setInterval(() => {
        if (venceu()) {
          setExpirou(true);
          parar();
          return;
        }
        void buscar(false);
      }, INTERVALO_DE_ATUALIZACAO_MS);
    };

    const aoTrocarDeVisibilidade = () => {
      if (document.hidden) {
        parar();
        return;
      }
      // Voltar para a aba é o momento em que a pessoa MAIS quer ver o que
      // chegou. Esperar até 8 segundos aqui seria a tela parada de novo.
      if (venceu()) {
        setExpirou(true);
        return;
      }
      void buscar(false);
      agendar();
    };

    void buscar(true).then(() => {
      if (ativo) agendar();
    });

    document.addEventListener('visibilitychange', aoTrocarDeVisibilidade);

    return () => {
      ativo = false;
      parar();
      document.removeEventListener('visibilitychange', aoTrocarDeVisibilidade);
    };
  }, [code]);

  return { batalha, carregando, erro, expirou, registrar };
}
