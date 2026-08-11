import type { LocalDaRoda } from '../../portas/disputaLocal';

/**
 * Como cada lugar aparece escrito.
 *
 * VEIO DE `features/battle/locais.ts` INTEIRO, com o tipo trocado por um da
 * porta. O lugar é gravado em código (`churrasco`, `escritorio`) e precisa
 * virar texto na sobreposição que abre a roda e na legenda do pódio. Sem este
 * mapa, os dois escreveriam "Churrasco" à mão e a primeira troca de palavra
 * deixaria os dois discordando sobre a mesma roda.
 *
 * `Record<LocalDaRoda, string>` é a trava: acrescentar um valor ao CHECK de
 * `batalhas.tipo_de_local` e ao tipo sem escrever o rótulo aqui não compila.
 */
export const ROTULO_DO_LOCAL: Record<LocalDaRoda, string> = {
  casa: 'Em casa',
  churrasco: 'Churrasco',
  publico: 'Em público',
  escritorio: 'No escritório',
  outro: 'Outro lugar',
};

/**
 * A ordem em que os lugares aparecem na sobreposição.
 *
 * É decisão de interface e por isso é uma lista, não a ordem das chaves de um
 * objeto — mas os cinco valores são os mesmos do CHECK, e o teste cobra isso.
 */
export const LUGARES_DA_RODA: readonly LocalDaRoda[] = [
  'casa',
  'churrasco',
  'publico',
  'escritorio',
  'outro',
];

/** O rótulo, ou `null` quando a roda não disse onde foi (o campo é opcional). */
export function rotuloDoLocal(local: LocalDaRoda | null | undefined): string | null {
  return local ? (ROTULO_DO_LOCAL[local] ?? null) : null;
}
