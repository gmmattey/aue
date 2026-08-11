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
import {
  COMPARTILHAR,
  COPIEI_O_LINK,
  NAO_DEU_PRA_COMPARTILHAR,
  NEM_COPIAR_DEU,
  TROCAR,
  VAI_COM,
  provocacoesDaImagem,
  proximaProvocacao,
  textoDoCompartilhamento,
  textoDoPlacar,
} from '../nucleo/fala/compartilhamento';
import { TETO_DA_ANALISE_MS, esperaQueFalta } from '../nucleo/julgamento/tempo';
import { ORIGEM_CANONICA } from '../shared/enderecoPublico';
import { formatarNota } from '../shared/formato/nota';
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
import { APAGAR_OS_ANTIGOS, MENU, confirmarOsAntigos } from '../nucleo/fala/privacidade';
import { fraseDoPrazo } from '../features/battle/prazoDaBatalha';
import {
  AGUENTA_ESSA,
  CHEGA,
  CHEGA_COMENTARIO,
  EMPATOU,
  EMPATOU_COMENTARIO,
  FALTA_TU_COMENTARIO,
  GANHOU,
  GANHOU_COMENTARIO,
  GRAVANDO_REVANCHE,
  MANDOU_COMENTARIO,
  MANDOU_FALTA_ELE,
  PERDEU_COMENTARIO,
  REVANCHE,
  MANDAR_O_LINK,
  O_ARROTO_DELE,
  PERDEU,
  PROVOCACOES,
  VER_O_ESTRAGO,
  VER_O_PLACAR,
  chamouVoce,
  faltaTu,
} from '../nucleo/fala/versus';
import { prefereMovimentoReduzido } from '../plataforma/web/preferencias';
import { SITUACAO_INICIAL, transicao } from '../nucleo/arena/maquina';
import type { EventoDaArena, SituacaoDaArena } from '../nucleo/arena/estados';
import { falaDoErro } from '../nucleo/fala/erros';
import { CONFERINDO, GRAVANDO, PARAR } from '../nucleo/fala/gravacao';
import { houveSom } from '../nucleo/gravacao/regras';
import {
  CHAMADAS,
  COMENTARIOS_DE_VOLTA,
  COMENTARIOS_PRIMEIRA_VEZ,
  escolherFala,
} from '../nucleo/fala/idle';
import { type AdaptadoresDaArena, adaptadoresWeb } from './adaptadores';
import { BolhaAue } from './bolha/BolhaAue';
import { CartaoDaImagem, ID_DO_CARTAO } from './CartaoDaImagem';
import { Cronometro } from './faixas/Cronometro';
import { EscolhaDaOrigem } from './faixas/EscolhaDaOrigem';
import { MedidasEmLinha } from './faixas/MedidasEmLinha';
import { NotaContada } from './faixas/NotaContada';
import { CobrarONome } from './faixas/CobrarONome';
import { LinkDoDesafio } from './faixas/LinkDoDesafio';
import { OuvirOProprio } from './faixas/OuvirOProprio';
import { BlocoVersus, LinhasDoPlacar } from './faixas/PlacarDoX1';
import { PlacarDaBriga } from './faixas/PlacarDaBriga';
import { ApagarMeuArroto } from './faixas/ApagarMeuArroto';
import { MenuDoJogo } from './faixas/MenuDoJogo';
import { TocarArroto } from './faixas/TocarArroto';
import { GatilhoDeMicrofone } from './faixas/GatilhoDeMicrofone';
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
    O que a tela tem a dizer sobre a última tentativa de compartilhar.

    `null` na maior parte do tempo, e é isso que se quer: mandou, apareceu a
    folha do sistema e acabou. Só ganha texto quando o navegador não deu conta
    — e aí a frase diz o que REALMENTE aconteceu, nunca "compartilhado!".
  */
  const [avisoDoCompartilhar, setAvisoDoCompartilhar] = useState<string | null>(null);

  /*
    QUAL PROVOCAÇÃO VAI NA IMAGEM — índice, não texto.

    Estado de tela e nada além disso: não vai pro banco, não vira RPC e não
    sobrevive a recarregar. Guardar o índice em vez da frase escolhida é o que
    impede a lista e a escolha de discordarem quando a frase do juiz muda.
  */
  const [indiceDaProvocacao, setIndiceDaProvocacao] = useState(0);

  /*
    ESTE APARELHO SABE MANDAR ARQUIVO?

    Perguntado uma vez, antes de a tela prometer qualquer coisa. Onde a
    resposta é `false` o botão continua mandando texto e link — como já faz
    hoje — e **nada na tela fala em imagem**: sem cartão montado, sem linha de
    provocação, sem `Trocar`. Botão que promete o que não entrega é o que a
    gente combinou de não ter.
  */
  const sabeMandarImagem = useMemo(
    () => dependencias.compartilhamento.sabeMandarImagem(),
    [dependencias],
  );

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
  const [menuAberto, setMenuAberto] = useState(false);
  /* Está revanchando? Muda o que o RESULT faz com a nota. */
  const revanchando = useRef(false);

  /*
    A CONFERIDA É UM MOMENTO, NÃO UM ESTADO (`ARENA.md`, `RECORDING`).

    Entre o PARAR e a pergunta de origem o jogo confere duas coisas — veio som?
    foi arroto? — e a segunda pode levar segundos. Sem isto, a pessoa toca em
    PARAR e fica olhando um botão PARAR que não faz mais nada, achando que o
    toque não pegou.

    A Arena continua em RECORDING: o HUD segue escondido e as faixas não
    remontam. O que muda é o CTA sumir e a Bolha segurar o que acabou de sair.
  */
  const [conferindo, setConferindo] = useState(false);
  const [gritoDaConferida, setGritoDaConferida] = useState<string>(CONFERINDO[0]);

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
        /*
          `VERSUS` É "ALGUÉM TE CHAMOU" — e só isso.

          O link é o mesmo para os dois lados da briga, então quem abre também é
          quem mandou: conferindo se foi, voltando pelo histórico do navegador,
          abrindo o próprio zap. Mandando todo mundo para o `VERSUS`, o jogo
          dizia "fulano chamou você" tocando o arroto DA PRÓPRIA PESSOA, com o
          rótulo "o arroto dele", e convidava ela a responder a si mesma.

          Round aberto por mim, ou nenhum round aberto, é `SCOREBOARD` — que já
          sabe dizer "Mandou. Agora é ele." e já tira o botão de arrotar.
        */
        const roundAberto = abertura.desafio.placar.roundAberto;
        if (roundAberto?.deQuem === 'dele') {
          setProvocacao(escolherFala(PROVOCACOES, null, sorteio));
          setSituacao({ estado: 'VERSUS', desafio: abertura.desafio });
          return;
        }

        setSituacao({ estado: 'SCOREBOARD', desafio: abertura.desafio });
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
    setGritoDaConferida((anterior) => escolherFala(CONFERINDO, anterior, sorteio));
    setConferindo(true);

    const resultado = await dependencias.captura.parar();

    if (!ehAudio(resultado)) {
      setConferindo(false);
      despachar({ tipo: 'DEU_RUIM_NA_GRAVACAO' });
      return;
    }

    /*
      A CONFERIDA DA SAÍDA, AGORA INTEIRA (`ARENA.md`, `RECORDING`).

      Duas perguntas, nesta ordem: veio som? e aquilo foi arroto? Ninguém
      escolhe de onde veio para depois descobrir que não valeu.

      A primeira é do núcleo, com o que a plataforma mediu. A segunda é do
      detector, e ele responde uma coisa só: posso pontuar isso? Confiança e
      limiar não chegam aqui.
    */
    if (!houveSom(resultado.resumo)) {
      setConferindo(false);
      despachar({ tipo: 'PAROU_SEM_SOM' });
      return;
    }

    if (!(await dependencias.detector.podePontuar(resultado))) {
      setConferindo(false);
      despachar({ tipo: 'NAO_EH_ARROTO' });
      return;
    }

    audio.current = resultado;
    setConferindo(false);
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
        dependencias.pontuador.pontuar(gravado, alvo.tipo),
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

      /*
        O MODELO COMEÇA A BAIXAR AGORA, junto com a gravação. São 16 MB: baixar
        só na hora de julgar colocaria a espera inteira exatamente onde o
        `ARENA.md` proíbe ficar preso. Não espera e não trata erro — se não
        chegar, a nota passa.
      */
      dependencias.detector.preparar();

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
    /* Arroto novo, juiz novo: a provocação volta a ser a reação da tela. */
    setIndiceDaProvocacao(0);
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
    async (link: string, textos?: { titulo: string; texto: string }) => {
      /*
        A folha do sistema quando existir; onde ela não existir, sobra copiar —
        que já está na tela logo acima. Nada de prometer o que o navegador não
        faz.

        SEM `elementId`: o X1 não tem cartão para virar imagem. Isto passava um
        id inventado esperando que o adaptador estourasse e caísse no texto —
        e ele não caía: voltava `falhou` e a folha nunca abria. O botão não
        fazia nada, e ninguém via porque o retorno era ignorado aqui.
      */
      const resultado = await dependencias.compartilhamento.compartilhar({
        url: link,
        /*
          Do placar sai o PLACAR — "GIAM 4 × 3 GUINHO". Quem manda o link de
          uma briga que já tem rounds não está chamando ninguém pro X1: está
          cutucando. Do `CHALLENGE`, onde a briga ainda não existe, continua
          saindo a chamada de sempre.
        */
        titulo: textos?.titulo ?? 'Te chamei pro X1 no Auê',
        texto: textos?.texto ?? 'Bati essa. Duvido você bater.',
      });

      /* Desistir não é falha. Copiar já está na tela, logo acima. */
      if (!resultado.ok && resultado.motivo === 'falhou') {
        setAvisoDoCompartilhar(NAO_DEU_PRA_COMPARTILHAR);
      }
    },
    [dependencias],
  );

  /**
   * A provocação que está valendo agora — a mesma na linha, na imagem e no
   * texto. Um lugar só, para os três não terem como discordar.
   */
  const provocacaoEscolhida = useMemo(() => {
    /*
      Aparelho que não manda arquivo não tem escolha nenhuma para mostrar — e
      por isso o texto dele também não muda: continua sendo o de hoje, com a
      provocação de sempre. A #101 segue funcionando lá exatamente igual.
    */
    if (situacao.estado !== 'RESULT' || !sabeMandarImagem) return '';
    const lista = provocacoesDaImagem(situacao.nota.frase);
    return lista[indiceDaProvocacao % lista.length];
  }, [situacao, indiceDaProvocacao, sabeMandarImagem]);

  /**
   * COMPARTILHAR a nota — a alternativa do `RESULT` (`ARENA.md`).
   *
   * NÃO CRIA BATALHA. É a diferença que o jogador precisa poder confiar: o X1
   * começa uma briga e gera link de desafio; isto aqui só mostra o que ele fez.
   * Por isso não chama `desafios.criar` nem cobra nome.
   *
   * O link que viaja é o endereço do jogo. Quem quer que o link volte para uma
   * batalha usa o X1 — e é lá que o link de batalha nasce.
   */
  const compartilharANota = useCallback(async () => {
    if (situacao.estado !== 'RESULT') return;

    const { titulo, texto } = textoDoCompartilhamento({
      notaEscrita: formatarNota(situacao.nota.nota),
      classificacao: situacao.nota.classificacao,
      /* A MESMA frase que está na tela. Sortear outra faria o jogo se contradizer. */
      frase: situacao.nota.frase,
      /*
        E A MESMA PROVOCAÇÃO QUE ESTÁ NA LINHA. O que a pessoa leu na tela é o
        que sai na imagem e no texto — se divergissem, o `Trocar` viraria
        enfeite.
      */
      provocacao: provocacaoEscolhida || undefined,
    });

    setAvisoDoCompartilhar(null);

    /*
      O endereço do jogo, explícito. O adaptador cairia nele sozinho, mas o
      caminho de copiar aqui embaixo precisa do MESMO valor — e derivar duas
      vezes é como dois lugares passam a discordar.
    */
    const resultado = await dependencias.compartilhamento.compartilhar({
      /*
        A IMAGEM SÓ É PEDIDA ONDE O APARELHO SABE MANDAR ARQUIVO. Onde não
        sabe, nem o cartão foi montado — pedir aqui seria falhar de propósito.
      */
      elementId: sabeMandarImagem ? ID_DO_CARTAO : undefined,
      /*
        E quando ela é pedida, ou vai imagem ou é falha. Sem texto escondido no
        lugar dela: a pessoa apertou para mandar a nota.
      */
      exigirImagem: sabeMandarImagem,
      url: ORIGEM_CANONICA,
      titulo,
      texto,
    });

    if (resultado.ok) return;

    /* Fechou a folha sem escolher. Não é erro, e a tela não acusa nada. */
    if (resultado.motivo === 'cancelado') return;

    /*
      Navegador sem folha de compartilhamento: sobra copiar, e a tela diz que
      COPIOU — nunca que compartilhou. Um "pronto!" mentiroso faz a pessoa ir
      ao grupo achando que mandou.
    */
    if (resultado.motivo === 'indisponivel') {
      const deu = await dependencias.compartilhamento.copiar(`${texto} ${ORIGEM_CANONICA}`);
      setAvisoDoCompartilhar(deu ? COPIEI_O_LINK : NEM_COPIAR_DEU);
      return;
    }

    setAvisoDoCompartilhar(NAO_DEU_PRA_COMPARTILHAR);
  }, [dependencias, provocacaoEscolhida, sabeMandarImagem, situacao]);

  /** Roda a lista de provocações. Chegou no fim, volta pra reação do juiz. */
  const trocarAProvocacao = useCallback(() => {
    if (situacao.estado !== 'RESULT') return;
    const quantas = provocacoesDaImagem(situacao.nota.frase).length;
    setIndiceDaProvocacao((atual) => proximaProvocacao(atual, quantas));
  }, [situacao]);

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

  /** "Revanche" — a mesma disputa continuando. */
  const revanchar = useCallback(async () => {
    if (situacao.estado !== 'SCOREBOARD') return;
    codigoDaDisputa.current = situacao.desafio.codigo;
    revanchando.current = true;
    audio.current = null;
    origemEscolhida.current = null;
    await abrirOMicrofoneEGravar({ tipo: 'REVANCHE' });
    setGritoDaGravacao((anterior) => escolherFala(GRAVANDO_REVANCHE, anterior, sorteio));
  }, [abrirOMicrofoneEGravar, situacao, sorteio]);

  /**
   * Mandar a revanche.
   *
   * Vai por um caminho próprio no servidor, que **abre um round novo ou fecha o
   * que o outro deixou aberto**. Quem escolhe entre as duas coisas é a RPC — a
   * Arena manda o arroto e lê o que aconteceu.
   */
  const mandarARevanche = useCallback(
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
      const resposta = await dependencias.desafios.revanchar({
        codigo,
        nota: situacao.nota,
        origem: alvo.tipo,
        audio: gravado,
        nome,
      });
      setEnviandoDesafio(false);
      setCobrandoNome(false);

      if (!resposta.ok) {
        /*
          TETO DE ROUNDS NÃO É ERRO, e o `ARENA.md` não tem caso de erro para
          ele. A briga continua existindo: a Arena volta ao placar, que já diz
          "Cinquenta rounds. Chega, porra." e não oferece mais o botão.

          Só dá para voltar lendo a briga de novo — o que a Arena tem na mão
          neste ponto é a nota, não o placar. Se nem isso responder, aí sim é
          falta de rede.
        */
        if (resposta.motivo === 'limiteDeRounds') {
          const briga = await dependencias.desafios.abrir(codigo);
          audio.current = null;
          revanchando.current = false;
          if (briga.ok) {
            despachar({ tipo: 'REVANCHE_ENVIADA', desafio: briga.desafio });
            return;
          }
          despachar({ tipo: 'DESAFIO_FALHOU', caso: 'semRede' });
          return;
        }

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

      audio.current = null;
      revanchando.current = false;
      /*
        O que aconteceu — abriu, fechou ou já era meu — não vira aviso separado:
        o placar já conta a história. Abriu, ele diz que falta o outro; fechou,
        ele mostra o round e a vitória. Um segundo texto por cima seria o jogo
        dizendo a mesma coisa duas vezes.
      */
      despachar({ tipo: 'REVANCHE_ENVIADA', desafio: resposta.desafio });
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

  const apagarArroto = useCallback(
    (resultadoId: string) => dependencias.desafios.apagarMeuArroto(resultadoId),
    [dependencias],
  );

  /*
    APAGAR EM LOTE NÃO PODE MENTIR NO "TENTA DE NOVO".

    O placar mostra só o último round, então os meus arrotos dos rounds
    anteriores só têm este caminho para sair do servidor. Cada um sai numa
    chamada, e o que já saiu não volta: se a terceira falha, as duas primeiras
    continuam apagadas. Guardo o que faltou para o retry não pedir de novo o
    que já foi — pedir duas vezes daria falha eterna numa tela que só sabe
    dizer "não consegui".
  */
  const faltaApagar = useRef<{ chave: string; pendentes: string[] } | null>(null);

  const apagarOsMeusAntigos = useCallback(
    async (resultadoIds: readonly string[]): Promise<'apagado' | 'naoDeu'> => {
      const chave = resultadoIds.join('|');
      const anterior = faltaApagar.current;
      const pendentes = anterior?.chave === chave ? anterior.pendentes : [...resultadoIds];

      const sobraram: string[] = [];
      for (const resultadoId of pendentes) {
        const resposta = await dependencias.desafios.apagarMeuArroto(resultadoId);
        if (resposta !== 'apagado') sobraram.push(resultadoId);
      }

      faltaApagar.current = sobraram.length > 0 ? { chave, pendentes: sobraram } : null;
      return sobraram.length > 0 ? 'naoDeu' : 'apagado';
    },
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

      case 'REMATCH':
      case 'RECORDING':
        if (conferindo) {
          return {
            reacao: <h1 className="grito">{gritoDaConferida}</h1>,
            /*
              Sem CTA e sem barra de progresso. O `ARENA.md` proíbe inventar
              progresso para uma espera que quase sempre é curta.
            */
            acao: null,
          };
        }
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
                O QUE VAI NA IMAGEM, ESCRITO ANTES DE MANDAR.

                Sem esta linha, trocar a provocação seria trocar às cegas uma
                coisa que a pessoa nunca viu. Ela já vem preenchida com a
                reação que está aí em cima — quem não liga, ignora.

                Só existe onde o aparelho sabe mandar arquivo: onde não sabe,
                não há imagem, e falar de provocação seria prometer o que não
                sai.
              */}
              {sabeMandarImagem ? (
                <p className="linha-da-provocacao">
                  <span className="rotulo-da-provocacao">{VAI_COM}</span>{' '}
                  <span className="provocacao-escolhida">{provocacaoEscolhida}</span>
                  <button
                    type="button"
                    className="botao-trocar"
                    onClick={trocarAProvocacao}
                  >
                    {TROCAR}
                  </button>
                </p>
              ) : null}
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
              {/*
                COMPARTILHAR é a alternativa que o `ARENA.md` lista no RESULT e
                que faltava desde que o estado foi construído. Discreto de
                propósito: o jogo empurra para a briga, mas quem só quer mostrar
                a nota também precisa de saída — é assim que o Auê sai daqui
                para fora sem obrigar ninguém a desafiar.

                Vale inclusive para quem está respondendo a um desafio: ver o
                estrago e mostrar o estrago são coisas diferentes.
              */}
              <button type="button" className="botao-discreto" onClick={compartilharANota}>
                {COMPARTILHAR}
              </button>
              {codigoDaDisputa.current ? null : (
                <button type="button" className="botao-discreto" onClick={mandarOutro}>
                  {MANDAR_OUTRO}
                </button>
              )}
              {avisoDoCompartilhar ? <p className="comentario">{avisoDoCompartilhar}</p> : null}
            </>
          ),
        };

      case 'VERSUS': {
        /*
          O ARROTO QUE TOCA É O DO ROUND ABERTO, não o do round 1.

          Numa briga que já tem cinco rounds, tocar o primeiro arroto seria
          responder a uma provocação de três dias atrás. Sem round aberto — o
          que não deveria acontecer aqui — sobra a primeira rodada.
        */
        const desafiante =
          situacao.desafio.placar.roundAberto?.rodada ?? situacao.desafio.rodadas[0];
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
        const placar = situacao.desafio.placar;
        const roundAberto = placar.roundAberto;
        const ultimo = placar.ultimoRound;

        /*
          QUEM VENCEU O ÚLTIMO ROUND QUEM DIZ É O SERVIDOR. Sem vencedor num
          round que fechou é empate, e inventar um seria roubo aos olhos de quem
          perdeu.
        */
        const minhaDoRound = ultimo.rodadas.find((rodada) => rodada.ehMeu);
        const venci = !!ultimo.vencedorResultadoId
          && minhaDoRound?.resultadoId === ultimo.vencedorResultadoId;

        /*
          CINQUENTA ROUNDS E ACABOU. O botão some antes de o servidor precisar
          recusar — e ele recusa também, se alguém forçar. Fechar o round que já
          está aberto continua valendo: o teto é para ABRIR round novo.
        */
        const noTeto = placar.rounds >= 50 && !roundAberto;

        const eu = placar.lados.find((lado) => lado.ehMeu);
        const ele = placar.lados.find((lado) => !lado.ehMeu);

        /*
          OS MEUS ARROTOS DOS ROUNDS QUE JÁ PASSARAM.

          A tela mostra só o último round, e é isso mesmo. Mas o arroto do round
          1 continua no servidor depois que o round 2 abre — e sem isto aqui ele
          ficaria sem nenhum lugar no jogo onde a pessoa pudesse apagar. Não é
          histórico: é um botão só, com a conta do que sai.
        */
        const noUltimoRound = new Set(ultimo.rodadas.map((rodada) => rodada.id));
        const meusAntigos = situacao.desafio.rodadas.filter(
          (rodada) => rodada.ehMeu && rodada.audioId && !noUltimoRound.has(rodada.id),
        );

        const grito = roundAberto
          ? roundAberto.deQuem === 'dele'
            ? faltaTu(roundAberto.rodada.nome, formatarNota(roundAberto.rodada.nota))
            : MANDOU_FALTA_ELE
          : noTeto
            ? CHEGA
            : !ultimo.vencedorResultadoId
              ? EMPATOU
              : venci
                ? GANHOU[0]
                : PERDEU[0];

        const comentario = roundAberto
          ? roundAberto.deQuem === 'dele'
            ? FALTA_TU_COMENTARIO
            : MANDOU_COMENTARIO
          : noTeto
            ? CHEGA_COMENTARIO
            : !ultimo.vencedorResultadoId
              ? EMPATOU_COMENTARIO
              : venci
                ? GANHOU_COMENTARIO
                : PERDEU_COMENTARIO;

        const mandarOPlacar = () =>
          mandarODesafio(
            situacao.desafio.link,
            eu && ele
              ? textoDoPlacar({
                  eu: { nome: eu.nome, vitorias: eu.vitorias },
                  ele: { nome: ele.nome, vitorias: ele.vitorias },
                })
              : undefined,
          );

        return {
          reacao: (
            <>
              {/*
                `role="status"`: a fala do round muda embaixo de quem já está na
                tela — fechou, abriu, o outro respondeu. Quem usa leitor de tela
                precisa ouvir isso sem ir caçar.
              */}
              <h1 className="grito" role="status">
                {grito}
              </h1>
              {/*
                AS FALAS TERMINAM EMPURRANDO PARA A REVANCHE OU PARA A CUTUCADA,
                ganhando ou perdendo — é o que o `ARENA.md` sempre pediu.
              */}
              <p className="comentario">{comentario}</p>
              {/*
                O ARROTO DELE TOCA AQUI quando o round é dele: é o mesmo player
                do `VERSUS`, na mesma função — ouvir antes de responder.
              */}
              {roundAberto?.deQuem === 'dele' ? (
                <TocarArroto
                  rotulo={O_ARROTO_DELE}
                  audioId={roundAberto.rodada.audioId}
                  motivoSemAudio={roundAberto.rodada.motivoSemAudio}
                  buscarEndereco={buscarEndereco}
                />
              ) : null}
              {/* SÓ O ÚLTIMO ROUND. Histórico de round não existe nesta tela. */}
              <LinhasDoPlacar
                rodadas={ultimo.rodadas}
                buscarEndereco={buscarEndereco}
                onApagar={apagarArroto}
              />
              {/*
                O botão dos rounds anteriores só aparece quando existe o que
                apagar. Botão que não faz nada é enfeite, e enfeite em tela de
                privacidade é pior: ensina a pessoa que apertar ali não resolve.
              */}
              {meusAntigos.length > 0 ? (
                <ApagarMeuArroto
                  rotulo={APAGAR_OS_ANTIGOS}
                  comentario={confirmarOsAntigos(meusAntigos.length)}
                  onApagar={() =>
                    apagarOsMeusAntigos(meusAntigos.map((rodada) => rodada.resultadoId))
                  }
                />
              ) : null}
            </>
          ),
          acao: (
            <>
              {/*
                TRÊS AÇÕES DIFERENTES, cada uma com o rótulo que ela já tem no
                jogo — não é o mesmo botão trocando de nome.

                Round aberto meu: não existe botão de arrotar. Eu já mandei; a
                única saída honesta é cutucar o outro.
              */}
              {roundAberto?.deQuem === 'meu' || noTeto ? (
                <button type="button" className="botao botao-principal" onClick={mandarOPlacar}>
                  {MANDAR_O_LINK}
                </button>
              ) : (
                <>
                  <button type="button" className="botao botao-principal" onClick={revanchar}>
                    {roundAberto ? AGUENTA_ESSA : REVANCHE}
                  </button>
                  <button type="button" className="botao-discreto" onClick={mandarOPlacar}>
                    {MANDAR_O_LINK}
                  </button>
                </>
              )}
            </>
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
              {/*
                Quem criou o desafio também tem o botão. É o único lugar onde
                ele vai encontrar esse arroto de novo enquanto ninguém
                respondeu — depois disso, é a linha dele no placar.
              */}
              <ApagarMeuArroto
                onApagar={() => apagarArroto(situacao.desafio.resultadoId)}
              />
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

      default: {
        /*
          O ANDAIME SAIU DAQUI, E ISSO É UM MARCO.

          Desde a primeira fatia, todo estado sem cena caía num aviso de obra.
          Com a revanche, os dez estados do `ARENA.md` têm cena — e o
          compilador prova: `situacao` narrowed para `never` neste ponto, o que
          só acontece quando o `switch` cobre a união inteira.

          A atribuição abaixo é o que segura isso: se alguém acrescentar um
          estado novo e esquecer a cena, ela para de compilar.
        */
        const naoDeviaExistir: never = situacao;
        void naoDeviaExistir;
        return { reacao: null, acao: null };
      }
    }
  }, [
    situacao,
    fala,
    gritoDaGravacao,
    conferindo,
    gritoDaConferida,
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
    apagarArroto,
    apagarOsMeusAntigos,
    revanchar,
    encerrarGravacao,
    escolherOrigem,
    mandarOutro,
    mandarODesafio,
    compartilharANota,
    avisoDoCompartilhar,
    sabeMandarImagem,
    provocacaoEscolhida,
    trocarAProvocacao,
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
  const hud =
    situacao.estado === 'RECORDING' ||
    situacao.estado === 'REMATCH' ||
    situacao.estado === 'JUDGING'
      ? 'off'
      : 'on';

  /*
    A NOTA MORA DENTRO DA BOLHA (design system §9.2). Ela não é um número
    colado ao lado: a Bolha se abre e entrega o palco ao número. Por isso o
    palco empilha os dois no mesmo lugar em vez de dividir espaço.
  */
  const modoDaBolha =
    (situacao.estado === 'RECORDING' || situacao.estado === 'REMATCH') && conferindo
      ? 'segurando'
      : situacao.estado === 'RECORDING' || situacao.estado === 'REMATCH'
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
        O BOTÃO DE MENU VOLTOU. Ele saiu na primeira fatia porque abriria uma
        sobreposição que não existia, e botão que não abre nada é mentira na
        tela. Agora ele abre — e é por ele que a política de privacidade e os
        termos ficam alcançáveis de dentro do jogo.
      */}
      {/*
        `inert` QUANDO O TOPO SOME. A faixa continua ocupando altura (senão a
        Bolha saltaria de lugar), então ela some por opacidade — e um controle
        invisível por opacidade continua alcançável pelo teclado e pelo leitor
        de tela. Sem isto, quem navega por teclado tabularia para um botão que
        não está na tela, no meio da gravação.
      */}
      <header className="hud" inert={hud === 'off'}>
        <div className="wordmark">
          Auê<i>!</i>
        </div>
        <button
          type="button"
          className="hud-botao"
          onClick={() => setMenuAberto(true)}
          aria-label={MENU}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <path d="M4 7h16M4 12h16M4 17h10" />
          </svg>
        </button>
      </header>

      <section className="palco">
        {/*
          No placar a Bolha sai e entram o PLACAR DA BRIGA e o último round
          (`ARENA.md`, SCOREBOARD). O placar de vitórias vem primeiro: a
          primeira coisa que a pessoa lê é quem tá ganhando, não quem deu o
          maior arroto da noite.
        */}
        {situacao.estado === 'SCOREBOARD' ? (
          <div className="palco-do-placar">
            <PlacarDaBriga placar={situacao.desafio.placar} />
            <BlocoVersus desafio={situacao.desafio} />
          </div>
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
        O CARTÃO QUE VIRA IMAGEM. Fora da vista, montado só no `RESULT` e só
        onde o aparelho sabe mandar arquivo — em aparelho que não sabe ele não
        existe, porque a imagem também não vai existir.

        Não é sobreposição e não é estado: é um nó para o adaptador fotografar.
        `aria-hidden` e `inert` moram no próprio componente.
      */}
      {situacao.estado === 'RESULT' && sabeMandarImagem ? (
        <CartaoDaImagem
          notaEscrita={formatarNota(situacao.nota.nota)}
          nota={situacao.nota.nota}
          provocacao={provocacaoEscolhida}
        />
      ) : null}

      {/*
        A ASSINATURA PINTA POR CIMA e volta — não é estado (`ARENA.md` §1). A
        Arena continua montada atrás, com a nota no lugar.
      */}
      {menuAberto ? <MenuDoJogo onFechar={() => setMenuAberto(false)} /> : null}

      {cobrandoNome ? (
        <CobrarONome
          ocupado={enviandoDesafio}
          onConfirmar={
            revanchando.current
              ? mandarARevanche
              : codigoDaDisputa.current
                ? responderODesafio
                : criarODesafio
          }
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
