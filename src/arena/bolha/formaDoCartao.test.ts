import { describe, expect, it } from 'vitest';

import { caminhoDaBolha } from './caminhoDaBolha';
import { bolhaDoCartao } from './formaDoCartao';

/*
  A Bolha impressa muda de cara com a nota — requisito 6 da #151, e o único
  jeito de provar isso sem olhar duas imagens lado a lado é comparar os
  caminhos.
*/
describe('a cara da Bolha na imagem', () => {
  it('nota alta desenha diferente de nota baixa', () => {
    const alta = bolhaDoCartao(97);
    const baixa = bolhaDoCartao(11);

    expect(caminhoDaBolha(alta.forma, 0)).not.toBe(caminhoDaBolha(baixa.forma, 0));
  });

  it('nota alta incha e nota baixa colapsa', () => {
    expect(bolhaDoCartao(100).forma.amplitude).toBeGreaterThan(
      bolhaDoCartao(0).forma.amplitude,
    );
    expect(bolhaDoCartao(0).forma.amplitude).toBe(4);
    expect(bolhaDoCartao(0).forma.pontos).toBe(4);
    expect(bolhaDoCartao(100).forma.pontos).toBe(8);
  });

  it('cresce do fundo do poço até o topo', () => {
    expect(bolhaDoCartao(0).escala).toBeCloseTo(0.78);
    expect(bolhaDoCartao(100).escala).toBeCloseTo(1.12);
  });

  it('a mesma nota desenha a mesma Bolha sempre', () => {
    // Sortear aqui faria a imagem mudar de cara entre um compartilhamento e
    // outro do MESMO arroto, e o jogador ia achar que o jogo estava zoando.
    const a = bolhaDoCartao(64.2);
    const b = bolhaDoCartao(64.2);
    expect(caminhoDaBolha(a.forma, 0)).toBe(caminhoDaBolha(b.forma, 0));
  });

  it('nota fora da faixa não deforma nada nem estoura', () => {
    // O servidor manda o que quiser; a imagem não pode sair com um caminho
    // cheio de NaN, que o navegador desenha como nada.
    for (const nota of [-30, 250, Number.NaN, Number.POSITIVE_INFINITY]) {
      const { forma, escala } = bolhaDoCartao(nota);
      expect(Number.isFinite(escala)).toBe(true);
      expect(caminhoDaBolha(forma, 0)).not.toContain('NaN');
    }
  });
});
