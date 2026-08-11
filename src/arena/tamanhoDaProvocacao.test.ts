import { describe, expect, it } from 'vitest';

import { FAIXAS } from '../nucleo/nota/faixas';
import { PROVOCACOES_PRONTAS } from '../nucleo/fala/compartilhamento';
import { LIMITE_DA_PROVOCACAO, tamanhoDaProvocacao } from './tamanhoDaProvocacao';

/*
  ISTO EXISTE POR UM DEFEITO QUE PASSOU.

  A frase mais comprida do juiz quebrava em três linhas dentro do cartão,
  passava por cima do filete do rodapé e empurrava a nota até a Bolha. A imagem
  saía pronta e errada: sem erro, sem aviso, e sem nenhum teste pegando —
  porque em jsdom não existe layout.

  O que dá pra travar sem layout é o TEXTO: comprimento de frase e degrau
  escolhido. Os tetos de cada degrau foram medidos no cartão real; o que este
  arquivo faz é impedir que uma frase nova passe do que foi medido.
*/

/** Toda frase que pode acabar na imagem, venha do juiz ou da lista pronta. */
const TODAS_AS_PROVOCACOES: readonly string[] = [
  ...FAIXAS.flatMap((faixa) => faixa.baralho.map((fala) => fala.fraseDoJuiz)),
  ...PROVOCACOES_PRONTAS,
];

describe('a provocação cabe no cartão', () => {
  it('nenhuma frase do jogo passa do que o menor degrau aguenta em duas linhas', () => {
    /*
      Frase nova mais comprida que isto derruba a suíte aqui, e não vira imagem
      torta no grupo de alguém. Quem precisar de frase maior mede o cartão de
      novo e mexe no degrau — não neste número solto.
    */
    for (const frase of TODAS_AS_PROVOCACOES) {
      expect(
        frase.length,
        `"${frase}" tem ${frase.length} caracteres e estoura o cartão`,
      ).toBeLessThanOrEqual(LIMITE_DA_PROVOCACAO);
    }
  });

  it('a frase que reprovou a #151 cai no degrau menor', () => {
    // Faixa mais baixa, item 0 da lista: é a provocação PADRÃO de quem arrota
    // fraco. Basta apertar Compartilhar, sem tocar no Trocar.
    expect(tamanhoDaProvocacao('Ouvimos alguma coisa. Tecnicamente, foi um suspiro.')).toBe('curta');
  });

  it('as provocações prontas continuam no corpo cheio', () => {
    for (const frase of PROVOCACOES_PRONTAS) {
      expect(tamanhoDaProvocacao(frase)).toBe('grande');
    }
  });

  it('desce um degrau de cada vez, nos cortes medidos', () => {
    expect(tamanhoDaProvocacao('a'.repeat(36))).toBe('grande');
    expect(tamanhoDaProvocacao('a'.repeat(37))).toBe('media');
    expect(tamanhoDaProvocacao('a'.repeat(48))).toBe('media');
    expect(tamanhoDaProvocacao('a'.repeat(49))).toBe('curta');
  });

  it('espaço em volta não conta como texto', () => {
    // Senão a mesma frase mudaria de corpo por causa de um espaço sobrando.
    expect(tamanhoDaProvocacao(`  ${'a'.repeat(36)}  `)).toBe('grande');
  });

  it('frase vazia não quebra a conta', () => {
    expect(tamanhoDaProvocacao('')).toBe('grande');
  });
});
