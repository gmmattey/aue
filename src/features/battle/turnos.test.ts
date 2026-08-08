import { describe, expect, it } from 'vitest';

import { calcularTurno, calcularClassificacao } from './turnos';
import type { ParticipanteDaBatalha } from '../../db/supabase';

/**
 * A disputa presencial acontece com o telefone passando de mão em mão numa
 * mesa. Passar a vez para a pessoa errada, ou fechar a disputa antes da hora,
 * estraga a brincadeira de um jeito que ninguém consegue desfazer — e é o tipo
 * de erro que só apareceria no churrasco.
 *
 * Estes testes existem porque o resto da suíte do projeto é renderização do
 * primeiro quadro (sem DOM, sem efeito, sem clique). Aqui há comportamento de
 * verdade sendo verificado.
 */

const MESA: ParticipanteDaBatalha[] = [
  { id: 'a', apelido: 'Carol' },
  { id: 'b', apelido: 'Bruno' },
  { id: 'c', apelido: 'Rafa' },
];

/** Atalho: quem gravou, em ordem, com a nota. */
function rodadas(...gravacoes: [string, number][]) {
  return gravacoes.map(([participant_id, score]) => ({ participant_id, score }));
}

describe('de quem é a vez', () => {
  it('começa pelo primeiro da lista, no round 1', () => {
    const turno = calcularTurno(MESA, [], 3);
    expect(turno.acabou).toBe(false);
    expect(turno.round).toBe(1);
    expect(turno.daVez?.apelido).toBe('Carol');
  });

  it('segue a ordem em que os nomes foram cadastrados', () => {
    // A mesa combinou quem começa; a ordem do array é essa combinação.
    expect(calcularTurno(MESA, rodadas(['a', 80]), 3).daVez?.apelido).toBe('Bruno');
    expect(calcularTurno(MESA, rodadas(['a', 80], ['b', 90]), 3).daVez?.apelido).toBe('Rafa');
  });

  it('só abre o round 2 depois de TODO MUNDO jogar o round 1', () => {
    const meio = calcularTurno(MESA, rodadas(['a', 80], ['b', 90]), 3);
    expect(meio.round).toBe(1);

    const completo = calcularTurno(MESA, rodadas(['a', 80], ['b', 90], ['c', 70]), 3);
    expect(completo.round).toBe(2);
    expect(completo.daVez?.apelido).toBe('Carol');
  });

  it('acaba quando todos cumpriram todos os rounds', () => {
    const turno = calcularTurno(MESA, rodadas(['a', 80], ['b', 90], ['c', 70]), 1);
    expect(turno.acabou).toBe(true);
    expect(turno.daVez).toBeUndefined();
  });

  it('NÃO acaba enquanto faltar alguém, mesmo com outros adiantados', () => {
    /*
      O guarda que importa. Se a conta fosse pelo TOTAL de gravações em vez do
      MÍNIMO por pessoa, seis gravações numa disputa de 3 pessoas x 2 rounds
      fechariam a disputa — e o Rafa, que gravou uma vez só, ficaria de fora do
      pódio sem nunca ter tido a segunda vez dele.
    */
    const turno = calcularTurno(
      MESA,
      rodadas(['a', 80], ['b', 90], ['c', 70], ['a', 85], ['b', 95]),
      2,
    );
    expect(turno.acabou).toBe(false);
    expect(turno.daVez?.apelido).toBe('Rafa');
    expect(turno.round).toBe(2);
  });

  it('ignora rodadas sem participante (as da batalha remota)', () => {
    // `rodadas_batalha` é compartilhada entre os dois modos: na remota,
    // `participant_id` é nulo. Contá-las aqui adiantaria turnos de ninguém.
    const daBatalhaRemota = { participant_id: null, score: 99 };
    const turno = calcularTurno(MESA, [daBatalhaRemota, ...rodadas(['a', 80])], 2);
    expect(turno.daVez?.apelido).toBe('Bruno');
    expect(turno.round).toBe(1);
  });

  it('não nasce acabada quando não há participante', () => {
    // `Math.min()` de lista vazia é Infinity, que passaria direto pelo teste de
    // "cumpriu todos os rounds".
    expect(calcularTurno([], [], 3).acabou).toBe(true);
  });
});

describe('classificação da disputa', () => {
  it('vale a MELHOR nota de cada um, não a última', () => {
    // Média puniria quem arriscou um arroto ruim; a última jogaria fora um 98
    // do primeiro round.
    const classificacao = calcularClassificacao(
      MESA,
      rodadas(['a', 98], ['b', 50], ['c', 70], ['a', 10], ['b', 91], ['c', 72]),
    );
    expect(classificacao).toEqual([
      { nome: 'Carol', score: 98 },
      { nome: 'Bruno', score: 91 },
      { nome: 'Rafa', score: 72 },
    ]);
  });

  it('deixa de fora quem não gravou, em vez de dar zero', () => {
    // Zero é uma nota possível e real neste jogo. Confundir "não jogou" com
    // "jogou muito mal" seria injusto com os dois.
    const classificacao = calcularClassificacao(MESA, rodadas(['a', 80]));
    expect(classificacao).toEqual([{ nome: 'Carol', score: 80 }]);
  });

  it('mantém no pódio quem tirou zero de verdade', () => {
    const classificacao = calcularClassificacao(MESA, rodadas(['a', 80], ['b', 0]));
    expect(classificacao).toEqual([
      { nome: 'Carol', score: 80 },
      { nome: 'Bruno', score: 0 },
    ]);
  });
});
