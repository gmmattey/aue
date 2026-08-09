import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { CHAVES } from '../portas/armazenamento';
import type { AudioCapturado } from '../portas/captura';
import type { AlvoDeOrigem } from '../nucleo/origem/origens';
import {
  JULGANDO,
  JULGANDO_COMENTARIO,
  MANDAR_OUTRO,
  PERGUNTAS_DE_ORIGEM,
  ROTULO_DA_NOTA,
} from '../nucleo/fala/julgamento';
import { TETO_DA_ANALISE_MS, esperaQueFalta } from '../nucleo/julgamento/tempo';
import { prefereMovimentoReduzido } from '../plataforma/web/preferencias';
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
import { EscolhaDaOrigem } from './faixas/EscolhaDaOrigem';
import { MedidasEmLinha } from './faixas/MedidasEmLinha';
import { NotaContada } from './faixas/NotaContada';
import { GatilhoDeMicrofone } from './faixas/GatilhoDeMicrofone';
import { EstadoNaoConstruido } from './faixas/EstadoNaoConstruido';
import './arena.css';

/**
 * A Arena — uma superfície que muda de estado, não uma pilha de telas.
 *
 * Estados construídos: `IDLE`, `RECORDING`, `ORIGIN`, `JUDGING`, `RESULT` e
 * `ERROR` — o loop solo inteiro. Faltam os quatro da briga (`CHALLENGE`,
 * `VERSUS`, `SCOREBOARD`, `REMATCH`).
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
  const [pergunta, setPergunta] = useState<string>(PERGUNTAS_DE_ORIGEM[0]);
  const [gritoDoJulgamento, setGritoDoJulgamento] = useState<string>(JULGANDO[0]);
  const [comentarioDoJulgamento, setComentarioDoJulgamento] = useState<string>(
    JULGANDO_COMENTARIO[0],
  );

  /*
    O ÁUDIO VIVE AQUI, E SÓ ATÉ O JUIZ TERMINAR.

    Num `ref` e não na situação da partida: a máquina é pura e a situação é o
    que a Arena precisa para se desenhar, não um depósito. E some assim que a
    nota sai — o `ARENA.md` §3 proíbe guardar o arroto para retomar sessão, e
    guardar "só enquanto a tela estiver aberta" é o primeiro passo para guardar
    de vez.
  */
  const audio = useRef<AudioCapturado | null>(null);

  /* A primeira revelação tem teatro. A segunda é direta (`ARENA.md`, RESULT). */
  const jaRevelou = useRef(false);
  const [medidasAbertas, setMedidasAbertas] = useState(false);

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
    if (!houveSom(resultado.resumo)) {
      despachar({ tipo: 'PAROU_SEM_SOM' });
      return;
    }

    audio.current = resultado;
    setPergunta((anterior) => escolherFala(PERGUNTAS_DE_ORIGEM, anterior, sorteio));
    despachar({ tipo: 'PAROU_COM_SOM' });
  }, [dependencias, despachar, sorteio]);

  /**
   * A ESCOLHA É A AÇÃO: tocou no alvo, o juiz já começa a ouvir.
   *
   * Sem confirmação, sem botão "continuar". Colocar uma porta no meio de uma
   * escolha de um toque mata o ritmo do jogo.
   */
  const escolherOrigem = useCallback(
    async (alvo: AlvoDeOrigem) => {
      const gravado = audio.current;
      setGritoDoJulgamento((anterior) => escolherFala(JULGANDO, anterior, sorteio));
      setComentarioDoJulgamento((anterior) =>
        escolherFala(JULGANDO_COMENTARIO, anterior, sorteio),
      );
      despachar({ tipo: 'ESCOLHEU_ORIGEM' });

      if (!gravado) {
        despachar({ tipo: 'ANALISE_FALHOU' });
        return;
      }

      const comecou = agora();
      const reduzido = prefereMovimentoReduzido();

      /*
        TETO NA ANÁLISE. Ficar preso no julgamento é o pior dos mundos: a
        pessoa arrotou, o jogo prometeu uma nota e não entrega nem a nota nem o
        erro. Passou do teto, é `ERROR` com saída.
      */
      const veredito = await Promise.race([
        dependencias.juiz.julgar(gravado, alvo.tipo),
        new Promise<null>((resolve) => setTimeout(() => resolve(null), TETO_DA_ANALISE_MS)),
      ]);

      /*
        O áudio some aqui, dê certo ou dê errado. Nada de arroto sobrando na
        memória depois que o juiz terminou.
      */
      audio.current = null;

      /*
        O PISO DO TEATRO. A análise costuma terminar antes de a pessoa ler o
        "Xiu." — sem esperar o resto, a nota aparece por cima da piada. Se a
        análise demorou mais que o piso, não espera nada: ninguém segura a nota
        de quem já esperou.
      */
      const falta = esperaQueFalta(agora() - comecou, reduzido);
      if (falta > 0) {
        await new Promise((resolve) => setTimeout(resolve, falta));
      }

      if (!veredito || !veredito.ok) {
        despachar({ tipo: 'ANALISE_FALHOU' });
        return;
      }

      setMedidasAbertas(false);
      despachar({ tipo: 'JUIZ_FECHOU', nota: veredito.nota });
    },
    [agora, dependencias, despachar, sorteio],
  );

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

  /**
   * Abrir o microfone e entrar na gravação.
   *
   * Serve os dois caminhos que levam a gravar — o ARROTAR do começo e o "Vou
   * mandar outro!" do resultado — porque a sequência é a mesma e ter duas
   * cópias dela é ter duas chances de esquecer um passo. O que muda é só o
   * evento de sucesso, que é o que a máquina usa para saber de onde a pessoa
   * veio.
   */
  const abrirOMicrofoneEGravar = useCallback(
    async (aoConseguir: EventoDaArena) => {
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
      despachar(aoConseguir);
    },
    [agora, dependencias, despachar, sorteio],
  );

  const pedirMicrofone = useCallback(async () => {
    despachar({ tipo: 'TOCOU_ARROTAR' });
    await abrirOMicrofoneEGravar({ tipo: 'MICROFONE_LIBERADO' });
  }, [abrirOMicrofoneEGravar, despachar]);

  /** "Vou mandar outro!" — direto para a gravação, sem passar pela entrada. */
  const mandarOutro = useCallback(async () => {
    await abrirOMicrofoneEGravar({ tipo: 'MANDAR_OUTRO' });
  }, [abrirOMicrofoneEGravar]);

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

      case 'ORIGIN':
        return {
          reacao: (
            <>
              <h1 className="grito">{pergunta}</h1>
              <EscolhaDaOrigem onEscolher={escolherOrigem} />
            </>
          ),
          /* O CTA principal some: a escolha é a ação (`ARENA.md`, ORIGIN). */
          acao: null,
        };

      case 'JUDGING':
        return {
          reacao: (
            <>
              <h1 className="grito">{gritoDoJulgamento}</h1>
              <p className="comentario">{comentarioDoJulgamento}</p>
            </>
          ),
          /* Nenhum CTA — não há o que fazer aqui. */
          acao: null,
        };

      case 'RESULT':
        return {
          reacao: (
            <>
              {/*
                A CLASSIFICAÇÃO EM CIMA, A ZOEIRA EMBAIXO — como no protótipo.

                Inverti isto na primeira versão e o resultado ficou com a frase
                do juiz em corpo de manchete e em accent, brigando com a nota
                pelo olho e estourando o orçamento de verde do design system
                (§2.2). Quem é sinal vivo aqui é o número.
              */}
              <h1 className="grito">{situacao.nota.classificacao}</h1>
              <p className="comentario">{situacao.nota.frase}</p>
              {/*
                As medidas só entram DEPOIS do número. É o `onChegou` da
                contagem que abre — não um tempo fixo, senão num aparelho lento
                elas apareceriam antes de a nota terminar de subir.
              */}
              {medidasAbertas ? <MedidasEmLinha medidas={situacao.nota.medidas} /> : null}
            </>
          ),
          acao: (
            <button type="button" className="botao botao-principal" onClick={mandarOutro}>
              {MANDAR_OUTRO}
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
    pergunta,
    gritoDoJulgamento,
    comentarioDoJulgamento,
    medidasAbertas,
    encerrarGravacao,
    escolherOrigem,
    mandarOutro,
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
  const hud = situacao.estado === 'RECORDING' || situacao.estado === 'JUDGING' ? 'off' : 'on';

  /*
    A NOTA MORA DENTRO DA BOLHA (design system §9.2). Ela não é um número
    colado ao lado: a Bolha se abre e entrega o palco ao número. Por isso o
    palco empilha os dois no mesmo lugar em vez de dividir espaço.
  */
  const modoDaBolha =
    situacao.estado === 'RECORDING'
      ? 'gravando'
      : situacao.estado === 'ORIGIN'
        ? 'segurando'
        : situacao.estado === 'JUDGING'
          ? 'julgando'
          : situacao.estado === 'RESULT'
            ? 'entregando'
            : 'repouso';

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
        <BolhaAue modo={modoDaBolha} nivel={nivel} />
        {situacao.estado === 'RESULT' ? (
          <div className="palco-nota">
            <p className="rotulo-da-nota">{ROTULO_DA_NOTA}</p>
            <NotaContada
              valor={situacao.nota.nota}
              comTeatro={!jaRevelou.current}
              onChegou={() => {
                jaRevelou.current = true;
                setMedidasAbertas(true);
              }}
            />
          </div>
        ) : null}
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
