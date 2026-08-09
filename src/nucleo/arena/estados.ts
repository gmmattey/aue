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
 * genérica é o começo de "deu ruim" sem dizer o quê.
 */
export type SituacaoDaArena =
  | { readonly estado: Exclude<EstadoDaArena, 'ERROR'> }
  | { readonly estado: 'ERROR'; readonly caso: CasoDeErro };

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
  /** A saída que todo `ERROR` é obrigado a oferecer. */
  | { readonly tipo: 'TENTAR_DE_NOVO' };
