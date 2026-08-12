import { describe, expect, it } from 'vitest';

import {
  ATRASOS_DA_REVELACAO_MS,
  FASES_DA_REVELACAO,
  FASE_FINAL,
  jaChegouEm,
  passosDaRevelacao,
} from './revelacao';

describe('a cascata da revelação', () => {
  it('entrega a nota primeiro e o X1 por último', () => {
    expect(FASES_DA_REVELACAO[0]).toBe('nota');
    expect(FASES_DA_REVELACAO[FASES_DA_REVELACAO.length - 1]).toBe('x1');
    expect(FASE_FINAL).toBe('x1');
  });

  it('agenda cada passo depois do anterior, nunca junto', () => {
    const passos = passosDaRevelacao(false);
    const atrasos = passos.map((passo) => passo.atrasoMs);

    expect(passos.map((passo) => passo.fase)).toEqual(['reacao', 'comentario', 'medidas', 'x1']);
    for (let i = 1; i < atrasos.length; i += 1) {
      expect(atrasos[i]).toBeGreaterThan(atrasos[i - 1]);
    }
  });

  it('dá ao comentário os 120ms de atraso que o par pede', () => {
    expect(ATRASOS_DA_REVELACAO_MS.comentario - ATRASOS_DA_REVELACAO_MS.reacao).toBe(120);
  });

  it('com movimento reduzido não sobra passo nenhum pra agendar', () => {
    expect(passosDaRevelacao(true)).toHaveLength(0);
  });

  it('a fase da nota ainda não libera as medidas', () => {
    expect(jaChegouEm('nota', 'medidas')).toBe(false);
    expect(jaChegouEm('nota', 'nota')).toBe(true);
  });

  it('a última fase libera tudo que veio antes', () => {
    expect(jaChegouEm('x1', 'reacao')).toBe(true);
    expect(jaChegouEm('x1', 'medidas')).toBe(true);
  });
});
