// @vitest-environment jsdom
/**
 * A TELA VIVA — e as horas em que ela precisa ficar quieta.
 *
 * O §6 do contrato pede "sequência atualizar" no meio da batalha remota, e a
 * tela carregava a batalha uma vez só: a rodada do amigo só aparecia
 * recarregando a página. Este arquivo trava as quatro decisões do laço que
 * corrigiu isso, e três delas são sobre NÃO pedir:
 *
 *   1. pede de novo a cada 8 segundos;
 *   2. aba oculta não pede nada — telefone no bolso;
 *   3. sessão vencida não pede nada, e a tela sabe que venceu;
 *   4. resposta igual não troca o estado, senão o feed inteiro re-renderiza a
 *      cada 8 segundos por cima de um áudio tocando.
 *
 * Nenhuma dessas quebra a tela quando regride. Elas aparecem como bateria
 * acabando e áudio cortando, que ninguém atribui a software.
 */
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { Batalha } from '../../db/supabase';
import { INTERVALO_DE_ATUALIZACAO_MS, mesmaBatalha, useBatalhaAoVivo } from './useBatalhaAoVivo';

const obterBatalha = vi.hoisted(() => vi.fn());

vi.mock('../../db/supabase', async () => {
  const real = await vi.importActual<typeof import('../../db/supabase')>('../../db/supabase');
  return { ...real, obterBatalha };
});

function rodada(id: string, position: number): Batalha['rodadas'][number] {
  return {
    rodada_id: id,
    position,
    round_number: 1,
    participant_id: null,
    result_id: `r-${id}`,
    score: 90,
    classification: 'Trovão Humano',
    origin_type: 'Cerveja',
    origin_subtype: null,
    is_artificial: false,
    is_hidden: false,
    audio_path: `caminho/${id}.webm`,
    apelido: 'Luiz',
    user_id: null,
    created_at: '2026-08-08T12:00:00.000Z',
  };
}

/**
 * Prazo FIXO, e não `Date.now() + 7 dias`.
 *
 * Com o relógio falso andando entre uma volta e outra, um prazo derivado do
 * "agora" mudaria a cada leitura — e `mesmaBatalha` acusaria diferença onde não
 * há nenhuma, escondendo justamente o que o teste de identidade verifica.
 */
const DAQUI_A_SETE_DIAS = '2026-08-15T12:00:00.000Z';

function batalha(extras: Partial<Batalha> = {}): Batalha {
  return {
    access_code: 'K7M3PQ9XTR',
    battle_type: 'remota',
    venue_type: null,
    rounds_total: null,
    created_at: '2026-08-08T12:00:00.000Z',
    expires_at: DAQUI_A_SETE_DIAS,
    finished_at: null,
    rodadas: [rodada('a', 1)],
    participantes: [],
    lider: { apelido: 'Luiz', score: 90, result_id: 'r-a' },
    ...extras,
  };
}

/**
 * Deixa as promessas já disparadas se resolverem, sem avançar o relógio.
 *
 * Substitui o `waitFor` da testing-library DE PROPÓSITO: aquele espera em
 * tempo real e, com o relógio congelado por `vi.useFakeTimers`, ele nunca
 * chega ao fim — o teste inteiro estoura em cinco segundos sem uma única
 * asserção falsa.
 */
async function assentar() {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(0);
  });
}

/** Uma volta do relógio, com as promessas do fetch resolvidas. */
async function passarUmIntervalo() {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(INTERVALO_DE_ATUALIZACAO_MS);
  });
}

function esconderAba(oculta: boolean) {
  Object.defineProperty(document, 'hidden', { configurable: true, value: oculta });
  document.dispatchEvent(new Event('visibilitychange'));
}

beforeEach(() => {
  vi.useFakeTimers();
  // Relógio preso: o prazo da batalha é comparado com `Date.now()`, e um teste
  // de prazo que depende do dia em que roda falha sozinho na semana seguinte.
  vi.setSystemTime(new Date('2026-08-08T12:00:00.000Z'));
  obterBatalha.mockReset();
  Object.defineProperty(document, 'hidden', { configurable: true, value: false });
});

afterEach(() => {
  /*
    Desmontar À MÃO é obrigatório aqui. A limpeza automática da
    testing-library só se registra quando o Vitest roda com `globals: true`, e
    este projeto não roda — sem isto, o hook do teste anterior continua
    montado, com o laço dele batendo no mesmo mock e somando chamadas ao teste
    seguinte.
  */
  cleanup();
  vi.useRealTimers();
});

