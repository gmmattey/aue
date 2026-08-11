import { describe, expect, it } from 'vitest';

import {
  JANELA_S,
  PASSO_S,
  RMS_MINIMO_AUDIVEL,
  maiorTrechoAtivo,
  medidasDoTrechoAtivo,
  percentile,
  preencherBuracosCurtos,
  rmsPorQuadro,
} from './trechoAtivo';

/**
 * O jogo mede o arroto, não a gravação.
 *
 * Quem espera três segundos para tocar em "JÁ FOI" não arrotou melhor. Estes
 * testes travam justamente isso: silêncio de borda não conta, buraco curto no
 * meio do arroto não parte o fôlego em dois, e clipe mudo não produz medida
 * nenhuma.
 */

/** Onda senoidal de amplitude fixa — RMS previsível: amplitude / raiz de 2. */
function tom(amostras: number, amplitude: number, sampleRate = 1000): Float32Array {
  const saida = new Float32Array(amostras);
  for (let i = 0; i < amostras; i++) {
    saida[i] = amplitude * Math.sin((2 * Math.PI * 50 * i) / sampleRate);
  }
  return saida;
}

function silencio(amostras: number): Float32Array {
  return new Float32Array(amostras);
}

function emenda(...partes: Float32Array[]): Float32Array {
  const total = partes.reduce((soma, parte) => soma + parte.length, 0);
  const saida = new Float32Array(total);
  let offset = 0;
  for (const parte of partes) {
    saida.set(parte, offset);
    offset += parte.length;
  }
  return saida;
}

describe('percentil', () => {
  it('lista vazia vale zero, e não NaN', () => {
    expect(percentile([], 0.75)).toBe(0);
  });

  it('pega o valor exato quando cai em cima de uma posição', () => {
    expect(percentile([0, 1, 2, 3, 4], 0.5)).toBe(2);
    expect(percentile([0, 1, 2, 3, 4], 0)).toBe(0);
    expect(percentile([0, 1, 2, 3, 4], 1)).toBe(4);
  });

  it('interpola quando cai no meio de duas posições', () => {
    expect(percentile([0, 10], 0.75)).toBeCloseTo(7.5, 9);
  });

  it('não depende da ordem em que os valores chegaram', () => {
    expect(percentile([4, 0, 3, 1, 2], 0.75)).toBe(percentile([0, 1, 2, 3, 4], 0.75));
  });
});

describe('RMS quadro a quadro', () => {
  it('clipe menor que a janela vira um quadro só', () => {
    const quadros = rmsPorQuadro(tom(10, 1), 1000);
    expect(quadros).toHaveLength(1);
  });

  it('mede a amplitude do tom, não o tamanho do arquivo', () => {
    const sampleRate = 1000;
    const quadros = rmsPorQuadro(tom(sampleRate, 1), sampleRate);
    // RMS de senoide de amplitude 1 é 1/raiz(2).
    for (const valor of quadros) {
      expect(valor).toBeCloseTo(Math.SQRT1_2, 1);
    }
  });

  it('silêncio dá zero em todos os quadros', () => {
    expect(rmsPorQuadro(silencio(1000), 1000).every((valor) => valor === 0)).toBe(true);
  });
});

describe('buracos curtos no meio do arroto', () => {
  it('fecha um vão de até 120 ms', () => {
    // 120 ms com passo de 10 ms são 12 quadros.
    const mascara = [true, ...Array(12).fill(false), true];
    expect(preencherBuracosCurtos(mascara).every(Boolean)).toBe(true);
  });

  it('não fecha vão maior que isso — ali são dois arrotos', () => {
    const mascara = [true, ...Array(30).fill(false), true];
    const saida = preencherBuracosCurtos(mascara);
    expect(saida.filter(Boolean)).toHaveLength(2);
  });

  it('não inventa som no começo nem no fim', () => {
    const mascara = [false, false, true, false, false];
    expect(preencherBuracosCurtos(mascara)).toEqual(mascara);
  });
});

describe('maior trecho ativo', () => {
  it('máscara sem nada ativo não tem duração', () => {
    expect(maiorTrechoAtivo([false, false, false])).toBe(0);
  });

  it('um quadro ativo dura uma janela', () => {
    expect(maiorTrechoAtivo([false, true, false])).toBeCloseTo(JANELA_S, 9);
  });

  it('pega o maior pedaço contínuo, não a soma dos pedaços', () => {
    const mascara = [true, true, false, true, true, true, false, true];
    expect(maiorTrechoAtivo(mascara)).toBeCloseTo(JANELA_S + 2 * PASSO_S, 9);
  });
});

describe('as três medidas do trecho ativo', () => {
  const sampleRate = 1000;

  it('ignora o silêncio de antes e de depois do arroto', () => {
    // Meio segundo de arroto no meio de 5,5 s de arquivo.
    const arroto = tom(500, 0.5, sampleRate);
    const comEspera = emenda(silencio(2000), arroto, silencio(3000));

    const medidas = medidasDoTrechoAtivo(comEspera, comEspera, sampleRate);

    // O fôlego é o do arroto, com folga de um quadro para cada lado — não os
    // 5,5 s do arquivo.
    expect(medidas.activeDuration).toBeGreaterThan(0.4);
    expect(medidas.activeDuration).toBeLessThan(0.5 + 2 * JANELA_S);
    expect(medidas.activeRms).toBeCloseTo(
      medidasDoTrechoAtivo(arroto, arroto, sampleRate).activeRms,
      2,
    );
  });

  it('esperar mais tempo para encerrar não aumenta o fôlego', () => {
    const arroto = tom(500, 0.5, sampleRate);
    const curto = medidasDoTrechoAtivo(
      emenda(arroto, silencio(500)),
      emenda(arroto, silencio(500)),
      sampleRate,
    );
    const enrolado = medidasDoTrechoAtivo(
      emenda(arroto, silencio(5000)),
      emenda(arroto, silencio(5000)),
      sampleRate,
    );

    expect(enrolado.activeDuration).toBeCloseTo(curto.activeDuration, 9);
  });

  it('arroto mais longo tem mais fôlego', () => {
    const curto = tom(300, 0.5, sampleRate);
    const longo = tom(1500, 0.5, sampleRate);

    expect(medidasDoTrechoAtivo(longo, longo, sampleRate).activeDuration).toBeGreaterThan(
      medidasDoTrechoAtivo(curto, curto, sampleRate).activeDuration,
    );
  });

  it('grave é proporção, e fica entre 0 e 1', () => {
    const original = tom(1000, 0.5, sampleRate);
    const soGrave = medidasDoTrechoAtivo(original, original, sampleRate);
    const semGrave = medidasDoTrechoAtivo(original, silencio(1000), sampleRate);

    expect(soGrave.bassRatio).toBeCloseTo(1, 6);
    expect(semGrave.bassRatio).toBe(0);
  });

  it('clipe abaixo do piso audível não produz medida nenhuma', () => {
    const quaseNada = tom(2000, RMS_MINIMO_AUDIVEL / 10, sampleRate);
    expect(medidasDoTrechoAtivo(quaseNada, quaseNada, sampleRate)).toEqual({
      activeDuration: 0,
      activeRms: 0,
      bassRatio: 0,
    });
  });
});
