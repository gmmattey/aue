/**
 * QUANTO CORPO A PROVOCAÇÃO PODE TER NO CARTÃO.
 *
 * A provocação é a única linha de texto livre da imagem, e o cartão tem 486px
 * de largura útil e ~131px de altura sobrando embaixo da nota. Em corpo fixo de
 * 44px, frase comprida quebra em TRÊS linhas: o bloco do meio cresce, o texto
 * passa por cima do filete do rodapé e a nota sobe até encostar na Bolha. Nada
 * disso dá erro — o html2canvas fotografa, o `share` abre, e a imagem sai
 * pronta e errada. Foi o defeito que reprovou a #151 na primeira volta.
 *
 * Por isso a regra é de CARACTERE, não de pixel: o núcleo não mede layout, o
 * jsdom não tem layout, e medir no navegador na hora da foto seria decidir
 * tipografia em tempo de execução. Contando caractere, a decisão é pura,
 * determinística e testável.
 *
 * OS NÚMEROS SÃO MEDIDOS, NÃO CHUTADOS. Cartão real de 540×540, as 42 frases do
 * juiz mais as quatro provocações prontas, em Anton, system-ui, Arial e Impact
 * (a pilha inteira do `--font-display`, porque no iPhone a Anton pode não
 * chegar). O teto de cada degrau — o comprimento a partir do qual a terceira
 * linha aparece na pior fonte — deu:
 *
 * | corpo | teto medido | corte aqui | folga |
 * |-------|-------------|------------|-------|
 * | 44px  | 40          | 36         | 4     |
 * | 36px  | 52          | 48         | 4     |
 * | 30px  | 57          | —          | —     |
 *
 * Os cortes ficam 4 caracteres abaixo do teto de propósito: acento, palavra
 * longa e fonte de sistema diferente mexem o suficiente para comer 1 ou 2.
 *
 * O ÚLTIMO DEGRAU NÃO É INFINITO. Acima de 57 caracteres nem 30px segura duas
 * linhas, e não existe degrau depois dele. Quem segura isso é
 * `tamanhoDaProvocacao.test.ts`, que mede toda frase de `nucleo/nota/faixas.ts`
 * contra `LIMITE_DA_PROVOCACAO`. Frase nova mais comprida que isso derruba a
 * suíte antes de virar imagem torta no grupo de alguém.
 */

/** Os degraus. O CSS de cada um mora em `cartao.css`. */
export type TamanhoDaProvocacao = 'grande' | 'media' | 'curta';

/** Até aqui, 44px. */
const ATE_GRANDE = 36;

/** Até aqui, 36px. Daí pra cima, 30px. */
const ATE_MEDIA = 48;

/**
 * O comprimento máximo que o último degrau aguenta em duas linhas.
 *
 * Medido em 57 na pior fonte; 53 deixa a mesma folga de 4 dos outros degraus.
 * A frase mais comprida do jogo hoje tem 51.
 */
export const LIMITE_DA_PROVOCACAO = 53;

export function tamanhoDaProvocacao(texto: string): TamanhoDaProvocacao {
  const comprimento = texto.trim().length;
  if (comprimento <= ATE_GRANDE) return 'grande';
  if (comprimento <= ATE_MEDIA) return 'media';
  return 'curta';
}
