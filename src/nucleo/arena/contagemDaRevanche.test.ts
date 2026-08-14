import { describe, expect, it } from 'vitest';

import {
  DURACAO_DO_TICK_MS,
  NUMEROS_DA_CONTAGEM,
  PAUSA_FINAL_MS,
  duracaoDaContagemMs,
  passosDaContagem,
} from './contagemDaRevanche';

describe('a contagem da revanche', () => {
  it('conta de 3 até 1, nessa ordem', () => {
    expect(NUMEROS_DA_CONTAGEM).toEqual(['3', '2', '1']);
    expect(passosDaContagem(false)).toEqual(['3', '2', '1']);
  });

  it('com movimento reduzido não sobra número nenhum pra agendar', () => {
    expect(passosDaContagem(true)).toHaveLength(0);
  });

  it('a duração soma um tick por número mais a pausa final', () => {
    const passos = passosDaContagem(false);
    expect(duracaoDaContagemMs(passos)).toBe(passos.length * DURACAO_DO_TICK_MS + PAUSA_FINAL_MS);
  });

  it('sem passo nenhum a duração é zero — nada para agendar', () => {
    expect(duracaoDaContagemMs(passosDaContagem(true))).toBe(0);
  });
});
