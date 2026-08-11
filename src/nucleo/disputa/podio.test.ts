import { describe, expect, it } from 'vitest';

import { campeoesDoPodio, montarPodio } from './podio';
import { MAXIMO_NA_RODA, daParaAbrirARoda, nomesDaRoda } from './regras';
import type { Roda } from '../../portas/disputaLocal';

const MESA: Roda = {
  codigo: 'ABCDEFGHJK',
  participantes: [
    { id: 'a', nome: 'Carol' },
    { id: 'b', nome: 'Bruno' },
    { id: 'c', nome: 'Rafa' },
  ],
  arrotos: [
    { participanteId: 'a', nota: 90 },
    { participanteId: 'b', nota: 70 },
  ],
  rounds: 3,
  local: 'churrasco',
};

describe('o pódio da roda', () => {
  it('a legenda diz onde foi e quantos rounds', () => {
    expect(montarPodio(MESA).legenda).toBe('Churrasco · 3 rounds');
  });

  it('sem lugar escolhido, a legenda continua contando os rounds', () => {
    // Inventar "Outro lugar" aqui poria no pódio compartilhado um contexto que
    // ninguém escolheu.
    expect(montarPodio({ ...MESA, local: null, rounds: 1 }).legenda).toBe('1 round');
  });

  it('quem não gravou não aparece', () => {
    expect(montarPodio(MESA).colocacoes.map((c) => c.nome)).toEqual(['Carol', 'Bruno']);
  });

  it('empate no topo é mais de um campeão', () => {
    const empatada: Roda = {
      ...MESA,
      arrotos: [
        { participanteId: 'a', nota: 88 },
        { participanteId: 'b', nota: 88 },
        { participanteId: 'c', nota: 40 },
      ],
    };
    expect(campeoesDoPodio(montarPodio(empatada)).map((c) => c.nome)).toEqual([
      'Carol',
      'Bruno',
    ]);
  });

  it('mesa sem nenhum arroto vira pódio vazio, não um campeão inventado', () => {
    const vazia = montarPodio({ ...MESA, arrotos: [] });
    expect(vazia.colocacoes).toEqual([]);
    expect(campeoesDoPodio(vazia)).toEqual([]);
  });
});

describe('quem entra na roda', () => {
  it('menos de dois nomes não abre a roda', () => {
    expect(daParaAbrirARoda(['Carol', ''])).toBe(false);
    expect(daParaAbrirARoda(['   ', ''])).toBe(false);
    expect(daParaAbrirARoda(['Carol', 'Bruno'])).toBe(true);
  });

  it('nome repetido não conta duas vezes', () => {
    /*
      "carlos" e "Carlos " são a mesma pessoa na mesa, e o banco recusa o par.
      Contar os dois deixaria o botão aberto para um pedido que vai falhar.
    */
    expect(nomesDaRoda(['Carlos', 'carlos '])).toEqual(['Carlos']);
    expect(daParaAbrirARoda(['Carlos', 'carlos'])).toBe(false);
  });

  it('mais de cinco não abre — o servidor recusa também', () => {
    const seis = ['a', 'b', 'c', 'd', 'e', 'f'];
    expect(seis.length).toBeGreaterThan(MAXIMO_NA_RODA);
    expect(daParaAbrirARoda(seis)).toBe(false);
  });

  it('espaço sobrando some antes de virar nome', () => {
    expect(nomesDaRoda([' Carol ', 'Bruno'])).toEqual(['Carol', 'Bruno']);
  });
});
