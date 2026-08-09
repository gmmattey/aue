import { useEffect, useState } from 'react';

import { ACABANDO } from '../../nucleo/fala/gravacao';
import { estaAcabando, estourouOTeto, formatarCronometro } from '../../nucleo/gravacao/regras';

/**
 * O cronômetro da gravação — e quem manda parar no teto.
 *
 * DUAS DECISÕES QUE PARECEM DETALHE E NÃO SÃO:
 *
 * 1. **Ele conta pelo relógio, não pelo laço de animação.** O laço congela
 *    quando a aba vai para segundo plano; o relógio não. Contando por quadros,
 *    voltar de uma ligação mostraria menos tempo do que passou de verdade e o
 *    teto poderia nunca chegar.
 * 2. **Ele é um componente separado.** O tempo muda dez vezes por segundo; se
 *    isso morasse na Arena, a Arena inteira — Bolha, faixas, botão — seria
 *    redesenhada dez vezes por segundo enquanto a pessoa arrota.
 */
interface Props {
  /** Quando a gravação começou, em tempo de relógio. */
  comecouEm: number;
  /** Chamado uma vez quando o teto é atingido. */
  onTeto: () => void;
  /** Injetável no teste; em produção é o relógio. */
  agora?: () => number;
}

export function Cronometro({ comecouEm, onTeto, agora = Date.now }: Props) {
  const [decorrido, setDecorrido] = useState(() => Math.max(0, agora() - comecouEm));

  useEffect(() => {
    let estourado = false;

    const tique = () => {
      const passou = Math.max(0, agora() - comecouEm);
      setDecorrido(passou);

      if (!estourado && estourouOTeto(passou)) {
        /*
          Uma vez só. Sem esta trava, o intervalo continuaria mandando parar a
          cada 100ms enquanto a parada acontece — e a parada é assíncrona.
        */
        estourado = true;
        onTeto();
      }
    };

    const relogio = setInterval(tique, 100);
    tique();
    return () => clearInterval(relogio);
  }, [comecouEm, onTeto, agora]);

  return (
    <>
      {/*
        `aria-live="off"`: o tempo muda dez vezes por segundo. Anunciar cada
        mudança transformaria um leitor de tela em metralhadora e cobriria a
        única coisa que importa ouvir aqui, que é o aviso do teto.
      */}
      <div className="cronometro" aria-live="off">
        {formatarCronometro(decorrido)}
      </div>
      {estaAcabando(decorrido) ? <p className="comentario aviso-do-teto">{ACABANDO}</p> : null}
    </>
  );
}
