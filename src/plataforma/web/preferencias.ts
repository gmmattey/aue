/**
 * O que a pessoa configurou no aparelho.
 *
 * Está aqui, e não solto dentro do componente, porque `matchMedia` é API de
 * navegador e API de navegador mora deste lado da fronteira (ADR 0001 §2).
 * Não virou porta porque não há o que dublar: é uma pergunta sem efeito, sem
 * permissão e sem ciclo de vida. Porta para isso seria cerimônia.
 */

/**
 * A pessoa pediu menos movimento?
 *
 * `matchMedia` protegido: nem todo ambiente de teste tem, e a Bolha não pode
 * deixar de existir por causa disso. Na dúvida, responde que **não** — o
 * padrão do jogo é a Bolha viva, e desligar movimento sem alguém ter pedido
 * seria decidir pelo jogador.
 */
export function prefereMovimentoReduzido(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}
