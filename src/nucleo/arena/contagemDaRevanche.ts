/**
 * A CONTAGEM DA REVANCHE — o 3, 2, 1 antes da gravação de verdade.
 *
 * **Não é estado da Arena.** É um momento dentro do `REMATCH`, do jeito que a
 * cascata do resultado é um momento dentro do `RESULT`
 * (`src/nucleo/arena/revelacao.ts`). O `REMATCH` continua sendo o mesmo
 * estado de sempre — só que agora ele abre com esta cerimônia antes de virar
 * gravação de verdade.
 *
 * O microfone é pedido no mesmo toque de sempre (`Arena.tsx`,
 * `abrirOMicrofoneEGravar`); é só a tela que muda — a Bolha fica escondida
 * atrás dos números enquanto o mic já está ligado por baixo. O relógio que
 * decide o teto de duração só começa a contar quando esta cerimônia termina
 * — issue #183.
 */

/** Os três números, na ordem em que aparecem. */
export const NUMEROS_DA_CONTAGEM = ['3', '2', '1'] as const;

export type NumeroDaContagem = (typeof NUMEROS_DA_CONTAGEM)[number];

/** Cada número escala e some por isto antes do próximo entrar (DESIGN.md §13.2). */
export const DURACAO_DO_TICK_MS = 620;

/** Depois do último número, a pausa antes de a gravação de verdade começar. */
export const PAUSA_FINAL_MS = 700;

/**
 * Os números a mostrar, na ordem.
 *
 * Com movimento reduzido a contagem não aparece — pula direto para a
 * gravação, igual `passosDaRevelacao` já faz na cascata do resultado quando
 * devolve lista vazia.
 */
export function passosDaContagem(movimentoReduzido: boolean): readonly NumeroDaContagem[] {
  return movimentoReduzido ? [] : NUMEROS_DA_CONTAGEM;
}

/**
 * Quanto tempo, ao todo, a cerimônia ocupa — do primeiro número ao momento em
 * que a gravação de verdade começa.
 *
 * Serve para quem agenda os relógios calcular o atraso final sem repetir a
 * conta em dois lugares.
 */
export function duracaoDaContagemMs(passos: readonly NumeroDaContagem[]): number {
  if (passos.length === 0) return 0;
  return passos.length * DURACAO_DO_TICK_MS + PAUSA_FINAL_MS;
}
