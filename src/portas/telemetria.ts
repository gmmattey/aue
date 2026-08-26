/**
 * A porta da telemetria — os dez eventos do funil, e nada além disso.
 *
 * A Arena manda o nome do evento (e, quando existe, o código da batalha) e
 * esquece. Ela não sabe o que é sessão, Supabase, `sessionStorage` nem CHECK de
 * banco — quem conversa com o servidor é o adaptador (ADR 0001 §2 e §7).
 *
 * TELEMETRIA NUNCA É DO CAMINHO CRÍTICO. `registrar` não devolve promessa: quem
 * chama não tem como (nem deve) esperar por ela. Falha de rede, de
 * configuração ou de banco é tratada dentro do adaptador — nunca sobe, nunca
 * aparece para quem está jogando.
 */

/** Os dez eventos do funil v1 (`docs/schema/nomenclatura.md`, `eventos_de_telemetria`). */
export const EVENTOS_DE_TELEMETRIA = [
  'abriu_arena',
  'iniciou_arroto',
  'recebeu_nota',
  'tentou_novamente',
  'compartilhou',
  'criou_x1',
  'abriu_x1',
  'respondeu_x1',
  'pediu_revanche',
  'concluiu_roda',
] as const;

export type EventoDeTelemetria = (typeof EVENTOS_DE_TELEMETRIA)[number];

export interface DetalheDoEvento {
  /**
   * O código do link da batalha (`batalhas.codigo_de_acesso`), só quando o
   * evento pertence a um fluxo de X1 ou de roda e faz sentido relacionar as
   * duas pontas. Nunca o uuid interno — a Arena não conhece esse uuid, só o
   * código do link (ver a migração `20260826000001`).
   */
  readonly batalhaCodigo?: string;
}

export interface Telemetria {
  /**
   * Registra o evento. Best-effort, silencioso e sem retorno: dispara e
   * esquece. Nunca lança, nunca bloqueia a jornada, nunca aparece como erro
   * para quem está jogando.
   */
  registrar(evento: EventoDeTelemetria, detalhe?: DetalheDoEvento): void;
}
