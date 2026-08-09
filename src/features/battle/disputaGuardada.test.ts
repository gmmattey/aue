// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';

import { esquecerDisputa, guardarDisputa, lerDisputaGuardada } from './disputaGuardada';

/**
 * O BILHETE COM O NÚMERO DA MESA.
 *
 * As notas da disputa presencial sempre estiveram no banco. O que se perdia
 * quando a tela apagava era o `access_code` — e sem ele não havia como voltar
 * para 15 gravações que existiam o tempo todo.
 *
 * O teste que mais importa aqui é o do armazenamento BLOQUEADO: `localStorage`
 * LANÇA (não devolve `null`) no Safari em navegação privada e quando o usuário
 * bloqueia armazenamento por site. Uma disputa que não sobrevive ao bloqueio da
 * tela é ruim; uma tela que não abre é pior.
 */

afterEach(() => {
  window.localStorage.clear();
  vi.restoreAllMocks();
});

describe('ida e volta', () => {
  it('guarda e relê o código', () => {
    guardarDisputa({ codigo: 'ABCDEFGHIJ' });
    expect(lerDisputaGuardada()).toEqual({ codigo: 'ABCDEFGHIJ', lugar: undefined });
  });

  it('guarda o lugar escrito à mão junto do código', () => {
    guardarDisputa({ codigo: 'ABCDEFGHIJ', lugar: 'Laje do Rian' });
    expect(lerDisputaGuardada()?.lugar).toBe('Laje do Rian');
  });

  it('esquecer apaga de verdade', () => {
    guardarDisputa({ codigo: 'ABCDEFGHIJ' });
    esquecerDisputa();
    expect(lerDisputaGuardada()).toBeNull();
  });

  it('sem nada guardado, devolve null', () => {
    expect(lerDisputaGuardada()).toBeNull();
  });
});

describe('lixo guardado', () => {
  it('JSON quebrado não derruba a tela', () => {
    window.localStorage.setItem('aue.disputa.v1', '{isso não é json');
    expect(lerDisputaGuardada()).toBeNull();
  });

  it('objeto sem código é tratado como nada', () => {
    // Uma versão futura que mude o formato cai aqui. O certo é abrir na
    // configuração, não tentar ler uma batalha de código `undefined`.
    window.localStorage.setItem('aue.disputa.v1', '{"lugar":"praia"}');
    expect(lerDisputaGuardada()).toBeNull();
  });

  it('código vazio não vale como código', () => {
    window.localStorage.setItem('aue.disputa.v1', '{"codigo":""}');
    expect(lerDisputaGuardada()).toBeNull();
  });
});

describe('armazenamento bloqueado', () => {
  it('ler não lança quando o navegador recusa', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('bloqueado', 'SecurityError');
    });
    expect(() => lerDisputaGuardada()).not.toThrow();
    expect(lerDisputaGuardada()).toBeNull();
  });

  it('guardar não lança quando o navegador recusa', () => {
    // Safari em navegação privada. A disputa continua funcionando NESTA
    // sessão; o que se perde é a retomada.
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('cota', 'QuotaExceededError');
    });
    expect(() => guardarDisputa({ codigo: 'ABCDEFGHIJ' })).not.toThrow();
  });

  it('esquecer não lança quando o navegador recusa', () => {
    vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {
      throw new DOMException('bloqueado', 'SecurityError');
    });
    expect(() => esquecerDisputa()).not.toThrow();
  });
});
