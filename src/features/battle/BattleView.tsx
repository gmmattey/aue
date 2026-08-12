import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';

import { responderBatalha, supabase, type ResultadoRow } from '../../db/supabase';
import { CompartilharEmRede } from '../../shared/components/CompartilharEmRede';
import { formatarNota } from '../../shared/formato/nota';
import { AudioRecorder } from '../audio/AudioRecorder';
import { MolduraDeLink, Convite } from '../audio/MolduraDeLink';
import { cartaoDeLink } from '../audio/estilosDeLink';
import { CartaoDeRodada } from './CartaoDeRodada';
import { ResultadoDaDisputa } from './ResultadoDaDisputa';
import { batalhaExpirou, fraseDoPrazo } from '../../nucleo/prazo/prazoDaBatalha';
import { useBatalhaAoVivo } from './useBatalhaAoVivo';

/**
 * A batalha em sessão — a tela de `/b/:code`.
 *
 * O QUE ELA É, do ponto de vista de quem usa: eu gravo, mando o link. Você
 * abre, ouve o meu arroto com a nota, grava a sua e manda de volta. Fica em
 * loop, os arrotos ficam em sequência, e mais amigos podem entrar pelo mesmo
 * link.
 *
 * DUAS BATALHAS ENTRAM POR AQUI. `batalhas.tipo_de_batalha` distingue a REMOTA
 * (cada um no seu aparelho, loop aberto) da PRESENCIAL (um aparelho só, rounds
 * fechados, pódio no fim — 20260807000031). O mesmo endereço serve as duas
 * porque `DisputaLocalScreen` compartilha exatamente este link ao fim da
 * disputa; o que muda é tudo o que vem depois, e quem cuida do caso presencial
 * é o `ResultadoDaDisputa` — inclusive a razão de não haver gravador lá.
 *
 * POR QUE NÃO É O `ChallengeView` EVOLUÍDO. Aquela tela serve `desafios`, que
 * aceita UMA resposta e congela o veredito em trigger. Ela continua no ar,
 * intocada, para os links `/d/CODIGO` que já circularam. Esta usa as tabelas
 * novas (20260807000030), que nasceram sem o SELECT aberto que `desafios` tem.
 *
 * "SÓ QUEM TEM O LINK" sai de graça e sem código: não existe listagem, não
 * existe busca, não existe nenhuma entrada nesta tela que não seja o código na
 * URL. As tabelas têm RLS ligada sem policy nenhuma — nem o próprio app
 * consegue listar batalhas.
 *
 * O QUE A TELA NÃO PROMETE: privacidade. A batalha é obscura, não secreta —
 * quem tiver o `caminho_do_audio` ouve o áudio com ou sem o código, porque a chave
 * anônima do app é pública (ver 20260807000028). Por isso o texto do rodapé
 * fala em "quem tiver este link", e nunca em "só vocês".
 */
