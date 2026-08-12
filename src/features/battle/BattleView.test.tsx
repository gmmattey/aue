// @vitest-environment jsdom
/**
 * `/b/CODIGO` SERVE DUAS BATALHAS DIFERENTES, e por um tempo serviu só uma.
 *
 * O defeito que este arquivo tranca: a disputa presencial compartilha o pódio
 * por este mesmo endereço (`DisputaLocalScreen` monta `/b/${codigo_de_acesso}`), e a
 * tela não olhava `tipo_de_batalha`. Quem abria o link do churrasco caía numa tela
 * de batalha REMOTA — com gravador convidando um estranho a "responder" uma
 * disputa que já tinha acabado.
 *
 * E não era só constrangimento: sem `participante_id`, a rodada do estranho fica
 * FORA do pódio (`turnos.ts` ignora rodada sem participante) e DENTRO da
 * consulta do líder (`obter_batalha`, 20260807000033). O app passaria a mostrar
 * um "liderando agora" com o nome de alguém que nunca esteve na mesa.
 *
 * O outro grupo de asserções é sobre a atualização automática não arrancar a
 * tela de quem está lendo — comportamento que só existe porque a tela agora se
 * atualiza sozinha, e que ninguém percebe quebrado até estar ouvindo a rodada 2
 * e ser jogado para o fim do feed.
 */
import { cleanup, render, act } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createElement } from 'react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

import type { Batalha } from '../../db/supabase';
import { BattleView } from './BattleView';
import type { BatalhaAoVivo } from './useBatalhaAoVivo';

const estado = vi.hoisted(() => ({ atual: null as unknown as BatalhaAoVivo }));

vi.mock('./useBatalhaAoVivo', () => ({
  useBatalhaAoVivo: () => estado.atual,
}));

/*
  O gravador vira um marcador. Ele arrasta o motor de julgamento, o
  `MediaRecorder` e o upload para dentro do teste, e o que está sendo verificado
  aqui é UMA coisa: se ele aparece ou não.
*/
vi.mock('../audio/AudioRecorder', () => ({
  AudioRecorder: () => createElement('div', { 'data-teste': 'gravador' }),
}));

vi.mock('../../db/supabase', async () => {
  const real = await vi.importActual<typeof import('../../db/supabase')>('../../db/supabase');
  return {
    ...real,
    supabase: { auth: { getSession: async () => ({ data: { session: null } }) } },
    // O player pediria URL assinada ao Storage no primeiro render.
    assinarUrlDoAudio: async () => null,
  };
});

type RodadaNoFeed = Batalha['rodadas'][number];

function rodada(id: string, posicao: number, extras: Partial<RodadaNoFeed> = {}): RodadaNoFeed {
  return {
    rodada_id: id,
    posicao,
    numero_da_rodada: 1,
    participante_id: null,
    resultado_id: `r-${id}`,
    nota: 90,
    classificacao: 'Trovão Humano',
    tipo_de_origem: 'Cerveja',
    subtipo_de_origem: null,
    e_artificial: false,
    esta_escondido: false,
    caminho_do_audio: null,
    apelido: 'Luiz',
    usuario_id: null,
    criado_em: '2026-08-08T12:00:00.000Z',
    ...extras,
  };
}

function batalha(extras: Partial<Batalha> = {}): Batalha {
  return {
    codigo_de_acesso: 'K7M3PQ9XTR',
    tipo_de_batalha: 'remota',
    tipo_de_local: null,
    total_de_rodadas: null,
    criado_em: '2026-08-08T12:00:00.000Z',
    expira_em: '2026-08-15T12:00:00.000Z',
    finalizada_em: null,
    rodadas: [rodada('a', 1)],
    participantes: [],
    lider: { apelido: 'Luiz', nota: 90, resultado_id: 'r-a' },
    /* A tela legada não lê o placar de rounds. Quem lê é a Arena. */
    placar: null,
    ...extras,
  };
}

