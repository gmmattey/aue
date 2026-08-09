// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  esquecerUltimaBatalha,
  guardarUltimaBatalha,
  lerUltimaBatalha,
} from './ultimaBatalha';

/**
 * O bilhete que devolve ao criador o endereço da batalha que ele mesmo criou.
 *
 * O que estes testes travam não é armazenamento: é que o atalho NUNCA prometa
 * uma batalha que o prazo já matou, e que uma tela do app jamais deixe de abrir
 * porque o navegador bloqueou `localStorage`.
 */

const SETE_DIAS = 7 * 24 * 60 * 60 * 1000;

afterEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
});

describe('o caminho normal', () => {
  it('guarda e devolve o código', () => {
    guardarUltimaBatalha('ABCDEFGHJK', 1_000);
    expect(lerUltimaBatalha(2_000)).toEqual({ codigo: 'ABCDEFGHJK', criadaEm: 1_000 });
  });

  it('sem nada guardado, não inventa batalha', () => {
    expect(lerUltimaBatalha()).toBeNull();
  });

  it('esquecer apaga de verdade', () => {
    guardarUltimaBatalha('ABCDEFGHJK', 1_000);
    esquecerUltimaBatalha();
    expect(lerUltimaBatalha(2_000)).toBeNull();
  });
});

describe('o prazo', () => {
  it('no sexto dia ainda oferece o atalho', () => {
    guardarUltimaBatalha('ABCDEFGHJK', 0);
    expect(lerUltimaBatalha(6 * 24 * 60 * 60 * 1000)).not.toBeNull();
  });

  it('completados os 7 dias, para de oferecer', () => {
    guardarUltimaBatalha('ABCDEFGHJK', 0);
    expect(lerUltimaBatalha(SETE_DIAS)).toBeNull();
  });

  it('vencido, o bilhete é jogado fora e não volta a aparecer', () => {
    guardarUltimaBatalha('ABCDEFGHJK', 0);
    lerUltimaBatalha(SETE_DIAS);
    // Mesmo perguntando de novo com um relógio mais antigo, já era.
    expect(lerUltimaBatalha(1_000)).toBeNull();
  });
});

describe('lixo guardado', () => {
  it('JSON quebrado não derruba a leitura', () => {
    localStorage.setItem('aue.ultima-batalha.v1', '{nao é json');
    expect(lerUltimaBatalha()).toBeNull();
  });

  it('formato de outra versão é descartado', () => {
    localStorage.setItem('aue.ultima-batalha.v1', JSON.stringify({ code: 'ABCDEFGHJK' }));
    expect(lerUltimaBatalha()).toBeNull();
  });

  it('data ilegível não vira batalha eterna', () => {
    localStorage.setItem(
      'aue.ultima-batalha.v1',
      JSON.stringify({ codigo: 'ABCDEFGHJK', criadaEm: 'ontem' }),
    );
    expect(lerUltimaBatalha()).toBeNull();
  });
});

describe('armazenamento bloqueado (Safari privado)', () => {
  it('ler não lança quando o getItem lança', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('bloqueado');
    });
    expect(() => lerUltimaBatalha()).not.toThrow();
    expect(lerUltimaBatalha()).toBeNull();
  });

  it('guardar não lança quando o setItem lança', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('bloqueado');
    });
    expect(() => guardarUltimaBatalha('ABCDEFGHJK')).not.toThrow();
  });
});
