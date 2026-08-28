/**
 * De onde a sessão veio — lido da URL, uma vez, na primeira entrada.
 *
 * Regra pura: recebe os parâmetros já extraídos (quem lê `window.location` é o
 * adaptador, em `plataforma/web/telemetria.ts` — núcleo não toca `window`,
 * ADR 0001 §2) e devolve o que vai para `eventos_de_telemetria`.
 *
 * Suporta pelo menos `tiktok`, `instagram`, `youtube`, `whatsapp`, `google`,
 * `qr` e `x1`, mas não é uma lista fechada: `origem` é texto livre, porque uma
 * campanha nova em outra rede não pode exigir deploy para ser contada.
 */

const TAMANHO_MAXIMO_ORIGEM = 40;
const TAMANHO_MAXIMO_CAMPANHA = 80;
const TAMANHO_MAXIMO_CONTEUDO = 80;

/** `origem` quando a URL não diz de onde a pessoa veio. */
export const ORIGEM_DIRETA = 'direct';

export interface AquisicaoDaSessao {
  readonly origem: string;
  readonly campanha: string | null;
  readonly conteudo: string | null;
}

/**
 * O formato de `URLSearchParams` — só o método que esta regra usa. Aceitar a
 * interface (e não a classe) deixa o teste construir um dublê sem precisar de
 * `window`.
 */
export interface LeitorDeParametros {
  get(nome: string): string | null;
}

function normalizado(valor: string | null | undefined, tamanhoMaximo: number): string | null {
  if (!valor) return null;
  const cortado = valor.trim().slice(0, tamanhoMaximo);
  return cortado.length > 0 ? cortado : null;
}

/**
 * Lê a aquisição a partir dos parâmetros da URL de entrada (`?src=`,
 * `?campaign=`, `?content=`).
 *
 * `origem` cai para `direct` quando `?src=` não existe ou vem vazio — nunca
 * fica `null`: todo evento tem uma origem, mesmo que seja "sem origem".
 */
export function lerAquisicaoDaURL(parametros: LeitorDeParametros): AquisicaoDaSessao {
  const origem =
    normalizado(parametros.get('src'), TAMANHO_MAXIMO_ORIGEM)?.toLowerCase() ?? ORIGEM_DIRETA;

  return {
    origem,
    campanha: normalizado(parametros.get('campaign'), TAMANHO_MAXIMO_CAMPANHA),
    conteudo: normalizado(parametros.get('content'), TAMANHO_MAXIMO_CONTEUDO),
  };
}
