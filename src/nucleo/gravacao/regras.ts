/**
 * As regras da gravação. Números, e o porquê de cada um.
 *
 * Núcleo puro: a plataforma mede, aqui se decide. É o que permite testar
 * "isso foi silêncio?" sem microfone, sem navegador e sem áudio de verdade.
 */

/**
 * O teto. A captura para sozinha aqui.
 *
 * Dez segundos é o que o fluxo de hoje já usa (`SEGUNDOS_DE_GRAVACAO` em
 * `features/audio/hooks/useGravacao.ts`), e não há motivo para o jogo novo
 * discordar do jogo velho sobre quanto tempo um arroto pode durar.
 *
 * Não confundir com o teto da NOTA: o Fôlego satura em 5 segundos
 * (`docs/jogo/REGRAS.md` §3). Segurar mais tempo não melhora a nota, mas o
 * jogo não corta a pessoa no meio do arroto por causa disso.
 */
export const TETO_DE_GRAVACAO_MS = 10_000;

/**
 * Quando o jogo avisa que está acabando.
 *
 * Dois segundos de sobra: dá para fechar o arroto sem susto, e é curto o
 * bastante para não ficar avisando durante metade da gravação.
 */
export const AVISO_A_PARTIR_DE_MS = 8_000;

/**
 * O chão de audibilidade — abaixo disto não houve som.
 *
 * ESTE NÚMERO TEM DONO E TEM HISTÓRIA. Veio de um caso real num iPhone
 * (2026-08-08): uma gravação **sem som nenhum** recebeu 54,2 e "Arroto
 * Respeitável", porque três das cinco parcelas da nota não dependem de haver
 * som — e a textura, que é taxa de cruzamentos por zero, SATURA quando o sinal
 * fica oscilando em torno do zero.
 *
 * 0,005 de RMS é cerca de -46 dBFS: o chão de ruído de um telefone numa sala
 * silenciosa. Um arroto perto do microfone dá entre 0,05 e 0,3 — sessenta vezes
 * mais.
 *
 * É o mesmo valor que guarda a entrada do motor antigo (`engine.ts`), e o teste
 * `features/audio/silencio.test.ts` trava a aritmética do caso original. Aqui
 * ele volta a aparecer porque a Arena precisa decidir isso **antes** de gastar
 * o gesto da pessoa: ninguém escolhe origem para depois descobrir que não valeu.
 */
export const RMS_MINIMO_AUDIVEL = 0.005;

/** O que a plataforma mediu enquanto o microfone estava aberto. */
export interface ResumoDoSinal {
  /** Média quadrática do sinal ao longo da gravação. */
  readonly rms: number;
  /** O ponto mais alto que o sinal atingiu. */
  readonly pico: number;
}

/**
 * Veio som?
 *
 * O RMS decide, e o pico entra como segunda chance: um arroto curto e forte no
 * fim de uma gravação longa e silenciosa derruba a média, e seria injusto
 * chamar de mudo alguém que arrotou de verdade.
 */
export function houveSom(resumo: ResumoDoSinal): boolean {
  return resumo.rms >= RMS_MINIMO_AUDIVEL || resumo.pico >= RMS_MINIMO_AUDIVEL * 4;
}

/** Já é hora de avisar que o tempo está acabando? */
export function estaAcabando(decorridoMs: number): boolean {
  return decorridoMs >= AVISO_A_PARTIR_DE_MS;
}

/** Estourou o teto? */
export function estourouOTeto(decorridoMs: number): boolean {
  return decorridoMs >= TETO_DE_GRAVACAO_MS;
}

/**
 * O cronômetro como a pessoa lê: `0,0s`.
 *
 * Vírgula porque o jogo é em português, e uma casa decimal porque é o que o
 * protótipo mostra. `Math.floor` e não arredondamento: o cronômetro nunca pode
 * mostrar 10,0s num teto de 10 segundos que já teria parado a gravação.
 */
export function formatarCronometro(decorridoMs: number): string {
  const limitado = Math.min(Math.max(0, decorridoMs), TETO_DE_GRAVACAO_MS);
  const decimos = Math.floor(limitado / 100) / 10;
  return `${decimos.toFixed(1).replace('.', ',')}s`;
}