function aoVivo(batalhaAtual: Batalha | null, extras: Partial<BatalhaAoVivo> = {}): BatalhaAoVivo {
  return {
    batalha: batalhaAtual,
    carregando: false,
    erro: null,
    expirou: false,
    registrar: () => {},
    ...extras,
  };
}

function abrir() {
  return render(
    createElement(
      MemoryRouter,
      { initialEntries: ['/b/K7M3PQ9XTR'] },
      createElement(
        Routes,
        null,
        createElement(Route, { path: '/b/:code', element: createElement(BattleView) }),
      ),
    ),
  );
}

/**
 * Finge que a área rolável tem conteúdo além da tela e que a pessoa está no
 * topo. jsdom não faz layout: sem isto todas as medidas são zero, o que o
 * componente lê (corretamente) como "já está no fim".
 */
function pessoaLendoLaEmCima() {
  Object.defineProperty(HTMLElement.prototype, 'scrollHeight', { configurable: true, value: 4000 });
  Object.defineProperty(HTMLElement.prototype, 'clientHeight', { configurable: true, value: 600 });
  Object.defineProperty(HTMLElement.prototype, 'scrollTop', { configurable: true, value: 0 });
}

function pessoaNoFimDoFeed() {
  Object.defineProperty(HTMLElement.prototype, 'scrollHeight', { configurable: true, value: 600 });
  Object.defineProperty(HTMLElement.prototype, 'clientHeight', { configurable: true, value: 600 });
  Object.defineProperty(HTMLElement.prototype, 'scrollTop', { configurable: true, value: 0 });
}

const rolou = vi.fn();

beforeEach(() => {
  vi.setSystemTime(new Date('2026-08-08T12:00:00.000Z'));
  rolou.mockReset();
  // jsdom não implementa `scrollIntoView` — sem o carimbo, o componente quebra.
  Element.prototype.scrollIntoView = rolou;
  pessoaNoFimDoFeed();
});

afterEach(() => {
  // A limpeza automática da testing-library só se registra com `globals: true`,
  // que este projeto não usa: sem isto a tela do teste anterior fica montada.
  cleanup();
  vi.useRealTimers();
});

describe('/b/CODIGO com uma disputa presencial', () => {
  const presencial = batalha({
    tipo_de_batalha: 'presencial',
    tipo_de_local: 'churrasco',
    total_de_rodadas: 1,
    participantes: [
      { id: 'p1', apelido: 'Carol' },
      { id: 'p2', apelido: 'Bruno' },
    ],
    rodadas: [
      rodada('a', 1, { participante_id: 'p1', apelido: 'Carol', nota: 98.1 }),
      rodada('b', 2, { participante_id: 'p2', apelido: 'Bruno', nota: 91.4 }),
    ],
    lider: { apelido: 'Carol', nota: 98.1, resultado_id: 'r-a' },
  });

  it('NÃO oferece gravador — responder ali criaria uma rodada fantasma', () => {
    estado.atual = aoVivo(presencial);
    const { container, queryByText } = abrir();

    expect(container.querySelector('[data-teste="gravador"]')).toBeNull();
    expect(queryByText('Sua vez')).toBeNull();
    expect(queryByText('Chamar mais gente')).toBeNull();
  });

  it('mostra o pódio da disputa, com o local e os rounds', () => {
    estado.atual = aoVivo(presencial);
    const { container } = abrir();

    expect(container.textContent).toContain('Campeão do Auê');
    expect(container.textContent).toContain('Carol');
    expect(container.textContent).toContain('Churrasco · 1 round');
  });

  it('disputa ainda em andamento não coroa campeão nenhum', () => {
    // Dois participantes, três rounds combinados, um round jogado: coroar aqui
    // seria anunciar um campeão que ainda pode perder no próximo arroto.
    estado.atual = aoVivo(batalha({ ...presencial, total_de_rodadas: 3 }));
    const { container } = abrir();

    expect(container.textContent).not.toContain('Campeão do Auê');
    expect(container.textContent).toContain('Ainda tem arroto por vir');
    expect(container.textContent).toContain('Placar parcial do round 2 de 3');
  });

  it('continua deixando ouvir os arrotos e denunciar', () => {
    estado.atual = aoVivo(presencial);
    const { container } = abrir();

    expect(container.textContent).toContain('Round 1 · Carol');
    // Deslogado, o botão de denúncia aparece desabilitado e explica por quê —
    // a policy de `denuncias` é `TO authenticated` desde a 20260807000023. O
    // que importa aqui é que ele EXISTE também no link do pódio, que é por
    // onde um estranho ouve os arrotos da mesa.
    expect(container.textContent).toContain('Entre para denunciar');
  });
});

