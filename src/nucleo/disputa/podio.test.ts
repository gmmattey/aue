import { describe, expect, it } from 'vitest';

import { campeoesDoPodio, montarPodio } from './podio';
import { MAXIMO_NA_RODA, daParaAbrirARoda, nomeDoArrotador, nomesDaRoda } from './regras';
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
  it('a régua pra abrir é o número de CAMPOS, não de campos preenchidos', () => {
    /*
      Campo em branco agora vira "Arrotador N" — deixar de escrever o nome não
      é o mesmo que desistir da roda. Só CAMPO de menos (ou de mais) trava o
      botão.
    */
    expect(daParaAbrirARoda(['Carol', ''])).toBe(true);
    expect(daParaAbrirARoda(['   ', ''])).toBe(true);
    expect(daParaAbrirARoda(['Carol', 'Bruno'])).toBe(true);
    expect(daParaAbrirARoda(['Carol'])).toBe(false);
  });

  it('campo em branco vira "Arrotador N", numerado pela ordem entre os vazios', () => {
    expect(nomesDaRoda(['', ''])).toEqual([nomeDoArrotador(1), nomeDoArrotador(2)]);
  });

  it('misturado com nome digitado, o N conta só os vazios — em qualquer posição', () => {
    expect(nomesDaRoda(['Carol', '', 'Bruno', ''])).toEqual([
      'Carol',
      nomeDoArrotador(1),
      'Bruno',
      nomeDoArrotador(2),
    ]);
    /* O vazio no começo é Arrotador 1, mesmo sendo o primeiro campo da tela. */
    expect(nomesDaRoda(['', 'Carol'])).toEqual([nomeDoArrotador(1), 'Carol']);
  });

  it('nome repetido não conta duas vezes', () => {
    /*
      "carlos" e "Carlos " são a mesma pessoa na mesa, e o banco recusa o par.
      Contar os dois deixaria o botão aberto para um pedido que vai falhar.
    */
    expect(nomesDaRoda(['Carlos', 'carlos '])).toEqual(['Carlos']);
    expect(daParaAbrirARoda(['Carlos', 'carlos'])).toBe(false);
  });

  it('nome gerado que colide com um digitado também é recusado', () => {
    /*
      Raro, mas possível: alguém digita "Arrotador 1" na mão e outro campo
      fica em branco. A checagem de duplicata vale igual para os dois.
    */
    expect(nomesDaRoda(['Arrotador 1', ''])).toEqual(['Arrotador 1']);
    expect(daParaAbrirARoda(['Arrotador 1', ''])).toBe(false);
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
