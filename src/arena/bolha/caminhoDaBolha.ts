/**
 * A geometria da Bolha — matemática pura, sem DOM.
 *
 * Portado do protótipo canônico (`docs/design/prototipo-arena/arena.html`):
 * um blob de N pontos suavizado por Catmull-Rom convertido em curvas cúbicas.
 * Mesma fórmula, mesmas constantes; o que mudou foi virar função testável em
 * vez de fechar sobre variáveis globais de um `<script>`.
 *
 * Fica em `arena/` e não em `nucleo/` de propósito: isto é forma, não regra de
 * jogo. Trocar a curva não muda quem ganha o X1.
 */

export interface FormaDaBolha {
  /** Raio de repouso. */
  readonly raio: number;
  /** O quanto ela deforma. Zero = círculo. */
  readonly amplitude: number;
  /** Quantos pontos de controle. Menos pontos, forma mais mole. */
  readonly pontos: number;
  /** Semente do ruído — muda o desenho sem mudar o comportamento. */
  readonly semente: number;
}

/**
 * Três senoides somadas.
 *
 * A ideia é uma respiração que não fecha em ciclo curto: se ela fechasse, o
 * olho pegaria o loop em poucos segundos e a Bolha viraria um GIF.
 */
function ruido(angulo: number, tempo: number, semente: number): number {
  return (
    (Math.sin(angulo * 3 + tempo * 0.9 + semente * 5) * 0.5 +
      Math.sin(angulo * 5 - tempo * 1.3 + semente * 9) * 0.32 +
      Math.sin(angulo * 2 + tempo * 0.55 + semente * 3) * 0.4) /
    1.22
  );
}

/**
 * O atributo `d` do `<path>` para um instante.
 *
 * `tempo` em segundos. Passar sempre o mesmo tempo congela a Bolha — é assim
 * que `prefers-reduced-motion` para a deformação sem apagar a Bolha.
 */
export function caminhoDaBolha(forma: FormaDaBolha, tempo: number): string {
  const n = Math.max(3, Math.round(forma.pontos));

  const pts: Array<[number, number]> = [];
  for (let i = 0; i < n; i++) {
    const a = i * ((Math.PI * 2) / n);
    const r = forma.raio + forma.amplitude * ruido(a, tempo, forma.semente);
    pts.push([Math.cos(a) * r, Math.sin(a) * r]);
  }

  let d = `M${pts[0][0].toFixed(2)},${pts[0][1].toFixed(2)}`;
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n];
    const p1 = pts[i];
    const p2 = pts[(i + 1) % n];
    const p3 = pts[(i + 2) % n];

    const c1x = p1[0] + (p2[0] - p0[0]) / 6;
    const c1y = p1[1] + (p2[1] - p0[1]) / 6;
    const c2x = p2[0] - (p3[0] - p1[0]) / 6;
    const c2y = p2[1] - (p3[1] - p1[1]) / 6;

    d += `C${c1x.toFixed(2)},${c1y.toFixed(2)} ${c2x.toFixed(2)},${c2y.toFixed(2)} ${p2[0].toFixed(2)},${p2[1].toFixed(2)}`;
  }

  return `${d}Z`;
}

/**
 * O modo de repouso — o único desta fatia.
 *
 * Os outros oito modos (gravação, contenção, julgamento, entrega, espera,
 * replay, vitória, derrota) são a #86. Colocar todos aqui agora seria escrever
 * vocabulário emocional para estados que ninguém consegue ver.
 *
 * Valores do protótipo, modo `idle`.
 */
export const REPOUSO: FormaDaBolha = {
  raio: 118,
  amplitude: 8,
  pontos: 5,
  semente: 0.7,
};
