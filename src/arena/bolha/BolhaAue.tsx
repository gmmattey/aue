import { useEffect, useRef } from 'react';

import { prefereMovimentoReduzido } from '../../plataforma/web/preferencias';
import { REPOUSO, caminhoDaBolha } from './caminhoDaBolha';

/**
 * A Bolha Auê em repouso.
 *
 * POR QUE ELA NÃO É O `shared/components/AueBubble.tsx`: aquele guarda a
 * pulsação em `useState` e chama `setState` **a cada quadro**. São 60
 * re-renders por segundo da árvore React inteira, no celular de alguém, para
 * animar um desenho — bateria e travamento de rolagem em troca de nada. Aqui o
 * `requestAnimationFrame` escreve direto no atributo `d` do `<path>`: o React
 * renderiza uma vez e sai da frente.
 *
 * Um modo só: repouso. Os outros são a #86.
 */
export function BolhaAue() {
  const pathRef = useRef<SVGPathElement>(null);

  useEffect(() => {
    const path = pathRef.current;
    if (!path) return;

    /*
      `prefers-reduced-motion` para a deformação, não a Bolha. Congelar o tempo
      em zero devolve a mesma forma sempre, e a Arena continua legível — que é
      o que o ARENA.md pede.
    */
    if (prefereMovimentoReduzido()) {
      path.setAttribute('d', caminhoDaBolha({ ...REPOUSO, amplitude: 0 }, 0));
      return;
    }

    /*
      Sem `requestAnimationFrame` (jsdom antigo, ambiente de servidor), a Bolha
      aparece parada em vez de sumir. Desenho estático é degradação; tela vazia
      seria defeito.
    */
    if (typeof requestAnimationFrame !== 'function') {
      path.setAttribute('d', caminhoDaBolha(REPOUSO, 0));
      return;
    }

    let quadro = 0;
    let inicio: number | null = null;

    const desenhar = (agora: number) => {
      if (inicio === null) inicio = agora;
      path.setAttribute('d', caminhoDaBolha(REPOUSO, (agora - inicio) / 1000));
      quadro = requestAnimationFrame(desenhar);
    };

    quadro = requestAnimationFrame(desenhar);
    return () => cancelAnimationFrame(quadro);
  }, []);

  return (
    <div className="bolha-wrap">
      <svg viewBox="-160 -160 320 320" role="img" aria-labelledby="tituloDaBolha">
        <title id="tituloDaBolha">Bolha Auê</title>
        {/* O `d` inicial é o repouso congelado: nada de path vazio piscando
            antes do primeiro quadro. */}
        <path ref={pathRef} className="bolha" d={caminhoDaBolha(REPOUSO, 0)} />
      </svg>
    </div>
  );
}
