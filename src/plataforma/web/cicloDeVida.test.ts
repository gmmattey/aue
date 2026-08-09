// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';

import { criarCicloDeVidaWeb } from './cicloDeVida';

function fingirVisibilidade(estado: DocumentVisibilityState) {
  Object.defineProperty(document, 'visibilityState', { value: estado, configurable: true });
  document.dispatchEvent(new Event('visibilitychange'));
}

afterEach(() => {
  fingirVisibilidade('visible');
});

describe('o ciclo de vida web', () => {
  it('avisa quando a tela some', () => {
    const ciclo = criarCicloDeVidaWeb();
    const soltar = vi.fn();
    ciclo.aoEsconder(soltar);

    fingirVisibilidade('hidden');

    expect(soltar).toHaveBeenCalledTimes(1);
    ciclo.parar();
  });

  it('avisa quando a tela volta', () => {
    const ciclo = criarCicloDeVidaWeb();
    const voltou = vi.fn();
    ciclo.aoVoltar(voltou);

    fingirVisibilidade('hidden');
    fingirVisibilidade('visible');

    expect(voltou).toHaveBeenCalledTimes(1);
    ciclo.parar();
  });

  it('`pagehide` também conta como esconder', () => {
    // É ELE que salva no iPhone: o Safari mata aba em segundo plano e nenhum
    // `return` de efeito roda. Sem escutar isto, o microfone ficaria vivo.
    const ciclo = criarCicloDeVidaWeb();
    const soltar = vi.fn();
    ciclo.aoEsconder(soltar);

    window.dispatchEvent(new Event('pagehide'));

    expect(soltar).toHaveBeenCalledTimes(1);
    ciclo.parar();
  });

  it('ouvinte que explode não impede o próximo de rodar', () => {
    // O próximo costuma ser o que solta o microfone. Se um ouvinte cosmético
    // derruba a fila, o recurso sensível fica vivo — e é o caso que ninguém
    // testa.
    const ciclo = criarCicloDeVidaWeb();
    const soltar = vi.fn();
    vi.spyOn(console, 'error').mockImplementation(() => {});

    ciclo.aoEsconder(() => {
      throw new Error('quebrei');
    });
    ciclo.aoEsconder(soltar);

    fingirVisibilidade('hidden');

    expect(soltar).toHaveBeenCalledTimes(1);
    ciclo.parar();
    vi.restoreAllMocks();
  });

  it('depois de parar, ninguém mais é avisado', () => {
    const ciclo = criarCicloDeVidaWeb();
    const soltar = vi.fn();
    ciclo.aoEsconder(soltar);
    ciclo.parar();

    fingirVisibilidade('hidden');
    window.dispatchEvent(new Event('pagehide'));

    expect(soltar).not.toHaveBeenCalled();
  });
});
