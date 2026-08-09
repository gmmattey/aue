/**
 * A NOTA DA ARENA É A MESMA NOTA DO JOGO DE HOJE.
 *
 * O ponto mais fácil de estragar nesta fatia era a Arena "quase" usar a
 * fórmula: um arredondamento, uma parcial trocada de lugar, um mapa de origem
 * diferente — e o jogo novo daria nota diferente do jogo velho para o mesmo
 * arroto, sem nada acusar.
 *
 * Este teste roda a fórmula direto e compara com o que sai pela porta do juiz.
 * Se alguém encostar no meio do caminho, cai aqui.
 */
import { describe, expect, it, vi } from 'vitest';

import { calculateScore } from '../../features/audio/rules';
import type { Origin } from '../../features/audio/rules';
import { fraseDoJuiz } from '../../features/audio/frasesDoJuiz';
import type { AudioMetrics } from '../../features/audio/engine';
import { ALVOS_DE_ORIGEM } from '../../nucleo/origem/origens';
import type { AudioCapturado } from '../../portas/captura';

/*
  O motor de extração é dublado porque ele decodifica áudio de verdade —
  `OfflineAudioContext` não existe fora do navegador. O que está sob teste aqui
  é a PONTE, não a decodificação.
*/
const MEDIDAS: AudioMetrics = { duration: 3.4, rms: 0.18, bassEnergy: 0.42, texture: 0.31 };

vi.mock('../../features/audio/engine', async (original) => {
  const real = await original<typeof import('../../features/audio/engine')>();
  return { ...real, analyzeAudio: vi.fn(async () => MEDIDAS) };
});

const { criarJuizWeb } = await import('./juiz');

const AUDIO = {
  dados: new Blob(['arroto']),
  formato: 'audio/mp4',
  duracaoMs: 3400,
  resumo: { rms: 0.18, pico: 0.5 },
} as AudioCapturado;

describe('a ponte do juiz', () => {
  it('devolve exatamente a nota da fórmula, para toda origem', async () => {
    const juiz = criarJuizWeb();

    for (const alvo of ALVOS_DE_ORIGEM) {
      const esperado = calculateScore(MEDIDAS, alvo.tipo as Origin);
      const veredito = await juiz.julgar(AUDIO, alvo.tipo);

      expect(veredito.ok, `origem ${alvo.rotulo}`).toBe(true);
      if (!veredito.ok) continue;

      expect(veredito.nota.nota).toBe(esperado.score);
      expect(veredito.nota.classificacao).toBe(esperado.classification);
    }
  });

  it('as quatro medidas são as parciais da fórmula, com nome de rua', async () => {
    const esperado = calculateScore(MEDIDAS, 'Bebida');
    const veredito = await criarJuizWeb().julgar(AUDIO, 'Bebida');
    if (!veredito.ok) throw new Error('devia ter julgado');

    expect(veredito.nota.medidas).toEqual({
      grave: esperado.partialScores.depth,
      estouro: esperado.partialScores.power,
      folego: esperado.partialScores.duration,
      sujeira: esperado.partialScores.texture,
    });
  });

  it('a frase vem da tabela por faixa, e nunca sai nula na tela', async () => {
    const esperado = calculateScore(MEDIDAS, 'Comida');
    const veredito = await criarJuizWeb().julgar(AUDIO, 'Comida');
    if (!veredito.ok) throw new Error('devia ter julgado');

    expect(veredito.nota.frase).toBe(fraseDoJuiz(esperado.classification));
    expect(veredito.nota.frase).toBeTruthy();
  });
});
