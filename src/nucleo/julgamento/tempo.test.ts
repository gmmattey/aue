import { describe, expect, it } from 'vitest';

import {
  LIMIAR_DA_ESPERA_LONGA_MS,
  PISO_DO_TEATRO_MS,
  PISO_REDUZIDO_MS,
  TETO_DA_ANALISE_MS,
  esperaQueFalta,
  pisoDoTeatro,
} from './tempo';

describe('o tempo do juiz', () => {
  it('o piso dá tempo de ler a frase', () => {
    // Menos de um segundo e a nota aparece por cima da piada.
    expect(PISO_DO_TEATRO_MS).toBeGreaterThanOrEqual(1000);
  });

  it('o piso não vira tela de carregamento', () => {
    // O ARENA.md proíbe com todas as letras: "não pode durar tanto que vire
    // tela de carregamento".
    expect(PISO_DO_TEATRO_MS).toBeLessThanOrEqual(2000);
  });

  it('com movimento reduzido a espera encolhe', () => {
    expect(pisoDoTeatro(true)).toBe(PISO_REDUZIDO_MS);
    expect(pisoDoTeatro(true)).toBeLessThan(pisoDoTeatro(false));
  });

  it('análise rápida ainda espera o resto do piso', () => {
    expect(esperaQueFalta(200, false)).toBe(PISO_DO_TEATRO_MS - 200);
  });

  it('análise lenta não segura mais ninguém', () => {
    // Quem já esperou não paga o teatro de novo.
    expect(esperaQueFalta(PISO_DO_TEATRO_MS + 1, false)).toBe(0);
    expect(esperaQueFalta(30_000, false)).toBe(0);
  });

  it('o teto da análise é maior que o piso do teatro', () => {
    // Ao contrário, o jogo desistiria da análise antes de terminar de fazer a
    // piada.
    expect(TETO_DA_ANALISE_MS).toBeGreaterThan(PISO_DO_TEATRO_MS);
  });

  it('o limiar da segunda fala vem depois do piso do teatro', () => {
    // Ao contrário, a espera "longa" apareceria em toda partida — e aí ela
    // deixaria de informar qualquer coisa.
    expect(LIMIAR_DA_ESPERA_LONGA_MS).toBeGreaterThan(PISO_DO_TEATRO_MS);
  });

  it('e antes do teto: quem desiste é o teto, não a fala', () => {
    expect(LIMIAR_DA_ESPERA_LONGA_MS).toBeLessThan(TETO_DA_ANALISE_MS);
  });
});
