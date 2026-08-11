import { describe, expect, it } from 'vitest';

import { calcularClassificacao, calcularTurno } from './turnos';
import type { ParticipanteDaRoda } from '../../portas/disputaLocal';

/**
 * A roda acontece com o telefone passando de mão em mão numa mesa. Passar a vez
 * para a pessoa errada, ou fechar a mesa antes da hora, estraga a brincadeira
 * de um jeito que ninguém desfaz — e é o tipo de erro que só apareceria no
 * churrasco.
 *
 * VEIO INTEIRO DE `features/battle/turnos.test.ts`, com os tipos da porta. A
 * regra não mudou; mudou a casa.
 */

const MESA: ParticipanteDaRoda[] = [
  { id: 'a', nome: 'Carol' },
  { id: 'b', nome: 'Bruno' },
  { id: 'c', nome: 'Rafa' },
];

/** Atalho: quem gravou, em ordem, com a nota. */
function arrotos(...gravacoes: [string, number][]) {
  return gravacoes.map(([participanteId, nota]) => ({ participanteId, nota }));
}

describe('de quem é a vez', () => {
  it('começa pelo primeiro da lista, no round 1', () => {
    const turno = calcularTurno(MESA, [], 3);
    expect(turno.acabou).toBe(false);
    expect(turno.round).toBe(1);
    expect(turno.daVez?.nome).toBe('Carol');
  });

  it('segue a ordem em que os nomes foram escritos', () => {
    // A mesa combinou quem começa; a ordem do array é essa combinação.
    expect(calcularTurno(MESA, arrotos(['a', 80]), 3).daVez?.nome).toBe('Bruno');
    expect(calcularTurno(MESA, arrotos(['a', 80], ['b', 90]), 3).daVez?.nome).toBe('Rafa');
  });

  it('só abre o round 2 depois de TODO MUNDO jogar o round 1', () => {
    const meio = calcularTurno(MESA, arrotos(['a', 80], ['b', 90]), 3);
    expect(meio.round).toBe(1);

    const completo = calcularTurno(MESA, arrotos(['a', 80], ['b', 90], ['c', 70]), 3);
    expect(completo.round).toBe(2);
    expect(completo.daVez?.nome).toBe('Carol');
  });

  it('acaba quando todos cumpriram todos os rounds', () => {
    const turno = calcularTurno(MESA, arrotos(['a', 80], ['b', 90], ['c', 70]), 1);
    expect(turno.acabou).toBe(true);
    expect(turno.daVez).toBeUndefined();
  });

  it('NÃO acaba enquanto faltar alguém, mesmo com outros adiantados', () => {
    /*
      O guarda que importa. Se a conta fosse pelo TOTAL de gravações em vez do
      MÍNIMO por pessoa, seis gravações numa roda de 3 pessoas × 2 rounds
      fechariam a mesa — e o Rafa, que gravou uma vez só, ficaria de fora do
      pódio sem nunca ter tido a segunda vez dele.
    */
    const turno = calcularTurno(
      MESA,
      arrotos(['a', 80], ['b', 90], ['c', 70], ['a', 85], ['b', 95]),
      2,
    );
    expect(turno.acabou).toBe(false);
    expect(turno.daVez?.nome).toBe('Rafa');
    expect(turno.round).toBe(2);
  });

  it('a vez sai igual com as gravações fora de ordem', () => {
    /*
      A vez é DERIVADA, não uma fila que anda. O servidor devolve as rodadas na
      ordem em que entraram, e uma retomada depois de erro de rede pode trazer
      outra. Se a ordem mudasse a resposta, a mesa passaria o telefone para
      quem já gravou.
    */
    const naOrdem = calcularTurno(MESA, arrotos(['a', 80], ['b', 90]), 3);
    const embaralhado = calcularTurno(MESA, arrotos(['b', 90], ['a', 80]), 3);
    expect(embaralhado.daVez?.nome).toBe(naOrdem.daVez?.nome);
    expect(embaralhado.round).toBe(naOrdem.round);
  });

  it('ignora gravação sem participante (as da disputa remota)', () => {
    // A tabela de rodadas é compartilhada entre os dois modos: na remota o
    // participante é nulo. Contá-las aqui adiantaria turnos de ninguém.
    const daDisputaRemota = { participanteId: null, nota: 99 };
    const turno = calcularTurno(MESA, [daDisputaRemota, ...arrotos(['a', 80])], 2);
    expect(turno.daVez?.nome).toBe('Bruno');
    expect(turno.round).toBe(1);
  });

  it('não nasce acabada quando não há ninguém na mesa', () => {
    // `Math.min()` de lista vazia é Infinity, que passaria direto pelo teste de
    // "cumpriu todos os rounds".
    expect(calcularTurno([], [], 3).acabou).toBe(true);
  });
});

