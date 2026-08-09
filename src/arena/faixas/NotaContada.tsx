import { useEffect, useRef } from 'react';

import { formatarNota } from '../../shared/formato/nota';
import { prefereMovimentoReduzido } from '../../plataforma/web/preferencias';

/**
 * A nota subindo até o valor.
 *
 * MESMA LIÇÃO DA BOLHA: a contagem escreve direto no nó, dentro do laço de
 * animação. Guardar o número em `useState` redesenharia a Arena inteira —
 * Bolha, faixas, botão — sessenta vezes por segundo para animar um texto.
 *
 * **Sem teatro na repetição.** A primeira nota da sessão sobe contando; a
 * segunda aparece pronta. Piada boa não se conta duas vezes, e quem já está no
 * terceiro arroto quer o número, não o suspense (`ARENA.md`, `RESULT`).
 *
 * **Sem teatro com movimento reduzido**, pelo mesmo motivo de sempre: quem
 * pediu menos animação não pediu menos informação.
 */
interface Props {
  valor: number;
  /** Primeira revelação da sessão? Só ela tem contagem. */
  comTeatro: boolean;
  /** Chamado quando o número chega ao fim — é o gatilho das medidas. */
  onChegou: () => void;
  duracaoMs?: number;
}

export function NotaContada({ valor, comTeatro, onChegou, duracaoMs = 900 }: Props) {
  const nodeRef = useRef<HTMLDivElement>(null);
  const chegouRef = useRef(onChegou);
  chegouRef.current = onChegou;

  useEffect(() => {
    const node = nodeRef.current;
    if (!node) return;

    /*
      Idempotente: a contagem e a rede de segurança lá embaixo podem chamar os
      dois, e abrir as medidas duas vezes não faz mal — chamar zero vezes, sim.
    */
    let chegou = false;
    const direto = () => {
      if (chegou) return;
      chegou = true;
      node.textContent = formatarNota(valor);
      chegouRef.current();
    };

    if (!comTeatro || prefereMovimentoReduzido() || typeof requestAnimationFrame !== 'function') {
      direto();
      return;
    }

    let quadro = 0;
    let inicio: number | null = null;

    const contar = (agora: number) => {
      if (inicio === null) inicio = agora;
      const progresso = Math.min(1, (agora - inicio) / duracaoMs);

      /*
        Desacelerando no fim: a nota chega e "assenta" em vez de bater na
        parede. É a curva `decelerate` do design system, escrita à mão porque
        aqui não é transição de CSS.
      */
      const suave = 1 - (1 - progresso) * (1 - progresso);
      node.textContent = formatarNota(valor * suave);

      if (progresso < 1) {
        quadro = requestAnimationFrame(contar);
        return;
      }
      /*
        O valor final é escrito de novo, sem passar pela curva: arredondamento
        de ponto flutuante faria a contagem parar em 91,3 numa nota 91,4 — e a
        pessoa lembraria do número errado.
      */
      direto();
    };

    quadro = requestAnimationFrame(contar);

    /*
      REDE DE SEGURANÇA.

      As medidas só abrem quando o número chega ao fim. Se o laço de animação
      não rodar — aba em segundo plano na hora da revelação, ambiente onde
      `requestAnimationFrame` existe mas nunca dispara —, a pessoa ficaria
      olhando a nota sem nunca ver as quatro medidas, sem nada explicando por
      quê.

      O `direto` é idempotente, então quem chegar primeiro ganha e o outro não
      faz nada.
    */
    const rede = setTimeout(direto, duracaoMs + 300);

    return () => {
      cancelAnimationFrame(quadro);
      clearTimeout(rede);
    };
  }, [valor, comTeatro, duracaoMs]);

  return (
    <div className="nota" ref={nodeRef} aria-live="polite">
      {/* O valor final já no HTML: se o laço não rodar, a nota está lá. Tela
          de resultado em branco seria o pior defeito possível deste estado. */}
      {formatarNota(valor)}
    </div>
  );
}
