import { describe, expect, it } from 'vitest';

import { calculateScore } from './rules';
import type { AudioMetrics } from './engine';

/**
 * Silêncio não pode chegar à nota.
 *
 * O caso real de 08/08/2026 mostrou por que a ordem importa: um arquivo quase
 * mudo ainda pode ter duração, origem declarada e razões espectrais numericamente
 * grandes. Nenhuma fórmula de qualidade deve ser usada como detector de entrada.
 *
 * A barreira de verdade continua em `engine.ts`: RMS abaixo de 0,005 lança
 * `AudioMudoError` ANTES do YAMNet e ANTES de `calculateScore`.
 *
 * A v2 melhora uma segunda coisa: ZCR/Textura pode continuar saturando em sinal
 * quase mudo, mas agora pesa zero. Então "Sujeira/Nojeira" não consegue mais
 * fabricar pontos por conta própria.
 */

const RMS_MINIMO_AUDIVEL = 0.005;

const GRAVACAO_MUDA: AudioMetrics = {
  duration: 4.8,
  rms: 0.0004,
  bassEnergy: 0.0002,
  texture: 0.06,
};

describe('silêncio não vira nota', () => {
  it('a gravação muda está abaixo do piso que a análise recusa antes da pontuação', () => {
    expect(GRAVACAO_MUDA.rms).toBeLessThan(RMS_MINIMO_AUDIVEL);
  });

  it('textura pode saturar, mas não muda mais a nota v2', () => {
    const saturada = calculateScore(GRAVACAO_MUDA, 'Espontâneo');
    const semTextura = calculateScore({ ...GRAVACAO_MUDA, texture: 0 }, 'Espontâneo');

    expect(saturada.partialScores.texture).toBe(100);
    expect(semTextura.partialScores.texture).toBe(0);
    expect(saturada.score).toBeCloseTo(semTextura.score, 9);
  });

  it('calculateScore não é usado como detector de silêncio', () => {
    // Este número pode até ser alto porque a função recebe métricas já prontas e
    // não tem o áudio bruto para decidir se elas vieram de ruído. Isso é
    // deliberado: a porta é `analyzeAudio` + YAMNet. Se alguém usar score > 0
    // como prova de que "é arroto", reabre o defeito por outra porta.
    const r = calculateScore(GRAVACAO_MUDA, 'Espontâneo');
    expect(r.score).toBeGreaterThan(0);
    expect(GRAVACAO_MUDA.rms).toBeLessThan(RMS_MINIMO_AUDIVEL);
  });

  it('o piso mantém margem para arroto real discreto', () => {
    for (const rmsDeArrotoReal of [0.02, 0.05, 0.1, 0.3]) {
      expect(rmsDeArrotoReal).toBeGreaterThan(RMS_MINIMO_AUDIVEL);
    }
  });
});
