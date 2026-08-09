/**
 * A fala de apagar o próprio arroto, e a do menu.
 *
 * Aqui a voz continua solta, mas **não pode ser engraçada a ponto de esconder
 * risco**: apagar não tem volta, e a pessoa precisa entender o que some e o
 * que fica antes de tocar.
 */

export const APAGAR_O_MEU = 'Apagar o meu arroto';

/*
  A confirmação DIZ O QUE ACONTECE, em vez de perguntar "tem certeza?".
  "Tem certeza" transfere a dúvida para a pessoa sem dar informação nenhuma —
  ela continua sem saber se a nota some junto.
*/
export const CONFIRMAR_TITULO = 'Apagar de vez?';
export const CONFIRMAR_COMENTARIO = 'O som some do servidor e não volta. A nota da disputa fica.';
export const CONFIRMAR_SIM = 'Apagar';
export const CONFIRMAR_NAO = 'Deixa quieto';

export const APAGANDO = 'Apagando…';
export const APAGADO = 'Apagado.';

/*
  Sem meio-termo. "Provavelmente foi apagado" é a frase que deixaria alguém
  seguir a vida achando que o arroto sumiu enquanto ele continua no servidor.
*/
export const NAO_DEU_PRA_APAGAR = 'Não consegui apagar agora. Tenta de novo.';

/** O que a linha do placar diz quando o dono apagou. */
export const DONO_APAGOU = 'Quem gravou apagou.';

/**
 * O que a linha diz quando a moderação escondeu.
 *
 * Genérico de propósito: contar da denúncia para quem não tem nada a ver com
 * ela seria expor uma coisa que não é da conta de terceiros.
 */
export const INDISPONIVEL = 'Esse arroto não está disponível.';

/* ── O menu ── */

export const MENU = 'Menu';
export const COMO_FUNCIONA_TITULO = 'Como funciona';
export const COMO_FUNCIONA = [
  'Você arrota, o juiz dá uma nota de 0 a 100 e você chama alguém pro X1.',
  'Quem recebe o link ouve o teu arroto e responde. Ganha a nota maior.',
  'O teu arroto fica guardado pra briga funcionar. Dá pra apagar quando quiser.',
] as const;
export const PRIVACIDADE = 'Privacidade';
export const TERMOS = 'Termos';
export const FECHAR = 'Fechar';
