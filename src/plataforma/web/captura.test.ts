// @vitest-environment jsdom
/**
 * O microfone, e a única coisa que não pode falhar: **soltar**.
 *
 * Vazamento de microfone é defeito de privacidade. Os testes provam que a
 * trilha é PARADA — coletor de lixo não apaga a luzinha do sistema,
 * `track.stop()` apaga — e que ela é parada em **todos** os caminhos de saída,
 * não só no bonito.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';

import { criarCapturaWeb } from './captura';

function trilhaFalsa() {
  return { stop: vi.fn(), kind: 'audio' };
}

function streamFalso(trilhas = [trilhaFalsa()]) {
  return { getTracks: () => trilhas } as unknown as MediaStream;
}

/** O gravador do navegador, reduzido ao que o adaptador usa. */
class GravadorFalso {
  static ultimo: GravadorFalso | null = null;

  state: 'inactive' | 'recording' = 'inactive';
  mimeType = 'audio/mp4';
  ondataavailable: ((evento: { data: Blob }) => void) | null = null;
  onstop: (() => void) | null = null;
  onerror: (() => void) | null = null;
  quebrarAoParar = false;

  constructor() {
    GravadorFalso.ultimo = this;
  }

  start() {
    this.state = 'recording';
  }

  stop() {
    if (this.quebrarAoParar) throw new Error('gravador morreu');
    this.state = 'inactive';
    this.ondataavailable?.({ data: new Blob(['arroto']) });
    this.onstop?.();
  }
}

/** O medidor. `amplitude` controla o que o sinal "tem" de som. */
let amplitude = 0;

class ContextoFalso {
  createAnalyser() {
    return {
      fftSize: 2048,
      getFloatTimeDomainData: (destino: Float32Array) => destino.fill(amplitude),
    };
  }
  createMediaStreamSource() {
    return { connect: () => {} };
  }
  resume() {
    return Promise.resolve();
  }
  close() {
    return Promise.resolve();
  }
}

function montarNavegador(getUserMedia: () => Promise<MediaStream>) {
  vi.stubGlobal('navigator', { mediaDevices: { getUserMedia } });
  vi.stubGlobal('MediaRecorder', GravadorFalso);
  vi.stubGlobal('AudioContext', ContextoFalso);
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
  GravadorFalso.ultimo = null;
  amplitude = 0;
});

describe('pedir e soltar', () => {
  it('liberou: o stream fica vivo até alguém soltar', async () => {
    montarNavegador(async () => streamFalso());
    const captura = criarCapturaWeb();

    expect(await captura.pedir()).toEqual({ ok: true });
    expect(captura.estaVivo()).toBe(true);
  });

  it('soltar para as trilhas de verdade', async () => {
    const trilha = trilhaFalsa();
    montarNavegador(async () => streamFalso([trilha]));

    const captura = criarCapturaWeb();
    await captura.pedir();
    captura.soltar();

    expect(trilha.stop).toHaveBeenCalledTimes(1);
    expect(captura.estaVivo()).toBe(false);
  });

  it('soltar duas vezes, ou sem ter pedido, não explode', () => {
    const captura = criarCapturaWeb();
    expect(() => {
      captura.soltar();
      captura.soltar();
    }).not.toThrow();
  });

  it('pedir duas vezes não abre dois streams', async () => {
    const getUserMedia = vi.fn(async () => streamFalso());
    montarNavegador(getUserMedia);

    const captura = criarCapturaWeb();
    await captura.pedir();
    await captura.pedir();

    // Dois streams vivos significam dois indicadores de microfone no sistema, e
    // um deles sem dono para soltar.
    expect(getUserMedia).toHaveBeenCalledTimes(1);
  });

  it('a pessoa negou vira motivo "negado"', async () => {
    montarNavegador(async () => {
      throw Object.assign(new Error('Permission denied'), { name: 'NotAllowedError' });
    });

    expect(await criarCapturaWeb().pedir()).toEqual({ ok: false, motivo: 'negado' });
  });

  it('aparelho sem microfone vira motivo "semAparelho"', async () => {
    montarNavegador(async () => {
      throw Object.assign(new Error('nada aqui'), { name: 'NotFoundError' });
    });

    expect(await criarCapturaWeb().pedir()).toEqual({ ok: false, motivo: 'semAparelho' });
  });

  it('navegador sem getUserMedia não quebra — responde que não dá', async () => {
    // Página sem HTTPS, WebView antiga, API desligada. Acontece de verdade.
    vi.stubGlobal('navigator', {});
    expect(await criarCapturaWeb().pedir()).toEqual({ ok: false, motivo: 'semAparelho' });
  });
});

