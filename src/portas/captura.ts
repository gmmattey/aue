/**
 * A porta do microfone.
 *
 * Nada aqui sabe o que é `getUserMedia`. Quem sabe é
 * `plataforma/web/captura.ts`, e no dia em que o Auê virar app de loja é só
 * essa implementação que muda — ver
 * `docs/technical/adr/0001-arquitetura-oficial-do-aue.md` §2.
 *
 * O DESENHO IMPORTANTE AQUI É O DONO. O microfone tem um dono só, e é esta
 * porta. Antes, cada tela pedia o stream e cada tela precisava lembrar de
 * soltar — em toda saída, inclusive nas que ninguém escreve teste (timeout,
 * erro, aba escondida, componente desmontado). Vazamento de microfone é
 * defeito de privacidade, não detalhe cosmético (ADR §4).
 */

/** O que aconteceu quando o jogo pediu o microfone. */
export type PedidoDeMicrofone =
  /** Liberou. O recurso está vivo e alguém precisa soltar depois. */
  | { ok: true }
  /**
   * A pessoa negou, ou o navegador negou por ela (site sem HTTPS, política de
   * permissão). Do ponto de vista do jogo é o mesmo caso: não tem microfone e
   * a Arena precisa dizer isso na cara.
   */
  | { ok: false; motivo: 'negado' }
  /** Não existe microfone, ou o aparelho não deixa enumerar. */
  | { ok: false; motivo: 'semAparelho' }
  /** Quebrou de um jeito que não é nenhum dos acima. */
  | { ok: false; motivo: 'falhou'; detalhe: string };

export interface CapturaDeAudio {
  /**
   * Pede o microfone. **Só pode ser chamado a partir de um toque da pessoa** —
   * é exigência do Safari e do Chrome, e é também o desenho do jogo: o
   * microfone é pedido depois do ARROTAR, nunca ao abrir
   * (`docs/jogo/ARENA.md`, estado `IDLE`).
   *
   * Chamar duas vezes sem soltar no meio não abre dois streams: a segunda
   * chamada recebe o que já está vivo.
   */
  pedir(): Promise<PedidoDeMicrofone>;

  /**
   * Solta o microfone. **Idempotente de propósito**: chamar sem ter pedido,
   * ou chamar duas vezes, não pode explodir. Todo caminho de saída chama isto,
   * e caminho de saída não tem tempo de conferir se o outro caminho já chamou.
   */
  soltar(): void;

  /** Tem stream vivo agora? Existe para o teste conseguir provar a soltura. */
  estaVivo(): boolean;
}
