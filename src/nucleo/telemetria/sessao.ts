import type { AquisicaoDaSessao } from './aquisicao';

/**
 * A sessão de telemetria — anônima, do navegador, sem fingerprinting.
 *
 * Regra pura: decide se reaproveita a sessão guardada ou abre uma nova. Quem
 * lê e grava o armazenamento, e quem gera o `id`, é o adaptador
 * (`plataforma/web/telemetria.ts`) — aqui não existe `localStorage`, `crypto`
 * nem `Date.now()` direto, só a decisão (ADR 0001 §2).
 *
 * UMA SESSÃO É UMA JANELA DE INATIVIDADE, não "para sempre". Sem isso, a
 * origem da primeira visita de uma pessoa ficaria colada nela por meses, e
 * `abriu_arena` só contaria a primeiríssima vez que o navegador foi usado —
 * o resto do funil (recarregar depois de uma semana, voltar noutro dia) ficaria
 * invisível. Com janela deslizante, uma sessão ativa nunca expira no meio do
 * jogo, e uma pausa longa conta como visita nova, com aquisição nova.
 */

/** 30 minutos de inatividade — o mesmo padrão que a maioria das ferramentas de produto usa. */
export const DURACAO_DA_SESSAO_MS = 30 * 60 * 1000;

export interface SessaoDeTelemetria {
  readonly id: string;
  readonly origem: string;
  readonly campanha: string | null;
  readonly conteudo: string | null;
  /** Epoch ms: depois disso, a sessão está vencida e a próxima leitura abre outra. */
  readonly expiraEm: number;
  /**
   * `abriu_arena` já foi mandado nesta sessão?
   *
   * O evento conta "uma vez por sessão" (não uma vez por render, não uma vez
   * por recarregada dentro da mesma janela) — sem esta marca, cada F5 durante
   * uma partida ativa infla `abriu_arena` sem um `iniciou_arroto` correspondente,
   * e o funil mentiria sobre a taxa de abertura → primeiro arroto.
   */
  readonly abriuArenaRegistrada: boolean;
}

export interface DecisaoDeSessao {
  readonly guardada: SessaoDeTelemetria | null;
  readonly agora: number;
  readonly aquisicaoAtual: AquisicaoDaSessao;
  readonly gerarId: () => string;
}

/**
 * Decide a sessão vigente.
 *
 * Guardada e ainda dentro da janela: reaproveita id e aquisição (NUNCA
 * sobrescreve a origem original por causa de navegação dentro do próprio
 * jogo) e desliza o prazo. Vencida ou inexistente: abre sessão nova com a
 * aquisição de agora.
 */
export function decidirSessao(decisao: DecisaoDeSessao): SessaoDeTelemetria {
  const { guardada, agora, aquisicaoAtual, gerarId } = decisao;

  if (guardada && guardada.expiraEm > agora) {
    return { ...guardada, expiraEm: agora + DURACAO_DA_SESSAO_MS };
  }

  return {
    id: gerarId(),
    origem: aquisicaoAtual.origem,
    campanha: aquisicaoAtual.campanha,
    conteudo: aquisicaoAtual.conteudo,
    expiraEm: agora + DURACAO_DA_SESSAO_MS,
    abriuArenaRegistrada: false,
  };
}

/** A mesma sessão, com `abriu_arena` marcada como já enviada. */
export function comAbriuArenaRegistrada(sessao: SessaoDeTelemetria): SessaoDeTelemetria {
  return { ...sessao, abriuArenaRegistrada: true };
}
