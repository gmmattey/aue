import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { CHAVES } from '../portas/armazenamento';
import type { AudioCapturado } from '../portas/captura';
import { SITUACAO_INICIAL, transicao } from '../nucleo/arena/maquina';
import type { EventoDaArena, SituacaoDaArena } from '../nucleo/arena/estados';
import { falaDoErro } from '../nucleo/fala/erros';
import { GRAVANDO, PARAR } from '../nucleo/fala/gravacao';
import { houveSom } from '../nucleo/gravacao/regras';
import {
  CHAMADAS,
  COMENTARIOS_DE_VOLTA,
  COMENTARIOS_PRIMEIRA_VEZ,
  escolherFala,
} from '../nucleo/fala/idle';
import { type AdaptadoresDaArena, adaptadoresWeb } from './adaptadores';
import { BolhaAue } from './bolha/BolhaAue';
import { Cronometro } from './faixas/Cronometro';
import { GatilhoDeMicrofone } from './faixas/GatilhoDeMicrofone';
import { EstadoNaoConstruido } from './faixas/EstadoNaoConstruido';
import './arena.css';

/**
 * A Arena — uma superfície que muda de estado, não uma pilha de telas.
 *
 * Estados construídos: `IDLE`, `RECORDING` e `ERROR`. Os outros sete existem na
 * máquina e ainda não têm cena.
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
  /** Injetável para o teste controlar o cronômetro. */
  agora?: () => number;
}