describe('/b/CODIGO com uma batalha remota', () => {
  it('continua com gravador, líder e convite para chamar mais gente', () => {
    estado.atual = aoVivo(batalha());
    const { container } = abrir();

    expect(container.querySelector('[data-teste="gravador"]')).not.toBeNull();
    expect(container.textContent).toContain('Liderando agora');
    expect(container.textContent).toContain('Chamar mais gente');
  });

  it('o prazo é contado de `expira_em`, e não escrito à mão', () => {
    // Sete dias inteiros no relógio preso do teste.
    estado.atual = aoVivo(batalha());
    expect(abrir().container.textContent).toContain('Ele para de funcionar em 7 dias.');

    cleanup();

    // Mesma batalha, seis dias depois: a frase antiga continuaria prometendo 7.
    estado.atual = aoVivo(batalha({ expira_em: '2026-08-09T06:00:00.000Z' }));
    expect(abrir().container.textContent).toContain('Ele para de funcionar em 18 horas.');
  });
});

describe('quando a sessão vence com a pessoa na tela', () => {
  it('diz o que aconteceu e tira o conteúdo do ar', () => {
    estado.atual = aoVivo(batalha(), { expirou: true });
    const { container } = abrir();

    expect(container.textContent).toContain('Esse link já deu o que tinha que dar');
    // §3.7: passado o prazo, o conteúdo não continua acessível pelo link.
    expect(container.querySelector('[data-teste="gravador"]')).toBeNull();
    expect(container.textContent).not.toContain('Liderando agora');
  });
});

describe('a rodada que chega sozinha', () => {
  it('não arranca a tela de quem está lendo o histórico', () => {
    pessoaLendoLaEmCima();
    estado.atual = aoVivo(batalha());
    const { container, rerender } = abrir();

    rolou.mockReset();

    estado.atual = aoVivo(batalha({ rodadas: [rodada('a', 1), rodada('b', 2)] }));
    act(() => {
      rerender(
        createElement(
          MemoryRouter,
          { initialEntries: ['/b/K7M3PQ9XTR'] },
          createElement(
            Routes,
            null,
            createElement(Route, { path: '/b/:code', element: createElement(BattleView) }),
          ),
        ),
      );
    });

    expect(rolou).not.toHaveBeenCalled();
    // Em vez de puxar a tela, avisa — e quem decide é ela.
    expect(container.textContent).toContain('Chegou arroto novo');
  });

  it('quem já está no fim do feed continua sendo levado junto', () => {
    pessoaNoFimDoFeed();
    estado.atual = aoVivo(batalha());
    const { container, rerender } = abrir();

    rolou.mockReset();

    estado.atual = aoVivo(batalha({ rodadas: [rodada('a', 1), rodada('b', 2)] }));
    act(() => {
      rerender(
        createElement(
          MemoryRouter,
          { initialEntries: ['/b/K7M3PQ9XTR'] },
          createElement(
            Routes,
            null,
            createElement(Route, { path: '/b/:code', element: createElement(BattleView) }),
          ),
        ),
      );
    });

    expect(rolou).toHaveBeenCalled();
    expect(container.textContent).not.toContain('Chegou arroto novo');
  });
});
