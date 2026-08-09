import type { CicloDeVida } from '../../portas/cicloDeVida';

/**
 * O ciclo de vida no navegador.
 *
 * DOIS EVENTOS, E O SEGUNDO É O QUE SALVA NO IPHONE:
 *
 * - `visibilitychange` cobre trocar de aba, minimizar e atender ligação;
 * - `pagehide` cobre o Safari **matando a aba em segundo plano**, que é o caso
 *   em que nenhum `return` de `useEffect` roda. Sem ele, o microfone ficaria
 *   vivo depois de o app já ter ido embora.
 *
 * `beforeunload` NÃO entra: no iOS ele não dispara de forma confiável, e
 * confiar nele é o jeito de achar que está limpo sem estar (ADR §6).
 */
export function criarCicloDeVidaWeb(): CicloDeVida {
  const aoEsconderOuvintes: Array<() => void> = [];
  const aoVoltarOuvintes: Array<() => void> = [];

  const naVisibilidade = () => {
    if (document.visibilityState === 'hidden') {
      disparar(aoEsconderOuvintes);
    } else {
      disparar(aoVoltarOuvintes);
    }
  };

  const naSaida = () => disparar(aoEsconderOuvintes);

  document.addEventListener('visibilitychange', naVisibilidade);
  window.addEventListener('pagehide', naSaida);

  return {
    aoEsconder(ouvinte: () => void): void {
      aoEsconderOuvintes.push(ouvinte);
    },
    aoVoltar(ouvinte: () => void): void {
      aoVoltarOuvintes.push(ouvinte);
    },
    parar(): void {
      document.removeEventListener('visibilitychange', naVisibilidade);
      window.removeEventListener('pagehide', naSaida);
      aoEsconderOuvintes.length = 0;
      aoVoltarOuvintes.length = 0;
    },
  };
}

/**
 * Um ouvinte que explode não pode impedir o próximo de rodar.
 *
 * O ouvinte mais importante desta lista é o que solta o microfone. Se um
 * ouvinte cosmético lançar antes dele, o recurso sensível fica vivo — e é
 * exatamente o caso que ninguém testa.
 */
function disparar(ouvintes: ReadonlyArray<() => void>): void {
  for (const ouvinte of ouvintes) {
    try {
      ouvinte();
    } catch (erro) {
      console.error('Ouvinte de ciclo de vida quebrou', erro);
    }
  }
}