describe('gravar', () => {
  it('não começa sem microfone', () => {
    montarNavegador(async () => streamFalso());
    expect(criarCapturaWeb().comecar()).toBe(false);
  });

  it('grava, mede e entrega o áudio com o formato que o gravador disse', async () => {
    vi.useFakeTimers();
    montarNavegador(async () => streamFalso());
    amplitude = 0.2;

    const captura = criarCapturaWeb();
    await captura.pedir();
    expect(captura.comecar()).toBe(true);
    expect(captura.estaGravando()).toBe(true);

    vi.advanceTimersByTime(500);
    const resultado = await captura.parar();

    expect('dados' in resultado).toBe(true);
    if (!('dados' in resultado)) return;

    /*
      O FORMATO VEM DO GRAVADOR, e o dublê diz `audio/mp4` — que é o que o
      iPhone grava. Se alguém cravar `webm` no adaptador, este teste cai.
    */
    expect(resultado.formato).toBe('audio/mp4');
    expect(resultado.resumo.rms).toBeGreaterThan(0);
    expect(resultado.resumo.pico).toBeCloseTo(0.2, 5);
  });

  it('silêncio é medido como silêncio', async () => {
    vi.useFakeTimers();
    montarNavegador(async () => streamFalso());
    amplitude = 0;

    const captura = criarCapturaWeb();
    await captura.pedir();
    captura.comecar();
    vi.advanceTimersByTime(500);

    const resultado = await captura.parar();
    if (!('dados' in resultado)) throw new Error('devia ter gravado');

    expect(resultado.resumo.rms).toBe(0);
    expect(resultado.resumo.pico).toBe(0);
  });

  it('o medidor roda sozinho, sem ninguém perguntar o nível', async () => {
    /*
      O CASO QUE ISTO IMPEDE: quem usa movimento reduzido não tem Bolha
      animando, logo ninguém chama `nivelAtual()`. Se a medição dependesse
      dessa chamada, essa pessoa gravaria com o microfone perfeito e ouviria
      "não veio nada" — acessibilidade virando bug de gameplay.
    */
    vi.useFakeTimers();
    montarNavegador(async () => streamFalso());
    amplitude = 0.3;

    const captura = criarCapturaWeb();
    await captura.pedir();
    captura.comecar();
    vi.advanceTimersByTime(1000);

    const resultado = await captura.parar();
    if (!('dados' in resultado)) throw new Error('devia ter gravado');
    expect(resultado.resumo.rms).toBeGreaterThan(0);
  });

  it('o nível sobe com o som e volta a zero quando solta', async () => {
    vi.useFakeTimers();
    montarNavegador(async () => streamFalso());
    amplitude = 0.4;

    const captura = criarCapturaWeb();
    await captura.pedir();
    captura.comecar();
    expect(captura.nivelAtual()).toBe(0);

    vi.advanceTimersByTime(100);
    expect(captura.nivelAtual()).toBeGreaterThan(0);

    captura.soltar();
    expect(captura.nivelAtual()).toBe(0);
  });

  it('parar solta o microfone junto — sempre', async () => {
    vi.useFakeTimers();
    const trilha = trilhaFalsa();
    montarNavegador(async () => streamFalso([trilha]));

    const captura = criarCapturaWeb();
    await captura.pedir();
    captura.comecar();
    await captura.parar();

    expect(trilha.stop).toHaveBeenCalled();
    expect(captura.estaVivo()).toBe(false);
    expect(captura.estaGravando()).toBe(false);
  });

  it('soltar no meio da gravação para o gravador antes de matar a trilha', async () => {
    // É o caminho da aba escondida: ninguém pediu o áudio, mas nada pode ficar
    // vivo.
    vi.useFakeTimers();
    const trilha = trilhaFalsa();
    montarNavegador(async () => streamFalso([trilha]));

    const captura = criarCapturaWeb();
    await captura.pedir();
    captura.comecar();
    captura.soltar();

    expect(GravadorFalso.ultimo?.state).toBe('inactive');
    expect(trilha.stop).toHaveBeenCalled();
    expect(captura.estaVivo()).toBe(false);
  });

  it('parar sem estar gravando avisa, e ainda assim solta', async () => {
    const trilha = trilhaFalsa();
    montarNavegador(async () => streamFalso([trilha]));

    const captura = criarCapturaWeb();
    await captura.pedir();
    const resultado = await captura.parar();

    expect(resultado).toEqual({ motivo: 'naoEstavaGravando' });
    expect(trilha.stop).toHaveBeenCalled();
  });

  it('gravador que quebra ao parar não deixa nada vivo', async () => {
    vi.useFakeTimers();
    const trilha = trilhaFalsa();
    montarNavegador(async () => streamFalso([trilha]));

    const captura = criarCapturaWeb();
    await captura.pedir();
    captura.comecar();
    GravadorFalso.ultimo!.quebrarAoParar = true;

    const resultado = await captura.parar();

    expect(resultado).toMatchObject({ motivo: 'quebrou' });
    expect(trilha.stop).toHaveBeenCalled();
    expect(captura.estaVivo()).toBe(false);
  });
});
