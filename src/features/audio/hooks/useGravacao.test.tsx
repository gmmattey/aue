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

  it('4b. microfone indisponível NÃO vira permissão negada', async () => {
    /*
      `NotReadableError` é o microfone tomado por outro app. A causa não é
      permissão, e mandar essa pessoa para o roteiro de "libere nas
      configurações" (a `TelaDeMicrofoneBloqueado`) é instrução errada para o
      problema errado.

      A #57 dá a frase; este teste garante que ela vem acompanhada do
      ROTEAMENTO certo — `permissaoNegada` falso mantém a mensagem na tela
      inicial, onde ela é lida, em vez de escondê-la atrás da tela de permissão.
    */
    (navigator.mediaDevices.getUserMedia as ReturnType<typeof vi.fn>).mockRejectedValue(
      new DOMException('ocupado', 'NotReadableError'),
    );
    const tela = montar();
    await act(async () => { await tela.gravacao.iniciar(); });

    expect(tela.gravacao.permissaoNegada).toBe(false);
    expect(tela.gravacao.erro).toBe('Fiquei sem o microfone.');
    expect(GravadorFalso.ultimo).toBeNull();
  });

  it('4c. uma negativa anterior não contamina a falha seguinte', async () => {
    /*
      `permissaoNegada` só era zerado DEPOIS de um `getUserMedia` bem-sucedido.
      Sem o `setPermissaoNegada(false)` explícito no ramo do microfone
      indisponível, a segunda tentativa aqui cairia na tela de permissão
      carregando o estado da primeira — e a mensagem "Fiquei sem o microfone."
      nunca apareceria.
    */
    const pedir = navigator.mediaDevices.getUserMedia as ReturnType<typeof vi.fn>;
    const tela = montar();

    pedir.mockRejectedValue(new DOMException('negado', 'NotAllowedError'));
    await act(async () => { await tela.gravacao.iniciar(); });
    expect(tela.gravacao.permissaoNegada).toBe(true);

    pedir.mockRejectedValue(new DOMException('sumiu', 'NotFoundError'));
    await act(async () => { await tela.gravacao.iniciar(); });

    expect(tela.gravacao.permissaoNegada).toBe(false);
    expect(tela.gravacao.erro).toBe('Fiquei sem o microfone.');
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

/**
 * A ONDA QUE MEDE DE VERDADE.
 *
 * A primeira versão do visualizador chamava o laço ANTES de `new MediaRecorder`.
 * Como a primeira linha do laço é o gate `state !== 'recording'`, ele saía na
 * primeira passada, o `requestAnimationFrame` nunca era agendado e as dez barras
 * ficavam paradas na altura de repouso a gravação inteira.
 *
 * Nada quebrava: sem tipo errado, sem teste vermelho, sem erro no console. Só
 * uma onda parada que PARECE medida — que é a mentira de interface que o
 * AGENTS.md proíbe e a #56 chama pelo nome.
 *
 * Por isso as asserções aqui são sobre o LAÇO ter engatado, e não só sobre o
 * componente renderizar: era exatamente o engate que faltava.
 */
describe('useGravacao — a onda reage ao microfone real', () => {
  let quadros: FrameRequestCallback[];
  let cancelados: number[];

  /** Roda os quadros agendados, como o navegador faria no próximo repaint. */
  function baterUmQuadro() {
    const pendentes = quadros;
    quadros = [];
    pendentes.forEach((cb) => cb(0));
  }

  /**
   * `AudioContext` falso com o mínimo que o hook toca.
   *
   * `getByteFrequencyData` devolve tudo no talo (255) porque o que se verifica é
   * o CAMINHO — o dado do analisador chegando às barras —, não a acústica.
   */
  class ContextoFalso {
    static ultimo: ContextoFalso | null = null;
    static lancarNoConstrutor = false;

    state: 'suspended' | 'running' | 'closed' = 'suspended';
    close = vi.fn(async () => { this.state = 'closed'; });
    resume = vi.fn(async () => { this.state = 'running'; });

    constructor() {
      if (ContextoFalso.lancarNoConstrutor) throw new Error('sem AudioContext aqui');
      ContextoFalso.ultimo = this;
    }

    createAnalyser() {
      return {
        fftSize: 0,
        frequencyBinCount: 32,
        connect: () => {},
        getByteFrequencyData: (destino: Uint8Array) => destino.fill(255),
      };
    }

    createMediaStreamSource() {
      return { connect: () => {} };
    }
  }

  beforeEach(() => {
    quadros = [];
    cancelados = [];
    ContextoFalso.ultimo = null;
    ContextoFalso.lancarNoConstrutor = false;
    vi.stubGlobal('AudioContext', ContextoFalso);
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => quadros.push(cb));
    vi.stubGlobal('cancelAnimationFrame', (id: number) => cancelados.push(id));
  });

  it('o laço engata — um quadro fica agendado depois do start()', async () => {
    const tela = montar();
    await act(async () => { await tela.gravacao.iniciar(); });

    /*
      ESTA É A ASSERÇÃO DO BUG. Com a chamada antes do `new MediaRecorder`,
      `quadros` fica vazio: o gate fecha, nada é agendado e a onda morre aqui.
    */
    expect(quadros).toHaveLength(1);
  });

  it('o dado do analisador vira altura de barra', async () => {
    const tela = montar();
    await act(async () => { await tela.gravacao.iniciar(); });

    // Antes do primeiro quadro, repouso: dez barras no piso.
    expect(tela.gravacao.frequencias).toEqual(Array(10).fill(5));

    await act(async () => { baterUmQuadro(); });

    // 255/255 -> 100%. E o laço se reagenda sozinho.
    expect(tela.gravacao.frequencias).toEqual(Array(10).fill(100));
    expect(quadros).toHaveLength(1);
  });

  it('parar devolve a onda ao repouso e fecha o AudioContext', async () => {
    const tela = montar();
    await act(async () => { await tela.gravacao.iniciar(); });
    await act(async () => { baterUmQuadro(); });
    expect(tela.gravacao.frequencias).toEqual(Array(10).fill(100));

    act(() => { tela.gravacao.parar(); });

    /*
      O `AudioContext` segura hardware de áudio: é o mesmo tipo de recurso que a
      luz do microfone acesa, e sai pelo mesmo cano (`encerrarStream`).
    */
    expect(tela.gravacao.frequencias).toEqual(Array(10).fill(5));
    expect(ContextoFalso.ultimo?.close).toHaveBeenCalled();
    expect(cancelados).toHaveLength(1);
  });

  it('o quadro em voo não repinta depois que a gravação acaba', async () => {
    const tela = montar();
    await act(async () => { await tela.gravacao.iniciar(); });

    /*
      `cancelAnimationFrame` mata o quadro AGENDADO; este teste cobre o outro:
      o quadro que o navegador já estava executando quando a gravação terminou.
      Sem o gate, ele repintaria a onda por cima do repouso.
    */
    act(() => { tela.gravacao.parar(); });
    await act(async () => { baterUmQuadro(); });

    expect(tela.gravacao.frequencias).toEqual(Array(10).fill(5));
  });

  it('visualizador quebrado NÃO derruba a gravação', async () => {
    /*
      A onda é decoração; o áudio que vira nota vem do `MediaRecorder`. Navegador
      sem `AudioContext` utilizável não pode custar o arroto da pessoa.
    */
    ContextoFalso.lancarNoConstrutor = true;
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const tela = montar();
    await act(async () => { await tela.gravacao.iniciar(); });

    expect(tela.gravacao.gravando).toBe(true);
    expect(tela.gravacao.erro).toBeNull();
    expect(GravadorFalso.ultimo?.state).toBe('recording');
    expect(tela.gravacao.frequencias).toEqual(Array(10).fill(5));
  });
});
