import { describe, expect, it } from 'vitest';

import {
  CHAMADAS,
  COMENTARIOS_DE_VOLTA,
  COMENTARIOS_PRIMEIRA_VEZ,
  escolherFala,
} from './idle';

describe('a fala do IDLE', () => {
  it('nunca repete a frase que estava na tela', () => {
    // O sorteio devolve sempre 0, ou seja, tentaria a primeira frase do pool.
    // Com ela na tela, a escolha tem que cair em outra — senão a Arena parece
    // travada em vez de falante.
    const anterior = CHAMADAS[0];
    const escolhida = escolherFala(CHAMADAS, anterior, () => 0);
    expect(escolhida).not.toBe(anterior);
    expect(CHAMADAS).toContain(escolhida);
  });

  it('na primeira vez, qualquer frase do pool serve', () => {
    expect(CHAMADAS).toContain(escolherFala(CHAMADAS, null, () => 0));
  });

  it('sorteio devolvendo 1 não escapa do fim da lista', () => {
    // `Math.random()` nunca devolve 1, mas um dublê de teste devolve. O índice
    // estouraria a lista e a Arena escreveria "undefined" na cara do jogador.
    expect(escolherFala(CHAMADAS, null, () => 1)).toBe(CHAMADAS[CHAMADAS.length - 1]);
  });

  it('quem já jogou ouve outra coisa', () => {
    // Os dois pools existem e não se misturam — é o que ARENA.md pede para
    // quem volta.
    for (const frase of COMENTARIOS_DE_VOLTA) {
      expect(COMENTARIOS_PRIMEIRA_VEZ).not.toContain(frase);
    }
  });

  it('pool vazio quebra na hora em vez de deixar a Arena muda', () => {
    expect(() => escolherFala([], null, () => 0)).toThrow();
  });
});
