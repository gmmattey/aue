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
 * O empurrão para a revanche.
 *
 * As três falas do placar terminam aqui, ganhando ou perdendo — é o que o
 * `ARENA.md` sempre pediu, e é o que transforma uma partida em rivalidade.
 * Antes da revanche existir, prometer isso seria mentira; agora não é mais.
 */
export const GANHOU_COMENTARIO = 'Ele vai querer revanche. Deixa.';
export const PERDEU_COMENTARIO = 'Vai ficar por isso mesmo?';

/**
 * Empate.
 *
 * **O jogo não desempata sozinho.** Nenhuma medida escondida decide a briga por
 * baixo do pano — se a pessoa não viu o critério, o critério não vale
 * (`ARENA.md`, SCOREBOARD). O texto assume que não resolveu nada.
 */
export const EMPATOU = 'Deu igual. Que sacanagem.';
export const EMPATOU_COMENTARIO = 'Ninguém ganhou, ninguém perdeu. Desempata.';

export const MANDAR_O_LINK = 'Mandar o link';

/** A ação principal do placar. */
export const REVANCHE = 'Revanche';

/** O que o jogo diz depois de uma revanche. */
export const SUPEROU = 'Melhorou.';
export const SUPEROU_COMENTARIO = 'Tua linha mudou.';

/*
  NÃO SUPEROU é dito na lata. Esconder que a tentativa não valeu faria a pessoa
  achar que o placar quebrou — e a melhor tentativa dela continua valendo, o
  que é uma notícia boa disfarçada de ruim.
*/
export const NAO_SUPEROU = 'Não superou.';
export const NAO_SUPEROU_COMENTARIO = 'Fica valendo a tua melhor. Tenta de novo.';

/** A fala da gravação de revanche. */
export const GRAVANDO_REVANCHE = ['Agora vai.', 'Mostra serviço.'] as const;
