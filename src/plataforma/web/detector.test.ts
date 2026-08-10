// @vitest-environment jsdom
/**
 * A POLÍTICA DE FALHA DO DETECTOR, travada em teste.
 *
 * Ela é a decisão mais importante desta peça, e é assimétrica de propósito:
 * **recusar exige o detector ter falado**. Modelo que não baixou, WebGL morto,
 * navegador sem áudio, resposta que demorou demais — tudo isso LIBERA a nota.
 *
 * É a diferença entre "o juiz recusou" e "o juiz não estava lá". Um jogo que
 * para de funcionar porque um arquivo de 16 MB não chegou seria pior que um
 * jogo sem filtro nenhum.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';

const julgarSeEhArroto = vi.fn();

vi.mock('../../features/audio/juiz/julgarSeEhArroto', () => ({
  julgarSeEhArroto: (...args: unknown[]) => julgarSeEhArroto(...(args as [])),
  pontuacaoLiberada: (v: { status: string }) => v.status !== 'nao-e-arroto',
}));

const { criarDetectorWeb, TETO_DA_CONFERIDA_MS } = await import('./detector');

const AUDIO = {
  dados: new Blob(['arroto']),
  formato: 'audio/mp4',
  duracaoMs: 2000,
  resumo: { rms: 0.2, pico: 0.5 },
};

afterEach(() => {
  vi.clearAllMocks();
  vi.useRealTimers();
});

describe('o detector', () => {
  it('arroto passa', async () => {
    julgarSeEhArroto.mockResolvedValue({ status: 'arroto', confianca: 0.9, limiar: 0.2 });
    expect(await criarDetectorWeb().podePontuar(AUDIO)).toBe(true);
  });

  it('o que não é arroto NÃO passa', async () => {
    julgarSeEhArroto.mockResolvedValue({ status: 'nao-e-arroto', confianca: 0.01, limiar: 0.2 });
    expect(await criarDetectorWeb().podePontuar(AUDIO)).toBe(false);
  });

  it('detector indisponível libera a nota', async () => {
    // Modelo que não baixou não pode custar o arroto de ninguém.
    julgarSeEhArroto.mockResolvedValue({ status: 'indisponivel', motivo: 'modelo não chegou' });
    expect(await criarDetectorWeb().podePontuar(AUDIO)).toBe(true);
  });

  it('detector que explode libera a nota', async () => {
    julgarSeEhArroto.mockRejectedValue(new Error('quebrou feio'));
    expect(await criarDetectorWeb().podePontuar(AUDIO)).toBe(true);
  });

  it('detector que demora demais libera a nota', async () => {
    /*
      O `ARENA.md` proíbe ficar preso na conferida da saída. Estourou o teto, a
      nota passa — o detector é filtro contra trapaça, não pedágio.
    */
    vi.useFakeTimers();
    julgarSeEhArroto.mockReturnValue(new Promise(() => {}));

    const resposta = criarDetectorWeb().podePontuar(AUDIO);
    // Além do teto real, que é de oito segundos.
    await vi.advanceTimersByTimeAsync(TETO_DA_CONFERIDA_MS + 500);

    expect(await resposta).toBe(true);
  });

  it('preparar não espera, não devolve promessa e não explode', () => {
    // Chamado no toque em ARROTAR: se ele pudesse falhar para quem chama,
    // derrubaria a gravação por causa de um download.
    const detector = criarDetectorWeb();
    expect(detector.preparar()).toBeUndefined();
    expect(() => detector.preparar()).not.toThrow();
  });
});
