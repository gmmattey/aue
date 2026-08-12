import { useEffect, useRef } from 'react';

import { prefereMovimentoReduzido } from '../../plataforma/web/preferencias';
import { FORMAS, type ModoDaBolha, amplitudeDoNivel, caminhoDaBolha } from './caminhoDaBolha';

/**
 * A Bolha Auê.
 *
 * POR QUE A PULSAÇÃO NÃO MORA NO ESTADO DO REACT: a bolha do fluxo antigo
 * (`shared/components/AueBubble.tsx`, apagada na #109) guardava a pulsação em
 * `useState` e chamava `setState` **a cada quadro**. São 60 re-renders por
 * segundo da árvore inteira, no celular de alguém, para animar um desenho —
 * bateria e travamento de rolagem em troca de nada. Aqui o
 * `requestAnimationFrame` escreve direto no atributo `d` do `<path>`: o React
 * renderiza uma vez e sai da frente.
 *
 * O NÍVEL CHEGA COMO FUNÇÃO, e não como prop de valor. Prop de valor obrigaria
 * um re-render por quadro para a Bolha saber que o som mudou — exatamente o
 * problema que este componente existe para não ter. A função é lida dentro do
 * laço, fora do React.
 */
interface Props {
  modo: ModoDaBolha;
  /** Quanto som está entrando agora, de 0 a 1. Só usado no modo `gravando`. */
  nivel?: () => number;
}

export function BolhaAue({ modo, nivel }: Props) {
  const pathRef = useRef<SVGPathElement>(null);

  /*
    O `nivel` mais recente sem re-assinar o laço: trocar a função a cada render
    do pai reiniciaria a animação, e a Bolha daria um salto no meio da
    gravação.
  */
  const nivelRef = useRef(nivel);
  nivelRef.current = nivel;

  useEffect(() => {
    const path = pathRef.current;
    if (!path) return;

    const forma = FORMAS[modo];

    /*
      `prefers-reduced-motion` para a deformação, não a Bolha. Congelar o tempo
      em zero devolve a mesma forma sempre, e a Arena continua legível — que é
      o que o ARENA.md pede.
    */
    if (prefereMovimentoReduzido()) {
      path.setAttribute('d', caminhoDaBolha({ ...forma, amplitude: 0 }, 0));
      return;
    }

    /*
      Sem `requestAnimationFrame` (jsdom antigo, ambiente de servidor), a Bolha
      aparece parada em vez de sumir. Desenho estático é degradação; tela vazia
      seria defeito.
    */
    if (typeof requestAnimationFrame !== 'function') {
      path.setAttribute('d', caminhoDaBolha(forma, 0));
      return;
    }

    let quadro = 0;
    let inicio: number | null = null;
    /*
      A amplitude persegue o alvo em vez de saltar para ele. Sem essa suavização
      a Bolha pisca a cada janela de medição, e pisco de 20 vezes por segundo
      lê como defeito, não como reação.
    */
    let amplitudeAtual = forma.amplitude;

    const desenhar = (agora: number) => {
      if (inicio === null) inicio = agora;

      const alvo =
        modo === 'gravando' ? amplitudeDoNivel(nivelRef.current?.() ?? 0) : forma.amplitude;
      amplitudeAtual += (alvo - amplitudeAtual) * 0.14;

      path.setAttribute(
        'd',
        caminhoDaBolha({ ...forma, amplitude: amplitudeAtual }, (agora - inicio) / 1000),
      );
      quadro = requestAnimationFrame(desenhar);
    };

    quadro = requestAnimationFrame(desenhar);
    return () => cancelAnimationFrame(quadro);
  }, [modo]);

  return (
    <div className="bolha-wrap" data-modo={modo}>
      <svg viewBox="-160 -160 320 320" role="img" aria-labelledby="tituloDaBolha">
        <title id="tituloDaBolha">Bolha Auê</title>
        {/* O `d` inicial é a forma congelada: nada de path vazio piscando
            antes do primeiro quadro. */}
        <path
          ref={pathRef}
          className="bolha"
          d={caminhoDaBolha(FORMAS[modo], 0)}
        />
      </svg>
    </div>
  );
}