export function Arena({ adaptadores, sorteio = Math.random, agora = Date.now }: PropsDaArena) {
  /*
    `useState` com função de inicialização, e não `useMemo`: o React pode
    descartar o valor de um `useMemo` quando quiser. Aqui o valor SEGURA
    RECURSO — o ciclo de vida tem ouvintes registrados no `document` e a
    captura tem microfone, gravador e medidor — e recriar isso no meio da
    partida deixaria o stream velho vivo, sem ninguém para soltar.
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
  const [gritoDaGravacao, setGritoDaGravacao] = useState<string>(GRAVANDO[0]);
  const [comecouEm, setComecouEm] = useState<number>(0);

  /*
    A TRAVA DA SAÍDA ÚNICA.

    Os três gatilhos de parada — o toque em PARAR, o teto do cronômetro e a
    tela sumindo — podem chegar quase juntos: a pessoa toca em PARAR no décimo
    segundo exato. Sem esta trava, dois deles chamariam `parar()` e o segundo
    receberia "não estava gravando", empurrando a partida para um erro que não
    aconteceu.
  */
  const encerrando = useRef(false);

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

  const despachar = useCallback((evento: EventoDaArena) => {
    setSituacao((atual) => {
      const proxima = transicao(atual, evento);
      /*
        `null` é evento que não faz sentido aqui — toque repetido, promessa
        que voltou atrasada, clique duplo. A Arena não se mexe, e isso é
        decisão, não esquecimento.
      */
      return proxima ?? atual;
    });
  }, []);

  /**
   * O CAMINHO ÚNICO DE SAÍDA DA GRAVAÇÃO.
   *
   * PARAR, teto de tempo e falha saem por aqui, como manda o `REGRAS.md` §1. A
   * porta solta microfone, gravador e medidor dentro do `parar()`, sempre —
   * inclusive quando dá errado.
   */
  const encerrarGravacao = useCallback(async () => {
    if (encerrando.current) return;
    encerrando.current = true;

    const resultado = await dependencias.captura.parar();

    if (!ehAudio(resultado)) {
      despachar({ tipo: 'DEU_RUIM_NA_GRAVACAO' });
      return;
    }

    /*
      A plataforma mediu, o núcleo decide. Ninguém escolhe origem para depois
      descobrir que não valeu — a conferida acontece aqui, na saída
      (`ARENA.md`, `RECORDING`).

      A outra metade da conferida — "foi arroto mesmo?" — é a #89.
    */
    despachar(houveSom(resultado.resumo) ? { tipo: 'PAROU_COM_SOM' } : { tipo: 'PAROU_SEM_SOM' });
  }, [dependencias, despachar]);

  /*
    A TELA SUMIU: SOLTA O MICROFONE.

    No iPhone o Safari mata aba em segundo plano, e quando mata nenhum `return`
    de efeito roda. Esperar a desmontagem para limpar é como deixar a chave na
    porta esperando alguém lembrar.

    Se sumiu no meio da gravação, a Arena volta para o `IDLE`: nada quebrou, a
    pessoa só saiu, e o jogo não finge que continuou gravando.
  */
  useEffect(() => {
    const { captura, cicloDeVida } = dependencias;

    cicloDeVida.aoEsconder(() => {
      const estavaGravando = captura.estaGravando();
      encerrando.current = true;
      captura.soltar();
      if (estavaGravando) {
        despachar({ tipo: 'SUMIU_DA_TELA' });
      }
    });

    return () => {
      cicloDeVida.parar();
      captura.soltar();
    };
  }, [dependencias, despachar]);

  const pedirMicrofone = useCallback(async () => {
    despachar({ tipo: 'TOCOU_ARROTAR' });

    const resposta = await dependencias.captura.pedir();
    if (!resposta.ok) {
      despachar({ tipo: 'MICROFONE_NEGADO' });
      return;
    }

    /*
      O gravador e o medidor nascem AQUI, dentro do mesmo gesto que pediu o
      microfone. No iPhone um contexto de áudio criado fora de gesto nasce
      suspenso e mede zero — a Bolha ficaria parada com a pessoa arrotando na
      cara do telefone, que é exatamente o medo que ela existe para matar.
    */
    if (!dependencias.captura.comecar()) {
      dependencias.captura.soltar();
      despachar({ tipo: 'DEU_RUIM_NA_GRAVACAO' });
      return;
    }

    encerrando.current = false;
    setGritoDaGravacao((anterior) => escolherFala(GRAVANDO, anterior, sorteio));
    setComecouEm(agora());
    despachar({ tipo: 'MICROFONE_LIBERADO' });
  }, [agora, dependencias, despachar, sorteio]);

  const tentarDeNovo = useCallback(() => {
    setFala((anterior) => sortearFala(anterior));
    despachar({ tipo: 'TENTAR_DE_NOVO' });
  }, [despachar, sortearFala]);

  /*
    "Já arrotou aqui" fica marcado quando a gravação de fato começou — não no
    toque, que pode terminar em permissão negada.
  */
  useEffect(() => {
    if (situacao.estado !== 'RECORDING' || jaJogou.current) return;
    jaJogou.current = dependencias.armazenamento.gravar(CHAVES.jaJogou, '1');
  }, [situacao.estado, dependencias]);

  const nivel = useCallback(() => dependencias.captura.nivelAtual(), [dependencias]);

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

      case 'RECORDING':
        return {
          reacao: (
            <>
              <h1 className="grito">{gritoDaGravacao}</h1>
              <Cronometro comecouEm={comecouEm} onTeto={encerrarGravacao} agora={agora} />
            </>
          ),
          acao: (
            <button type="button" className="botao botao-principal" onClick={encerrarGravacao}>
              {PARAR}
            </button>
          ),
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
  }, [
    situacao,
    fala,
    gritoDaGravacao,
    comecouEm,
    agora,
    encerrarGravacao,
    pedirMicrofone,
    tentarDeNovo,
  ]);

  /*
    O HUD some durante a gravação: nada compete com a captura (`ARENA.md`,
    `RECORDING`). É atributo na Arena, e não `hidden` no header, porque a faixa
    continua ocupando a altura dela — se o topo sumisse do fluxo, a Bolha
    saltaria de lugar entre um estado e outro, que é a única coisa que a grade
    não pode deixar acontecer.
  */
  const hud = situacao.estado === 'RECORDING' ? 'off' : 'on';

  return (
    <main className="arena" data-estado={situacao.estado} data-hud={hud}>
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
        <BolhaAue modo={situacao.estado === 'RECORDING' ? 'gravando' : 'repouso'} nivel={nivel} />
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

/** O `parar()` devolve o áudio ou o motivo de não ter dado. */
function ehAudio(resultado: Awaited<ReturnType<AdaptadoresDaArena['captura']['parar']>>): resultado is AudioCapturado {
  return 'dados' in resultado;
}
