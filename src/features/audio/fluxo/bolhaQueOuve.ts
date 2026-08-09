/**
 * De quanto a Bolha cresce quando o arroto chega — e em quanto tempo.
 *
 * Módulo separado, e não duas linhas dentro do JSX, porque isto é a REGRA do
 * comportamento que a #56 descreve com números: se ela vive no meio da tela,
 * ninguém consegue testá-la sem montar componente, e a próxima pessoa que
 * mexer no visual mexe na regra sem perceber.
 *
 * A #56 dá a tabela:
 *
 *   silêncio  1.00 – 1.02
 *   médio     1.04 – 1.08
 *   forte     1.09 – 1.15
 *
 * Ataque 60–100 ms. Volta 140–220 ms.
 */

/** O teto. Acima disto a bolha estoura o container. */
export const ESCALA_MAXIMA = 1.15;

/**
 * O piso NÃO é 1.00 exato, e sim 1.005.
 *
 * Silêncio absoluto travando a bolha em 1.000 a faria parecer congelada — e a
 * tela de gravação sem nenhum movimento é exatamente a "planilha" que a issue
 * diz que acaba com a graça. A faixa da issue para o silêncio é 1.00–1.02, e
 * 1.005 está dentro dela.
 */
const ESCALA_MINIMA = 1.005;

/** Sobe rápido: a issue pede 60 a 100 ms. */
export const MS_ATAQUE = 80;

/** Volta devagar: a issue pede 140 a 220 ms. */
export const MS_VOLTA = 180;

/**
 * O nível audível, de 0 a 1, a partir das barras que `useGravacao` já mede.
 *
 * USA O PICO, não a média. As dez barras são faixas de frequência: um arroto
 * concentra energia em poucas delas, e a média dividiria esse pico por dez —
 * a bolha mal se mexeria num arroto de verdade. O pico é o que a pessoa ouve.
 *
 * A entrada vem em 0–100 (é o que a tela desenhava como altura em %), e sai
 * normalizada. Fora da faixa é tratado como extremo em vez de propagar número
 * estranho para dentro de um `transform`.
 */
export function nivelDaGravacao(frequencias: readonly number[]): number {
  if (frequencias.length === 0) return 0;
  let pico = 0;
  for (const f of frequencias) {
    if (f > pico) pico = f;
  }
  if (!Number.isFinite(pico)) return 0;
  return Math.min(1, Math.max(0, pico / 100));
}

/**
 * A escala da bolha para um nível.
 *
 * CURVA, não reta. O `** 0.7` levanta a parte de baixo: a energia acústica é
 * logarítmica, e um mapeamento linear deixaria quase todo arroto comum
 * espremido perto de 1.02 — a bolha só reagiria de verdade no arroto
 * monstruoso, e a tela pareceria morta para o resto do mundo.
 */
export function escalaDaBolha(frequencias: readonly number[]): number {
  const nivel = nivelDaGravacao(frequencias);
  const bruto = ESCALA_MINIMA + (ESCALA_MAXIMA - ESCALA_MINIMA) * nivel ** 0.7;
  // O arredondamento evita reescrever o style a cada micro-variação: sem ele,
  // o React troca o atributo a cada quadro por diferenças na quinta casa.
  return Math.round(bruto * 1000) / 1000;
}

/**
 * Quanto tempo a transição leva, decidido pela DIREÇÃO.
 *
 * É o que separa "a bolha me ouviu" de "a bolha está tremendo": subir tem que
 * ser quase instantâneo (o estouro do arroto) e descer tem que ter inércia. Com
 * uma duração só, ou o ataque fica mole ou a volta fica nervosa — e a issue
 * avisa: "se ficar tremendo igual caixa de som vagabunda, tá errado".
 */
export function msDaTransicao(escalaNova: number, escalaAnterior: number): number {
  return escalaNova >= escalaAnterior ? MS_ATAQUE : MS_VOLTA;
}
