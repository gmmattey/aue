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
import {
  CHAMAR_PRO_X1,
  DEIXA_PRA_LA,
  DESAFIO_COMENTARIO,
  DESAFIO_LANCADO,
  ESPERANDO,
  MANDAR_O_DESAFIO,
} from '../nucleo/fala/desafio';
/*
  DÍVIDA DECLARADA: a Arena importando do código legado.

  `fraseDoPrazo` é regra pura — transformar a data que o banco mandou numa
  frase honesta — e por isso deveria morar no núcleo. Ela não mudou de casa
  agora porque tem consumidor no fluxo antigo, e mover no mesmo dia em que a
  Arena passa a usar é o mesmo risco que a gente já recusou com a fórmula da
  nota. Migra junto com a #109.

  O teste de fronteira conhece esta exceção pelo nome: qualquer outro import de
  `features/` dentro de `arena/` reprova o build.
*/
import { fraseDoPrazo } from '../features/battle/prazoDaBatalha';
import {
  AGUENTA_ESSA,
  EMPATOU,
  EMPATOU_COMENTARIO,
  GANHOU,
  MANDAR_O_LINK,
  O_ARROTO_DELE,
  PERDEU,
  PROVOCACOES,
  VER_O_ESTRAGO,
  VER_O_PLACAR,
  chamouVoce,
} from '../nucleo/fala/versus';
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
import { CobrarONome } from './faixas/CobrarONome';
import { LinkDoDesafio } from './faixas/LinkDoDesafio';
import { OuvirOProprio } from './faixas/OuvirOProprio';
import { BlocoVersus, LinhasDoPlacar } from './faixas/PlacarDoX1';
import { TocarArroto } from './faixas/TocarArroto';
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
  /**
   * O código do link, quando a Arena foi aberta por um desafio.
   *
   * Quem lê a URL é o roteador, lá fora — a Arena recebe o código pronto e
   * continua sem saber o que é rota.
   */
  codigoDoDesafio?: string;
  /** Dublês nos testes; a montagem web em produção. */
  adaptadores?: AdaptadoresDaArena;
  /** Injetável para o teste conseguir prever a fala sorteada. */
  sorteio?: () => number;
  /** Injetável para o teste controlar o cronômetro. */
  agora?: () => number;
}

