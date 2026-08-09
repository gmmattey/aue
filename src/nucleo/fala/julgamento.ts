/**
 * A fala da origem e do julgamento.
 *
 * Curta nos dois casos, por motivos diferentes: na origem porque a pessoa está
 * mirando em seis alvos e texto comprido atrapalha; no julgamento porque a
 * espera dura pouco mais de um segundo e ninguém lê parágrafo em um segundo.
 */

/** A pergunta da origem. Quem responde é a pessoa — o jogo nunca detecta. */
export const PERGUNTAS_DE_ORIGEM = [
  'Isso veio de quê?',
  'O que tu enfiou pra dentro?',
  'Confessa: veio de quê?',
] as const;

export const JULGANDO = ['Xiu.', 'Peraí.', 'Calma aí.'] as const;

export const JULGANDO_COMENTARIO = ['Tô julgando essa porra.', 'Medindo o estrago.'] as const;

/** O rótulo em cima da nota, no palco. */
export const ROTULO_DA_NOTA = 'Seu Auê';

/** A saída do resultado que existe nesta fatia. Contrato: não varia. */
export const MANDAR_OUTRO = 'Vou mandar outro!';

/**
 * Os nomes das quatro medidas.
 *
 * Rua, não laboratório: "Grave" e não "profundidade espectral". O motor não
 * mede pressão calibrada, e nome técnico prometeria precisão que ele não tem.
 */
export const NOMES_DAS_MEDIDAS = {
  grave: 'Grave',
  estouro: 'Estouro',
  folego: 'Fôlego',
  sujeira: 'Sujeira',
} as const;
