/**
 * A fala do `RECORDING`.
 *
 * Curta de propósito. A pessoa está com a boca ocupada e o olho na Bolha —
 * ninguém lê frase comprida no meio de um arroto.
 */

export const GRAVANDO = ['Valendo.', 'É agora.', 'Solta.'] as const;

/**
 * O aviso do teto.
 *
 * Não é contagem regressiva e não é alarme: é um empurrão para fechar. Alarme
 * assustaria, e susto no meio da gravação estraga o arroto — que é o produto.
 */
export const ACABANDO = 'Tá acabando.';

/**
 * Rótulo do botão que encerra. Contrato: não varia, não é sorteado.
 *
 * ERA `Parar`. Parar é o que se faz com um gravador; `JÁ FOI` é o que se diz
 * depois de arrotar. O botão é o MESMO nó do gatilho de entrada — ele não some
 * para outro nascer no lugar, só troca de rótulo (`ARENA.md`, `RECORDING`).
 */
export const JA_FOI = 'Já foi';

/**
 * A fala da conferida — o momento entre o JÁ FOI e a pergunta de origem.
 *
 * **Não é estado** (`ARENA.md`, `RECORDING`): a Arena continua em gravação, o
 * HUD segue escondido e as faixas não remontam. O que muda é que o CTA some e
 * o jogo diz que está conferindo.
 *
 * Curta porque costuma durar pouco. E sem barra de progresso: o ARENA.md
 * proíbe inventar progresso para uma espera que quase sempre é rápida.
 */
export const CONFERINDO = ['Deixa eu ver.', 'Peraí.', 'Conferindo.'] as const;
