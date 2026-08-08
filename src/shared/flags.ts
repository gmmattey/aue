/**
 * Flags de lançamento — fonte única.
 *
 * Regra de ouro: **o padrão é DESLIGADO**. Um deploy sem nenhuma variável de
 * ambiente configurada já sai com o corte de lançamento correto. Ligar uma
 * feature é sempre um ato deliberado (variável explícita + rebuild), nunca um
 * acidente de configuração ausente.
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
   * Ligas / Campeonatos. Desligada: a aba "Ligas" some da navegação e a tela
   * de lobby fica inalcançável por qualquer caminho.
   *
   * O código do campeonato NÃO foi apagado — hoje a tela de lobby exibe
   * participantes e pódio escritos à mão no código (nomes e notas que não
   * existem no banco). Ligar esta flag sem antes plugar a tela em
   * `getChampionshipLobby` volta a mostrar dado inventado ao usuário.
   */
  ligas: boolean;

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

  /**
   * Criação avançada de comunidades/grupos. Desligada: as telas de criação e
   * entrada em grupos ficam fora do roteador (é o estado atual — elas são
   * código de protótipo, com `alert()` como interface).
   */
  gruposAvancados: boolean;
}

export const FLAGS: Flags = {
  ligas: ligada(import.meta.env.VITE_FEATURE_LIGAS),
  assinatura: ligada(import.meta.env.VITE_FEATURE_ASSINATURA),
  push: ligada(import.meta.env.VITE_FEATURE_PUSH),
  gruposAvancados: ligada(import.meta.env.VITE_FEATURE_GRUPOS_AVANCADOS),
};

/** Exportado para teste; não use para decidir nada em tela. */
export const __ligada = ligada;
