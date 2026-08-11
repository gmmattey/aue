/**
 * A NOTA DA ARENA É A MESMA NOTA DO JOGO DE HOJE.
 *
 * O ponto mais fácil de estragar nesta fatia era a Arena "quase" usar a
 * fórmula: um arredondamento, uma parcial trocada de lugar, um mapa de origem
 * diferente — e o jogo novo daria nota diferente do jogo velho para o mesmo
 * arroto, sem nada acusar.
 *
 * Este teste roda a fórmula direto e compara com o que sai pela porta da pontuação.
 * Se alguém encostar no meio do caminho, cai aqui.
 */
import { describe, expect, it, vi } from 'vitest';

import { calculateScore } from '../../features/audio/rules';
import type { Origin } from '../../features/audio/rules';
import { faixaDaNota, rotuloDaFaixa } from '../../nucleo/nota/faixas';
import type { AudioMetrics } from '../../features/audio/engine';
import { ALVOS_DE_ORIGEM } from '../../nucleo/origem/origens';
import type { AudioCapturado } from '../../portas/captura';

/*
  O motor de extração é dublado porque ele decodifica áudio de verdade —
  `OfflineAudioContext` não existe fora do navegador. O que está sob teste aqui
  é a PONTE, não a decodificação.
*/
const MEDIDAS: AudioMetrics = {
  duration: 3.4,
  rms: 0.18,
  bassEnergy: 0.42,
  texture: 0.31,
  // O que a nota v2 realmente usa. Sem estes três a ponte estaria sendo testada
  // por um caminho que não existe em produção.
  activeDuration: 1.6,
  activeRms: 0.21,
  bassRatio: 0.24,
};

vi.mock('../../features/audio/engine', async (original) => {
  const real = await original<typeof import('../../features/audio/engine')>();
  return { ...real, analyzeAudio: vi.fn(async () => MEDIDAS) };
});

const { criarPontuadorWeb } = await import('./pontuacao');

const AUDIO = {
  dados: new Blob(['arroto']),
  formato: 'audio/mp4',
  duracaoMs: 3400,
  resumo: { rms: 0.18, pico: 0.5 },
} as AudioCapturado;

describe('a ponte da pontuação', () => {
  it('devolve exatamente a nota da fórmula, para toda origem', async () => {
    const pontuador = criarPontuadorWeb();

    for (const alvo of ALVOS_DE_ORIGEM) {
      const esperado = calculateScore(MEDIDAS, alvo.tipo as Origin);
      const veredito = await pontuador.pontuar(AUDIO, alvo.tipo);

      expect(veredito.ok, `origem ${alvo.rotulo}`).toBe(true);
      if (!veredito.ok) continue;

      expect(veredito.nota.nota).toBe(esperado.score);
      /*
        A `Nota` carrega a REAÇÃO escolhida, não o rótulo que vai pro banco. As
        duas saem da mesma faixa — é isso que precisa continuar valendo, senão a
        tela mostraria fala de uma faixa e o banco guardaria outra.
      */
      expect(faixaDaNota(esperado.score).baralho.map((f) => f.reacao)).toContain(
        veredito.nota.classificacao,
      );
      expect(esperado.classification).toBe(rotuloDaFaixa(esperado.score));
    }
  });

  it('as quatro medidas são as parciais da fórmula, com nome de rua', async () => {
    const esperado = calculateScore(MEDIDAS, 'Bebida');
    const veredito = await criarPontuadorWeb().pontuar(AUDIO, 'Bebida');
    if (!veredito.ok) throw new Error('devia ter julgado');

    expect(veredito.nota.medidas).toEqual({
      grave: esperado.partialScores.depth,
      estouro: esperado.partialScores.power,
      folego: esperado.partialScores.duration,
      sujeira: esperado.partialScores.texture,
    });
  });

  it('a reação e a frase são o MESMO par da faixa, nunca cruzadas', async () => {
    const esperado = calculateScore(MEDIDAS, 'Comida');
    const veredito = await criarPontuadorWeb().pontuar(AUDIO, 'Comida');
    if (!veredito.ok) throw new Error('devia ter julgado');

    expect(faixaDaNota(esperado.score).baralho).toContainEqual({
      reacao: veredito.nota.classificacao,
      fraseDoJuiz: veredito.nota.frase,
    });
    expect(veredito.nota.frase).toBeTruthy();
  });

  it('a escolha acontece uma vez, e nada re-sorteia depois', async () => {
    // A mesma `Nota` é lida pela tela e pelo compartilhamento. O que este teste
    // trava é que um julgamento devolve UM par — não que dois julgamentos do
    // mesmo áudio devolvam o mesmo, que é justamente o preço aceito da variedade.
    const veredito = await criarPontuadorWeb().pontuar(AUDIO, 'Comida');
    if (!veredito.ok) throw new Error('devia ter julgado');

    expect(veredito.nota.classificacao).toBeTruthy();
    expect(veredito.nota.frase).toBeTruthy();
  });
});
