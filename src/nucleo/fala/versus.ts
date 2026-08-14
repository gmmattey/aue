/**
 * A fala de quem foi chamado, e a do placar.
 *
 * O `VERSUS` tem uma função só: fazer a pessoa **ouvir** e querer responder.
 * Por isso a provocação é curta e mira no desempenho da pessoa naquele momento
 * — nunca em característica dela.
 */

/**
 * Quem chamou. Molde com `{nome}` — o sorteio escolhe o molde, o nome entra
 * depois, do mesmo jeito que já funciona em `faltaTu` e `revancheContra`.
 */
export const CHAMOU_VOCE = [
  '{nome} te chamou.',
  '{nome} tá te cutucando.',
  '{nome} quer ver se tu aguenta.',
  '{nome} te desafiou.',
  '{nome} tá te esperando.',
] as const;

/** Troca o `{nome}` do molde sorteado pelo nome de quem chamou. */
export function chamouVoce(molde: string, nome: string): string {
  return molde.replace('{nome}', nome);
}

export const PROVOCACOES = ['Duvido bater.', 'Coé, vai peidar?', 'Vai deixar barato?'] as const;

/** O rótulo do player do adversário. */
export const O_ARROTO_DELE = 'O arroto dele';

export const AGUENTA_ESSA = 'Aguenta essa';
export const VER_O_PLACAR = 'Ver o placar';

/** Na nota de quem respondeu, o principal deixa de ser o X1. */
export const VER_O_ESTRAGO = 'Ver o estrago';

export const GANHOU = [
  'Passou por cima.',
  'Tá pago.',
  'Isso foi fácil.',
  'Nem sentiu.',
  'Deu de goleada.',
  'Mandou ver.',
] as const;

export const PERDEU = [
  'Tomou.',
  'Foi atropelado.',
  'Rodou.',
  'Ficou pra trás.',
  'Levou a pior.',
  'Apanhou.',
] as const;

/**
 * O empurrão para a revanche.
 *
 * As três falas do placar terminam aqui, ganhando ou perdendo — é o que o
 * `ARENA.md` sempre pediu, e é o que transforma uma partida em rivalidade.
 * Antes da revanche existir, prometer isso seria mentira; agora não é mais.
 */
export const GANHOU_COMENTARIO = [
  'Ele vai querer revanche. Deixa.',
  'Ele já tá procurando desculpa.',
  'Deixa ele se recompor.',
  'Chama de novo, se aguentar.',
  'Podia parar por aqui. Duvido que ele deixe.',
] as const;

export const PERDEU_COMENTARIO = [
  'Vai ficar por isso mesmo?',
  'Chama de novo e desconta.',
  'Isso não pode ficar assim.',
  'Tá esperando o quê pra revanche?',
  'Não vai deixar barato, né?',
] as const;

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

/* ═══════════════════════ O placar da briga ═══════════════════════ */

/*
  SUPEROU / NÃO SUPEROU SAÍRAM.

  As duas falavam de melhor tentativa ("Fica valendo a tua melhor"), e melhor
  tentativa deixou de existir na briga por link: agora cada revanche é um round.
  Deixar o texto de pé seria o jogo mentindo no primeiro round entregue.
*/

/** Os rótulos dos dois blocos do palco. */
export const PLACAR_DA_BRIGA = 'Placar da briga';
export const ULTIMO_ROUND = 'Último round';

/** O lado que ainda não arrotou neste round. */
export const FALTA_TU = 'falta tu';
export const FALTA_ELE = 'falta ele';

/**
 * O round aberto do outro: ele mandou, e a bola está comigo.
 *
 * A nota chega **escrita**, com vírgula. Formatar é `shared/formato/nota.ts` e
 * o núcleo não importa de `shared` — a direção de dependência é regra da casa.
 */
export function faltaTu(nome: string, notaEscrita: string): string {
  return `${nome} mandou ${notaEscrita}. Falta tu.`;
}

export const FALTA_TU_COMENTARIO = 'Vai deixar barato?';

/** O round aberto meu: já mandei, e sem o link ele nem fica sabendo. */
export const MANDOU_FALTA_ELE = 'Mandou. Agora é ele.';
export const MANDOU_COMENTARIO = 'Sem link ele não fica sabendo.';

/** O teto de rounds. Chega. */
export const CHEGA = 'Cinquenta rounds. Chega, porra.';
export const CHEGA_COMENTARIO = 'Vocês dois precisam de ajuda.';

/** A fala da gravação de revanche. */
export const GRAVANDO_REVANCHE = [
  'Agora vai.',
  'Mostra serviço.',
  'Desconta.',
  'Revida.',
  'Não erra essa.',
] as const;

/**
 * A linha da cerimônia — 3, 2, 1 antes da revanche.
 *
 * Linha fixa, não pool: `DESIGN.md` §14.3 não lista a revanche entre os
 * momentos que sorteiam fala. É contra quem a pessoa vai bater de novo, e
 * isso não varia de sessão para sessão.
 */
export function revancheContra(nome: string): string {
  return `Revanche contra ${nome}.`;
}
