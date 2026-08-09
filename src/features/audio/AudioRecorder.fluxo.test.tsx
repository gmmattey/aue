// @vitest-environment jsdom
import { act, cleanup, render, screen } from '@testing-library/react';
import { createElement } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AudioMudoError, type AudioMetrics } from './engine';

/**
 * A JORNADA DO FLUXO INDIVIDUAL, de ponta a ponta, sem microfone de verdade.
 *
 * O recorte MVP1 do protótipo (`index-mvp1.html`) descreve uma sequência de
 * TELAS — home → permissão → gravação → julgando(+origem) → resultado. O app
 * tinha uma tela só, com o julgamento reduzido ao rótulo de um botão. Este
 * arquivo trava a sequência que passou a existir.
 *
 * A ASSERÇÃO QUE MAIS IMPORTA está em "o veredito NUNCA fecha sozinho": o
 * protótipo abre o resultado depois de 5 a 10 segundos se ninguém escolher a
 * origem, e o §3.4 do CONTRATO_MVP1 proíbe exatamente isso. É uma linha de
 * código de distância voltar a existir, e ela não quebraria mais nada.
 *
 * `analyzeAudio` é dublada porque `OfflineAudioContext` não existe no jsdom —
 * e porque o que se testa aqui é o ROTEAMENTO das telas, não a acústica (que
 * tem `silencio.test.ts` e `rules.formula.test.ts`).
 */

const METRICAS: AudioMetrics = { duration: 4, rms: 0.2, bassEnergy: 0.1, texture: 0.03 };

const analisar = vi.fn<(blob: Blob) => Promise<AudioMetrics>>();

vi.mock('./engine', async (importarOriginal) => {
  const original = await importarOriginal<typeof import('./engine')>();
  return { ...original, analyzeAudio: (blob: Blob) => analisar(blob) };
});

/** Track falso: o mesmo de `hooks/useGravacao.test.tsx`. */
function criarTrack() {
  return { stop: vi.fn(), kind: 'audio' } as unknown as MediaStreamTrack;
}

class GravadorFalso {
  static ultimo: GravadorFalso | null = null;
  /**
   * Quando ligado, `stop()` NÃO dispara `onstop`.
   *
   * Serve para congelar a janela entre "a pessoa tocou em Finalizar" e "o
   * evento chegou" — que no navegador é assíncrona e no dublê é instantânea.
   */
  static engolirOStop = false;

  state: 'inactive' | 'recording' = 'inactive';
  ondataavailable: ((e: { data: Blob }) => void) | null = null;
  onstop: (() => void) | null = null;
  readonly mimeType = 'audio/webm';

  constructor() {
    GravadorFalso.ultimo = this;
  }

  start() {
    this.state = 'recording';
  }

  /** Dispara `onstop` de forma síncrona — simplificação deliberada. */
  stop() {
    this.state = 'inactive';
    if (GravadorFalso.engolirOStop) return;
    this.ondataavailable?.({ data: new Blob(['arroto'], { type: 'audio/webm' }) });
    this.onstop?.();
  }
}

let track: MediaStreamTrack;
let getUserMedia: ReturnType<typeof vi.fn>;

