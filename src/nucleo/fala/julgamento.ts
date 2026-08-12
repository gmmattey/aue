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

export const JULGANDO = [
  'Xiu.',
  'Peraí.',
  'Calma aí.',
  'Segura aí.',
  'Calma, porra.',
] as const;

export const JULGANDO_COMENTARIO = ['Tô julgando essa porra.', 'Medindo o estrago.'] as const;

/**
 * A fala da espera que ESTICOU.
 *
 * Só entra quando o relógio de verdade passa do limiar
 * (`nucleo/julgamento/tempo.ts`). Não é etapa, não é progresso e não é
 * porcentagem: é a segunda coisa que alguém diria depois de ficar calado tempo
 * demais.
 *
 * O que ficou de fora, de propósito: qualquer frase que sugira que o jogo já
 * viu alguma coisa no arroto ("essa veio estranha", "essa foi longe"). Neste
 * instante ele não tem nota nenhuma na mão — insinuar detecção é inventar
 * dado.
 */
export const JULGANDO_DEMORANDO = ['Tá saindo.', 'Vendo quanto deu.', 'Já vai.'] as const;

/** O rótulo em cima da nota, no palco. */
export const ROTULO_DA_NOTA = 'Seu Auê';

/** A saída do resultado que existe nesta fatia. Contrato: não varia. */
export const MANDAR_OUTRO = 'Vou mandar outro!';

/**
 * Os nomes das medidas que vão pra tela — três, nesta ordem.
 *
 * Rua, não laboratório: "Grave" e não "profundidade espectral". O motor não
 * mede pressão calibrada, e nome técnico prometeria precisão que ele não tem.
 *
 * **`sujeira` saiu da tela, e não do contrato.** O motor v2
 * (`features/audio/rules.ts`) zerou o peso da textura: o número continua sendo
 * calculado e persistido — mexer nisso exigiria migração destrutiva —, mas
 * mostrar como barra é dizer que ele pesa na nota quando ele não pesa mais.
 *
 * **`estouro` virou `Força`** porque é o que a pessoa entende: o quanto veio
 * com potência.
 */
export const NOMES_DAS_MEDIDAS = {
  estouro: 'Força',
  folego: 'Fôlego',
  grave: 'Grave',
} as const;

/** A ordem é fixa (design system §6.4). */
export const ORDEM_DAS_MEDIDAS = ['estouro', 'folego', 'grave'] as const;
