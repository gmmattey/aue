/**
 * A fala do `IDLE`.
 *
 * Rótulo de botão é contrato e nunca varia — "Arrotar" é sempre "Arrotar". A
 * chamada, essa varia, e é o que faz parecer que tem alguém do outro lado em
 * vez de uma tela repetindo a mesma frase pela décima vez.
 *
 * Quem já jogou recebe um comentário diferente de quem nunca jogou
 * (`docs/jogo/ARENA.md`, estado `IDLE`).
 */

export const CHAMADAS = ['Manda o arrotão aí.', 'Solta o bicho.', 'O juiz tá acordado.'] as const;

export const COMENTARIOS_PRIMEIRA_VEZ = [
  'Tua dignidade já era mesmo.',
  'Ninguém precisa saber que você tentou.',
] as const;

export const COMENTARIOS_DE_VOLTA = [
  'De novo? Tá viciado.',
  'Volta aqui pra consertar aquela nota.',
] as const;

/**
 * Sorteia sem repetir a anterior.
 *
 * O sorteio entra por parâmetro em vez de `Math.random()` porque isto é
 * núcleo: função pura, testável sem stub global e sem surpresa.
 *
 * `anterior` é o texto que estava na tela. Passa `null` na primeira vez.
 */
export function escolherFala(
  pool: readonly string[],
  anterior: string | null,
  sorteio: () => number,
): string {
  if (pool.length === 0) {
    throw new Error('Pool de fala vazio — a Arena ficaria muda.');
  }
  if (pool.length === 1) return pool[0];

  const candidatos = pool.filter((frase) => frase !== anterior);
  /*
    `candidatos` só ficaria vazio se o pool inteiro fosse a mesma frase
    repetida. Não vale devolver `undefined` por causa disso.
  */
  const lista = candidatos.length > 0 ? candidatos : pool;

  const bruto = sorteio();
  /*
    `Math.random()` devolve [0,1), mas quem implementa o sorteio num teste
    pode devolver 1 sem querer — e `lista[lista.length]` é `undefined`, que
    viraria "undefined" escrito na tela do jogador.
  */
  const indice = Math.min(lista.length - 1, Math.max(0, Math.floor(bruto * lista.length)));
  return lista[indice];
}