export const BattleView: React.FC = () => {
  const { code } = useParams<{ code: string }>();

  /*
    A batalha se atualiza sozinha enquanto a tela está aberta (ver
    `useBatalhaAoVivo`). Sem isso, a rodada que o amigo mandou só aparecia
    recarregando a página — e o §6 do contrato pede "sequência atualizar" no
    meio do fluxo da batalha remota.
  */
  const { batalha, carregando, erro: erroDeCarga, expirou, registrar } = useBatalhaAoVivo(code);

  const [erroDaResposta, setErroDaResposta] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | undefined>(undefined);

  /**
   * Âncora do fim do feed.
   *
   * A ordem é ascendente (a rodada mais nova embaixo, como conversa), então sem
   * rolar até o fim a pessoa abre o link e vê a PRIMEIRA gravação — que na
   * quarta rodada não é a que acabou de chegar.
   */
  const fimDoFeed = useRef<HTMLDivElement | null>(null);

  /** A área rolável (`.screen`). Serve para saber se a pessoa está no fim. */
  const areaRolavel = useRef<HTMLDivElement | null>(null);

  /**
   * "A próxima rodada que aparecer é minha."
   *
   * Marcado em `responder`, logo antes de guardar o estado que a RPC devolveu.
   * Quem acabou de gravar SEMPRE quer ver a própria nota; quem está lendo o
   * histórico, não.
   */
  const rolarPorMinhaConta = useRef(false);

  /** Rodadas que chegaram sozinhas enquanto a pessoa lia mais acima. */
  const [novidades, setNovidades] = useState(0);

  useEffect(() => {
    let ativo = true;
    supabase.auth.getSession().then(({ data }) => {
      if (ativo) setUserId(data.session?.user.id);
    });
    return () => {
      ativo = false;
    };
  }, []);

  const irParaOFim = useCallback(() => {
    fimDoFeed.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    setNovidades(0);
  }, []);

  /*
    ROLAR SEM ARRANCAR A TELA DE NINGUÉM.

    Antes da atualização automática, rolar para o fim a cada mudança no número
    de rodadas era inofensivo: o número só mudava quando a própria pessoa
    respondia. Agora a rodada pode chegar do outro aparelho no meio de uma
    frase, e puxar a tela para baixo enquanto alguém ouve a rodada 2 é o tipo de
    "melhoria" que faz a pessoa perder o lugar e fechar o link.

    A regra passou a ser: rola quando a rodada é MINHA, quando é a carga inicial
    (que é o motivo original — abrir o link e cair na gravação mais nova) ou
    quando a pessoa já está no fim do feed. Nos outros casos, a chegada vira um
    aviso tocável, e quem decide é ela.
  */
  const quantasRodadas = batalha?.rodadas.length ?? 0;
  const rodadasAntes = useRef<number | null>(null);

  useEffect(() => {
    if (quantasRodadas === 0) return;

    const anterior = rodadasAntes.current;
    rodadasAntes.current = quantasRodadas;

    // Carga inicial: cair no fim é o comportamento que já existia.
    if (anterior === null) {
      if (quantasRodadas > 1) fimDoFeed.current?.scrollIntoView({ block: 'end' });
      return;
    }

    if (quantasRodadas <= anterior) return;

    if (rolarPorMinhaConta.current) {
      rolarPorMinhaConta.current = false;
      irParaOFim();
      return;
    }

    const area = areaRolavel.current;
    // Sem área medida (ou já coladinho no fim), rolar não tira ninguém do
    // lugar. A folga cobre o dedo parado a um cartão do fim.
    const noFim = !area || area.scrollHeight - area.scrollTop - area.clientHeight < 160;

    if (noFim) irParaOFim();
    else setNovidades((quantas) => quantas + (quantasRodadas - anterior));
  }, [quantasRodadas, irParaOFim]);

  const responder = useCallback(
    async (resultado: ResultadoRow) => {
      if (!code || !resultado?.id) return;
      try {
        // A RPC devolve a batalha INTEIRA, não só a rodada criada: entre abrir
        // o link e mandar de volta pode ter entrado gente.
        const atualizada = await responderBatalha(code, resultado.id);
        rolarPorMinhaConta.current = true;
        registrar(atualizada);
        setErroDaResposta(null);
      } catch (err) {
        console.error('Falha ao responder a batalha', err);
        setErroDaResposta(
          'Sua nota foi registrada, mas não entrou na batalha. ' +
            'Recarregue o link e tente de novo.',
        );
      }
    },
    [code, registrar],
  );

  if (carregando) {
    return (
      <MolduraDeLink>
        <div className="screen">Carregando batalha...</div>
      </MolduraDeLink>
    );
  }

  /*
    Código inexistente e batalha expirada chegam aqui do MESMO jeito: a RPC
    devolve NULL para os dois, de propósito (dizer "expirou" confirmaria a um
    curioso que ele acertou um código real). Então a tela também não distingue
    — e menciona as duas possibilidades sem afirmar qual foi.
  */
  if (!batalha) {
    return (
      <MolduraDeLink>
        <div className="screen" style={{ gap: 'var(--space-4)' }}>
          <div style={cartaoDeLink}>
            <h1
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 22,
                textTransform: 'uppercase',
                marginBottom: 'var(--space-2)',
              }}
            >
              {erroDeCarga ?? 'Batalha não encontrada.'}
            </h1>
            <p style={{ fontSize: 13.5, color: 'var(--muted)' }}>
              O link pode estar errado ou já ter passado dos 7 dias.
            </p>
          </div>

          <Convite />
        </div>
      </MolduraDeLink>
    );
  }

  /*
    A SESSÃO VENCEU COM A PESSOA NA TELA.

    Aqui não vale a regra de cima, e a diferença não é descuido: ela JÁ estava
    dentro da batalha, já ouviu os arrotos, já sabe que o código é real. Não há
    o que proteger — há o que explicar. E o §3.7 é claro: passado o prazo, o
    conteúdo não continua acessível pelo link, então o feed sai da tela junto
    com o gravador.
  */
  if (expirou || batalhaExpirou(batalha.expira_em)) {
    return (
      <MolduraDeLink subtitulo={`Batalha ${batalha.codigo_de_acesso}`}>
        <div className="screen" style={{ gap: 'var(--space-4)' }}>
          <div style={cartaoDeLink}>
            <h1
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 22,
                textTransform: 'uppercase',
                marginBottom: 'var(--space-2)',
              }}
            >
              Esse link já deu o que tinha que dar.
            </h1>
            <p style={{ fontSize: 13.5, color: 'var(--muted)', lineHeight: 1.5 }}>
              A batalha passou dos 7 dias e saiu do ar. Grava o teu e começa
              outra — essa dura mais uma semana.
            </p>
          </div>

          <Convite />
        </div>
      </MolduraDeLink>
    );
  }

  const url = `${window.location.origin}/b/${batalha.codigo_de_acesso}`;

  /*
    A DISPUTA PRESENCIAL NÃO TEM GRAVADOR, e o motivo está escrito por extenso
    no `ResultadoDaDisputa`: um estranho respondendo ali criaria uma rodada sem
    participante, que fica fora do pódio e dentro da conta do líder.
  */
  if (batalha.tipo_de_batalha === 'presencial') {
    return (
      <MolduraDeLink subtitulo={`Disputa ${batalha.codigo_de_acesso}`}>
        <ResultadoDaDisputa batalha={batalha} url={url} userId={userId} />
      </MolduraDeLink>
    );
  }

  return (
    <MolduraDeLink subtitulo={`Batalha ${batalha.codigo_de_acesso}`}>
      <div className="screen" ref={areaRolavel}>
        {erroDaResposta && (
          <p role="alert" style={{ color: 'var(--danger)', marginBottom: 'var(--space-4)' }}>
            {erroDaResposta}
          </p>
        )}

        {/*
          Quem está ganhando, no topo e sempre visível.

          Substitui o "veredito" do duelo antigo, que só existia depois da
          resposta e era final. Numa batalha em loop não há resultado final
          enquanto o link viver — há um líder, que muda.
        */}
        {batalha.lider && (
          <div
            style={{
              ...cartaoDeLink,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: 'var(--space-4)',
            }}
          >
            <div>
              <div style={{ fontSize: 11, textTransform: 'uppercase', color: 'var(--muted)' }}>
                Liderando agora
              </div>
              <div style={{ fontSize: 15, fontWeight: 700 }}>{batalha.lider.apelido}</div>
            </div>
            <div
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 32,
                color: 'var(--accent)',
                lineHeight: 1,
              }}
            >
              {formatarNota(batalha.lider.nota)}
            </div>
          </div>
        )}

        {batalha.rodadas.map((rodada) => (
          <CartaoDeRodada
            key={rodada.rodada_id}
            rodada={rodada}
            rotulo={`${rodada.posicao}º`}
            userId={userId}
          />
        ))}

        <div ref={fimDoFeed} />

        {/*
          O aviso de que chegou coisa nova, para quem NÃO está no fim do feed.

          `sticky` no fim do conteúdo: enquanto a posição natural dele estiver
          abaixo do que se vê, ele fica colado na base da área rolável; quando a
          pessoa chega ao fim, ele volta para o fluxo e some junto com o motivo
          de existir.
        */}
        {novidades > 0 && (
          <button
            type="button"
            onClick={irParaOFim}
            style={{
              position: 'sticky',
              bottom: 'var(--space-2)',
              alignSelf: 'center',
              padding: '10px 18px',
              borderRadius: 'var(--radius-full)',
              border: '1px solid var(--border)',
              background: 'var(--accent)',
              color: 'var(--bg)',
              fontWeight: 700,
              fontSize: 13,
              zIndex: 2,
            }}
          >
            {novidades === 1 ? 'Chegou arroto novo' : `Chegaram ${novidades} arrotos novos`} · ver
          </button>
        )}

        <h2
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 20,
            textTransform: 'uppercase',
            marginTop: 'var(--space-4)',
          }}
        >
          Sua vez
        </h2>

        {/*
          `hideChallengeButton` já existia exatamente para isto: aqui a batalha
          JÁ existe, então "Desafiar um amigo" criaria uma segunda batalha e
          partiria a conversa em duas.
        */}
        {/*
          `exigeAudio`: sem som a resposta NÃO entra na batalha. Quem abriu este
          link veio para ouvir — uma rodada muda na timeline é o mesmo defeito
          que deixava o desafiante mandar um link sem arroto.
        */}
        <AudioRecorder onRecordingComplete={responder} hideChallengeButton exigeAudio />

        <div style={{ ...cartaoDeLink, marginTop: 'var(--space-4)' }}>
          <div
            style={{
              fontSize: 11,
              color: 'var(--muted)',
              textTransform: 'uppercase',
              marginBottom: 'var(--space-2)',
            }}
          >
            Chamar mais gente
          </div>

          <CompartilharEmRede
            url={url}
            texto="Entra nessa batalha de arroto no Auê. Ouve os que já estão lá e manda o teu."
          />

          {/*
            O prazo vem de `expira_em`, e não de um "7 dias" escrito à mão: no
            sexto dia a frase antiga continuava prometendo uma semana inteira a
            quem estava decidindo se mandava o link agora ou amanhã.
          */}
          <p
            style={{
              fontSize: 12,
              color: 'var(--muted)',
              marginTop: 'var(--space-4)',
              lineHeight: 1.5,
            }}
          >
            Quem tiver este link entra na batalha e pode responder.{' '}
            {fraseDoPrazo(batalha.expira_em)} Os arrotos continuam guardados no
            Auê.
          </p>
        </div>

        <Convite />
      </div>
    </MolduraDeLink>
  );
};
