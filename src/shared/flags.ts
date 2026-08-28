/**
 * Flags de lançamento — fonte única.
 *
 * Regra de ouro: **o padrão é DESLIGADO**. Ligar uma feature é sempre um ato
 * deliberado (variável explícita + rebuild), nunca um acidente de configuração
 * ausente.
 *
 * E é **por isso** que o corte que a produção publica precisa estar declarado em
 * algum lugar: build sem variável nenhuma não sai com o corte de produção, sai
 * com tudo desligado. O corte mora no `.github/workflows/publicar-firebase.yml`,
 * está copiado no `.env.example` e os dois são travados por
 * `src/corte-de-producao.paridade.test.ts`.
 *
 * Antes deste módulo, cada tela lia `import.meta.env` por conta própria, com
 * convenções diferentes. Não havia como responder "o que está ligado neste
 * build?" sem varrer o código inteiro.
 *
 * ATENÇÃO: variável `VITE_*` é lida em TEMPO DE BUILD. Mudar o valor no painel
 * da hospedagem não liga nada sozinho — exige rebuild e redeploy.
 */

/**
 * Só `1` e `true` ligam. Qualquer outra coisa — vazio, ausente, `0`, `false`,
 * o placeholder do `.env.example`, um espaço em branco — deixa desligado.
 */
function ligada(valor: unknown): boolean {
  if (typeof valor !== 'string') return false;
  const normalizado = valor.trim().toLowerCase();
  return normalizado === '1' || normalizado === 'true';
}

export interface Flags {
  /*
    ------------------------------------------------------------------------
    ERAM ONZE. A #109 apagou oito, junto com o código que elas escondiam.

    O que saiu: feed, ranking global, XP, conquistas, perfil social, grupos e
    comunidades, ligas, push e assinatura. Nenhuma delas estava ligada em
    produção; o que elas guardavam era código da visão anterior, decidido fora
    do jogo. Flag desligada convida a ligar, e ligar aquilo publicava o arroto
    de todo visitante, enchia o ranking de "Arrotador a1b2c3" e oferecia
    notificação que ninguém manda.

    Quem sobrou não é sobra: as três abaixo escondem coisa que ainda vai
    acontecer. `aFlagMorta.test.ts` guarda a porta contra ramo que tente voltar
    por copiar-e-colar.
    ------------------------------------------------------------------------
  */

  /**
   * Login social (Google). Desligada: o botão "Entrar" não é renderizado.
   *
   * O MVP não pede login: a identidade é a sessão anônima. O código de
   * `signInWithGoogle` continua em `db/supabase.ts` — ligar esta flag é o
   * primeiro passo do MVP 2, onde o login vira uma PROMOÇÃO da conta anônima
   * (`linkIdentity`), preservando o histórico, e não um muro na entrada.
   */
  loginSocial: boolean;

  /**
   * Disputa presencial (a segunda fatia do lançamento). Desligada: a tela fica
   * fora do roteador e não há entrada para ela.
   *
   * Só deve ser ligada depois de uma disputa de 5 participantes × 3 rounds
   * rodada de ponta a ponta num telefone real.
   */
  disputaLocal: boolean;

  /**
   * A RODA DENTRO DA ARENA — a disputa presencial no jogo de verdade.
   * Desligada: nenhuma entrada para ela aparece, e o `IDLE` é o de sempre.
   *
   * É FLAG NOVA DE PROPÓSITO, e não a `disputaLocal` reaproveitada. Aquela está
   * `=1` em produção governando a tela do fluxo velho; reusar o nome ligaria a
   * roda no ar no merge, sem a disputa de 5 pessoas × 3 rounds num telefone
   * real — que é o teste que libera esta aqui.
   *
   * `VITE_FEATURE_DISPUTA_LOCAL` não governa nada dentro da Arena.
   */
  disputaNaArena: boolean;


}

export const FLAGS: Flags = {
  loginSocial: ligada(import.meta.env.VITE_FEATURE_LOGIN_SOCIAL),
  disputaLocal: ligada(import.meta.env.VITE_FEATURE_DISPUTA_LOCAL),
  disputaNaArena: ligada(import.meta.env.VITE_FEATURE_DISPUTA_NA_ARENA),
};

/** Exportado para teste; não use para decidir nada em tela. */
export const __ligada = ligada;
