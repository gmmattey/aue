// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  esquecerMicrofoneLiberado,
  lembrarMicrofoneLiberado,
  microfoneJaLiberado,
} from './microfoneJaLiberado';

/**
 * Quem decide se a tela de gravação pode abrir o microfone sozinha.
 *
 * O CUSTO DE ERRAR NÃO É SIMÉTRICO, e é por isso que quase todo teste aqui
 * espera `false`:
 *
 *   * errar para `false` custa um toque a mais — é o comportamento antigo;
 *   * errar para `true` abre a tela de gravação com o cronômetro correndo
 *     enquanto o navegador ainda pergunta se pode usar o microfone. O
 *     cronômetro estaria contando um áudio que não está sendo capturado, que é
 *     a interface mentindo.
 */

function fingirPermissions(resultado: unknown) {
  Object.defineProperty(navigator, 'permissions', {
    value: resultado,
    configurable: true,
  });
}

describe('microfoneJaLiberado', () => {
  beforeEach(() => {
    esquecerMicrofoneLiberado();
  });

  afterEach(() => {
    esquecerMicrofoneLiberado();
    vi.restoreAllMocks();
  });

  describe('quando a Permissions API responde (Chrome, Edge)', () => {
    it('libera com "granted"', async () => {
      fingirPermissions({ query: vi.fn().mockResolvedValue({ state: 'granted' }) });
      await expect(microfoneJaLiberado()).resolves.toBe(true);
    });

    it('não libera com "denied"', async () => {
      fingirPermissions({ query: vi.fn().mockResolvedValue({ state: 'denied' }) });
      await expect(microfoneJaLiberado()).resolves.toBe(false);
    });

    it('não libera com "prompt" — quem dispara a pergunta é o toque da pessoa', async () => {
      fingirPermissions({ query: vi.fn().mockResolvedValue({ state: 'prompt' }) });
      await expect(microfoneJaLiberado()).resolves.toBe(false);
    });

    it('"denied" GANHA da lembrança local: revogar a permissão tem efeito imediato', async () => {
      /*
        O caso que justifica a consulta vir antes da lembrança. Quem gravou uma
        vez e depois tirou a permissão nas configurações tem os dois sinais em
        conflito — e o que vale é o do navegador.
      */
      lembrarMicrofoneLiberado();
      fingirPermissions({ query: vi.fn().mockResolvedValue({ state: 'denied' }) });
      await expect(microfoneJaLiberado()).resolves.toBe(false);
    });
  });

  describe('quando a Permissions API não serve (Safari, iPhone)', () => {
    it('cai na lembrança local quando a consulta rejeita', async () => {
      // O Safari rejeita `query({ name: 'microphone' })` com TypeError. É o
      // caminho ESPERADO no aparelho onde este produto mais roda.
      fingirPermissions({ query: vi.fn().mockRejectedValue(new TypeError('não suportado')) });

      await expect(microfoneJaLiberado()).resolves.toBe(false);
      lembrarMicrofoneLiberado();
      await expect(microfoneJaLiberado()).resolves.toBe(true);
    });

    it('cai na lembrança local quando não existe Permissions API nenhuma', async () => {
      fingirPermissions(undefined);

      await expect(microfoneJaLiberado()).resolves.toBe(false);
      lembrarMicrofoneLiberado();
      await expect(microfoneJaLiberado()).resolves.toBe(true);
    });

    it('esquecer volta ao estado de primeira visita', async () => {
      fingirPermissions(undefined);
      lembrarMicrofoneLiberado();
      esquecerMicrofoneLiberado();
      await expect(microfoneJaLiberado()).resolves.toBe(false);
    });
  });

  it('localStorage indisponível não derruba nada — só não lembra', async () => {
    /*
      Safari em navegação privada antiga e iframe com cookies de terceiro
      bloqueados fazem `localStorage` LANÇAR. Gravar áudio não pode depender
      disso, então as três funções engolem o erro e a resposta vira o lado
      seguro.
    */
    fingirPermissions(undefined);
    const explodir = () => {
      throw new DOMException('bloqueado', 'SecurityError');
    };
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(explodir);
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(explodir);

    expect(() => lembrarMicrofoneLiberado()).not.toThrow();
    await expect(microfoneJaLiberado()).resolves.toBe(false);
  });
});
