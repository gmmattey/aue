import type { ArrotoDaRoda, ParticipanteDaRoda } from '../../portas/disputaLocal';

/**
 * De quem é a vez, e em que round.
 *
 * VEIO DE `features/battle/turnos.ts` PRATICAMENTE INTEIRO. O que mudou foi a
 * casa e os dois tipos: antes vinham de `db/supabase`, agora vêm da porta. É a
 * única coisa que impedia esta regra de morar no núcleo — ela nunca teve React,
 * `window` nem rede.
 */

export interface Turno {
  /** Todo mundo cumpriu todos os rounds. */
  readonly acabou: boolean;
  /** Round corrente, 1..rounds. Quando acabou, é o último. */
  readonly round: number;
  /** De quem é a vez. `undefined` quando acabou. */
  readonly daVez?: ParticipanteDaRoda;
  /** Quantas vezes cada pessoa já gravou, por id. */
  readonly gravacoesPor: ReadonlyMap<string, number>;
}

/**
 * DERIVADO das gravações que já existem, nunca guardado em estado próprio.
 *
 * Um ponteiro local (o índice da vez num `useState`) se dessincronizaria no
 * primeiro erro de rede: a tela passaria a vez de quem não chegou a gravar, e o
 * servidor recusaria a gravação seguinte por já existir. Derivar do que está
 * gravado é o único jeito de a tela e o banco concordarem sempre — e o servidor
 * deriva o round exatamente da mesma forma, dentro de `responder_batalha`
 * (20260807000031, com os nomes de hoje na 20260807000036).
 *
 * A REGRA: todo mundo joga uma vez antes de alguém jogar duas. Logo, o round
 * corrente é o menor número de gravações entre as pessoas da roda, e quem está
 * na vez é a primeira (na ordem de entrada) que ainda está nesse mínimo.
 */
export function calcularTurno(
  participantes: readonly ParticipanteDaRoda[],
  arrotos: readonly Pick<ArrotoDaRoda, 'participanteId'>[],
  rounds: number,
): Turno {
  const gravacoesPor = new Map<string, number>();
  for (const arroto of arrotos) {
    if (arroto.participanteId) {
      gravacoesPor.set(
        arroto.participanteId,
        (gravacoesPor.get(arroto.participanteId) ?? 0) + 1,
      );
    }
  }

  const total = Math.max(1, rounds);

  /*
    Sem gente não há turno. `Math.min()` de lista vazia é `Infinity`, que faria
    a roda nascer "acabada".
  */
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

/** Uma pessoa na classificação da roda, já com a posição resolvida. */
export interface Colocacao {
  readonly nome: string;
  readonly nota: number;
  /**
   * A posição no pódio, 1-based, COM EMPATE: duas notas iguais dividem o mesmo
   * número e a seguinte pula (1, 2, 2, 4).
   *
   * Existe porque o pódio numerava pela posição no array — dois arrotos de 88,0
   * saíam como 2º e 3º, e a mesa que acabou de ouvir os dois iguais leria um
   * desempate que o app inventou. Ninguém desfaz isso depois de o pódio ir para
   * o grupo.
   */
  readonly posicao: number;
}

/**
 * A melhor nota de cada um, do maior para o menor.
 *
 * MELHOR, e não a última nem a média: numa roda de rounds, o que a mesa cobra é
 * "o seu melhor arroto da noite". Média puniria quem arriscou um arroto ruim; a
 * última nota jogaria fora um 98 do round 1.
 *
 * Quem não gravou nenhuma vez fica FORA, em vez de aparecer com zero — zero é
 * uma nota possível e real neste jogo, e confundir "não jogou" com "jogou muito
 * mal" seria injusto com os dois.
 */
export function calcularClassificacao(
  participantes: readonly ParticipanteDaRoda[],
  arrotos: readonly ArrotoDaRoda[],
): Colocacao[] {
  const melhorPor = new Map<string, number>();
  for (const arroto of arrotos) {
    if (!arroto.participanteId) continue;
    const nota = Number(arroto.nota);
    const atual = melhorPor.get(arroto.participanteId);
    if (atual === undefined || nota > atual) melhorPor.set(arroto.participanteId, nota);
  }

  const ordenados = participantes
    .filter((p) => melhorPor.has(p.id))
    .map((p) => ({ nome: p.nome, nota: melhorPor.get(p.id) as number }))
    .sort((a, b) => b.nota - a.nota);

  /*
    Numeração por MÉRITO e não por índice. `posicao` só anda quando a nota muda;
    quem empata herda a posição de quem veio antes.
  */
  let posicao = 0;
  let notaAnterior: number | null = null;

  return ordenados.map((pessoa, i) => {
    if (notaAnterior === null || pessoa.nota !== notaAnterior) posicao = i + 1;
    notaAnterior = pessoa.nota;
    return { ...pessoa, posicao };
  });
}
