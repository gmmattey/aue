import type { ParticipanteDaBatalha, RodadaDaBatalha } from '../../db/supabase';

export interface Turno {
  /** Todos cumpriram todos os rounds. */
  acabou: boolean;
  /** Round corrente, 1..roundsTotal. Quando acabou, é o último. */
  round: number;
  /** De quem é a vez. `undefined` quando acabou. */
  daVez?: ParticipanteDaBatalha;
  /** Quantas vezes cada participante já gravou, por id. */
  gravacoesPor: Map<string, number>;
}

/**
 * De quem é a vez, e em qual round.
 *
 * DERIVADO das rodadas já gravadas, nunca guardado em estado próprio. Um
 * ponteiro local (`useState` do índice da vez) se dessincronizaria no primeiro
 * erro de rede: a tela passaria a vez de quem não chegou a gravar, e o
 * servidor recusaria a gravação seguinte por já existir. Derivar do que está
 * gravado é o único jeito de a tela e o banco concordarem sempre — e o
 * servidor deriva o round exatamente da mesma forma (20260807000031).
 *
 * A REGRA: todo mundo joga uma vez antes de alguém jogar duas. Logo, o round
 * corrente é o menor número de gravações entre os participantes, e quem está
 * na vez é o primeiro (na ordem de entrada) que ainda está nesse mínimo.
 *
 * Vive fora do componente para poder ser testado. É a lógica mais fácil de
 * errar da disputa presencial e a que estraga a brincadeira de forma mais
 * visível — passar a vez errada com o telefone na mão de alguém.
 */
export function calcularTurno(
  participantes: ParticipanteDaBatalha[],
  rodadas: Pick<RodadaDaBatalha, 'participant_id'>[],
  roundsTotal: number,
): Turno {
  const gravacoesPor = new Map<string, number>();
  for (const r of rodadas) {
    if (r.participant_id) {
      gravacoesPor.set(r.participant_id, (gravacoesPor.get(r.participant_id) ?? 0) + 1);
    }
  }

  const total = Math.max(1, roundsTotal);

  // Sem participantes não há turno. `Math.min()` de lista vazia é `Infinity`,
  // que faria a disputa nascer "acabada".
  if (participantes.length === 0) {
    return { acabou: true, round: total, gravacoesPor };
  }

  const minimo = Math.min(...participantes.map((p) => gravacoesPor.get(p.id) ?? 0));

  if (minimo >= total) {
    return { acabou: true, round: total, gravacoesPor };
  }

  return {
    acabou: false,
    round: minimo + 1,
    daVez: participantes.find((p) => (gravacoesPor.get(p.id) ?? 0) === minimo),
    gravacoesPor,
  };
}

/**
 * A melhor nota de cada participante, do maior para o menor.
 *
 * MELHOR, e não a última nem a média: numa disputa de rounds, o que a mesa
 * cobra é "o seu melhor arroto da noite". Média puniria quem arriscou um
 * arroto ruim; a última nota jogaria fora um 98 do round 1.
 *
 * Quem não gravou nenhuma vez fica FORA da classificação, em vez de aparecer
 * com zero — zero é uma nota possível e real neste jogo, e confundir "não
 * jogou" com "jogou muito mal" seria injusto com os dois.
 */
export function calcularClassificacao(
  participantes: ParticipanteDaBatalha[],
  rodadas: Pick<RodadaDaBatalha, 'participant_id' | 'score'>[],
): { nome: string; score: number }[] {
  const melhorPor = new Map<string, number>();
  for (const r of rodadas) {
    if (!r.participant_id) continue;
    const nota = Number(r.score);
    const atual = melhorPor.get(r.participant_id);
    if (atual === undefined || nota > atual) melhorPor.set(r.participant_id, nota);
  }

  return participantes
    .filter((p) => melhorPor.has(p.id))
    .map((p) => ({ nome: p.apelido, score: melhorPor.get(p.id) as number }))
    .sort((a, b) => b.score - a.score);
}
