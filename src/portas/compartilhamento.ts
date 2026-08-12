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
  /**
   * Id do nó a virar imagem. `score-card` (nota) ou `podio-card` (pódio).
   *
   * **OMITA para mandar só texto e link.** Antes isto era obrigatório, e quem
   * não tinha cartão passava um id inventado (`'nao-existe-cartao-aqui'`)
   * contando que o adaptador estourasse por dentro e caísse no texto.
   *
   * Não caía. O erro voltava como `falhou`, a folha do sistema nunca abria, e
   * o "Mandar o desafio" da Arena não fazia nada — sem sintoma, porque quem
   * chamava também ignorava o retorno. Compartilhar sem imagem é caso legítimo
   * e agora se diz assim.
   */
  elementId?: string;
  /**
   * Ou vai a imagem, ou é falha. **Nunca texto escondido no lugar dela.**
   *
   * Sem isto, o adaptador degrada sozinho: nó fora da tela, html2canvas que
   * estourou ou aparelho que recusa arquivo caíam em texto e link com um
   * `console.warn`, e o retorno dizia `via: 'texto'` — que ninguém lia. A
   * pessoa apertava "compartilhar a nota", mandava e saía achando que a nota
   * tinha viajado. Ligado, esses três casos voltam `falhou` e quem chama
   * avisa.
   *
   * **Default `false` de propósito.** As telas antigas (`AudioRecorder`,
   * `DisputaLocalScreen`) contam com a degradação, e endurecer o adaptador
   * para todo mundo tiraria o compartilhar delas em aparelho que não aceita
   * arquivo. Quem quer o rigor pede.
   */
  exigirImagem?: boolean;
  /** O link que viaja. Sem ele, vai a home. */
  url?: string | null;
  titulo?: string;
  texto?: string;
}

export interface Compartilhamento {
  compartilhar(pedido: PedidoDeCompartilhamento): Promise<ResultadoDoCompartilhamento>;

  /**
   * Este aparelho sabe mandar arquivo junto do texto?
   *
   * A pergunta existe para a tela **não prometer o que não entrega**: onde a
   * resposta é `false`, o botão continua mandando texto e link e nada na tela
   * fala em imagem. É a diferença entre um botão honesto e um botão que abre
   * a folha do sistema sem a nota dentro.
   *
   * Booleano, e não `Promise`: quem responde é o próprio navegador, na hora, e
   * a tela precisa disso antes do primeiro render do resultado. Fora da web,
   * o adaptador daquela plataforma responde do jeito dele — a UI continua sem
   * saber quem é `navigator`.
   */
  sabeMandarImagem(): boolean;

  /**
   * Copiar texto para a área de transferência.
   *
   * Devolve `false` quando o navegador não deixou — e a tela **precisa** dizer
   * isso. Fingir que copiou é o pior dos mundos: a pessoa vai colar no grupo e
   * mandar a mensagem anterior dela, sem entender por quê.
   */
  copiar(texto: string): Promise<boolean>;
}
