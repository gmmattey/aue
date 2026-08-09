/**
 * A fala de quem foi chamado, e a do placar.
 *
 * O `VERSUS` tem uma função só: fazer a pessoa **ouvir** e querer responder.
 * Por isso a provocação é curta e mira no desempenho da pessoa naquele momento
 * — nunca em característica dela.
 */

/** Quem chamou, e quanto fez. O nome entra na frase. */
export function chamouVoce(nome: string): string {
  return `${nome} te chamou.`;
}

export const PROVOCACOES = ['Duvido bater.', 'Coé, vai peidar?', 'Vai deixar barato?'] as const;

/** O rótulo do player do adversário. */
export const O_ARROTO_DELE = 'O arroto dele';

export const AGUENTA_ESSA = 'Aguenta essa';
export const VER_O_PLACAR = 'Ver o placar';

/** Na nota de quem respondeu, o principal deixa de ser o X1. */
export const VER_O_ESTRAGO = 'Ver o estrago';

export const GANHOU = ['Passou por cima.', 'Tá pago.'] as const;
export const PERDEU = ['Tomou.', 'Foi atropelado.'] as const;

/**
 * Empate.
 *
 * **O jogo não desempata sozinho.** Nenhuma medida escondida decide a briga por
 * baixo do pano — se a pessoa não viu o critério, o critério não vale
 * (`ARENA.md`, SCOREBOARD). O texto assume que não resolveu nada.
 */
export const EMPATOU = 'Deu igual. Que sacanagem.';
export const EMPATOU_COMENTARIO = 'Ninguém ganhou, ninguém perdeu, e ninguém tá satisfeito.';

/** A ação do placar nesta fatia. A revanche é a #100. */
export const MANDAR_O_LINK = 'Mandar o link';
