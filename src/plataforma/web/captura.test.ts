/**
 * O microfone, e a única coisa que não pode falhar: **soltar**.
 *
 * Vazamento de microfone é defeito de privacidade. O teste prova que a trilha
 * é PARADA, e não só desreferenciada — coletor de lixo não apaga a luzinha do
 * sistema, `track.stop()` apaga.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';

import { criarCapturaWeb } from './captura';

function trilhaFalsa() {
  return { stop: vi.fn(), kind: 'audio' };
}

function streamFalso(trilhas = [trilhaFalsa()]) {
  return { getTracks: () => trilhas } as unknown as MediaStream;
}

function comMediaDevices(getUserMedia: () => Promise<MediaStream>) {
  vi.stubGlobal('navigator', { mediaDevices: { getUserMedia } });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('a captura web', () => {
  it('liberou: o stream fica vivo até alguém soltar', async () => {
    comMediaDevices(async () => streamFalso());
    const captura = criarCapturaWeb();

    expect(await captura.pedir()).toEqual({ ok: true });
    expect(captura.estaVivo()).toBe(true);
  });

  it('soltar para as trilhas de verdade', async () => {
    const trilha = trilhaFalsa();
    comMediaDevices(async () => streamFalso([trilha]));

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
    comMediaDevices(getUserMedia);

    const captura = criarCapturaWeb();
    await captura.pedir();
    await captura.pedir();

    // Dois streams vivos significam dois indicadores de microfone no sistema, e
    // um deles sem dono para soltar.
    expect(getUserMedia).toHaveBeenCalledTimes(1);
  });

  it('a pessoa negou vira motivo "negado"', async () => {
    comMediaDevices(async () => {
      throw Object.assign(new Error('Permission denied'), { name: 'NotAllowedError' });
    });

    expect(await criarCapturaWeb().pedir()).toEqual({ ok: false, motivo: 'negado' });
  });

  it('aparelho sem microfone vira motivo "semAparelho"', async () => {
    comMediaDevices(async () => {
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
