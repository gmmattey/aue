import type { DesafioAberto, DesafioCriado } from '../../portas/desafios';
import type { Nota } from '../../portas/pontuacao';
import type { PodioDaRoda } from '../disputa/podio';

/**
 * Os dez estados da Arena, os sete casos de erro e os eventos que movem a
 * partida.
 *
 * Quem manda aqui é [`docs/jogo/ARENA.md`](../../../docs/jogo/ARENA.md).
 * Protótipo, design system e handoff decidem como cada estado se parece e se
 * move — **não criam, não renomeiam e não removem estado**. Se faltar um, a
 * conversa volta para o ARENA.md antes de existir código.
 *
 * DECLARAR NÃO É IMPLEMENTAR. Os dez nomes existem desde já porque a tabela de
 * transição precisa ser uma coisa só, num arquivo só. O comportamento de cada
 * estado chega com a fatia dele.
 */

export const ESTADOS = [
  'IDLE',
  'RECORDING',
  'ORIGIN',
  'JUDGING',
  'RESULT',
  'CHALLENGE',
  'VERSUS',
  'SCOREBOARD',
  'REMATCH',
  'ERROR',
] as const;

export type EstadoDaArena = (typeof ESTADOS)[number];

/**
 * Os sete casos de `ERROR` do ARENA.md §2.
 *
 * O tipo é fechado de propósito: quem for construir o próximo caso vai ser
 * cobrado pelo compilador em todo lugar que trata erro, em vez de descobrir
 * na mão que esqueceu um.
 */
export const CASOS_DE_ERRO = [
  'microfoneNegado',
  'semSom',
  'naoEhArroto',
  'falhaNaAnalise',
  'falhaAoCompartilhar',
  'linkExpirado',
  'semRede',
] as const;

export type CasoDeErro = (typeof CASOS_DE_ERRO)[number];

/**
 * Onde a partida está agora.
 *
 * `ERROR` carrega o caso junto porque erro sem caso é tela genérica, e tela
 * genérica é o começo de "deu ruim" sem dizer o quê. `RESULT` carrega a nota
 * pelo mesmo motivo: estado de resultado sem resultado é tela em branco
 * esperando alguém lembrar de preencher.
 *
 * O ÁUDIO NÃO ENTRA AQUI. Ele é dado de plataforma e some com a saída — a
 * situação da partida é o que a Arena precisa para se desenhar, não um
 * depósito.
 */
export type SituacaoDaArena =
  | {
      readonly estado: Exclude<
        EstadoDaArena,
        'ERROR' | 'RESULT' | 'CHALLENGE' | 'VERSUS' | 'SCOREBOARD'
      >;
    }
  /* Quem foi chamado precisa saber quem chamou e ouvir o que veio. */
  | { readonly estado: 'VERSUS'; readonly desafio: DesafioAberto }
  /* O placar é a disputa inteira, do jeito que o servidor a descreve. */
  | { readonly estado: 'SCOREBOARD'; readonly desafio: DesafioAberto }
  /*
    O MESMO ESTADO, A SEGUNDA FORMA: o pódio da roda.

    O `SCOREBOARD` sempre foi "o placar da disputa". A roda é uma disputa de até
    cinco pessoas no mesmo aparelho, e o fim dela é o mesmo momento — o que muda
    é quantas linhas cabem e de onde a posição vem. Um estado `PODIO` seria uma
    tela nova disfarçada, e a Arena existe justamente para não ter tela por
    momento (`ARENA.md` §2, "A roda").
  */
  | { readonly estado: 'SCOREBOARD'; readonly podio: PodioDaRoda }
  | { readonly estado: 'RESULT'; readonly nota: Nota }
  /*
    O `CHALLENGE` carrega o desafio inteiro: sem o código, o prazo e a nota
    oficial, ele seria uma tela de espera sem nada para esperar.
  */
  | { readonly estado: 'CHALLENGE'; readonly nota: Nota; readonly desafio: DesafioCriado }
  /*
    O `ERROR` carrega a nota QUANDO ELA EXISTIA. Quem tirou 87, tocou em CHAMAR
    NO X1 e viu o servidor cair não pode perder o 87 junto — o erro foi do
    jogo, e cobrar do jogador o que ele já conquistou é o único lugar do loop
    onde a Arena rouba.

    Opcional, e não obrigatório, porque a maior parte dos erros acontece antes
    de existir nota nenhuma: microfone negado no `IDLE`, gravação sem som,
    link torto. Aí o campo simplesmente não vem — e é assim que a regra "nunca
    mostra nota quando não houve nota" (`ARENA.md` §2) vale por construção, em
    vez de depender de alguém lembrar de checar.
  */
  | { readonly estado: 'ERROR'; readonly caso: CasoDeErro; readonly nota?: Nota };

/**
 * O que acontece com a partida.
 *
 * Só existem aqui os eventos que esta fatia realmente dispara. Evento para
 * estado que ninguém construiu seria enfeite — e enfeite em máquina de estado
 * vira caminho morto que ninguém testa.
 */
