import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { CHAVES } from '../portas/armazenamento';
import { SITUACAO_INICIAL, transicao } from '../nucleo/arena/maquina';
import type { EventoDaArena, SituacaoDaArena } from '../nucleo/arena/estados';
import { falaDoErro } from '../nucleo/fala/erros';
import {
  CHAMADAS,
  COMENTARIOS_DE_VOLTA,
  COMENTARIOS_PRIMEIRA_VEZ,
  escolherFala,
} from '../nucleo/fala/idle';
import { type AdaptadoresDaArena, adaptadoresWeb } from './adaptadores';
import { BolhaAue } from './bolha/BolhaAue';
import { GatilhoDeMicrofone } from './faixas/GatilhoDeMicrofone';
import { EstadoNaoConstruido } from './faixas/EstadoNaoConstruido';
import './arena.css';

/**
 * A Arena — uma superfície que muda de estado, não uma pilha de telas.
 *
 * Esta fatia levanta a fundação: a grade das quatro faixas, a máquina de
 * estados e o `IDLE` funcionando de verdade, com o microfone sendo pedido no
 * toque. Os outros nove estados existem na máquina e ainda não têm cena.
 *
 * Referências: `docs/jogo/ARENA.md` (quem manda nos estados),
 * `docs/design/prototipo-arena/arena.html` (como se parece e se move),
 * `docs/technical/adr/0001-arquitetura-oficial-do-aue.md` (as camadas).
 */
interface PropsDaArena {
  /** Dublês nos testes; a montagem web em produção. */
  adaptadores?: AdaptadoresDaArena;
  /** Injetável para o teste conseguir prever a fala sorteada. */
  sorteio?: () => number;
}

export function Arena({ adaptadores, sorteio = Math.random }: PropsDaArena) {
  /*
    `useState` com função de inicialização, e não `useMemo`: o React pode
    descartar o valor de um `useMemo` quando quiser. Aqui o valor SEGURA
    RECURSO — o ciclo de vida tem ouvintes registrados no `document` e a
    captura tem um `MediaStream` — e recriar isso no meio da partida deixaria o
    stream velho vivo, sem ninguém para soltar.
  */
  const [dependencias] = useState<AdaptadoresDaArena>(() => adaptadores ?? adaptadoresWeb());

  const [situacao, setSituacao] = useState<SituacaoDaArena>(SITUACAO_INICIAL);

  /*
    "Essa pessoa já arrotou aqui antes?" — muda o comentário do `IDLE`. Lido
    uma vez, e num `ref` porque não é para redesenhar quando muda: a fala já
    está escolhida.
  */
  const jaJogou = useRef<boolean>(false);
  const [fala, setFala] = useState(() => ({ chamada: '', comentario: '' }));

  const sortearFala = useCallback(
    (anterior: { chamada: string; comentario: string } | null) => {
      const comentarios = jaJogou.current ? COMENTARIOS_DE_VOLTA : COMENTARIOS_PRIMEIRA_VEZ;
      return {
        chamada: escolherFala(CHAMADAS, anterior?.chamada ?? null, sorteio),
        comentario: escolherFala(comentarios, anterior?.comentario ?? null, sorteio),
      };
    },
    [sorteio],
  );

  useEffect(() => {
    jaJogou.current = dependencias.armazenamento.ler(CHAVES.jaJogou) === '1';
    setFala(sortearFala(null));
  }, [dependencias, sortearFala]);

  const despachar = useCallback(
    (evento: EventoDaArena) => {
      setSituacao((atual) => {
        const proxima = transicao(atual, evento);
        /*
          `null` é evento que não faz sentido aqui — toque repetido, promessa
          que voltou atrasada, clique duplo. A Arena não se mexe, e isso é
          decisão, não esquecimento.
        */
        return proxima ?? atual;
      });
    },
    [],
  );

  /*
    A TELA SUMIU: SOLTA O MICROFONE.

    No iPhone o Safari mata aba em segundo plano, e quando mata nenhum `return`
    de efeito roda. Esperar a desmontagem para limpar é como deixar a chave na
    porta esperando alguém lembrar.
  */
  useEffect(() => {
    const { captura, cicloDeVida } = dependencias;
    cicloDeVida.aoEsconder(() => captura.soltar());
    return () => {
      cicloDeVida.parar();
      captura.soltar();
    };
  }, [dependencias]);

  /*
    ENTROU EM `RECORDING` E A GRAVAÇÃO NÃO EXISTE: solta o microfone na hora.

    Enquanto a #87 não chega, ninguém segura recurso de aparelho esperando uma
    cena que não foi construída. Quando ela chegar, este efeito sai e quem
    passa a mandar no stream é a gravação.

    É aqui também que "já jogou" fica marcado: o microfone liberado é o sinal
    mais honesto que existe hoje de que a pessoa foi arrotar. Vira exato quando
    a gravação existir.
  */
  useEffect(() => {
    if (situacao.estado !== 'RECORDING') return;
    dependencias.captura.soltar();
    if (!jaJogou.current) {
      jaJogou.current = dependencias.armazenamento.gravar(CHAVES.jaJogou, '1');
    }
  }, [situacao.estado, dependencias]);

  const pedirMicrofone = useCallback(async () => {
    despachar({ tipo: 'TOCOU_ARROTAR' });
    const resposta = await dependencias.captura.pedir();
    despachar(resposta.ok ? { tipo: 'MICROFONE_LIBERADO' } : { tipo: 'MICROFONE_NEGADO' });
  }, [dependencias, despachar]);

  const tentarDeNovo = useCallback(() => {
    setFala((anterior) => sortearFala(anterior));
    despachar({ tipo: 'TENTAR_DE_NOVO' });
  }, [despachar, sortearFala]);

  const faixas = useMemo(() => {
    switch (situacao.estado) {
      case 'IDLE':
        return {
          reacao: (
            <>
              <h1 className="grito">{fala.chamada}</h1>
              <p className="comentario">{fala.comentario}</p>
            </>
          ),
          acao: <GatilhoDeMicrofone onArrotar={pedirMicrofone} />,
        };

      case 'ERROR': {
        const texto = falaDoErro(situacao.caso);
        return {
          reacao: (
            <>
              <h1 className="grito">{texto.titulo}</h1>
              <p className="comentario">{texto.comentario}</p>
            </>
          ),
          acao: (
            <button type="button" className="botao botao-principal" onClick={tentarDeNovo}>
              {texto.saida}
            </button>
          ),
        };
      }

      default:
        return {
          reacao: <EstadoNaoConstruido estado={situacao.estado} />,
          acao: null,
        };
    }
  }, [situacao, fala, pedirMicrofone, tentarDeNovo]);

  return (
    <main className="arena" data-estado={situacao.estado}>
      {/*
        O HUD desta fatia é só a marca. O botão de menu do protótipo abre uma
        sobreposição que ainda não existe, e botão que não abre nada é mentira
        na tela — ele volta junto com o menu.
      */}
      <header className="hud">
        <div className="wordmark">
          Auê<i>!</i>
        </div>
      </header>

      <section className="palco">
        <BolhaAue />
      </section>

      {/*
        `aria-live="polite"`: a faixa de reação é o que o jogo está dizendo
        agora. Quem usa leitor de tela precisa ouvir a mudança sem ter que sair
        caçando o que mudou.
      */}
      <section className="reacao" aria-live="polite">
        {faixas.reacao}
      </section>

      <section className="acao">{faixas.acao}</section>
    </main>
  );
}
