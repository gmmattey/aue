import type { ArmazenamentoLocal } from '../../portas/armazenamento';

/**
 * `localStorage`, com a proteção que ele exige.
 *
 * **TODO ACESSO É PROTEGIDO, inclusive a leitura.** O Safari em aba privada
 * não devolve `null` quando o armazenamento está bloqueado — ele **lança**. E
 * lança no `getItem`, não só no `setItem`. Sem o `try`, abrir o jogo numa aba
 * privada do iPhone quebraria a Arena antes da primeira Bolha aparecer, por
 * causa de uma frase que a gente queria lembrar.
 *
 * É o mesmo desenho que `features/battle/disputaGuardada.ts` já usa. Não
 * inventamos outro; centralizamos.
 */
export function criarArmazenamentoWeb(): ArmazenamentoLocal {
  return {
    ler(chave: string): string | null {
      try {
        return window.localStorage.getItem(chave);
      } catch {
        return null;
      }
    },

    gravar(chave: string, valor: string): boolean {
      try {
        window.localStorage.setItem(chave, valor);
        return true;
      } catch {
        /*
          Além da aba privada, cai aqui a cota estourada. Nos dois casos o jogo
          segue: o que mora aqui é pista descartável (ADR §5), e perder pista
          não pode custar a partida.
        */
        return false;
      }
    },

    apagar(chave: string): void {
      try {
        window.localStorage.removeItem(chave);
      } catch {
        /* Se nem apagar dá, não havia o que apagar. */
      }
    },
  };
}