export function Arena({
  codigoDoDesafio,
  adaptadores,
  sorteio = Math.random,
  agora = Date.now,
}: PropsDaArena) {
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
    ABRIR O DESAFIO É UM MOMENTO, NÃO UM ESTADO.

    Quem chega por link não passa pelo `IDLE` de verdade: enquanto o servidor
    responde, a Arena fica montada com a Bolha e diz que está abrindo. Criar um
    estado só para isso encheria a máquina de cena que aparece e some em menos
    de um segundo — o mesmo motivo que mantém a permissão de microfone como
    momento do `IDLE`.
  */
  const [abrindoODesafio, setAbrindoODesafio] = useState<boolean>(!!codigoDoDesafio);
  const [provocacao, setProvocacao] = useState<string>(PROVOCACOES[0]);

  /* A assinatura é sobreposição: a Arena continua atrás, com a nota no lugar. */
  const [cobrandoNome, setCobrandoNome] = useState(false);
  const [enviandoDesafio, setEnviandoDesafio] = useState(false);
  const [gritoDoDesafio, setGritoDoDesafio] = useState<string>(DESAFIO_LANCADO[0]);
  const [comentarioDoDesafio, setComentarioDoDesafio] = useState<string>(DESAFIO_COMENTARIO[0]);
  /* A origem escolhida viaja até o envio: o servidor recalcula a nota com ela. */
  const origemEscolhida = useRef<AlvoDeOrigem | null>(null);
  /*
    O código da disputa que está sendo respondida. Guardado num `ref` porque
    ele atravessa quatro estados — do `VERSUS` até o `RESULT` — e não faz parte
    do que a Arena desenha em nenhum deles.
  */
  const codigoDaDisputa = useRef<string | null>(codigoDoDesafio ?? null);

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

  /*
    A SEGUNDA PORTA DE ENTRADA DO JOGO (`ARENA.md` §3). Roda uma vez, no boot,
    quando existe código na URL.
  */
  useEffect(() => {
    if (!codigoDoDesafio) return;
    let cancelado = false;

    void (async () => {
      const abertura = await dependencias.desafios.abrir(codigoDoDesafio);
      if (cancelado) return;

      setAbrindoODesafio(false);
      if (abertura.ok) {
        setProvocacao(escolherFala(PROVOCACOES, null, sorteio));
        setSituacao({ estado: 'VERSUS', desafio: abertura.desafio });
        return;
      }

      setSituacao({
        estado: 'ERROR',
        caso:
          abertura.motivo === 'expirado' || abertura.motivo === 'naoExiste'
            ? 'linkExpirado'
            : 'semRede',
      });
    })();

    return () => {
      cancelado = true;
    };
  }, [codigoDoDesafio, dependencias, sorteio]);

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
      origemEscolhida.current = alvo;
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
        O ÁUDIO SOBREVIVE AO JULGAMENTO, e some quando a partida acaba.

        Ele é preciso em dois lugares depois daqui: para subir junto do desafio
        (sem áudio o amigo abre o link e não tem o que ouvir) e para o player
        do `CHALLENGE`, onde a pessoa escuta o próprio arroto enquanto espera.

        Quem apaga é a volta ao `IDLE` e o começo de uma gravação nova — nunca
        fica arroto de partida velha na memória.
      */

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
    /* O arroto anterior sai da memória antes de o próximo entrar. */
    audio.current = null;
    origemEscolhida.current = null;
    await abrirOMicrofoneEGravar({ tipo: 'MANDAR_OUTRO' });
  }, [abrirOMicrofoneEGravar]);

  /**
   * CRIAR O DESAFIO — o único lugar onde o áudio sai do aparelho.
   *
   * Guardar o resultado, subir o áudio e criar a batalha são três passos na
   * porta, e ela é toda-ou-nada: ou existe desafio com som, ou não existe
   * desafio. Link que abre num arroto mudo é o produto quebrado.
   */
  const criarODesafio = useCallback(
    async (nome: string) => {
      const gravado = audio.current;
      const alvo = origemEscolhida.current;
      if (situacao.estado !== 'RESULT' || !gravado || !alvo) {
        setCobrandoNome(false);
        despachar({ tipo: 'DESAFIO_FALHOU', caso: 'falhaNaAnalise' });
        return;
      }

      setEnviandoDesafio(true);
      const resposta = await dependencias.desafios.criar({
        nota: situacao.nota,
        origem: alvo.tipo,
        audio: gravado,
        nome,
      });
      setEnviandoDesafio(false);
      setCobrandoNome(false);

      if (!resposta.ok) {
        /*
          Sem rede e sem configuração são o MESMO caso para o `ARENA.md`: "o
          jogo não consegue operar agora". Quem publicou errado é problema de
          quem publicou; para quem está jogando, o desafio não saiu e existe
          um botão de tentar de novo.
        */
        const caso = resposta.motivo === 'falhou' ? 'falhaNaAnalise' : 'semRede';
        despachar({ tipo: 'DESAFIO_FALHOU', caso });
        return;
      }

      setGritoDoDesafio((anterior) => escolherFala(DESAFIO_LANCADO, anterior, sorteio));
      setComentarioDoDesafio((anterior) => escolherFala(DESAFIO_COMENTARIO, anterior, sorteio));
      despachar({ tipo: 'DESAFIO_CRIADO', desafio: resposta.desafio });
    },
    [dependencias, despachar, situacao, sorteio],
  );

  const mandarODesafio = useCallback(
    async (link: string) => {
      /*
        A folha do sistema quando existir; onde ela não existir, sobra copiar —
        que já está na tela logo acima. Nada de prometer o que o navegador não
        faz.
      */
      await dependencias.compartilhamento.compartilhar({
        elementId: 'nao-existe-cartao-aqui',
        url: link,
        titulo: 'Te chamei pro X1 no Auê',
        texto: 'Bati essa. Duvido você bater.',
      });
    },
    [dependencias],
  );

  const copiar = useCallback(
    (texto: string) => dependencias.compartilhamento.copiar(texto),
    [dependencias],
  );

  const deixaPraLa = useCallback(() => {
    /* Partida encerrada: o arroto sai da memória. */
    audio.current = null;
    origemEscolhida.current = null;
    jaRevelou.current = false;
    setFala((anterior) => sortearFala(anterior));
    despachar({ tipo: 'DEIXA_PRA_LA' });
  }, [despachar, sortearFala]);

  /** "Aguenta essa" — o desafiado vai gravar a resposta. */
  const aguentarEssa = useCallback(async () => {
    await abrirOMicrofoneEGravar({ tipo: 'AGUENTA_ESSA' });
  }, [abrirOMicrofoneEGravar]);

  /**
   * MANDAR A RESPOSTA — o segundo lugar onde o áudio sai do aparelho.
   *
   * Mesma regra de criar: ou a resposta existe inteira, com áudio, ou não
   * existe. Falhar no meio deixaria o placar com uma linha muda, e é a linha
   * que serve de prova.
   */
  const responderODesafio = useCallback(
    async (nome: string) => {
      const gravado = audio.current;
      const alvo = origemEscolhida.current;
      const codigo = codigoDaDisputa.current;
      if (situacao.estado !== 'RESULT' || !gravado || !alvo || !codigo) {
        setCobrandoNome(false);
        despachar({ tipo: 'DESAFIO_FALHOU', caso: 'falhaNaAnalise' });
        return;
      }

      setEnviandoDesafio(true);
      const resposta = await dependencias.desafios.responder({
        codigo,
        nota: situacao.nota,
        origem: alvo.tipo,
        audio: gravado,
        nome,
      });
      setEnviandoDesafio(false);
      setCobrandoNome(false);

      if (!resposta.ok) {
        despachar({
          tipo: 'DESAFIO_FALHOU',
          caso:
            resposta.motivo === 'expirado' || resposta.motivo === 'naoExiste'
              ? 'linkExpirado'
              : resposta.motivo === 'semRede'
                ? 'semRede'
                : 'falhaNaAnalise',
        });
        return;
      }

      /* Respondeu: a partida acabou para este arroto. */
      audio.current = null;
      despachar({ tipo: 'RESPOSTA_ENVIADA', desafio: resposta.desafio });
    },
    [dependencias, despachar, situacao],
  );

  const verOPlacar = useCallback(() => {
    despachar({ tipo: 'VER_O_PLACAR' });
  }, [despachar]);

  const buscarEndereco = useCallback(
    (audioId: string) => dependencias.desafios.enderecoDoAudio(audioId),
    [dependencias],
  );

  const tentarDeNovo = useCallback(() => {
    audio.current = null;
    origemEscolhida.current = null;
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
        /*
          Momento do `IDLE`, não estado: quem chegou por link não vê a chamada
          de "manda o arrotão" enquanto o servidor responde — ele veio para uma
          briga específica.
        */
        if (abrindoODesafio) {
          return {
            reacao: (
              <h1 className="grito" role="status">
                Abrindo o desafio…
              </h1>
            ),
            acao: null,
          };
        }
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
            <>
              {/*
                O X1 é a saída PRINCIPAL do resultado (`ARENA.md`, RESULT). O
                "mandar outro" continua ali, discreto — quem quer arrotar de
                novo consegue, mas o jogo empurra para a briga.
              */}
              <button
                type="button"
                className="botao botao-principal"
                onClick={() => setCobrandoNome(true)}
              >
                {/*
                  Quem está respondendo a um desafio não vai chamar ninguém: ele
                  quer ver o estrago (`ARENA.md`, RESULT).
                */}
                {codigoDaDisputa.current ? VER_O_ESTRAGO : CHAMAR_PRO_X1}
              </button>
              {codigoDaDisputa.current ? null : (
                <button type="button" className="botao-discreto" onClick={mandarOutro}>
                  {MANDAR_OUTRO}
                </button>
              )}
            </>
          ),
        };

      case 'VERSUS': {
        const desafiante = situacao.desafio.rodadas[0];
        return {
          reacao: (
            <>
              <h1 className="grito">{chamouVoce(desafiante?.nome ?? 'Alguém')}</h1>
              <p className="comentario">{provocacao}</p>
              {/*
                OUVIR ANTES DE RESPONDER é o que faz o jogo existir — sem isso
                a pessoa está respondendo a um número. O player vem antes da
                ação, e não escondido embaixo dela.
              */}
              <TocarArroto
                rotulo={O_ARROTO_DELE}
                audioId={desafiante?.audioId ?? null}
                buscarEndereco={buscarEndereco}
              />
            </>
          ),
          acao: (
            <>
              <button type="button" className="botao botao-principal" onClick={aguentarEssa}>
                {AGUENTA_ESSA}
              </button>
              <button type="button" className="botao-discreto" onClick={verOPlacar}>
                {VER_O_PLACAR}
              </button>
            </>
          ),
        };
      }

      case 'SCOREBOARD': {
        const lider = situacao.desafio.lider;
        /*
          Sem líder é empate — ou disputa que ainda não tem os dois lados. Nos
          dois casos não existe vencedor, e inventar um seria roubo aos olhos
          de quem perdeu.
        */
        const eu = situacao.desafio.rodadas[situacao.desafio.rodadas.length - 1];
        const venci = !!lider && !!eu && lider.rodadaId === eu.id;
        return {
          reacao: (
            <>
              <h1 className="grito">
                {!lider ? EMPATOU : venci ? GANHOU[0] : PERDEU[0]}
              </h1>
              {!lider ? <p className="comentario">{EMPATOU_COMENTARIO}</p> : null}
              <LinhasDoPlacar desafio={situacao.desafio} buscarEndereco={buscarEndereco} />
            </>
          ),
          acao: (
            /*
              A REVANCHE NÃO EXISTE AINDA (#100), e por isso nenhuma frase daqui
              promete revanche. A ação que existe é mandar o link.
            */
            <button
              type="button"
              className="botao botao-principal"
              onClick={() => mandarODesafio(situacao.desafio.link)}
            >
              {MANDAR_O_LINK}
            </button>
          ),
        };
      }

      case 'CHALLENGE':
        return {
          reacao: (
            <>
              <h1 className="grito">{gritoDoDesafio}</h1>
              <p className="comentario">{comentarioDoDesafio}</p>
              <LinkDoDesafio link={situacao.desafio.link} onCopiar={copiar} />
              {audio.current ? <OuvirOProprio dados={audio.current.dados} /> : null}
              <p className="aviso-de-espera">{ESPERANDO}</p>
              {/*
                O PRAZO VEM DO BANCO. "7 dias" escrito na tela é a mentira mais
                fácil de contar — no sexto dia continuaria prometendo sete.
              */}
              <p className="comentario">{fraseDoPrazo(situacao.desafio.expiraEm, agora())}</p>
            </>
          ),
          acao: (
            <>
              <button
                type="button"
                className="botao botao-principal"
                onClick={() => mandarODesafio(situacao.desafio.link)}
              >
                {MANDAR_O_DESAFIO}
              </button>
              <button type="button" className="botao-discreto" onClick={deixaPraLa}>
                {DEIXA_PRA_LA}
              </button>
            </>
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
    gritoDoDesafio,
    comentarioDoDesafio,
    provocacao,
    abrindoODesafio,
    aguentarEssa,
    verOPlacar,
    buscarEndereco,
    encerrarGravacao,
    escolherOrigem,
    mandarOutro,
    mandarODesafio,
    copiar,
    deixaPraLa,
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
        {/* No placar a Bolha sai e entra o VS (`ARENA.md`, SCOREBOARD). */}
        {situacao.estado === 'SCOREBOARD' ? (
          <BlocoVersus desafio={situacao.desafio} />
        ) : (
          <BolhaAue modo={modoDaBolha} nivel={nivel} />
        )}
        {situacao.estado === 'RESULT' || situacao.estado === 'CHALLENGE' ? (
          <div className="palco-nota">
            <p className="rotulo-da-nota">{ROTULO_DA_NOTA}</p>
            {/*
              No `CHALLENGE` o número que aparece é o OFICIAL, o que o servidor
              calculou e o que vai no link. E sem teatro: a nota já foi
              revelada, repetir a contagem seria contar a piada duas vezes.
            */}
            <NotaContada
              valor={
                situacao.estado === 'CHALLENGE' ? situacao.desafio.notaOficial : situacao.nota.nota
              }
              comTeatro={situacao.estado === 'RESULT' && !jaRevelou.current}
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

      {/*
        A ASSINATURA PINTA POR CIMA e volta — não é estado (`ARENA.md` §1). A
        Arena continua montada atrás, com a nota no lugar.
      */}
      {cobrandoNome ? (
        <CobrarONome
          ocupado={enviandoDesafio}
          onConfirmar={codigoDaDisputa.current ? responderODesafio : criarODesafio}
          onFechar={() => setCobrandoNome(false)}
        />
      ) : null}
    </main>
  );
}

/** O `parar()` devolve o áudio ou o motivo de não ter dado. */
function ehAudio(resultado: Awaited<ReturnType<AdaptadoresDaArena['captura']['parar']>>): resultado is AudioCapturado {
  return 'dados' in resultado;
}
