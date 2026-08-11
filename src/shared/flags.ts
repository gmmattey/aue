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
  /**
   * Auê+ (assinatura). Desligada: nenhum caminho de venda de assinatura deve
   * aparecer. Não existe provedor de pagamento integrado.
   */
  assinatura: boolean;

  /**
   * Notificações push. Desligada: nenhum controle de notificação deve ser
   * oferecido. Depende de VAPID configurada (`VITE_VAPID_PUBLIC_KEY` e os
   * segredos da Edge Function); sem isso o usuário liga o interruptor e nada
   * nunca chega.
   */
  push: boolean;

  /*
    ------------------------------------------------------------------------
    As seis abaixo entraram com o LOGIN ANÔNIMO (`signInAnonymously` no boot).

    Elas existem por um motivo específico e que precisa ficar registrado: até
    aqui, "tem sessão?" era sempre `false` na prática — só havia botão de login
    do Google e ninguém o usava. Vários caminhos do app estavam desligados por
    acidente, não por decisão. Com sessão anônima, TODOS ligam de uma vez.

    Estas flags são o que transforma esse acidente em decisão explícita.
    ------------------------------------------------------------------------
  */

  /**
   * Tela de perfil. Desligada: o avatar do cabeçalho não é renderizado e o App
   * recusa a view.
   *
   * O cabeçalho decidia entre "Entrar" e avatar por `session`. Com sessão
   * anônima o avatar passaria a aparecer sempre, levando a uma tela de perfil
   * de um usuário que nunca se cadastrou.
   */
  perfil: boolean;

  /**
   * XP, níveis e conquistas na tela de resultado. Desligada: a linha "+N XP" e
   * o aviso de limite somem do card.
   *
   * `calcular_xp_do_resultado` (20260807000002) tem um teto de 5 gravações com XP a
   * cada 24h, que só se aplicava a quem tinha conta. Com sessão anônima ele
   * passa a valer para todos — e numa disputa presencial (5 pessoas × 3 rounds
   * = 15 gravações no mesmo aparelho) a tela anunciaria "Limite de 5 gravações
   * em 24h" no meio do churrasco. O teto continua existindo no banco; o que
   * esta flag desliga é falar dele numa tela onde ele não faz sentido.
   */
  xp: boolean;

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
   * A Arena — a superfície de estado único que vai substituir a sequência de
   * telas. Desligada: a raiz serve o fluxo de hoje, intocado.
   *
   * ELA NÃO É UMA FEATURE DO CATÁLOGO ACIMA. As outras flags escondem código
   * legado que está na fila para sair (#109); esta escolhe qual jogo a raiz
   * serve.
   *
   * A PRODUÇÃO RODA COM ELA LIGADA — o loop fecha: grava, dá nota, desafia,
   * responde e faz revanche. O padrão desligado continua servindo o fluxo velho
   * enquanto ele existir, e some junto com ele na #109.
   */
  arena: boolean;
}

export const FLAGS: Flags = {
  assinatura: ligada(import.meta.env.VITE_FEATURE_ASSINATURA),
  push: ligada(import.meta.env.VITE_FEATURE_PUSH),
  perfil: ligada(import.meta.env.VITE_FEATURE_PERFIL),
  xp: ligada(import.meta.env.VITE_FEATURE_XP),
  loginSocial: ligada(import.meta.env.VITE_FEATURE_LOGIN_SOCIAL),
  disputaLocal: ligada(import.meta.env.VITE_FEATURE_DISPUTA_LOCAL),
  arena: ligada(import.meta.env.VITE_FEATURE_ARENA),
};

/** Exportado para teste; não use para decidir nada em tela. */
export const __ligada = ligada;
