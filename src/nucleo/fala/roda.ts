/**
 * A fala da roda — a disputa com um aparelho só, passando de mão em mão.
 *
 * Duas coisas mandam aqui. A primeira: o celular está gravando gente que não
 * pediu para ser gravada, e o aviso disso fica onde os nomes são escritos, não
 * escondido na política. A segunda: ninguém perde o próprio arroto por causa de
 * passar o telefone — a nota fica na tela até alguém tocar.
 */

/* ─────────────────── Abrir a roda ─────────────────── */

/** O discreto do `IDLE` que abre a sobreposição. */
export const CHAMAR_A_MESA = 'Chamar a mesa';

export const RODA_TITULO = 'Quem tá na roda?';
export const RODA_COMENTARIO = 'De dois a cinco. Deixou em branco, a gente batiza.';
export const RODA_NOME_PLACEHOLDER = 'Nome (deixa em branco que a gente batiza)';
export const RODA_MAIS_UM = '+ mais um';
export const RODA_TIRAR = 'Tirar da roda';

export const RODA_ROUNDS = 'Quantos rounds?';
export const RODA_ONDE = 'Onde é essa vergonha?';
export const RODA_SEM_LUGAR = 'Deixa pra lá';

/**
 * O aviso de gravação.
 *
 * Fica SEMPRE VISÍVEL e acima do CTA, na mesma tela onde os nomes são escritos.
 * Não é caixinha de aceite: é aviso, e quem digita os nomes é quem tem como
 * avisar a mesa. É o único ponto do jogo em que uma pessoa registra o áudio de
 * outra.
 */
export const RODA_AVISO = 'O celular vai gravar todo mundo aí. Avisa a mesa antes de abrir.';

export const RODA_ABRIR = 'Abrir a roda';
export const RODA_ABRINDO = 'Abrindo…';
export const RODA_AGORA_NAO = 'Agora não';

/* ─────────────────── A vez ─────────────────── */

export function agoraEhVoce(nome: string): string {
  return `Agora é você, ${nome}`;
}

export function roundDeTotal(round: number, total: number): string {
  return `Round ${round} de ${total}`;
}

export const MANDA = 'Manda';

/** Quem já gravou e quem ainda falta, na linha da mesa. */
export const AINDA_NAO = '—';

/* ─────────────────── Depois da nota ─────────────────── */

export function passaOCelular(nome: string): string {
  return `Passa o celular pro ${nome}.`;
}

export const PASSA_O_CELULAR = 'Passa o celular';
export const VER_O_PODIO = 'Ver o pódio';

export const ACABOU = 'Acabou essa porra';
export const ACABOU_CONFIRMA = 'Acabou mesmo? Vai pro pódio com o que tem.';
export const ACABOU_SIM = 'Acabou';
export const ACABOU_VOLTA = 'Volta';

/*
  Fechar a roda a partir da VEZ não passa pelo pódio, e isso é decisão.

  Chegar no pódio dali exigiria a seta `IDLE → SCOREBOARD`, que o plano recusou
  — a roda acrescenta UMA aresta à Arena, `SCOREBOARD → IDLE`. Quem quer o pódio
  o alcança do `RESULT`, que é o passo anterior a toda vez que não seja a
  primeira. Aqui a roda só fecha.
*/
export const FECHAR_A_RODA_CONFIRMA = 'Acabou mesmo? A roda fecha aqui.';

/* ─────────────────── O pódio ─────────────────── */

export function humilhouAMesa(nome: string): string {
  return `${nome} humilhou a mesa`;
}

export const PODIO_COMENTARIO = 'Os outros que arrotem melhor da próxima.';
export const PODIO_EMPATE = 'Deu empate lá em cima';
export const PODIO_EMPATE_COMENTARIO = 'Ninguém humilhou ninguém. Vergonha pros dois.';
export const MANDAR_O_PODIO = 'Mandar o pódio';

/* ─────────────────── Deu ruim ─────────────────── */

export const NAO_ABRIU_A_RODA = 'Não deu pra abrir a roda.';

/**
 * O turno que não entrou.
 *
 * A pessoa arrotou, o juiz deu a nota, e o registro não subiu. A vez continua
 * sendo dela — ela não gravou, e a vez é derivada do que está gravado.
 */
export function turnoNaoEntrou(nome: string): string {
  return `Esse arroto não entrou. ${nome} manda de novo.`;
}
