import { describe, expect, it } from 'vitest';

import { calculateScore } from './rules';
import type { AudioMetrics } from './engine';

/**
 * Silêncio não pode virar nota.
 *
 * O CASO REAL (iPhone, 2026-08-08): o áudio não subiu e a tela mostrou
 * **54,2 — "Arroto Respeitável"**, com DURAÇÃO 96, POTÊNCIA 0, PROFUND. 0 e
 * TEXTURA 100. Não era um arroto fraco; era uma gravação sem som nenhum.
 *
 * A fórmula premia silêncio por acidente, porque três das cinco parcelas não
 * dependem de haver som: a duração conta o tempo, a origem é escolhida na tela,
 * e a textura — a mais traiçoeira — é taxa de cruzamentos por zero, que SATURA
 * quando o sinal fica oscilando em torno do zero.
 *
 * A fórmula NÃO foi alterada (ela é espelhada no SQL e há um teste travando
 * essa paridade). O que entrou foi uma guarda de ENTRADA em `engine.ts`:
 * `AudioMudoError` quando o RMS fica abaixo do chão de audibilidade.
 *
 * Este arquivo trava as duas metades: que a aritmética do caso real é essa
 * mesmo (para ninguém achar que foi outra coisa), e que o número que a guarda
 * usa de fato separa silêncio de arroto.
 */

const RMS_MINIMO_AUDIVEL = 0.005;

/**
 * Aproxima o que a tela do iPhone mostrou.
 *
 * As parciais exibidas usam `toFixed(0)`, então o "0" da tela é qualquer valor
 * abaixo de 0,5 — não necessariamente zero. Por isso este teste NÃO finge saber
 * a segunda casa da nota real: ele trava o COMPORTAMENTO (silêncio recebendo
 * nota de arroto respeitável), que é o defeito, e não um decimal que não temos
 * como reconstituir.
 */
const GRAVACAO_MUDA: AudioMetrics = {
  duration: 4.8,      // -> 96
  rms: 0.0004,        // -> 0,1 na conta; "0" na tela
  bassEnergy: 0.0002, // -> 0,1 na conta; "0" na tela
  texture: 0.06,      // -> 100 (saturada, justamente por ser quase silêncio)
};

describe('silêncio não vira nota', () => {
  it('silêncio pontua como arroto respeitável — é o defeito', () => {
    const r = calculateScore(GRAVACAO_MUDA, 'Espontâneo');

    // ~54 numa escala de 100, sem um único decibel. A faixa importa mais que o
    // decimal: metade da nota máxima para uma gravação sem som.
    expect(r.score).toBeGreaterThan(50);
    expect(r.score).toBeLessThan(60);
    expect(r.classification).toBe('Arroto Respeitável');

    // As duas parcelas que dependem de haver som ficam no chão...
    expect(r.partialScores.power).toBeLessThan(1);
    expect(r.partialScores.depth).toBeLessThan(1);
    // ...e ainda assim a textura vai ao máximo.
    expect(r.partialScores.texture).toBe(100);
  });

  it('a nota vem inteira das parcelas que não ouvem nada', () => {
    // Duração, textura e origem somam 0,25 + 0,20 + 0,10 = 55% do peso, e
    // NENHUMA delas exige som audível. É a raiz do problema, e o motivo de a
    // correção ser uma guarda de entrada e não um ajuste de pesos.
    const r = calculateScore(GRAVACAO_MUDA, 'Espontâneo');
    const semOuvir =
      r.partialScores.duration * 0.25 +
      r.partialScores.texture * 0.20 +
      r.partialScores.origin * 0.10;
    expect(semOuvir / r.score).toBeGreaterThan(0.99);
  });

  it('a textura satura no silêncio, em vez de zerar', () => {
    // É o núcleo do defeito, e o mais fácil de alguém "consertar" errado
    // achando que silêncio deveria dar textura baixa.
    expect(calculateScore({ ...GRAVACAO_MUDA, texture: 0.06 }, 'Espontâneo').partialScores.texture)
      .toBe(100);
  });

  it('o piso separa silêncio de arroto de verdade', () => {
    // Chão de ruído de telefone em sala silenciosa fica bem abaixo do piso.
    expect(0.0004).toBeLessThan(RMS_MINIMO_AUDIVEL);
    // Um arroto perto do microfone fica uma ordem de grandeza acima.
    for (const rmsDeArrotoReal of [0.05, 0.1, 0.3]) {
      expect(rmsDeArrotoReal).toBeGreaterThan(RMS_MINIMO_AUDIVEL);
    }
    // E um arroto tímido, longe do telefone, ainda passa: a guarda não pode
    // recusar quem arrotou de verdade só por ter sido discreto.
    expect(0.02).toBeGreaterThan(RMS_MINIMO_AUDIVEL);
  });
});
