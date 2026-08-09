// @vitest-environment jsdom
/**
 * O caso que derruba app de verdade: **`localStorage` que lança**.
 *
 * Safari em aba privada, e navegador com armazenamento de site desligado, não
 * devolvem `null` — levantam exceção, e levantam no `getItem` também. Sem a
 * proteção, abrir o jogo numa aba privada do iPhone quebraria a Arena antes da
 * primeira Bolha, por causa de uma frase que a gente queria lembrar.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';

import { criarArmazenamentoWeb } from './armazenamento';

afterEach(() => {
  vi.restoreAllMocks();
  window.localStorage.clear();
});

function bloquearArmazenamento() {
  const explodir = () => {
    throw new DOMException('The operation is insecure.', 'SecurityError');
  };
  vi.spyOn(Storage.prototype, 'getItem').mockImplementation(explodir);
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(explodir);
  vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(explodir);
}

describe('o armazenamento web', () => {
  it('guarda e devolve', () => {
    const armazenamento = criarArmazenamentoWeb();
    expect(armazenamento.gravar('aue.teste.v1', '1')).toBe(true);
    expect(armazenamento.ler('aue.teste.v1')).toBe('1');
    armazenamento.apagar('aue.teste.v1');
    expect(armazenamento.ler('aue.teste.v1')).toBeNull();
  });

  it('com o armazenamento bloqueado, ler devolve null em vez de explodir', () => {
    bloquearArmazenamento();
    const armazenamento = criarArmazenamentoWeb();
    expect(() => armazenamento.ler('aue.teste.v1')).not.toThrow();
    expect(armazenamento.ler('aue.teste.v1')).toBeNull();
  });

  it('com o armazenamento bloqueado, gravar avisa que não deu — sem lançar', () => {
    bloquearArmazenamento();
    const armazenamento = criarArmazenamentoWeb();
    expect(armazenamento.gravar('aue.teste.v1', '1')).toBe(false);
  });

  it('com o armazenamento bloqueado, apagar não explode', () => {
    bloquearArmazenamento();
    const armazenamento = criarArmazenamentoWeb();
    expect(() => armazenamento.apagar('aue.teste.v1')).not.toThrow();
  });
});