describe('classificação da roda', () => {
  it('vale a MELHOR nota de cada um, não a última', () => {
    const classificacao = calcularClassificacao(
      MESA,
      arrotos(['a', 98], ['b', 50], ['c', 70], ['a', 10], ['b', 91], ['c', 72]),
    );
    expect(classificacao).toEqual([
      { nome: 'Carol', nota: 98, posicao: 1 },
      { nome: 'Bruno', nota: 91, posicao: 2 },
      { nome: 'Rafa', nota: 72, posicao: 3 },
    ]);
  });

  it('deixa de fora quem não gravou, em vez de dar zero', () => {
    const classificacao = calcularClassificacao(MESA, arrotos(['a', 80]));
    expect(classificacao).toEqual([{ nome: 'Carol', nota: 80, posicao: 1 }]);
  });

  it('mantém no pódio quem tirou zero de verdade', () => {
    const classificacao = calcularClassificacao(MESA, arrotos(['a', 80], ['b', 0]));
    expect(classificacao).toEqual([
      { nome: 'Carol', nota: 80, posicao: 1 },
      { nome: 'Bruno', nota: 0, posicao: 2 },
    ]);
  });
});

describe('empate na classificação', () => {
  /*
    O DEFEITO QUE ESTES TESTES TRAVAM: a posição saía do índice do array, então
    duas notas iguais viravam 2º e 3º. O pódio ia para o grupo com um desempate
    que ninguém deu — e não tem como desfazer depois.
  */

  it('duas notas iguais dividem a mesma posição', () => {
    const classificacao = calcularClassificacao(MESA, arrotos(['a', 90], ['b', 70], ['c', 70]));
    expect(classificacao.map((c) => [c.nome, c.posicao])).toEqual([
      ['Carol', 1],
      ['Bruno', 2],
      ['Rafa', 2],
    ]);
  });

  it('depois do empate, a posição PULA — não existe 2º, 2º, 3º', () => {
    const MESA_DE_QUATRO = [...MESA, { id: 'd', nome: 'Julia' }];
    const classificacao = calcularClassificacao(
      MESA_DE_QUATRO,
      arrotos(['a', 90], ['b', 70], ['c', 70], ['d', 50]),
    );
    expect(classificacao.map((c) => c.posicao)).toEqual([1, 2, 2, 4]);
  });

  it('empate no TOPO deixa dois em primeiro', () => {
    const classificacao = calcularClassificacao(MESA, arrotos(['a', 88], ['b', 88], ['c', 40]));
    expect(classificacao.filter((c) => c.posicao === 1).map((c) => c.nome)).toEqual([
      'Carol',
      'Bruno',
    ]);
    expect(classificacao[2]?.posicao).toBe(3);
  });

  it('a mesa inteira empatada é um pódio de primeiros', () => {
    const classificacao = calcularClassificacao(MESA, arrotos(['a', 0], ['b', 0], ['c', 0]));
    expect(classificacao.every((c) => c.posicao === 1)).toBe(true);
  });
});
