// @vitest-environment jsdom
/**
 * O movimento não pode sobreviver ao momento que o criou.
 *
 * É o §16 da #86 escrito em teste: classe pendurada e relógio vivo depois de
 * a rodada acabar é como animação de uma partida vaza para a próxima.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';

import { anim, bandeira } from './anim';

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

function noDocumento(): HTMLElement {
  const el = document.createElement('div');
  document.body.append(el);
  return el;
}

describe('anim', () => {
  it('põe a classe na hora e tira quando a animação acaba', () => {
    vi.useFakeTimers();
    const el = noDocumento();

    anim(el, 'pop', 560);
    expect(el.classList.contains('pop')).toBe(true);

    vi.advanceTimersByTime(560);
    expect(el.classList.contains('pop')).toBe(false);
  });

  it('desfazer no meio limpa a classe e o relógio', () => {
    vi.useFakeTimers();
    const el = noDocumento();

    const desfazer = anim(el, 'pop', 560);
    desfazer();

    expect(el.classList.contains('pop')).toBe(false);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('sem nó não quebra e não deixa relógio pendurado', () => {
    vi.useFakeTimers();
    expect(() => anim(null, 'pop', 560)()).not.toThrow();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('quem pediu menos movimento não recebe animação nenhuma', () => {
    vi.stubGlobal('matchMedia', () => ({ matches: true }));
    const el = noDocumento();

    anim(el, 'pop', 560);

    expect(el.classList.contains('pop')).toBe(false);
  });
});

describe('bandeira', () => {
  it('liga o atributo e desliga sozinha', () => {
    vi.useFakeTimers();
    const el = noDocumento();

    bandeira(el, 'ring', 720);
    expect(el.getAttribute('data-ring')).toBe('1');

    vi.advanceTimersByTime(720);
    expect(el.getAttribute('data-ring')).toBe('0');
  });

  it('desfazer antes da hora desliga na mesma', () => {
    vi.useFakeTimers();
    const el = noDocumento();

    bandeira(el, 'shake', 340)();

    expect(el.getAttribute('data-shake')).toBe('0');
    expect(vi.getTimerCount()).toBe(0);
  });

  it('com movimento reduzido o atributo nem chega a ligar', () => {
    vi.stubGlobal('matchMedia', () => ({ matches: true }));
    const el = noDocumento();

    bandeira(el, 'ring', 720);

    expect(el.hasAttribute('data-ring')).toBe(false);
  });
});