export type EventoDaArena =
  /** Tocou no gatilho do microfone, no `IDLE`. */
  | { readonly tipo: 'TOCOU_ARROTAR' }
  /** O aparelho liberou o microfone. */
  | { readonly tipo: 'MICROFONE_LIBERADO' }
  /** A pessoa (ou o navegador) negou o microfone. */
  | { readonly tipo: 'MICROFONE_NEGADO' }
  /**
   * A gravação terminou e veio som. Os três gatilhos de parada — o toque em
   * PARAR, o teto de tempo e o fim automático — chegam aqui pelo **mesmo
   * caminho**, como manda o `REGRAS.md` §1.
   */
  | { readonly tipo: 'PAROU_COM_SOM' }
  /** A gravação terminou e não veio som nenhum. */
  | { readonly tipo: 'PAROU_SEM_SOM' }
  /**
   * Veio som, mas não era arroto.
   *
   * Separado do "sem som" de propósito: são duas conversas diferentes com
   * quem está jogando — "não te ouvi" e "isso não vale".
   */
  | { readonly tipo: 'NAO_EH_ARROTO' }
  /**
   * O gravador quebrou. Do lado de quem está jogando: deu ruim do lado do
   * jogo, não do lado dela.
   */
  | { readonly tipo: 'DEU_RUIM_NA_GRAVACAO' }
  /** A pessoa disse de onde veio o arroto. */
  | { readonly tipo: 'ESCOLHEU_ORIGEM' }
  /** O juiz fechou a nota. */
  | { readonly tipo: 'JUIZ_FECHOU'; readonly nota: Nota }
  /** A análise não deu. */
  | { readonly tipo: 'ANALISE_FALHOU' }
  /** "Vou mandar outro!" — volta direto a gravar. */
  | { readonly tipo: 'MANDAR_OUTRO' }
  /** O desafio foi criado no servidor e tem link. */
  | { readonly tipo: 'DESAFIO_CRIADO'; readonly desafio: DesafioCriado }
  /** Não deu para criar o desafio. Nada existe do outro lado. */
  | { readonly tipo: 'DESAFIO_FALHOU'; readonly caso: CasoDeErro }
  /** "Deixa pra lá" — desistiu do desafio. */
  | { readonly tipo: 'DEIXA_PRA_LA' }
  /**
   * A Arena montou por um link de desafio.
   *
   * É a segunda porta de entrada do jogo (`ARENA.md` §3): quem chega assim não
   * passa pelo `IDLE` de verdade — vê o confronto direto.
   */
  | { readonly tipo: 'DESAFIO_ABERTO'; readonly desafio: DesafioAberto }
  /** "Aguenta essa" — vai gravar a resposta. */
  | { readonly tipo: 'AGUENTA_ESSA' }
  /** A resposta subiu e a disputa tem os dois lados. */
  | { readonly tipo: 'RESPOSTA_ENVIADA'; readonly desafio: DesafioAberto }
  /** Do confronto direto para o placar, sem responder. */
  | { readonly tipo: 'VER_O_PLACAR' }
  /** "Revanche" — a mesma disputa continuando. */
  | { readonly tipo: 'REVANCHE' }
  /** A revanche foi julgada e entrou (ou não) no placar. */
  | { readonly tipo: 'REVANCHE_ENVIADA'; readonly desafio: DesafioAberto }
  /**
   * A tela sumiu no meio da gravação. Não é erro: a pessoa saiu, e o jogo
   * volta a esperar ela arrotar (`ARENA.md`, `RECORDING`).
   */
  | { readonly tipo: 'SUMIU_DA_TELA' }
  /**
   * A roda acabou (ou alguém disse que acabou): vai pro pódio com o que existe.
   *
   * Sai do `RESULT`, que é onde a nota do último arroto está e onde o discreto
   * "Acabou essa porra" vive. A seta `RESULT → SCOREBOARD` já existia para o
   * X1; a roda entra por ela em vez de abrir outra.
   */
  | { readonly tipo: 'VER_O_PODIO'; readonly podio: PodioDaRoda }
  /**
   * "Acabou essa porra", do pódio: a roda fecha e o jogo volta a esperar
   * alguém arrotar.
   *
   * É a ÚNICA aresta que a roda acrescenta à Arena, e é irmã do
   * `CHALLENGE → IDLE` do "deixa pra lá".
   */
  | { readonly tipo: 'ACABOU_A_RODA' }
  /** A saída que todo `ERROR` é obrigado a oferecer. */
  | { readonly tipo: 'TENTAR_DE_NOVO' }
  /**
   * "Ver minha nota" — sai do `ERROR` de volta para o resultado.
   *
   * Só existe quando o `ERROR` entrou trazendo a nota. Sem nota não há
   * resultado para onde voltar, e a máquina recusa o caminho.
   */
  | { readonly tipo: 'VOLTAR_PRA_NOTA' };
