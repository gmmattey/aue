import type { EstadoDaArena } from '../../nucleo/arena/estados';

/**
 * O andaime.
 *
 * A máquina já conhece os dez estados; oito deles ainda não têm cena. Quando a
 * partida cai num desses, a Arena diz isso com todas as letras em vez de
 * mostrar tela em branco ou, pior, fingir que alguma coisa aconteceu.
 *
 * ISTO NUNCA CHEGA EM QUEM JOGA: a Arena inteira está atrás da
 * `VITE_FEATURE_ARENA`, que vem desligada por padrão. É o lugar onde a fatia
 * de cada estado encosta o código dela — a #87 começa por `RECORDING`.
 */
interface Props {
  estado: EstadoDaArena;
}

export function EstadoNaoConstruido({ estado }: Props) {
  return (
    <div className="nao-construido" role="status">
      <p>
        <strong>{estado}</strong> ainda não foi construído.
      </p>
      <p>Andaime de desenvolvimento. Não é estado do jogo.</p>
    </div>
  );
}
