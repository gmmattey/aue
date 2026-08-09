import type { LocalDaDisputa } from '../../db/supabase';

/**
 * Como cada `venue_type` aparece escrito.
 *
 * POR QUE EXISTE AQUI. O local da disputa é gravado em código (`churrasco`,
 * `escritorio`) e precisa virar texto em DOIS lugares: na tela que abre a
 * disputa presencial e na tela que recebe o link do pódio (`/b/CODIGO`). Sem
 * este mapa, a segunda tela escreveria "Churrasco" de novo, à mão, e a primeira
 * troca de palavra deixaria as duas telas discordando sobre a mesma disputa.
 *
 * `Record<LocalDaDisputa, string>` é a trava: acrescentar um valor ao CHECK de
 * `batalhas.venue_type` e ao tipo sem escrever o rótulo aqui não compila.
 *
 * A LISTA DO SELETOR CONTINUA EM `DisputaLocalScreen`, e é outra coisa: lá a
 * ORDEM dos botões importa e é decisão de interface. `locais.test.ts` trava os
 * textos das duas pontas juntos.
 */
export const ROTULO_DO_LOCAL: Record<LocalDaDisputa, string> = {
  casa: 'Em casa',
  churrasco: 'Churrasco',
  publico: 'Em público',
  escritorio: 'No escritório',
  outro: 'Outro lugar',
};

/** O rótulo, ou `null` quando a disputa não disse onde foi (o campo é opcional). */
export function rotuloDoLocal(local: LocalDaDisputa | null | undefined): string | null {
  return local ? (ROTULO_DO_LOCAL[local] ?? null) : null;
}
