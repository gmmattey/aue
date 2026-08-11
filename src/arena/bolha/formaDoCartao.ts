import type { FormaDaBolha } from './caminhoDaBolha';

/**
 * A cara que a Bolha faz na imagem que viaja.
 *
 * A DIFERENÇA É GEOMETRIA, NÃO COR. Na imagem não existe animação nem estado
 * vivo: se nota alta e nota baixa saíssem com a mesma forma, a Bolha viraria
 * carimbo. Nota alta incha — amplitude grande, mais pontos, um pouco maior.
 * Nota baixa colapsa num caroço quase liso e menor.
 *
 * Matemática pura, sem DOM e sem React: dá para provar em teste que duas notas
 * distantes desenham caminhos diferentes, que é o requisito 6 da #151.
 */

/** Nota fora de 0..100 não deforma nada — o servidor pode mandar qualquer coisa. */
function fracao(nota: number): number {
  if (!Number.isFinite(nota)) return 0;
  return Math.min(1, Math.max(0, nota / 100));
}

/** Quanto a Bolha impressa cresce da pior nota para a melhor. */
export interface BolhaDoCartao {
  readonly forma: FormaDaBolha;
  /** Multiplicador do tamanho desenhado. 0,78 no fundo do poço, 1,12 no topo. */
  readonly escala: number;
}

/**
 * Semente fixa: a mesma nota tem que desenhar a mesma Bolha hoje e amanhã.
 *
 * Sortear aqui faria a imagem mudar de cara entre um compartilhamento e outro
 * do MESMO arroto — e o jogador ia achar que o jogo estava zoando com ele.
 */
const SEMENTE = 0.7;

export function bolhaDoCartao(nota: number): BolhaDoCartao {
  const f = fracao(nota);

  return {
    forma: {
      raio: 118,
      /* 4 é o caroço liso; 30 é a bolha estufada de quem mandou bem. */
      amplitude: 4 + f * 26,
      pontos: Math.round(4 + f * 4),
      semente: SEMENTE,
    },
    escala: 0.78 + f * 0.34,
  };
}
