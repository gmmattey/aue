import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ondaDe16k, TAXA_DO_YAMNET } from './ondaDe16k';

/**
 * A conversão que, se estiver errada, NÃO DÁ ERRO — dá número errado.
 *
 * Entregar 48 kHz a um modelo que espera 16 kHz não lança exceção nenhuma: o
 * YAMNet lê a onda como se fosse 16 kHz, ouve tudo três vezes mais grave e três
 * vezes mais lento, e devolve um score plausível sobre outra coisa. É por isso
 * que este caminho tem teste apesar de ser "só encanamento".
 *
 * `OfflineAudioContext` não existe no jsdom nem no node, então aqui ele é
 * dublado — o que se verifica é a DECISÃO (converter ou não, e com que
 * parâmetros), não a qualidade da reamostragem, que é do navegador.
 */

interface BufferFalso {
  numberOfChannels: number;
  sampleRate: number;
  duration: number;
  getChannelData: (canal: number) => Float32Array;
}

function bufferFalso(canais: number, taxa: number, duracao: number): BufferFalso {
  // Um array por canal, criado UMA vez: as asserções são de identidade
  // (`toBe`), porque o que se verifica é de QUAL buffer a onda saiu.
  const dados = Array.from({ length: canais }, (_, canal) =>
    Float32Array.from([canal, taxa, canais]),
  );
  return {
    numberOfChannels: canais,
    sampleRate: taxa,
    duration: duracao,
    getChannelData: (canal) => dados[canal],
  };
}

/** Registra como cada contexto foi construído, para as asserções. */
let construidos: Array<{ canais: number; quadros: number; taxa: number }>;
let decodificado: BufferFalso;
let renderizado: BufferFalso;

class ContextoFalso {
  destination = {};

  constructor(canais: number, quadros: number, taxa: number) {
    construidos.push({ canais, quadros, taxa });
  }

  decodeAudioData = async (_bytes: ArrayBuffer) => decodificado;

  createBufferSource() {
    return { buffer: null as unknown, connect: () => {}, start: () => {} };
  }

  startRendering = async () => renderizado;
}

/** Blob com `arrayBuffer()`, que o jsdom não implementa por completo. */
function blobFalso(): Blob {
  return { arrayBuffer: async () => new ArrayBuffer(8) } as unknown as Blob;
}

beforeEach(() => {
  construidos = [];
  renderizado = bufferFalso(1, TAXA_DO_YAMNET, 2);
  vi.stubGlobal('OfflineAudioContext', ContextoFalso);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('ondaDe16k', () => {
  it('quando o navegador já decodifica em 16 kHz mono, não renderiza de novo', async () => {
    decodificado = bufferFalso(1, TAXA_DO_YAMNET, 3);

    const onda = await ondaDe16k(blobFalso());

    // Um único contexto: o decodificador. Nenhuma conversão foi necessária.
    expect(construidos).toHaveLength(1);
    expect(construidos[0].taxa).toBe(TAXA_DO_YAMNET);
    expect(onda).toBe(decodificado.getChannelData(0));
  });

  it('estéreo é MISTURADO, e não meio jogado fora', async () => {
    /*
      `engine.ts` resolve estéreo com `getChannelData(0)`, ou seja, descartando o
      canal direito. Aqui isso não serve: um arroto gravado com o telefone
      virado pode estar mais forte justamente no canal descartado, e o juiz
      julgaria o silêncio do outro lado. Quem mistura é a renderização em mono.
    */
    decodificado = bufferFalso(2, TAXA_DO_YAMNET, 3);

    const onda = await ondaDe16k(blobFalso());

    expect(construidos).toHaveLength(2);
    expect(construidos[1]).toEqual({ canais: 1, quadros: 3 * TAXA_DO_YAMNET, taxa: TAXA_DO_YAMNET });
    expect(onda).toBe(renderizado.getChannelData(0));
  });

  it('navegador que ignora a taxa do contexto ao decodificar é corrigido', async () => {
    decodificado = bufferFalso(1, 48000, 2.5);

    await ondaDe16k(blobFalso());

    expect(construidos).toHaveLength(2);
    expect(construidos[1].taxa).toBe(TAXA_DO_YAMNET);
    expect(construidos[1].quadros).toBe(Math.ceil(2.5 * TAXA_DO_YAMNET));
  });

  it('blob truncado não pede contexto de comprimento zero', async () => {
    // `OfflineAudioContext` recusa comprimento 0 — e blob truncado existe.
    decodificado = bufferFalso(2, 48000, 0);

    await ondaDe16k(blobFalso());

    expect(construidos[1].quadros).toBe(1);
  });

  it('sem Web Audio no navegador, falha de um jeito que o juiz sabe tratar', async () => {
    vi.stubGlobal('OfflineAudioContext', undefined);

    await expect(ondaDe16k(blobFalso())).rejects.toThrow(/Web Audio/);
  });
});
