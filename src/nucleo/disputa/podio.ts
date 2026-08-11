import type { Roda } from '../../portas/disputaLocal';
import { rotuloDoLocal } from './locais';
import { calcularClassificacao, type Colocacao } from './turnos';

/**
 * O pódio da roda — o que o `SCOREBOARD` mostra quando a mesa acaba.
 *
 * É o pódio, e não o placar do X1: são até cinco linhas, a posição vem com
 * empate resolvido e quem não gravou não aparece. O `SCOREBOARD` passa a ter
 * duas formas, e nenhum estado novo nasceu por causa disso.
 */
export interface PodioDaRoda {
  /** O código da roda, para o pódio saber de que mesa ele é. */
  readonly codigo: string;
  readonly colocacoes: readonly Colocacao[];
  /** "Churrasco · 3 rounds". `null` quando a roda não disse onde foi. */
  readonly legenda: string | null;
}

export function montarPodio(roda: Roda): PodioDaRoda {
  const lugar = rotuloDoLocal(roda.local);
  const rounds = `${roda.rounds} ${roda.rounds === 1 ? 'round' : 'rounds'}`;

  return {
    codigo: roda.codigo,
    colocacoes: calcularClassificacao(roda.participantes, roda.arrotos),
    legenda: lugar ? `${lugar} · ${rounds}` : rounds,
  };
}

/**
 * Quem está em primeiro. Pode ser mais de um — empate no topo é empate, e
 * escolher um deles seria inventar um desempate que a mesa não deu.
 */
export function campeoesDoPodio(podio: PodioDaRoda): readonly Colocacao[] {
  return podio.colocacoes.filter((c) => c.posicao === 1);
}
