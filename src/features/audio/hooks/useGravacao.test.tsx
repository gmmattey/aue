// @vitest-environment jsdom
import { act, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createElement, useEffect } from 'react';

import { useGravacao } from './useGravacao';
import type { Gravacao } from './tiposDaGravacao';

/**
 * A TRAVA DO MICROFONE.
 *
 * `useGravacao` existe por causa de UM invariante: todo caminho de saída solta
 * o `MediaStream`. Até aqui ele era garantido por leitura — e vazamento de
 * microfone é exatamente o defeito que NÃO quebra teste e NÃO aparece na tela.
 * O sintoma é a luz do microfone continuar acesa depois que a pessoa saiu, e
 * ninguém atribui isso a software.
 *
 * Este arquivo troca a convenção por regressão travada: seis caminhos, seis
 * asserções de que `track.stop()` foi chamado.
 *
 * `// @vitest-environment jsdom` por ARQUIVO, e não no `vitest.config.ts`: é o
 * que aquele arquivo manda fazer, e trocar o padrão global faria todo teste de
 * lógica pura pagar o custo de montar um DOM.
 */

/** Track falso que registra se foi parado. É o que todas as asserções olham. */
function criarTrack() {
  return { stop: vi.fn(), kind: 'audio' } as unknown as MediaStreamTrack;
}

function criarStream(track: MediaStreamTrack) {
  return { getTracks: () => [track] } as unknown as MediaStream;
}

/**
 * `MediaRecorder` falso, com o mínimo que o hook usa.
 *
 * `stop()` dispara `onstop` de forma SÍNCRONA, o que o navegador faz de forma
 * assíncrona. É simplificação deliberada: o que este arquivo verifica é QUEM
 * solta o stream, não a ordem de eventos do MediaRecorder.
 */
class GravadorFalso {
  static ultimo: GravadorFalso | null = null;
  static lancarNoStart = false;

  state: 'inactive' | 'recording' = 'inactive';
  ondataavailable: ((e: { data: Blob }) => void) | null = null;
  onstop: (() => void) | null = null;

  // Campo à parte, e não `constructor(public stream)`: o projeto roda com
  // `erasableSyntaxOnly`, que proíbe propriedade de parâmetro.
  readonly stream: MediaStream;

  constructor(stream: MediaStream) {
    this.stream = stream;
    GravadorFalso.ultimo = this;
  }

  start() {
    if (GravadorFalso.lancarNoStart) throw new Error('formato recusado pelo navegador');
    this.state = 'recording';
  }

  stop() {
    this.state = 'inactive';
    this.ondataavailable?.({ data: new Blob(['x']) });
    this.onstop?.();
  }
}

/** Expõe o retorno do hook para o teste dirigir. */
function Sonda({ aoMontar }: { aoMontar: (g: Gravacao) => void }) {
  const gravacao = useGravacao({ aoTerminar: () => {} });
  useEffect(() => {
    aoMontar(gravacao);
  });
  return null;
}

let track: MediaStreamTrack;

function montar() {
  let atual: Gravacao | null = null;
  const utils = render(createElement(Sonda, { aoMontar: (g) => (atual = g) }));
  return { ...utils, get gravacao() { return atual as unknown as Gravacao; } };
}

beforeEach(() => {
  track = criarTrack();
  GravadorFalso.ultimo = null;
  GravadorFalso.lancarNoStart = false;
  vi.stubGlobal('MediaRecorder', GravadorFalso);
  Object.defineProperty(navigator, 'mediaDevices', {
    configurable: true,
    value: { getUserMedia: vi.fn().mockResolvedValue(criarStream(track)) },
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('useGravacao — todo caminho de saída solta o microfone', () => {
  it('1. desmontar durante a gravação', async () => {
    const tela = montar();
    await act(async () => { await tela.gravacao.iniciar(); });
    expect(track.stop).not.toHaveBeenCalled(); // gravando: o stream tem dono

    tela.unmount();
    expect(track.stop).toHaveBeenCalled();
  });

  it('2. parar manualmente', async () => {
    const tela = montar();
    await act(async () => { await tela.gravacao.iniciar(); });
    act(() => { tela.gravacao.parar(); });

    expect(track.stop).toHaveBeenCalled();
  });

  it('3. o cronômetro zerar', async () => {
    vi.useFakeTimers();
    try {
      const tela = montar();
      await act(async () => { await tela.gravacao.iniciar(); });
      // SEGUNDOS_DE_GRAVACAO = 10, e o intervalo bate de segundo em segundo.
      await act(async () => { vi.advanceTimersByTime(11_000); });

      expect(track.stop).toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });

  it('4. permissão negada — nenhum stream fica aberto', async () => {
    (navigator.mediaDevices.getUserMedia as ReturnType<typeof vi.fn>).mockRejectedValue(
      new DOMException('negado', 'NotAllowedError'),
    );
    const tela = montar();
    await act(async () => { await tela.gravacao.iniciar(); });

    // Nem chegou a existir stream: o que se prova é que o gate é ESTADO e não
    // exceção, e que nada ficou pendurado.
    expect(tela.gravacao.permissaoNegada).toBe(true);
    expect(GravadorFalso.ultimo).toBeNull();
    expect(track.stop).not.toHaveBeenCalled();
  });

  it('5. descartar', async () => {
    const tela = montar();
    await act(async () => { await tela.gravacao.iniciar(); });
    act(() => { tela.gravacao.descartar(); });

    expect(track.stop).toHaveBeenCalled();
    expect(tela.gravacao.blobRef.current).toBeNull();
  });

  it('6. o gravador falhar ao subir — o caminho que era MUDO na main', async () => {
    // `new MediaRecorder()`/`start()` não tinham try/catch: o navegador recusava
    // o formato, o stream ficava aberto e a tela não dizia nada.
    GravadorFalso.lancarNoStart = true;
    const tela = montar();
    await act(async () => { await tela.gravacao.iniciar(); });

    expect(track.stop).toHaveBeenCalled();
    expect(tela.gravacao.erro).toBeTruthy();
    expect(tela.gravacao.gravando).toBe(false);
  });
});
