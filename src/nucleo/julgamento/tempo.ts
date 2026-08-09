/**
 * Quanto tempo o juiz demora.
 *
 * O `JUDGING` é o único lugar do jogo onde a **espera é a piada**. Ele tem dois
 * problemas opostos, e os dois estragam a mesma coisa:
 *
 * - **rápido demais** — a análise costuma terminar em fração de segundo, e a
 *   nota apareceria antes de a pessoa ler o "Xiu.". A piada não acontece;
 * - **devagar demais** — vira tela de carregamento, que o `ARENA.md` proíbe com
 *   todas as letras.
 *
 * Daí um piso e um teto. Com movimento reduzido o piso encolhe: quem pediu
 * menos animação não pediu menos jogo, mas também não quer ficar olhando uma
 * tela parada de propósito.
 */

/** O mínimo que a cena fica no ar, para a frase ser lida. */
export const PISO_DO_TEATRO_MS = 1200;

/** O mesmo piso para quem pediu menos movimento. */
export const PISO_REDUZIDO_MS = 400;

/**
 * O máximo que o jogo espera pela análise antes de desistir.
 *
 * Depois disto é `ERROR`, com saída. Ficar preso no julgamento é o pior dos
 * mundos: a pessoa arrotou, o jogo prometeu uma nota e não entrega nem erro.
 */
export const TETO_DA_ANALISE_MS = 8000;

/** Quanto a cena precisa ficar no ar, no mínimo. */
export function pisoDoTeatro(movimentoReduzido: boolean): number {
  return movimentoReduzido ? PISO_REDUZIDO_MS : PISO_DO_TEATRO_MS;
}

/**
 * Quanto ainda falta esperar depois de a análise ter voltado.
 *
 * Zero quando a análise já demorou mais que o piso — ninguém segura a nota de
 * quem esperou.
 */
export function esperaQueFalta(decorridoMs: number, movimentoReduzido: boolean): number {
  return Math.max(0, pisoDoTeatro(movimentoReduzido) - decorridoMs);
}
