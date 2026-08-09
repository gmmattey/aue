/**
 * De onde veio o arroto.
 *
 * **Quem informa é a pessoa. O jogo não detecta origem** — nunca detectou e não
 * pode fingir que detecta (`docs/jogo/ARENA.md`, `ORIGIN`).
 *
 * SEIS ALVOS, CINCO ORIGENS, E ISSO NÃO É BUG. A fórmula pontua cinco origens;
 * a tela oferece seis botões porque "Cerveja" e "Refri" são a mesma coisa para
 * a conta (Bebida) e coisas bem diferentes para quem arrotou. Quem "arrumar"
 * isto para cinco botões vai estar tirando uma escolha do jogo para agradar uma
 * tabela.
 *
 * O peso de cada origem continua morando na fórmula — aqui só existe o mapa.
 * Existe teste amarrando este mapa às origens que a fórmula conhece.
 */

/** As origens que a fórmula pontua. Os textos são os mesmos de `rules.ts`. */
export type TipoDeOrigem = 'Espontâneo' | 'Comida' | 'Bebida' | 'Puxei ar' | 'Outro';

export interface AlvoDeOrigem {
  /** Identificador estável. Não é texto de tela. */
  readonly id: string;
  /** O que a pessoa lê no botão. */
  readonly rotulo: string;
  readonly emoji: string;
  /** Para onde isto vai na conta da nota. */
  readonly tipo: TipoDeOrigem;
}

export const ALVOS_DE_ORIGEM: readonly AlvoDeOrigem[] = [
  { id: 'cerveja', rotulo: 'Cerveja', emoji: '🍺', tipo: 'Bebida' },
  { id: 'refrigerante', rotulo: 'Refri', emoji: '🥤', tipo: 'Bebida' },
  { id: 'comida', rotulo: 'Comida', emoji: '🍔', tipo: 'Comida' },
  { id: 'espontaneo', rotulo: 'Espontâneo', emoji: '⚡', tipo: 'Espontâneo' },
  { id: 'ar', rotulo: 'Puxando ar', emoji: '💨', tipo: 'Puxei ar' },
  { id: 'outro', rotulo: 'Outro', emoji: '🤷', tipo: 'Outro' },
];

/** Todas as origens que os alvos conseguem produzir. */
export function origensAlcancaveis(): TipoDeOrigem[] {
  return [...new Set(ALVOS_DE_ORIGEM.map((alvo) => alvo.tipo))];
}
