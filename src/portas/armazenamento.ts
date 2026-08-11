/**
 * A porta do que o jogo guarda no aparelho.
 *
 * REGRA QUE JUSTIFICA A PORTA EXISTIR: **nada aqui lança.** O `localStorage`
 * do Safari em aba privada não devolve vazio — ele levanta exceção — e o
 * mesmo vale para quem desligou armazenamento de site no navegador. Um jogo
 * que não abre porque não conseguiu lembrar de uma frase é um jogo quebrado
 * por um enfeite.
 *
 * O que mora aqui é pista descartável, e só (ADR §5): o que é oficial,
 * competitivo ou atravessa aparelho vive no Postgres. Nada de dado pessoal,
 * nada de áudio.
 */
export interface ArmazenamentoLocal {
  /** O valor, ou `null` quando não existe, está corrompido ou o navegador barrou. */
  ler(chave: string): string | null;

  /** Grava. Devolve `false` quando o navegador não deixou — sem lançar. */
  gravar(chave: string, valor: string): boolean;

  /** Apaga. Não reclama se não existia. */
  apagar(chave: string): void;
}

/**
 * As chaves, num lugar só e versionadas.
 *
 * Versão no nome (`.v1`) porque o formato guardado muda, e quando mudar o
 * valor velho tem que ser ignorado em vez de mal interpretado. É a mesma
 * convenção que `features/battle/disputaGuardada.ts` já usa — não inventamos
 * outra.
 */
export const CHAVES = {
  /** "essa pessoa já arrotou aqui alguma vez" — muda a fala do `IDLE`. */
  jaJogou: 'aue.ja-jogou.v1',
  /**
   * O CÓDIGO DA RODA EM ANDAMENTO — o bilhete com o número da mesa.
   *
   * Quinze gravações passando de mão em mão dão tempo de a tela apagar, chegar
   * ligação e o navegador matar a aba. O que se guarda é dez caracteres, e nada
   * além disso: as notas, os nomes e os rounds sempre moraram no banco. Perder
   * o bilhete custa a retomada, nunca o placar.
   *
   * Some quando a roda fecha ou quando o servidor diz que ela não existe mais —
   * o jogo não ressuscita mesa morta.
   */
  roda: 'aue.roda.v1',
} as const;