beforeEach(() => {
  track = criarTrack();
  getUserMedia = vi.fn().mockResolvedValue({ getTracks: () => [track] } as unknown as MediaStream);
  GravadorFalso.ultimo = null;
  GravadorFalso.engolirOStop = false;
  analisar.mockReset();
  analisar.mockResolvedValue(METRICAS);

  vi.stubGlobal('MediaRecorder', GravadorFalso);
  vi.stubGlobal('navigator', { mediaDevices: { getUserMedia } });
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

/** Monta o gravador e deixa os efeitos de sessão assentarem. */
async function montar() {
  const { AudioRecorder } = await import('./AudioRecorder');
  const arvore = render(createElement(AudioRecorder, {}));
  await act(async () => {});
  return arvore;
}

async function tocar(nome: RegExp) {
  const botao = screen.getByRole('button', { name: nome });
  await act(async () => {
    botao.click();
  });
}

describe('AudioRecorder — a jornada do MVP1', () => {
  it('começa no convite, com o aviso de privacidade visível', async () => {
    await montar();

    expect(screen.getByRole('button', { name: /gravar meu auê/i })).toBeTruthy();
    expect(screen.getByText(/qualquer pessoa consegue ouvir/i)).toBeTruthy();
  });

  it('gravando, mostra a tela de gravação — e só ela', async () => {
    await montar();
    await tocar(/gravar meu auê/i);

    expect(screen.getByText('Gravando')).toBeTruthy();
    expect(screen.getByRole('button', { name: /parar/i })).toBeTruthy();
    expect(screen.getByText('Manda.')).toBeTruthy();
    // O botão de gravar não pode conviver com a gravação em curso.
    expect(screen.queryByRole('button', { name: /gravar meu auê/i })).toBeNull();
    // E o rodapé de privacidade sai de cena: a decisão dele já foi tomada.
    expect(screen.queryByText(/qualquer pessoa consegue ouvir/i)).toBeNull();
  });

  it('ao finalizar, vai para o julgamento com a origem na própria tela', async () => {
    await montar();
    await tocar(/gravar meu auê/i);
    await tocar(/parar/i);

    expect(screen.getByText('Veio de onde essa porra?')).toBeTruthy();
    // As cinco do §3.4 estão aqui, em um toque.
    for (const rotulo of [/cerveja/i, /refri/i, /comida/i, /puxando ar/i, /outro/i]) {
      expect(screen.getByRole('button', { name: rotulo })).toBeTruthy();
    }
  });

  it('o veredito NUNCA fecha sozinho — §3.4', async () => {
    /*
      `julgando.html:105-120` sorteia de 5 a 10 segundos e abre o resultado sem
      ninguém escolher, dizendo "deixe o Auê decidir". A origem pesa 10% da nota
      e define `is_artificial`: um padrão silencioso é o app declarando por você
      uma coisa que só você sabe.

      Trinta segundos de relógio falso, e a tela tem que continuar exatamente
      onde estava.
    */
    vi.useFakeTimers();
    try {
      await montar();
      await tocar(/gravar meu auê/i);
      await tocar(/parar/i);

      await act(async () => {
        vi.advanceTimersByTime(30_000);
      });

      expect(screen.getByText('Veio de onde essa porra?')).toBeTruthy();
      expect(screen.getByText(/escolha a origem/i)).toBeTruthy();
    } finally {
      vi.useRealTimers();
    }
  });

  it('entre "PARAR" e o onstop, a tela NÃO volta a piscar o convite', async () => {
    /*
      No navegador o evento `stop` é assíncrono. `parar()` marca `gravando` como
      falso na hora — e, sem o estado `finalizando`, naquele intervalo não havia
      gravação, nem métricas, nem análise: a etapa caía em 'inicio' e o botão
      "Gravar meu Auê" reaparecia por um instante, tocável, logo depois de a
      pessoa ter tocado em Finalizar.

      O dublê dispara `onstop` sincronamente e nunca reproduziria isso, então
      aqui ele é instruído a ENGOLIR o evento: a janela fica aberta e a tela
      pode ser inspecionada dentro dela.
    */
    GravadorFalso.engolirOStop = true;
    await montar();
    await tocar(/gravar meu auê/i);
    await tocar(/parar/i);

    expect(screen.queryByRole('button', { name: /gravar meu auê/i })).toBeNull();
    expect(screen.getByText('Veio de onde essa porra?')).toBeTruthy();
    // E sem métricas as opções ficam travadas: um toque aqui cairia no
    // `if (!metricas) return` do envio e sumiria sem dizer nada.
    expect((screen.getByRole('button', { name: /cerveja/i }) as HTMLButtonElement).disabled).toBe(
      true,
    );
  });

  it('gravação sem som vira tela própria, não uma linha de erro', async () => {
    analisar.mockRejectedValue(new AudioMudoError(0.0004));
    await montar();
    await tocar(/gravar meu auê/i);
    await tocar(/parar/i);

    expect(screen.getByText('Coé, não peguei nada aí.')).toBeTruthy();
    expect(screen.getByRole('button', { name: /tentar de novo/i })).toBeTruthy();
    // A mensagem da análise aparece UMA vez — não duplicada num alerta à parte.
    expect(screen.getAllByText(/não saiu som nenhum/i)).toHaveLength(1);
  });

  it('microfone negado vira os três passos, não uma linha em cinza', async () => {
    getUserMedia.mockRejectedValue(new DOMException('negado', 'NotAllowedError'));
    await montar();
    await tocar(/gravar meu auê/i);

    expect(screen.getByText('Preciso ouvir essa porra.')).toBeTruthy();
    expect(screen.getByRole('button', { name: /tentar de novo/i })).toBeTruthy();
    // Quem nega a permissão não é perguntado de novo pelo navegador: sem o
    // roteiro de como liberar, o produto acabava naquela linha.
    expect(screen.getByText(/permissões/i)).toBeTruthy();
  });

  it('descartar no julgamento devolve o convite e solta o microfone', async () => {
    await montar();
    await tocar(/gravar meu auê/i);
    await tocar(/parar/i);
    await tocar(/descartar essa/i);

    expect(screen.getByRole('button', { name: /gravar meu auê/i })).toBeTruthy();
    expect(screen.queryByText('Veio de onde essa porra?')).toBeNull();
    expect(track.stop).toHaveBeenCalled();
  });
});
