import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { CHAVES } from '../portas/armazenamento';
import type { AudioCapturado } from '../portas/captura';
import type { Nota } from '../portas/pontuacao';
import type { AlvoDeOrigem } from '../nucleo/origem/origens';
import {
  JULGANDO,
  JULGANDO_COMENTARIO,
  JULGANDO_DEMORANDO,
  MANDAR_OUTRO,
  PERGUNTAS_DE_ORIGEM,
  ROTULO_DA_NOTA,
} from '../nucleo/fala/julgamento';
import {
  COMPARTILHAR,
  COPIEI_O_LINK,
  NAO_DEU_PRA_COMPARTILHAR,
  TROCAR,
  VAI_COM,
  provocacoesDaImagem,
  proximaProvocacao,
  textoDoCompartilhamento,
  textoDoPlacar,
} from '../nucleo/fala/compartilhamento';
import {
  LIMIAR_DA_ESPERA_LONGA_MS,
  TETO_DA_ANALISE_MS,
  esperaQueFalta,
} from '../nucleo/julgamento/tempo';
import {
  type FaseDaRevelacao,
  FASE_FINAL,
  jaChegouEm,
  passosDaRevelacao,
} from '../nucleo/arena/revelacao';
import {
  type NumeroDaContagem,
  NUMEROS_DA_CONTAGEM,
  DURACAO_DO_TICK_MS,
  duracaoDaContagemMs,
  passosDaContagem,
} from '../nucleo/arena/contagemDaRevanche';
import { anim, bandeira } from './motion/anim';
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
/*
  As duas coisas do merge: a #134 trouxe o apagar os antigos, e a faxina mudou o
  `prazoDaBatalha` de lugar. O caminho novo é o que vale — `features/battle` é
  território que esta issue está esvaziando.
*/
import { APAGAR_OS_ANTIGOS, MENU, confirmarOsAntigos } from '../nucleo/fala/privacidade';
import { fraseDoPrazo } from '../nucleo/prazo/prazoDaBatalha';
import {
  AGUENTA_ESSA,
  CHAMOU_VOCE,
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
  revancheContra,
} from '../nucleo/fala/versus';
import {
  ACABOU,
  ACABOU_CONFIRMA,
  ACABOU_SIM,
  ACABOU_VOLTA,
  CHAMAR_A_MESA,
  FECHAR_A_RODA_CONFIRMA,
  MANDA,
  MANDAR_O_PODIO,
  NAO_ABRIU_A_RODA,
  PASSA_O_CELULAR,
  PODIO_COMENTARIO,
  PODIO_EMPATE,
  PODIO_EMPATE_COMENTARIO,
  VER_O_PODIO,
  humilhouAMesa,
  passaOCelular,
  turnoNaoEntrou,
} from '../nucleo/fala/roda';
import { calcularTurno } from '../nucleo/disputa/turnos';
import { campeoesDoPodio, montarPodio } from '../nucleo/disputa/podio';
import type { LocalDaRoda, Roda } from '../portas/disputaLocal';
import { FLAGS } from '../shared/flags';
import { prefereMovimentoReduzido } from '../plataforma/web/preferencias';
import { SITUACAO_INICIAL, transicao } from '../nucleo/arena/maquina';
import type { EventoDaArena, SituacaoDaArena } from '../nucleo/arena/estados';
import {
  DEIXA_QUIETO,
  DICA_DO_MICROFONE,
  ROTULO_DA_NOTA_NO_ERRO,
  VER_MINHA_NOTA,
  falaDoErro,
  pesoDoErro,
} from '../nucleo/fala/erros';
import { CONFERINDO, GRAVANDO } from '../nucleo/fala/gravacao';
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
import { BlocoVersus, LinhasDoPlacar, NotaPraBater } from './faixas/PlacarDoX1';
import { PlacarDaBriga } from './faixas/PlacarDaBriga';
import { ApagarMeuArroto } from './faixas/ApagarMeuArroto';
import { MenuDoJogo } from './faixas/MenuDoJogo';
import { TocarArroto } from './faixas/TocarArroto';
import { GatilhoDeMicrofone } from './faixas/GatilhoDeMicrofone';
import { AbrirARoda } from './faixas/AbrirARoda';
import { DeQuemEhAVez } from './faixas/DeQuemEhAVez';
import { ID_DO_PODIO, PodioDaMesa } from './faixas/PodioDaMesa';
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
    A FALA DO PLACAR QUANDO O ROUND FECHA COM DONO.

    Sorteada de novo só quando o round MUDA de fechado para fechado — nunca a
    cada render. Sem isto, apagar um arroto antigo ou fechar o menu trocaria a
    frase debaixo de quem só olhou pra tela (issue #185).
  */
  const [gritoDoPlacar, setGritoDoPlacar] = useState<string>(GANHOU[0]);
  const [comentarioDoPlacar, setComentarioDoPlacar] = useState<string>(GANHOU_COMENTARIO[0]);
  /*
    A SEGUNDA FALA DA ESPERA — e ela só existe se o relógio DE VERDADE passar do
    limiar (`nucleo/julgamento/tempo.ts`).

    `null` na maior parte das partidas, porque a análise costuma voltar antes.
    Isso é o ponto: nada aqui inventa etapa, porcentagem ou barra. O jogo fica
    calado enquanto a espera é curta, e só diz uma segunda coisa quando ficar
    calado começaria a parecer travamento.
  */
  const [esperaLonga, setEsperaLonga] = useState<string | null>(null);

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
  /*
    ONDE A REVELAÇÃO ESTÁ — momento dentro do `RESULT`, não estado da máquina.

    A ordem é requisito: nota → reação → comentário → medidas → X1. Enquanto a
    fase é `nota`, o número está sozinho na tela e **nada mais se mexe** — é o
    payoff respirando. O X1 é o último a ganhar presença porque, até ali, ainda
    tem coisa para ler.
  */
  const [faseDaRevelacao, setFaseDaRevelacao] = useState<FaseDaRevelacao>('nota');
  /* Só a primeira revelação da sessão dispara a cascata e o `pop`. */
  const [notaChegou, setNotaChegou] = useState(false);
  /*
    "ESTA revelação tem teatro?" — decidido ao entrar no `RESULT` e congelado
    ali.

    Perguntar `!jaRevelou.current` na hora de renderizar parece a mesma coisa e
    não é: a resposta MUDAVA no meio da revelação, porque quem marca o `ref` é
    o fim da contagem. A contagem então recomeçava já sem teatro, chamava o
    `onChegou` de novo e a cascata inteira entrava de uma vez — a revelação
    aparecia pronta na primeira nota da sessão, que é exatamente o defeito que
    esta fatia veio matar.
  */
  const [revelacaoComTeatro, setRevelacaoComTeatro] = useState(false);
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
  /** O molde de "fulano te chamou" — sorteado uma vez, ao entrar no `VERSUS`. */
  const [moldeDaChamada, setMoldeDaChamada] = useState<string>(CHAMOU_VOCE[0]);
  const [menuAberto, setMenuAberto] = useState(false);
  /* Está revanchando? Muda o que o RESULT faz com a nota. */
  const revanchando = useRef(false);
  /* Contra quem é esta revanche — lido do placar no toque, para a linha fixa da cerimônia. */
  const rivalDaRevanche = useRef<string>('');
  /*
    A CERIMÔNIA DO 3…2…1, MOMENTO DENTRO DO `REMATCH` (issue #183).
    Não é estado da Arena — é irmã da cascata do `RESULT`
    (`nucleo/arena/revelacao.ts`). Enquanto ela dura a Bolha fica escondida e
    a faixa de ação não existe: nada na tela responde a toque.
  */
  const [contandoARevanche, setContandoARevanche] = useState(false);
  const [numeroDaContagem, setNumeroDaContagem] = useState<NumeroDaContagem>(
    NUMEROS_DA_CONTAGEM[0],
  );

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

  /* ─────────────────────────── A RODA ───────────────────────────

    A disputa com um aparelho só, passando de mão em mão. Ela NÃO cria estado
    nenhum: é uma sobreposição para montar a mesa mais momentos dentro de
    estados que já existem (`ARENA.md` §2, "A roda").

    De quem é a vez e em que round a mesa está NÃO ficam guardados aqui — são
    derivados dos arrotos que o servidor conhece. Um ponteiro local se
    dessincronizaria no primeiro erro de rede, e a tela passaria a vez de quem
    não gravou com o telefone na mão de alguém.
  */
  const [roda, setRoda] = useState<Roda | null>(null);
  /*
    A MESMA RODA, ALCANÇÁVEL DE DENTRO DAS PROMESSAS.

    Gravar um turno leva segundos e atravessa dois `await`. Ler `roda` do
    fechamento devolveria a mesa de antes do upload anterior — e a vez sairia
    errada. O `ref` é a versão que os caminhos assíncronos leem.
  */
  const rodaAtual = useRef<Roda | null>(null);
  const aplicarRoda = useCallback((nova: Roda | null) => {
    rodaAtual.current = nova;
    setRoda(nova);
  }, []);

  const [montandoAMesa, setMontandoAMesa] = useState(false);
  const [abrindoARoda, setAbrindoARoda] = useState(false);
  const [registrandoTurno, setRegistrandoTurno] = useState(false);
  /* Já passou o celular? Muda o que o `RESULT` mostra, sem trocar de estado. */
  const [passouOCelular, setPassouOCelular] = useState(false);
  /* "Acabou essa porra" pede dois toques: o primeiro abre esta pergunta. */
  const [confirmandoOFim, setConfirmandoOFim] = useState(false);
  /* O que o `ERROR` tem a dizer sobre a roda, além do caso genérico. */
  const [avisoDaRoda, setAvisoDaRoda] = useState<string | null>(null);
  /**
   * Quem está gravando agora.
   *
   * Fixado no instante em que o microfone abre, e não lido de novo na hora de
   * subir: entre uma coisa e outra a mesa não muda, e recalcular ali abriria a
   * chance de a nota entrar na linha da pessoa errada.
   */
  const participanteDaVez = useRef<string | null>(null);

  /** De quem é a vez, derivado. `null` quando não há roda aberta. */
  const turno = useMemo(
    () => (roda ? calcularTurno(roda.participantes, roda.arrotos, roda.rounds) : null),
    [roda],
  );

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
          setMoldeDaChamada(escolherFala(CHAMOU_VOCE, null, sorteio));
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

  /*
    A RODA VOLTA AO ABRIR O JOGO (`ARENA.md` §3, reabertura).

    Quinze gravações passando de mão em mão dão tempo de a tela apagar, chegar
    ligação e o navegador matar a aba. O aparelho guarda só o número da mesa; o
    resto vem do servidor. Ou a Arena remonta na vez de quem falta, ou já no
    pódio se a mesa acabou.

    Roda que não existe mais ou venceu: o bilhete é rasgado e o jogo abre no
    `IDLE` limpo. Não se ressuscita mesa morta. Sem rede, o bilhete FICA — o
    problema pode ser o wifi do churrasco, e jogar a mesa fora por causa disso
    custaria as notas de todo mundo.
  */
  useEffect(() => {
    if (!FLAGS.disputaNaArena || codigoDoDesafio) return;

    const codigo = dependencias.armazenamento.ler(CHAVES.roda);
    if (!codigo) return;

    let cancelado = false;

    void (async () => {
      const resposta = await dependencias.disputaLocal.ler(codigo);
      if (cancelado) return;

      if (!resposta.ok) {
        if (resposta.motivo === 'naoExiste') {
          dependencias.armazenamento.apagar(CHAVES.roda);
        }
        return;
      }

      aplicarRoda(resposta.roda);

      const onde = calcularTurno(
        resposta.roda.participantes,
        resposta.roda.arrotos,
        resposta.roda.rounds,
      );
      if (onde.acabou) {
        setSituacao({ estado: 'SCOREBOARD', podio: montarPodio(resposta.roda) });
      }
    })();

    return () => {
      cancelado = true;
    };
  }, [aplicarRoda, codigoDoDesafio, dependencias]);

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
   * O TURNO ENTRA NA RODA ASSIM QUE A NOTA SAI — não no passa-o-celular.
   *
   * O motivo é honestidade: se o registro falhar, a pessoa precisa saber AGORA,
   * enquanto ainda está com o telefone na mão. Deixar para descobrir no toque
   * seguinte colocaria um arroto fantasma na tela e um buraco no pódio.
   *
   * Enquanto isto roda, o botão de passar o celular fica travado. Nada é dito
   * como feito antes de ter sido feito.
   */
  const registrarTurno = useCallback(
    async (nota: Nota, alvo: AlvoDeOrigem, gravado: AudioCapturado): Promise<void> => {
      const mesa = rodaAtual.current;
      const participanteId = participanteDaVez.current;
      if (!mesa || !participanteId) return;

      const quem = mesa.participantes.find((p) => p.id === participanteId);

      setRegistrandoTurno(true);
      const resposta = await dependencias.disputaLocal.gravarTurno({
        codigo: mesa.codigo,
        participanteId,
        nota,
        origem: alvo.tipo,
        audio: gravado,
      });
      setRegistrandoTurno(false);

      if (!resposta.ok) {
        /*
          A roda sumiu do servidor: o bilhete é rasgado e o jogo não ressuscita
          mesa morta. Nos outros casos a mesa continua de pé, e o "tenta de
          novo" devolve a vez para A MESMA PESSOA — ela não gravou, e a vez é
          derivada do que está gravado.
        */
        if (resposta.motivo === 'naoExiste') {
          dependencias.armazenamento.apagar(CHAVES.roda);
          aplicarRoda(null);
        }
        setAvisoDaRoda(turnoNaoEntrou(quem?.nome ?? ''));
        despachar({
          tipo: 'DESAFIO_FALHOU',
          caso:
            resposta.motivo === 'naoExiste'
              ? 'linkExpirado'
              : resposta.motivo === 'semRede' || resposta.motivo === 'semConfiguracao'
                ? 'semRede'
                : 'falhaNaAnalise',
        });
        return;
      }

      aplicarRoda(resposta.roda);
    },
    [aplicarRoda, dependencias, despachar],
  );

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

      /*
        A cascata começa do zero a cada nota. Sem isto, a segunda rodada
        entraria no `RESULT` com tudo já na tela — inclusive o X1, que é o
        último a ganhar presença de propósito.

        Isto ocupou o lugar do `medidasAbertas`: a abertura das medidas virou
        uma fase da cascata, e a bandeira solta não existe mais.
      */
      const comTeatro = !jaRevelou.current;
      setNotaChegou(false);
      setRevelacaoComTeatro(comTeatro);
      setFaseDaRevelacao(comTeatro ? 'nota' : FASE_FINAL);
      setPassouOCelular(false);
      despachar({ tipo: 'JUIZ_FECHOU', nota: veredito.nota });

      /* Na roda, o arroto entra na mesa agora — com a nota já na tela. */
      await registrarTurno(veredito.nota, alvo, gravado);
    },
    [agora, dependencias, despachar, registrarTurno, sorteio],
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
   * Serve os três caminhos que levam a gravar — o ARROTAR do começo, o "Vou
   * mandar outro!" do resultado e a Revanche do placar — porque a sequência é
   * a mesma e ter cópias dela é ter chances de esquecer um passo. O que muda
   * é o evento de sucesso, que é o que a máquina usa para saber de onde a
   * pessoa veio.
   *
   * `adiarRelogio`: só a Revanche usa. O microfone abre no mesmo toque de
   * sempre — isso não muda —, mas o relógio que decide o teto da gravação não
   * pode começar a contar enquanto a cerimônia do 3…2…1 ainda está na tela,
   * senão a contagem comeria tempo de arrotar sem a pessoa saber (issue
   * #183). Quem chama com esta opção liga o próprio `setComecouEm` depois.
   *
   * Devolve se o microfone abriu: quem chama decide o que fazer a seguir só
   * quando a resposta é `true` — com `false` a máquina já foi para `ERROR`.
   */
  const abrirOMicrofoneEGravar = useCallback(
    async (aoConseguir: EventoDaArena, opcoes?: { adiarRelogio?: boolean }): Promise<boolean> => {
      const resposta = await dependencias.captura.pedir();
      if (!resposta.ok) {
        despachar({ tipo: 'MICROFONE_NEGADO' });
        return false;
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
        return false;
      }

      /*
        O MODELO COMEÇA A BAIXAR AGORA, junto com a gravação. São 16 MB: baixar
        só na hora de julgar colocaria a espera inteira exatamente onde o
        `ARENA.md` proíbe ficar preso. Não espera e não trata erro — se não
        chegar, a nota passa.
      */
      dependencias.detector.preparar();

      /*
        O ARROTO ANTERIOR SAI DA MEMÓRIA QUANDO O PRÓXIMO COMEÇA — e não um
        passo antes.

        Limpar no toque parecia igual e não era: microfone negado no "vou
        mandar outro" apagava o arroto que ainda estava valendo, e a nota
        voltava do erro sem áudio para chamar ninguém pro X1. Agora a gravação
        nova precisa ter de fato começado.
      */
      audio.current = null;
      origemEscolhida.current = null;

      /*
        DE QUEM É ESTE ARROTO, FIXADO AQUI. A vez é derivada da mesa que o
        servidor conhece, e é lida uma vez só — no gesto que abriu o microfone.
        Recalcular na hora de subir deixaria a nota entrar na linha errada se a
        mesa tivesse andado no meio.
      */
      const mesa = rodaAtual.current;
      participanteDaVez.current = mesa
        ? (calcularTurno(mesa.participantes, mesa.arrotos, mesa.rounds).daVez?.id ?? null)
        : null;

      encerrando.current = false;
      setGritoDaGravacao((anterior) => escolherFala(GRAVANDO, anterior, sorteio));
      if (!opcoes?.adiarRelogio) {
        setComecouEm(agora());
      }
      despachar(aoConseguir);
      return true;
    },
    [agora, dependencias, despachar, sorteio],
  );

  const pedirMicrofone = useCallback(async () => {
    despachar({ tipo: 'TOCOU_ARROTAR' });
    await abrirOMicrofoneEGravar({ tipo: 'MICROFONE_LIBERADO' });
  }, [abrirOMicrofoneEGravar, despachar]);

  /** "Vou mandar outro!" — direto para a gravação, sem passar pela entrada. */
  const mandarOutro = useCallback(async () => {
    /*
      O ARROTO ANTERIOR NÃO SAI DAQUI. Ele saía, e isso era defeito: o toque
      apagava o áudio ANTES de saber se a gravação nova ia começar. Microfone
      negado no meio deixava a pessoa voltando para uma nota sem áudio por trás,
      e o X1 falhava depois sem dizer por quê. Quem limpa é o começo da gravação
      nova, quando ela realmente começa.

      Arroto novo, juiz novo: a provocação volta a ser a reação da tela.
    */
    setIndiceDaProvocacao(0);
    await abrirOMicrofoneEGravar({ tipo: 'MANDAR_OUTRO' });
  }, [abrirOMicrofoneEGravar]);

  /* ───────────────────── Os gestos da roda ───────────────────── */

  /**
   * Abrir a mesa.
   *
   * Falhou, `ERROR` com saída e **nada foi criado**: ninguém fica achando que a
   * roda começou. A sobreposição fecha junto — deixar ela aberta por cima de um
   * erro é o jeito de a pessoa tocar de novo e criar duas mesas.
   */
  const abrirARoda = useCallback(
    async (nomes: string[], rounds: number, local: LocalDaRoda | null) => {
      setMontandoAMesa(true);
      const resposta = await dependencias.disputaLocal.abrir({ nomes, rounds, local });
      setMontandoAMesa(false);
      setAbrindoARoda(false);

      if (!resposta.ok) {
        setAvisoDaRoda(NAO_ABRIU_A_RODA);
        despachar({
          tipo: 'DESAFIO_FALHOU',
          caso:
            resposta.motivo === 'semRede' || resposta.motivo === 'semConfiguracao'
              ? 'semRede'
              : 'falhaNaAnalise',
        });
        return;
      }

      /*
        O BILHETE COM O NÚMERO DA MESA. Dez caracteres, e nada além disso — as
        notas, os nomes e os rounds sempre moraram no banco. Não deu para
        guardar (Safari privado, armazenamento bloqueado), a roda funciona nesta
        sessão do mesmo jeito: o que se perde é a retomada.
      */
      dependencias.armazenamento.gravar(CHAVES.roda, resposta.roda.codigo);
      aplicarRoda(resposta.roda);
      setPassouOCelular(false);
      setAvisoDaRoda(null);
    },
    [aplicarRoda, dependencias, despachar],
  );

  /** Passa o celular: a nota sai e entra a vez do próximo, no mesmo `RESULT`. */
  const passarOCelular = useCallback(() => {
    audio.current = null;
    origemEscolhida.current = null;
    setPassouOCelular(true);
  }, []);

  /** Ao pódio, com o que existe. */
  const verOPodio = useCallback(() => {
    const mesa = rodaAtual.current;
    if (!mesa) return;
    setConfirmandoOFim(false);
    audio.current = null;
    origemEscolhida.current = null;
    despachar({ tipo: 'VER_O_PODIO', podio: montarPodio(mesa) });
  }, [despachar]);

  /**
   * "Acabou essa porra" — a roda fecha e o jogo volta a esperar alguém arrotar.
   *
   * Serve as duas saídas: a do pódio, que sai por `SCOREBOARD → IDLE`, e a da
   * vez, que já está no `IDLE` e só limpa a mesa. Fechar a mesa a partir da vez
   * NÃO passa pelo pódio, e isso é decisão: chegar lá dali exigiria a seta
   * `IDLE → SCOREBOARD`, e a roda acrescenta uma aresta só à Arena. Quem quer o
   * pódio o alcança do `RESULT`, que é o passo anterior a toda vez que não seja
   * a primeira.
   */
  const acabarARoda = useCallback(() => {
    dependencias.armazenamento.apagar(CHAVES.roda);
    aplicarRoda(null);
    participanteDaVez.current = null;
    setConfirmandoOFim(false);
    setPassouOCelular(false);
    setAvisoDaRoda(null);
    setFala((anterior) => sortearFala(anterior));
    despachar({ tipo: 'ACABOU_A_RODA' });
  }, [aplicarRoda, dependencias, despachar, sortearFala]);

  /**
   * Mandar o pódio para o grupo.
   *
   * É LIGAR, NÃO CONSTRUIR: a porta de compartilhamento já documenta o
   * `podio-card`, e o adaptador web já sabe fotografá-lo. Onde o aparelho não
   * manda arquivo, vai texto e link — e a tela não fala em imagem. Recusou, a
   * tela diz que recusou.
   */
  const mandarOPodio = useCallback(async () => {
    setAvisoDoCompartilhar(null);
    const resultado = await dependencias.compartilhamento.compartilhar({
      elementId: sabeMandarImagem ? ID_DO_PODIO : undefined,
      exigirImagem: sabeMandarImagem,
      url: ORIGEM_CANONICA,
      titulo: 'O pódio do Auê',
      texto: 'Olha a vergonha que deu.',
    });

    if (resultado.ok) return;
    /* Fechou a folha sem escolher. Não é erro, e a tela não acusa nada. */
    if (resultado.motivo === 'cancelado') return;
    setAvisoDoCompartilhar(NAO_DEU_PRA_COMPARTILHAR);
  }, [dependencias, sabeMandarImagem]);

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
      if (deu) {
        setAvisoDoCompartilhar(COPIEI_O_LINK);
        return;
      }
    }

    /*
      NADA SAIU DO APARELHO — e aí vira `ERROR` de verdade, com a nota junto.

      O aviso inline dava a notícia e deixava a pessoa num beco: o `RESULT` não
      tem botão de copiar avulso, então "copia o link na mão" era instrução
      para uma coisa que não estava na tela. Como estado, ela tem as duas
      saídas e a nota continua onde estava.

      Os dois finais que NÃO são erro continuam inline: copiar deu certo (o
      link saiu) e fechar a folha sem escolher (mudou de ideia).
    */
    despachar({ tipo: 'DESAFIO_FALHOU', caso: 'falhaAoCompartilhar' });
  }, [dependencias, despachar, provocacaoEscolhida, sabeMandarImagem, situacao]);

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
    /* Revanche é coisa do X1. O pódio da roda não tem adversário para revanchar. */
    if (situacao.estado !== 'SCOREBOARD' || !('desafio' in situacao)) return;
    codigoDaDisputa.current = situacao.desafio.codigo;
    revanchando.current = true;
    audio.current = null;
    origemEscolhida.current = null;

    /* Contra quem é, para a linha fixa da cerimônia — lido do placar agora. */
    const ele = situacao.desafio.placar.lados.find((lado) => !lado.ehMeu);
    rivalDaRevanche.current = ele?.nome ?? '';

    /*
      O RELÓGIO FICA PRA DEPOIS: o mic abre agora, no mesmo toque, mas o teto
      da gravação só começa a contar quando a cerimônia terminar — a fatia
      abaixo (`contandoARevanche`) chama `setComecouEm` ali.
    */
    const abriu = await abrirOMicrofoneEGravar({ tipo: 'REVANCHE' }, { adiarRelogio: true });
    if (!abriu) return;

    setGritoDaGravacao((anterior) => escolherFala(GRAVANDO_REVANCHE, anterior, sorteio));
    setContandoARevanche(true);
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
    setAvisoDaRoda(null);
    setPassouOCelular(false);
    setFala((anterior) => sortearFala(anterior));
    despachar({ tipo: 'TENTAR_DE_NOVO' });
  }, [despachar, sortearFala]);

  /**
   * "Ver minha nota" — sai do erro de volta para o resultado.
   *
   * O áudio e a origem continuam onde estavam: é a mesma partida, e o X1
   * funciona de novo no toque seguinte. Quem limpa é a volta ao `IDLE` e o
   * começo de uma gravação nova.
   *
   * **E o resultado volta INTEIRO, sem teatro e sem cascata.** Quem abre
   * cascata é o juiz fechando uma nota nova; aqui não tem nota nova, tem a
   * mesma de antes sendo devolvida. Sem isto o erro pode ter mordido a
   * revelação no meio — no upload da roda ele chega antes de a contagem
   * terminar — e a volta cairia num `RESULT` com a faixa de ação ainda por
   * nascer: nota na tela, nenhuma saída, e nada mais para acontecer.
   */
  const voltarPraNota = useCallback(() => {
    setAvisoDoCompartilhar(null);
    setRevelacaoComTeatro(false);
    setFaseDaRevelacao(FASE_FINAL);
    despachar({ tipo: 'VOLTAR_PRA_NOTA' });
  }, [despachar]);

  /*
    "Já arrotou aqui" fica marcado quando a gravação de fato começou — não no
    toque, que pode terminar em permissão negada.
  */
  useEffect(() => {
    if (situacao.estado !== 'RECORDING' || jaJogou.current) return;
    jaJogou.current = dependencias.armazenamento.gravar(CHAVES.jaJogou, '1');
  }, [situacao.estado, dependencias]);

  const nivel = useCallback(() => dependencias.captura.nivelAtual(), [dependencias]);

  /*
    ═══════════════ O MOVIMENTO DA RODADA ═══════════════

    Tudo aqui embaixo é o vocabulário do protótipo canônico ligado nos momentos
    que o design system §13.2 mapeia. Três regras valem para os cinco efeitos:

    1. **todo timer volta no `return`.** Sair do estado no meio da animação não
       pode deixar relógio vivo, e voltar a arrotar não pode acumular
       movimento da rodada anterior (§16 da issue, e é aqui que essa fatia
       tinha mais chance de dar merda);
    2. **o estado do movimento mora em `data-*` na Arena**, e quem decide o que
       fazer com ele é o CSS. O componente não sabe duração de keyframe;
    3. **com movimento reduzido nada dispara** — quem cuida disso é o
       `motion/anim.ts`, num lugar só.
  */
  const arenaRef = useRef<HTMLElement>(null);
  const notaRef = useRef<HTMLDivElement>(null);

  const gravando = situacao.estado === 'RECORDING' || situacao.estado === 'REMATCH';

  /*
    O disparo: um anel de accent sai do centro do palco quando a partida
    começa. Na revanche isso é quando a cerimônia TERMINA — antes disso não é
    a partida começando, é o 3…2…1.
  */
  useEffect(() => {
    if (!gravando || conferindo || contandoARevanche) return;
    return bandeira(arenaRef.current, 'ring', 720);
  }, [gravando, conferindo, contandoARevanche]);

  /*
    A CERIMÔNIA DO 3…2…1 (issue #183).

    O microfone já abriu, no mesmo toque que sempre abriu — quem chamou foi
    `revanchar`, lá em cima. O que este efeito agenda é só a TELA: os números
    entrando um a um e, no fim, a troca para a gravação de verdade — que é a
    hora exata em que o relógio do teto começa a contar (`setComecouEm` só
    roda aqui, nunca antes).
  */
  useEffect(() => {
    if (!contandoARevanche) return;

    const passos = passosDaContagem(prefereMovimentoReduzido());
    if (passos.length === 0) {
      setContandoARevanche(false);
      setComecouEm(agora());
      return;
    }

    setNumeroDaContagem(passos[0]);
    const relogios = passos
      .slice(1)
      .map((numero, indice) =>
        setTimeout(() => setNumeroDaContagem(numero), DURACAO_DO_TICK_MS * (indice + 1)),
      );
    const fim = setTimeout(() => {
      setContandoARevanche(false);
      setComecouEm(agora());
    }, duracaoDaContagemMs(passos));

    return () => {
      relogios.forEach(clearTimeout);
      clearTimeout(fim);
    };
  }, [contandoARevanche, agora]);

  /*
    SAIU DO `REMATCH` NO MEIO DA CERIMÔNIA (a tela sumiu, por exemplo): a
    cerimônia não pode continuar contando para um estado que a Arena já
    deixou — é o mesmo cuidado do parágrafo 1 acima, "todo timer volta no
    `return`". Mudar isto para `false` dispara a limpeza do efeito de cima.
  */
  useEffect(() => {
    if (situacao.estado !== 'REMATCH') setContandoARevanche(false);
  }, [situacao.estado]);

  /*
    A conferida: a Bolha leva o baque e logo depois dá três batidas curtas.
    `snap` primeiro, `tick` em cima dele — é alguém conferindo, não algo
    carregando.
  */
  useEffect(() => {
    if (!conferindo) return;
    /* O nó copiado para variável: na limpeza, o `ref` já pode ter mudado. */
    const arena = arenaRef.current;
    const desfazerSnap = bandeira(arena, 'snap', 460);
    let desfazerTick: () => void = () => {};
    const atraso = setTimeout(() => {
      desfazerTick = bandeira(arena, 'tick', 900);
    }, 260);
    return () => {
      desfazerSnap();
      clearTimeout(atraso);
      desfazerTick();
    };
  }, [conferindo]);

  /* A recusa: a Bolha nega com a cabeça antes de qualquer texto entrar. */
  const recusou =
    situacao.estado === 'ERROR' && (situacao.caso === 'semSom' || situacao.caso === 'naoEhArroto');
  useEffect(() => {
    if (!recusou) return;
    return bandeira(arenaRef.current, 'shake', 340);
  }, [recusou]);

  /*
    A ESPERA QUE ESTICOU.

    O relógio é de verdade: se a análise voltar antes do limiar, o efeito é
    limpo e a segunda fala nunca existe. Nada de contar etapa nem de fingir
    progresso — o `ARENA.md` proíbe as duas coisas, e um `setTimeout` que
    dispara sozinho seria progresso inventado com outro nome.
  */
  useEffect(() => {
    if (situacao.estado !== 'JUDGING') {
      setEsperaLonga(null);
      return;
    }
    const id = setTimeout(() => {
      setEsperaLonga((anterior) => escolherFala(JULGANDO_DEMORANDO, anterior, sorteio));
    }, LIMIAR_DA_ESPERA_LONGA_MS);
    return () => clearTimeout(id);
  }, [situacao.estado, sorteio]);

  /*
    O `pop` DO NÚMERO SAI JUNTO COM A CONTAGEM, NÃO DEPOIS DELA.

    O keyframe `pop` começa em `opacity: 0; scale(.68)`. Disparado no fim da
    contagem, ele apagava o `.palco-nota` inteiro — rótulo junto — no exato
    quadro em que o número chegava no valor final: um piscão, não uma
    revelação. O DESIGN §9.3 e §13.2 são explícitos que os dois andam juntos
    (`pop` 560ms **+** contagem 900ms), e é o que o `RESULT_REVEAL` do
    protótipo faz.

    Por isso ele mora aqui, na ENTRADA do `RESULT`: o mesmo commit que monta a
    `NotaContada` e começa a contar é o que solta o `pop`. O `anim` devolve o
    desfazer, então sair do `RESULT` antes dos 560ms não deixa relógio solto.
  */
  useEffect(() => {
    if (situacao.estado !== 'RESULT' || !revelacaoComTeatro) return;
    return anim(notaRef.current, 'pop', 560);
  }, [situacao.estado, revelacaoComTeatro]);

  /*
    A CASCATA DO RESULTADO.

    Só começa quando a contagem TERMINA — não num tempo fixo depois de entrar
    no estado. Num aparelho lento o número demora mais para subir, e amarrar no
    relógio do estado faria as medidas aparecerem por cima de uma nota que
    ainda está contando.
  */
  useEffect(() => {
    if (situacao.estado !== 'RESULT' || !notaChegou) return;

    const passos = passosDaRevelacao(prefereMovimentoReduzido());
    if (passos.length === 0) {
      setFaseDaRevelacao(FASE_FINAL);
      return;
    }

    const relogios = passos.map((passo) =>
      setTimeout(() => setFaseDaRevelacao(passo.fase), passo.atrasoMs),
    );
    return () => relogios.forEach(clearTimeout);
  }, [situacao.estado, notaChegou]);

  /*
    O PLACAR SÓ SORTEIA FRASE NOVA QUANDO O ROUND FECHA — NUNCA A CADA RENDER.

    `chaveDoRoundFechado` e `resultadoDoRoundFechado` são primitivos derivados
    do placar: o valor só muda quando o round que fechou é outro (ids de
    resultado diferentes) ou quando quem venceu muda. Reabrir o menu, apagar
    um arroto antigo, qualquer redesenho que não mude essas duas coisas —
    `Object.is` bate igual e o efeito abaixo nem roda (issue #185).
  */
  const chaveDoRoundFechado = useMemo(() => {
    if (situacao.estado !== 'SCOREBOARD' || !('desafio' in situacao)) return null;
    const { roundAberto, ultimoRound } = situacao.desafio.placar;
    if (roundAberto) return null;
    return ultimoRound.rodadas.map((rodada) => rodada.resultadoId).join('|');
  }, [situacao]);

  const resultadoDoRoundFechado = useMemo(() => {
    if (situacao.estado !== 'SCOREBOARD' || !('desafio' in situacao)) return null;
    const { placar } = situacao.desafio;
    if (placar.roundAberto) return null;

    const { ultimoRound } = placar;
    if (!ultimoRound.vencedorResultadoId) return 'empatou';

    const minha = ultimoRound.rodadas.find((rodada) => rodada.ehMeu);
    return minha?.resultadoId === ultimoRound.vencedorResultadoId ? 'venci' : 'perdi';
  }, [situacao]);

  useEffect(() => {
    if (!chaveDoRoundFechado) return;
    if (resultadoDoRoundFechado !== 'venci' && resultadoDoRoundFechado !== 'perdi') return;

    const pool = resultadoDoRoundFechado === 'venci' ? GANHOU : PERDEU;
    const poolComentario = resultadoDoRoundFechado === 'venci' ? GANHOU_COMENTARIO : PERDEU_COMENTARIO;
    setGritoDoPlacar((anterior) => escolherFala(pool, anterior, sorteio));
    setComentarioDoPlacar((anterior) => escolherFala(poolComentario, anterior, sorteio));
  }, [chaveDoRoundFechado, resultadoDoRoundFechado, sorteio]);

  const faixas = useMemo(() => {
    /* "Esta fase já chegou?" em forma de atributo, para o CSS cascatear. */
    const visivelEm = (fase: FaseDaRevelacao) => (jaChegouEm(faseDaRevelacao, fase) ? '1' : '0');

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
        /*
          A RODA ABERTA MUDA O QUE O `IDLE` DIZ, não o estado em que ele está.
          Em vez de "manda o arrotão aí", ele diz de quem é a vez e em que round
          a mesa está. O CTA continua sendo o mesmo gatilho de microfone — o que
          troca é o rótulo.
        */
        if (roda && turno && !turno.acabou) {
          return {
            reacao: <DeQuemEhAVez roda={roda} turno={turno} />,
            acao: (
              <>
                <GatilhoDeMicrofone modo="arrotar" onTocar={pedirMicrofone} rotulo={MANDA} />
                {confirmandoOFim ? (
                  <>
                    <p className="comentario">{FECHAR_A_RODA_CONFIRMA}</p>
                    <button type="button" className="botao-discreto" onClick={acabarARoda}>
                      {ACABOU_SIM}
                    </button>
                    <button
                      type="button"
                      className="botao-discreto"
                      onClick={() => setConfirmandoOFim(false)}
                    >
                      {ACABOU_VOLTA}
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    className="botao-discreto"
                    onClick={() => setConfirmandoOFim(true)}
                  >
                    {ACABOU}
                  </button>
                )}
              </>
            ),
          };
        }

        return {
          reacao: (
            <>
              <h1 className="grito">{fala.chamada}</h1>
              <p className="comentario">{fala.comentario}</p>
            </>
          ),
          acao: (
            <>
              <GatilhoDeMicrofone modo="arrotar" onTocar={pedirMicrofone} />
              {/*
                CHAMAR A MESA — discreto, embaixo do ARROTAR. Quem chegou por
                link de desafio não vê: ele veio para uma briga específica, e
                abrir uma roda ali seria trocar de jogo no meio.
              */}
              {FLAGS.disputaNaArena && !codigoDaDisputa.current ? (
                <button
                  type="button"
                  className="botao-discreto"
                  onClick={() => setAbrindoARoda(true)}
                >
                  {CHAMAR_A_MESA}
                </button>
              ) : null}
            </>
          ),
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
        if (situacao.estado === 'REMATCH' && contandoARevanche) {
          return {
            /*
              A LINHA FIXA (issue #183, "não viaja"): não é pool, não sorteia,
              é sempre "Revanche contra [nome]." — quem está na tela não muda
              de sessão para sessão.
            */
            reacao: <h1 className="grito">{revancheContra(rivalDaRevanche.current)}</h1>,
            /*
              Sem cronômetro e sem CTA: não dá pra pular a cerimônia tocando
              nem apertando nada — o protótipo não prevê pular.
            */
            acao: null,
          };
        }
        return {
          reacao: (
            <>
              <h1 className="grito">{gritoDaGravacao}</h1>
              <Cronometro comecouEm={comecouEm} onTeto={encerrarGravacao} agora={agora} />
              {/*
                A NOTA CONTINUA NA TELA DO COMEÇO AO FIM DA GRAVAÇÃO
                (`ARENA.md`, VERSUS; issue #188). Herdada do `VERSUS` (aguenta
                essa) ou do round aberto do rival (revanche) — sem nota pra
                bater, nenhum elemento aparece.
              */}
              <NotaPraBater alvo={situacao.alvo} />
            </>
          ),
          /*
            O MESMO BOTÃO DO `IDLE`, com outro rótulo.

            `GatilhoDeMicrofone` nos dois estados, na mesma posição da faixa de
            ação: o React reaproveita o nó em vez de desmontar um botão e
            montar outro. Antes disto o gatilho sumia e uma pílula nascia no
            lugar, e a rodada parecia duas telas trocando.
          */
          acao: <GatilhoDeMicrofone modo="jaFoi" onTocar={encerrarGravacao} />,
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
              {/*
                A `key` troca junto com a fala: quando a espera estica, o texto
                não é substituído em silêncio — ele reanima, e a reanimação é o
                sinal de que alguma coisa mudou (design system §13.3).
              */}
              <h1 className="grito enter" key={esperaLonga ?? gritoDoJulgamento}>
                {esperaLonga ?? gritoDoJulgamento}
              </h1>
              <p className="comentario">{comentarioDoJulgamento}</p>
            </>
          ),
          /* Nenhum CTA — não há o que fazer aqui. */
          acao: null,
        };

      case 'RESULT': {
        /*
          O PASSA-O-CELULAR É MOMENTO DO `RESULT`, não estado.

          Tocou em PASSA O CELULAR, a nota sai e entra a vez do próximo — mesma
          faixa, mesmo estado, e o MANDA sai por `RESULT → RECORDING`, que já
          existia. Um estado só para "passe o telefone" seria uma tela nova
          disfarçada.
        */
        if (roda && turno && passouOCelular && !turno.acabou) {
          return {
            reacao: <DeQuemEhAVez roda={roda} turno={turno} />,
            acao: (
              <>
                <GatilhoDeMicrofone modo="arrotar" onTocar={mandarOutro} rotulo={MANDA} />
                <button
                  type="button"
                  className="botao-discreto"
                  onClick={() => setConfirmandoOFim(true)}
                >
                  {ACABOU}
                </button>
                {confirmandoOFim ? (
                  <>
                    <p className="comentario">{ACABOU_CONFIRMA}</p>
                    <button type="button" className="botao-discreto" onClick={verOPodio}>
                      {ACABOU_SIM}
                    </button>
                    <button
                      type="button"
                      className="botao-discreto"
                      onClick={() => setConfirmandoOFim(false)}
                    >
                      {ACABOU_VOLTA}
                    </button>
                  </>
                ) : null}
              </>
            ),
          };
        }

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
              {/*
                A CASCATA, E A ORDEM É REQUISITO (design system §13.3).

                Enquanto a fase é `nota`, isto aqui está invisível: o número
                está sozinho no palco, respirando. Depois entram reação,
                comentário e medidas, cada um no seu tempo. Mostrar tudo de uma
                vez mata o payoff — e o payoff é o produto.

                TODOS NASCEM JUNTOS, e o que cascateia é opacidade e
                deslocamento. Montar um de cada vez parecia igual na tela e era
                outra coisa no ouvido: isto aqui está dentro da região
                `aria-live`, e região `aria-live` anuncia INSERÇÃO de conteúdo.
                Montando em tempos separados, o leitor de tela lia o resultado
                picotado em vários anúncios; nascendo junto, é um só.
              */}
              <h1 className="grito cascata" data-visivel={visivelEm('reacao')}>
                {situacao.nota.classificacao}
              </h1>
              <p className="comentario cascata" data-visivel={visivelEm('comentario')}>
                {situacao.nota.frase}
              </p>
              {/*
                O QUE VAI NA IMAGEM, ESCRITO ANTES DE MANDAR.

                Sem esta linha, trocar a provocação seria trocar às cegas uma
                coisa que a pessoa nunca viu. Ela já vem preenchida com a
                reação que está aí em cima — quem não liga, ignora.

                Só existe onde o aparelho sabe mandar arquivo: onde não sabe,
                não há imagem, e falar de provocação seria prometer o que não
                sai.

                ELA ENTRA NA FASE DAS MEDIDAS, não antes: a linha cita a reação
                que está logo acima, e aparecer junto com o número seria falar
                da provocação antes de a pessoa ter lido o que está sendo
                provocado. Fica montada desde o começo, como todo o resto do
                bloco, pelo mesmo motivo do `aria-live`.
              */}
              {/*
                Na roda a linha da provocação não entra: quem vai viajar para o
                grupo é o pódio, no fim. Oferecer a escolha da imagem no meio do
                turno seria enfeite no caminho de passar o telefone.
              */}
              {sabeMandarImagem && !roda ? (
                <p className="linha-da-provocacao cascata" data-visivel={visivelEm('medidas')}>
                  <span className="rotulo-da-provocacao">{VAI_COM}</span>{' '}
                  <span className="provocacao-escolhida">{provocacaoEscolhida}</span>
                  {/*
                    TRAVADO ENQUANTO INVISÍVEL. `.cascata` esconde por
                    opacidade, e o que está a `0` continua tocável e continua
                    no caminho do teclado. Botão que ninguém vê e mesmo assim
                    responde é alvo cego — é a mesma coisa que fez a faixa de
                    ação do `RESULT` deixar de existir durante a revelação.
                  */}
                  <button
                    type="button"
                    className="botao-trocar"
                    disabled={!jaChegouEm(faseDaRevelacao, 'medidas')}
                    onClick={trocarAProvocacao}
                  >
                    {TROCAR}
                  </button>
                </p>
              ) : null}
              {/*
                As medidas só entram DEPOIS do número — e quem manda nisso é o
                fim da contagem, não um tempo fixo contado da entrada no
                `RESULT`: num aparelho lento elas apareceriam antes de a nota
                terminar de subir.
              */}
              <div className="cascata enter-largo" data-visivel={visivelEm('medidas')}>
                <MedidasEmLinha medidas={situacao.nota.medidas} />
              </div>
            </>
          ),
          acao: roda ? (
            <>
              {/*
                NA RODA, O PRINCIPAL É PASSAR O TELEFONE — não chamar ninguém
                pro X1: a briga já está acontecendo, e o próximo já está do
                lado.

                TODA saída fica TRAVADA enquanto o arroto sobe — o principal e o
                "acabou essa porra" junto. Liberar o principal antes deixaria a
                mesa passar o telefone com a nota ainda no ar, e a falha
                apareceria na mão da pessoa errada. Liberar a saída é pior: o
                pódio é montado da mesa que está na mão, e a mesa só recebe o
                arroto quando o upload volta. Sair no meio manda pro grupo um
                pódio sem a linha que acabou de aparecer na tela — vazio, se foi
                o primeiro arroto da noite.
              */}
              <button
                type="button"
                className="botao botao-principal"
                disabled={registrandoTurno}
                onClick={turno?.acabou ? verOPodio : passarOCelular}
              >
                {turno?.acabou ? VER_O_PODIO : PASSA_O_CELULAR}
              </button>
              {turno?.acabou || !turno?.daVez ? null : (
                <p className="comentario">{passaOCelular(turno.daVez.nome)}</p>
              )}
              <button
                type="button"
                className="botao-discreto"
                disabled={registrandoTurno}
                onClick={() => setConfirmandoOFim(true)}
              >
                {ACABOU}
              </button>
              {confirmandoOFim ? (
                <>
                  <p className="comentario">{ACABOU_CONFIRMA}</p>
                  <button
                    type="button"
                    className="botao-discreto"
                    disabled={registrandoTurno}
                    onClick={verOPodio}
                  >
                    {ACABOU_SIM}
                  </button>
                  <button
                    type="button"
                    className="botao-discreto"
                    onClick={() => setConfirmandoOFim(false)}
                  >
                    {ACABOU_VOLTA}
                  </button>
                </>
              ) : null}
            </>
          ) : (
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
      }

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
              <h1 className="grito">{chamouVoce(moldeDaChamada, desafiante?.nome ?? 'Alguém')}</h1>
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
              {/*
                A NOTA QUE PRECISA SER BATIDA, antes de qualquer botão
                (`ARENA.md`, VERSUS; issue #188). O `ARENA.md` já pedia "dizer
                na cara quem chamou e quanto fez" — isso nunca tinha sido
                construído.
              */}
              <NotaPraBater alvo={desafiante ? { nome: desafiante.nome, nota: desafiante.nota } : null} />
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
        /*
          O MESMO ESTADO, A SEGUNDA FORMA. O placar do X1 tem dois lados e uma
          revanche; o pódio da roda tem até cinco linhas e fecha a mesa. Um
          estado `PODIO` seria tela nova disfarçada — a Arena existe para não
          ter tela por momento.
        */
        if ('podio' in situacao) {
          const campeoes = campeoesDoPodio(situacao.podio);
          const empatouNoTopo = campeoes.length > 1;
          return {
            reacao: (
              <>
                <h1 className="grito">
                  {empatouNoTopo || !campeoes[0]
                    ? PODIO_EMPATE
                    : humilhouAMesa(campeoes[0].nome)}
                </h1>
                <p className="comentario">
                  {empatouNoTopo || !campeoes[0] ? PODIO_EMPATE_COMENTARIO : PODIO_COMENTARIO}
                </p>
                <PodioDaMesa podio={situacao.podio} />
              </>
            ),
            acao: (
              <>
                <button type="button" className="botao botao-principal" onClick={mandarOPodio}>
                  {MANDAR_O_PODIO}
                </button>
                <button
                  type="button"
                  className="botao-discreto"
                  onClick={() => setConfirmandoOFim(true)}
                >
                  {ACABOU}
                </button>
                {confirmandoOFim ? (
                  <>
                    <button type="button" className="botao-discreto" onClick={acabarARoda}>
                      {ACABOU_SIM}
                    </button>
                    <button
                      type="button"
                      className="botao-discreto"
                      onClick={() => setConfirmandoOFim(false)}
                    >
                      {ACABOU_VOLTA}
                    </button>
                  </>
                ) : null}
                {avisoDoCompartilhar ? (
                  <p className="comentario">{avisoDoCompartilhar}</p>
                ) : null}
              </>
            ),
          };
        }

        const placar = situacao.desafio.placar;
        const roundAberto = placar.roundAberto;
        const ultimo = placar.ultimoRound;

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

        /*
          O GRITO DE VITÓRIA/DERROTA VEM DO ESTADO, NÃO DAQUI.

          `gritoDoPlacar`/`comentarioDoPlacar` são sorteados no efeito que
          reage ao round fechar (mais abaixo, perto dos outros `useEffect` de
          fala) — nunca aqui dentro. Sortear a cada passada deste `useMemo`
          trocaria a frase toda vez que a tela redesenha por outro motivo:
          apagar um arroto antigo, abrir e fechar o menu (issue #185).
        */
        const grito = roundAberto
          ? roundAberto.deQuem === 'dele'
            ? faltaTu(roundAberto.rodada.nome, formatarNota(roundAberto.rodada.nota))
            : MANDOU_FALTA_ELE
          : noTeto
            ? CHEGA
            : !ultimo.vencedorResultadoId
              ? EMPATOU
              : gritoDoPlacar;

        const comentario = roundAberto
          ? roundAberto.deQuem === 'dele'
            ? FALTA_TU_COMENTARIO
            : MANDOU_COMENTARIO
          : noTeto
            ? CHEGA_COMENTARIO
            : !ultimo.vencedorResultadoId
              ? EMPATOU_COMENTARIO
              : comentarioDoPlacar;

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
        const peso = pesoDoErro(situacao.caso);
        return {
          reacao: (
            <>
              <h1 className="grito">{texto.titulo}</h1>
              {/*
                `--danger` SÓ EM FALHA TÉCNICA DE VERDADE (design system §15).
                Pintar de vermelho "não veio nada" transformaria zoação em
                bronca, e o vermelho pararia de significar alguma coisa.
              */}
              <p className={peso === 'quebrou' ? 'comentario aviso-de-erro' : 'comentario'}>
                {texto.comentario}
              </p>
              {/*
                A dica é do peso "parede": é o único caso em que a pessoa
                precisa fazer alguma coisa FORA do jogo para voltar.
              */}
              {peso === 'parede' ? <p className="dica">{DICA_DO_MICROFONE}</p> : null}
              {/*
                O QUE ACONTECEU COM A RODA, quando foi ela que deu ruim. O caso
                do `ERROR` continua sendo um dos sete do `ARENA.md` — isto é a
                frase que diz de quem é a vez depois do tropeço, e ela some
                assim que o jogo sai daqui.
              */}
              {avisoDaRoda ? <p className="comentario">{avisoDaRoda}</p> : null}
            </>
          ),
          /*
            COM NOTA, DUAS SAÍDAS. A principal devolve o resultado inteiro — é
            o que o erro tinha acabado de tirar da pessoa. A discreta encerra a
            partida, como sempre encerrou.

            Sem nota, uma saída só: dois botões caindo no mesmo `IDLE` seriam
            enfeite fingindo ser escolha.

            MENOS NO PESO `jaEra`, QUE TAMBÉM ACONTECE COM NOTA NA MÃO: a
            disputa vence enquanto a pessoa grava a resposta ou a revanche, e
            aí o erro herda o número. Devolver ao `RESULT` seria devolver a
            pessoa para o botão que manda de novo para a disputa morta — ela
            dá a volta e cai no mesmo erro, sem nada na tela dizendo por quê.
            Não tem o que consertar aqui, e o texto já manda arrotar de novo:
            uma saída só, e é a que arrota.
          */
          acao:
            situacao.nota && peso !== 'jaEra' ? (
              <>
                <button type="button" className="botao botao-principal" onClick={voltarPraNota}>
                  {VER_MINHA_NOTA}
                </button>
                <button type="button" className="botao-discreto" onClick={tentarDeNovo}>
                  {DEIXA_QUIETO}
                </button>
              </>
            ) : (
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
    esperaLonga,
    faseDaRevelacao,
    gritoDoDesafio,
    comentarioDoDesafio,
    provocacao,
    moldeDaChamada,
    gritoDoPlacar,
    comentarioDoPlacar,
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
    voltarPraNota,
    roda,
    turno,
    passouOCelular,
    confirmandoOFim,
    registrandoTurno,
    avisoDaRoda,
    acabarARoda,
    passarOCelular,
    verOPodio,
    mandarOPodio,
    contandoARevanche,
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
  /*
    O PESO DO ERRO VEM DO NÚCLEO. A tela lê para escolher a forma da Bolha e a
    animação; ela não decide quem é grave.
  */
  const pesoDoErroAtual = situacao.estado === 'ERROR' ? pesoDoErro(situacao.caso) : null;
  const notaSalvaNoErro = situacao.estado === 'ERROR' ? situacao.nota : undefined;

  const modoDaBolha =
    (situacao.estado === 'RECORDING' || situacao.estado === 'REMATCH') && conferindo
      ? 'segurando'
      : situacao.estado === 'RECORDING' || situacao.estado === 'REMATCH'
        ? 'gravando'
      : situacao.estado === 'ORIGIN'
        ? 'segurando'
        : situacao.estado === 'VERSUS'
          ? /*
              O X1 chegou por link com o arroto do host já tocando — a Bolha
              segura esse arroto do mesmo jeito que segura o próprio, no
              `ORIGIN` (`ARENA.md`, VERSUS).
            */
            'segurando'
          : situacao.estado === 'JUDGING'
            ? 'julgando'
            : situacao.estado === 'RESULT'
              ? 'entregando'
              : situacao.estado === 'CHALLENGE'
                ? /*
                    Desafio mandado, ninguém respondeu ainda — viva, mas sem
                    resposta do outro lado. Mesma forma do `IDLE`
                    (`caminhoDaBolha.ts`), mesma cor: o que muda aqui não é
                    tanto que se mexe, é quanto tempo ela fica assim.
                  */
                  'esperando'
                : situacao.estado === 'SCOREBOARD' && 'podio' in situacao
                  ? /*
                      Pódio da roda de cinco: não há dois lados pra confrontar,
                      então não existe modo canônico pra isso no protótipo.
                      Reaproveita `esperando` — presente e vivo, sem fingir
                      vitória de alguém específico.
                    */
                    'esperando'
                  : situacao.estado === 'ERROR'
                    ? /*
                        Com a nota na mão a Bolha fica `esperando` — viva,
                        segurando o número, sem cara de estrago. Sem nota, ela
                        reage no tamanho do peso: murcha no leve, morta no
                        resto.
                      */
                      notaSalvaNoErro
                      ? 'esperando'
                      : pesoDoErroAtual === 'leve'
                        ? 'chata'
                        : 'morta'
                    : 'repouso';

  /*
    A MARCA DA ESPERA — o `data-dim` do protótipo (`arena.html` l.1155), e nada
    além disso.

    O que ele liga no CSS é uma troca de fundo que, no `--bg` de hoje, quase
    não se vê — a conta está no `arena.css`. Então ele NÃO é o que segura a
    tensão do `JUDGING`: quem segura é a Bolha no modo `julgando` e a segunda
    fala depois de 1,8s. O plano pedia também o secundário caindo de opacidade,
    e isso não foi entregue — está anotado como pendência no PR, com o motivo.

    Vale como atributo derivado do estado, e não bandeira com relógio: assim
    ele ACABA junto com o estado, inclusive quando a saída é `ERROR`. Palco
    marcado pendurado num erro seria o jogo esquecendo de acender a luz — e é
    isso, e só isso, que o teste consegue cobrar.
  */
  const escurecido = situacao.estado === 'JUDGING' ? '1' : '0';

  /*
    A faixa de ação do `RESULT` NÃO EXISTE até a cascata terminar.

    Não é opacidade: os botões não são montados. Enquanto a revelação corre não
    tem nada para tocar ali, e no fim os três nascem juntos — que é o que o
    protótipo faz (`arena.html`: `setState` esconde `btnShare`/`btnGhost` em
    toda troca de estado, `RESULT_REVEAL` esconde também o `btnMain`, e
    `[hidden]` lá é `display:none !important`).

    A versão anterior deixava os três montados, invisíveis e tocáveis por
    ~1,8s, para não engolir toque. Era pior: "Vou mandar outro!" reabre o
    microfone e joga fora a nota que a pessoa ainda não viu, e "COMPARTILHAR"
    abre a folha do sistema por cima de um resultado invisível. Alvo cego que
    dispara ação sem volta não se resolve com regra de toque — se resolve não
    existindo.

    A grade não dá salto por causa disto: a reação é a trilha `1fr` com o
    conteúdo ancorado no topo, e a ação é a última trilha, colada no rodapé.
  */
  const acaoPronta = situacao.estado !== 'RESULT' || jaChegouEm(faseDaRevelacao, FASE_FINAL);

  return (
    <main
      className="arena"
      ref={arenaRef}
      data-estado={situacao.estado}
      data-hud={hud}
      data-dim={escurecido}
      data-peso={pesoDoErroAtual ?? undefined}
      data-com-nota={situacao.estado === 'ERROR' ? (notaSalvaNoErro ? 'sim' : 'nao') : undefined}
    >
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
          No placar da briga a Bolha sai e entram o PLACAR DA BRIGA e o último
          round (`ARENA.md`, SCOREBOARD). O placar de vitórias vem primeiro: a
          primeira coisa que a pessoa lê é quem tá ganhando, não quem deu o
          maior arroto da noite.

          No PÓDIO da roda a Bolha FICA: ali não há dois lados para confrontar,
          são até cinco linhas, e um VS com cinco nomes não significaria nada.
        */}
        {situacao.estado === 'SCOREBOARD' && 'desafio' in situacao ? (
          <div className="palco-do-placar">
            <PlacarDaBriga placar={situacao.desafio.placar} />
            <BlocoVersus desafio={situacao.desafio} />
          </div>
        ) : situacao.estado === 'REMATCH' && contandoARevanche ? (
          /*
            A BOLHA SOME, O NÚMERO ENTRA NO LUGAR DELA (issue #183). A `key`
            troca a cada número — é o que faz o React remontar o nó e a
            animação `contagemDaRevanche` reiniciar; sem isso o "2" chegaria
            estático, porque o navegador não reanima uma animação já
            terminada só porque o texto mudou.
          */
          <div className="contagem-da-revanche" key={numeroDaContagem} aria-live="off">
            {numeroDaContagem}
          </div>
        ) : (
          <BolhaAue modo={modoDaBolha} nivel={nivel} />
        )}
        {/*
          O ERRO MOSTRA A NOTA QUANDO ELA EXISTE, e nunca quando não existe —
          quem decide isso é a máquina, que só entrega o campo se a partida
          tinha resultado antes de dar ruim.
        */}
        {situacao.estado === 'RESULT' ||
        situacao.estado === 'CHALLENGE' ||
        (situacao.estado === 'ERROR' && situacao.nota) ? (
          <div className="palco-nota" ref={notaRef}>
            <p className="rotulo-da-nota">
              {situacao.estado === 'ERROR' ? ROTULO_DA_NOTA_NO_ERRO : ROTULO_DA_NOTA}
            </p>
            {/*
              No `CHALLENGE` o número que aparece é o OFICIAL, o que o servidor
              calculou e o que vai no link. E sem teatro: a nota já foi
              revelada, repetir a contagem seria contar a piada duas vezes.
            */}
            <NotaContada
              valor={
                situacao.estado === 'CHALLENGE'
                  ? situacao.desafio.notaOficial
                  : situacao.estado === 'ERROR'
                    ? (notaSalvaNoErro?.nota ?? 0)
                    : situacao.nota.nota
              }
              /*
                No erro não tem teatro: a contagem já rodou uma vez no
                resultado, e repetir seria contar a piada duas vezes.

                Quem responde por "já rodou" é o `revelacaoComTeatro`, decidido
                lá atrás quando o juiz fechou, e não o `jaRevelou.current` lido
                aqui na renderização: o `onChegou` levanta o `jaRevelou` no meio
                da própria contagem, e perguntar a ele agora derrubaria o teatro
                enquanto ele ainda está acontecendo.
              */
              comTeatro={situacao.estado === 'RESULT' && revelacaoComTeatro}
              onChegou={() => {
                jaRevelou.current = true;
                /*
                  Revelação repetida não tem teatro nem cascata: a piada já foi
                  contada, e o `RESULT` já entrou inteiro.
                */
                if (situacao.estado !== 'RESULT' || !revelacaoComTeatro) return;
                /*
                  O `pop` NÃO mora aqui: ele sai na entrada do `RESULT`, junto
                  com o começo da contagem. Aqui só cai a bandeira que solta a
                  cascata.
                */
                setNotaChegou(true);
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
        {/*
          A ENTRADA PADRÃO DE BLOCO (§13.3), num invólucro em vez de na
          `<section>`: trocar a chave da região `aria-live` a cada estado
          faria o leitor de tela reanunciar a faixa inteira. A chave muda com
          o estado e com a conferida, que é o que precisa reanimar.
        */}
        <div className="faixa-entrando" key={`${situacao.estado}${conferindo ? ':conferindo' : ''}`}>
          {faixas.reacao}
        </div>
      </section>

      <section className="acao" data-pronta={acaoPronta ? '1' : '0'}>
        {acaoPronta ? faixas.acao : null}
      </section>

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

      {/*
        A RODA TAMBÉM PINTA POR CIMA E VOLTA. Mesma casca da assinatura, mesmo
        motivo: montar a mesa é um formulário, e formulário não vira estado da
        Arena. Fechar aqui devolve o `IDLE` como estava, sem nada ter
        acontecido.
      */}
      {abrindoARoda ? (
        <AbrirARoda
          ocupado={montandoAMesa}
          onAbrir={abrirARoda}
          onFechar={() => setAbrindoARoda(false)}
        />
      ) : null}

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
