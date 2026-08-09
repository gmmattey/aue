import { describe, expect, it } from 'vitest';

import { REPOUSO, caminhoDaBolha } from './caminhoDaBolha';

describe('a forma da Bolha', () => {
  it('devolve um caminho SVG fechado', () => {
    const d = caminhoDaBolha(REPOUSO, 0);
    expect(d.startsWith('M')).toBe(true);
    expect(d.endsWith('Z')).toBe(true);
    expect(d).not.toContain('NaN');
  });

  it('respira: o desenho muda com o tempo', () => {
    expect(caminhoDaBolha(REPOUSO, 0)).not.toBe(caminhoDaBolha(REPOUSO, 1.7));
  });

  it('sem amplitude, congela — é o que movimento reduzido usa', () => {
    const parada = { ...REPOUSO, amplitude: 0 };
    expect(caminhoDaBolha(parada, 0)).toBe(caminhoDaBolha(parada, 9));
  });

  it('não desenha polígono degenerado nem com pouco ponto', () => {
    // Menos de três pontos não fecha forma nenhuma. O `Math.max(3, ...)`
    // existe por isso, e sem teste ele é a primeira coisa a ser "simplificada".
    expect(caminhoDaBolha({ ...REPOUSO, pontos: 1 }, 0)).not.toContain('NaN');
    expect(caminhoDaBolha({ ...REPOUSO, pontos: 0 }, 0).length).toBeGreaterThan(10);
  });
});
