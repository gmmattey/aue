import { describe, expect, it } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import { ENDERECO_LEGIVEL } from '../shared/enderecoPublico';
import { CartaoDaImagem, ID_DO_CARTAO } from './CartaoDaImagem';

/**
 * O ARTEFATO QUE VIAJA.
 *
 * Este nó vira PNG e sai do aparelho: cai no grupo do zap e é reencaminhado
 * sem contexto nenhum. Errar aqui é diferente de errar numa tela — imagem que
 * saiu não volta.
 *
 * `renderToStaticMarkup`: o cartão é puro, sem efeito, sem DOM e sem rede. Se
 * um dia precisar de `useEffect` para desenhar, quebrou o contrato — o
 * html2canvas fotografa o que está montado, não o que vai chegar depois.
 */
function montar(props: { notaEscrita: string; nota: number; provocacao: string }): string {
  return renderToStaticMarkup(createElement(CartaoDaImagem, props));
}

const PADRAO = { notaEscrita: '91,4', nota: 91.4, provocacao: 'Duvido bater.' };

describe('o cartão que o html2canvas fotografa', () => {
  it('tem o id que o adaptador procura', () => {
    // Sem o id certo o adaptador não acha o nó, e com `exigirImagem` isso vira
    // falha na cara da pessoa. É o teste mais chato e o mais importante.
    expect(montar(PADRAO)).toContain(`id="${ID_DO_CARTAO}"`);
  });

  it('mostra a nota exatamente como ela está na tela', () => {
    const html = montar(PADRAO);
    expect(html).toContain('91,4');
    expect(html).not.toContain('91.4');
  });

  it('imprime a provocação escolhida, e não uma fixa', () => {
    expect(montar({ ...PADRAO, provocacao: 'Cadê o teu?' })).toContain('Cadê o teu?');
  });

  it('leva o endereço do jogo no rodapé', () => {
    // É por aqui que quem recebeu a imagem descobre onde jogar. Se o WhatsApp
    // comer o texto da legenda, este endereço é o único que sobra.
    expect(montar(PADRAO)).toContain(ENDERECO_LEGIVEL);
  });

  it('some do leitor de tela e da ordem de tabulação', () => {
    const html = montar(PADRAO);
    expect(html).toContain('aria-hidden="true"');
    expect(html).toContain('inert');
  });

  it('não põe placar, nome de gente nem métrica na imagem', () => {
    const html = montar(PADRAO);
    expect(html).not.toMatch(/×|XP|Grave|Duração|dB/);
  });
});

describe('as armadilhas que quebram a imagem em silêncio', () => {
  it('não usa color-mix — o html2canvas 1.4.1 não resolve', () => {
    expect(montar(PADRAO)).not.toContain('color-mix');
  });

  it('não usa sprite externo por <use href> — mesma história', () => {
    expect(montar(PADRAO)).not.toContain('<use');
  });

  it('não herda a classe `.bolha` do arena.css, que é color-mix na primeira linha', () => {
    expect(montar(PADRAO)).not.toContain('class="bolha"');
  });

  it('não repete o id do <title> da Bolha da Arena', () => {
    // O `BolhaAue` tem `<title id="tituloDaBolha">` fixo. Os dois montados na
    // mesma página duplicariam o id — e o cartão não precisa de título nenhum,
    // já que é `aria-hidden`.
    expect(montar(PADRAO)).not.toContain('tituloDaBolha');
  });
});

describe('a nota tem que caber', () => {
  it('encolhe quando o número é comprido', () => {
    // "100,0" tem cinco caracteres. No corpo de 200px ele estoura a largura de
    // 540 e sai cortado — o piso de 150px existe para isso.
    expect(montar({ ...PADRAO, notaEscrita: '100,0', nota: 100 })).toContain('data-longa="sim"');
  });

  it('fica no corpo cheio quando cabe', () => {
    expect(montar(PADRAO)).toContain('data-longa="nao"');
  });
});

describe('a provocação também tem que caber', () => {
  it('encolhe a frase comprida do juiz em vez de passar por cima do rodapé', () => {
    /*
      Em 44px fixo esta frase quebrava em três linhas: passava por cima do
      filete do rodapé e empurrava a nota até a Bolha. E saía assim, porque
      imagem torta não dá erro.
    */
    const html = montar({
      ...PADRAO,
      provocacao: 'Ouvimos alguma coisa. Tecnicamente, foi um suspiro.',
    });
    expect(html).toContain('data-tamanho="curta"');
  });

  it('deixa a provocação curta no corpo cheio', () => {
    expect(montar(PADRAO)).toContain('data-tamanho="grande"');
  });
});
