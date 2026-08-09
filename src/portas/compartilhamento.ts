/**
 * A porta de compartilhar.
 *
 * O tipo do resultado morava em `features/audio/useShareResult.ts` e veio para
 * cá porque ele é **contrato**, não detalhe da web: quem consome precisa saber
 * que existe "a pessoa desistiu" e que isso não é erro. `useShareResult`
 * continua exportando o tipo, então nenhum consumidor de hoje precisou mudar.
 *
 * A implementação web é `plataforma/web/compartilhamento.ts` — é o mesmo
 * código que já rodava, mudado de lugar, sem uma vírgula de comportamento
 * diferente.
 */

/** O que aconteceu com o pedido de compartilhar. */
export type ResultadoDoCompartilhamento =
  /** Foi para a folha de compartilhamento do sistema, com imagem. */
  | { ok: true; via: 'imagem' }
  /** Foi para a folha do sistema, mas só com texto e link. */
  | { ok: true; via: 'texto' }
  /** O usuário fechou a folha sem escolher. Não é erro. */
  | { ok: false; motivo: 'cancelado' }
  /** O navegador não tem Web Share API. Cabe à tela oferecer outro caminho. */
  | { ok: false; motivo: 'indisponivel' }
  /** Deu errado de verdade. */
  | { ok: false; motivo: 'falhou'; detalhe: string };

export interface PedidoDeCompartilhamento {
  /** Id do nó a virar imagem. `score-card` (nota) ou `podio-card` (pódio). */
  elementId: string;
  /** O link que viaja. Sem ele, vai a home. */
  url?: string | null;
  titulo?: string;
  texto?: string;
}

export interface Compartilhamento {
  compartilhar(pedido: PedidoDeCompartilhamento): Promise<ResultadoDoCompartilhamento>;
}