describe('useBatalhaAoVivo', () => {
  it('busca ao abrir e continua buscando sozinho', async () => {
    obterBatalha.mockResolvedValue(batalha());

    const { result } = renderHook(() => useBatalhaAoVivo('K7M3PQ9XTR'));

    await assentar();
    expect(result.current.carregando).toBe(false);
    expect(obterBatalha).toHaveBeenCalledTimes(1);

    await passarUmIntervalo();
    expect(obterBatalha).toHaveBeenCalledTimes(2);

    await passarUmIntervalo();
    expect(obterBatalha).toHaveBeenCalledTimes(3);
  });

  it('a rodada que chegou do outro aparelho entra na tela', async () => {
    obterBatalha.mockResolvedValueOnce(batalha());
    obterBatalha.mockResolvedValue(batalha({ rodadas: [rodada('a', 1), rodada('b', 2)] }));

    const { result } = renderHook(() => useBatalhaAoVivo('K7M3PQ9XTR'));
    await assentar();
    expect(result.current.batalha?.rodadas).toHaveLength(1);

    await passarUmIntervalo();
    expect(result.current.batalha?.rodadas).toHaveLength(2);
  });

  it('resposta igual não troca o estado — o feed não re-renderiza à toa', async () => {
    // Objetos NOVOS a cada chamada, como a RPC devolve de verdade: ela monta o
    // JSON do zero. É por isso que a comparação existe.
    obterBatalha.mockImplementation(async () => batalha());

    const { result } = renderHook(() => useBatalhaAoVivo('K7M3PQ9XTR'));
    await assentar();
    expect(result.current.batalha).not.toBeNull();

    const primeira = result.current.batalha;
    await passarUmIntervalo();
    await passarUmIntervalo();

    expect(result.current.batalha).toBe(primeira);
  });

  it('aba oculta não gasta requisição, e voltar para ela busca na hora', async () => {
    obterBatalha.mockResolvedValue(batalha());

    const { result } = renderHook(() => useBatalhaAoVivo('K7M3PQ9XTR'));
    await assentar();
    expect(result.current.carregando).toBe(false);
    expect(obterBatalha).toHaveBeenCalledTimes(1);

    act(() => esconderAba(true));

    await passarUmIntervalo();
    await passarUmIntervalo();
    expect(obterBatalha).toHaveBeenCalledTimes(1);

    // Voltar é o momento em que a pessoa MAIS quer ver o que chegou: buscar já,
    // sem esperar a próxima volta do relógio.
    await act(async () => {
      esconderAba(false);
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(obterBatalha).toHaveBeenCalledTimes(2);
  });

  it('sessão vencida para o laço e a tela fica sabendo', async () => {
    obterBatalha.mockResolvedValue(
      batalha({ expires_at: new Date(Date.now() + INTERVALO_DE_ATUALIZACAO_MS / 2).toISOString() }),
    );

    const { result } = renderHook(() => useBatalhaAoVivo('K7M3PQ9XTR'));
    await assentar();
    expect(result.current.carregando).toBe(false);
    expect(result.current.expirou).toBe(false);

    await passarUmIntervalo();
    expect(result.current.expirou).toBe(true);

    const chamadas = obterBatalha.mock.calls.length;
    await passarUmIntervalo();
    await passarUmIntervalo();
    expect(obterBatalha).toHaveBeenCalledTimes(chamadas);
  });

  it('a batalha que some com a pessoa dentro é a expiração, e é dita como tal', async () => {
    // A RPC filtra por `expires_at > now()`: o código na URL não mudou, então
    // NULL depois de ter vindo batalha só pode ser o prazo. Diferente do
    // primeiro carregamento, aqui não há o que confirmar a um curioso — a
    // pessoa já estava dentro.
    obterBatalha.mockResolvedValueOnce(batalha());
    obterBatalha.mockResolvedValue(null);

    const { result } = renderHook(() => useBatalhaAoVivo('K7M3PQ9XTR'));
    await assentar();
    expect(result.current.batalha).not.toBeNull();

    await passarUmIntervalo();
    expect(result.current.expirou).toBe(true);
  });

  it('atualização que falha não apaga a batalha nem grita na tela', async () => {
    obterBatalha.mockResolvedValueOnce(batalha());
    obterBatalha.mockRejectedValue(new Error('rede caiu no elevador'));
    vi.spyOn(console, 'error').mockImplementation(() => {});

    const { result } = renderHook(() => useBatalhaAoVivo('K7M3PQ9XTR'));
    await assentar();
    expect(result.current.batalha).not.toBeNull();

    await passarUmIntervalo();

    expect(result.current.batalha).not.toBeNull();
    expect(result.current.erro).toBeNull();
  });

  it('falha no PRIMEIRO carregamento vira mensagem — aí a pessoa está sem nada', async () => {
    obterBatalha.mockRejectedValue(new Error('rede caiu no elevador'));
    vi.spyOn(console, 'error').mockImplementation(() => {});

    const { result } = renderHook(() => useBatalhaAoVivo('K7M3PQ9XTR'));

    await assentar();
    expect(result.current.carregando).toBe(false);
    expect(result.current.erro).toBe('Não foi possível carregar a batalha.');
  });
});

describe('mesmaBatalha', () => {
  it('reconhece a mesma leitura em objetos diferentes', () => {
    expect(mesmaBatalha(batalha(), batalha())).toBe(true);
  });

  it('rodada nova é diferença', () => {
    expect(mesmaBatalha(batalha(), batalha({ rodadas: [rodada('a', 1), rodada('b', 2)] }))).toBe(
      false,
    );
  });

  it('arroto escondido pela moderação é diferença, mesmo sem mudar a contagem', () => {
    // `obter_batalha` devolve `audio_path` NULL quando `is_hidden`. Se isto
    // passasse por "igual", o player continuaria na tela apontando para um
    // áudio que o Storage já não assina.
    const escondida = batalha();
    escondida.rodadas = [{ ...rodada('a', 1), is_hidden: true, audio_path: null }];
    expect(mesmaBatalha(batalha(), escondida)).toBe(false);
  });

  it('troca de líder é diferença', () => {
    expect(
      mesmaBatalha(batalha(), batalha({ lider: { apelido: 'Carol', score: 98, result_id: 'r-z' } })),
    ).toBe(false);
  });
});
