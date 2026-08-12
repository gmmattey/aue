/**
 * A CASCATA DA REVELAÇÃO — a ordem em que o resultado aparece.
 *
 * **Não é estado da Arena.** Os dez estados de `docs/jogo/ARENA.md` continuam
 * os dez; isto aqui é momento dentro do `RESULT`, como `conferindo` e
 * `abrindoODesafio` já são. O protótipo chama de `RESULT_REVEAL`, e o próprio
 * `ARENA.md` classifica como momento.
 *
 * Por que a ordem é requisito e não estilo: mostrar tudo de uma vez mata o
 * payoff. O número é o que a pessoa veio buscar — ele respira sozinho antes de
 * qualquer coisa secundária se mexer, e a briga só aparece quando já não tem
 * mais nada para ler (design system §13.3).
 */

/** As fases, na ordem. Cada uma acrescenta — nenhuma tira o que já entrou. */
export const FASES_DA_REVELACAO = ['nota', 'reacao', 'comentario', 'medidas', 'x1'] as const;

export type FaseDaRevelacao = (typeof FASES_DA_REVELACAO)[number];

/** A última: daqui em diante o `RESULT` está inteiro na tela. */
export const FASE_FINAL: FaseDaRevelacao = 'x1';

/**
 * Quanto tempo depois da nota chegar cada fase entra.
 *
 * Os atrasos são acumulados a partir do fim da contagem, não do começo do
 * `RESULT`: num aparelho lento a contagem demora mais, e amarrar no relógio do
 * estado faria as medidas aparecerem antes de o número terminar de subir.
 *
 * O `+120ms` entre reação e comentário é a variante atrasada da entrada padrão
 * de bloco (§13.3).
 */
export const ATRASOS_DA_REVELACAO_MS: Readonly<Record<Exclude<FaseDaRevelacao, 'nota'>, number>> = {
  reacao: 260,
  comentario: 380,
  medidas: 640,
  x1: 900,
};

export interface PassoDaRevelacao {
  readonly fase: FaseDaRevelacao;
  /** Milissegundos depois de a contagem terminar. */
  readonly atrasoMs: number;
}

/**
 * Os passos a agendar quando a nota chega ao fim.
 *
 * Com movimento reduzido não sobra passo nenhum: quem pediu menos animação não
 * pediu menos informação, então o `RESULT` aparece inteiro de uma vez. Quem
 * chama trata a lista vazia pulando direto para `FASE_FINAL`.
 */
export function passosDaRevelacao(movimentoReduzido: boolean): readonly PassoDaRevelacao[] {
  if (movimentoReduzido) return [];
  return [
    { fase: 'reacao', atrasoMs: ATRASOS_DA_REVELACAO_MS.reacao },
    { fase: 'comentario', atrasoMs: ATRASOS_DA_REVELACAO_MS.comentario },
    { fase: 'medidas', atrasoMs: ATRASOS_DA_REVELACAO_MS.medidas },
    { fase: 'x1', atrasoMs: ATRASOS_DA_REVELACAO_MS.x1 },
  ];
}

/** Esta fase já chegou? Serve para a tela perguntar "posso mostrar isto?". */
export function jaChegouEm(atual: FaseDaRevelacao, alvo: FaseDaRevelacao): boolean {
  return FASES_DA_REVELACAO.indexOf(atual) >= FASES_DA_REVELACAO.indexOf(alvo);
}
