import { describe, expect, it } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import { PodioBanner, ID_DO_PODIO, type ColocacaoNoPodio } from './PodioBanner';

/**
 * O ARTEFATO QUE VIAJA.
 *
 * Este bloco vira PNG e sai do app: vai para o grupo do WhatsApp e é
 * reencaminhado sem contexto nenhum. Errar aqui é diferente de errar em outra
 * tela — não tem correção depois, porque a imagem já está no telefone dos
 * outros.
 *
 * `renderToStaticMarkup`, como no resto da suíte: componente puro, sem DOM,
 * sem efeito, sem rede.
 */

function montar(colocacoes: ColocacaoNoPodio[], legenda?: string): string {
  return renderToStaticMarkup(createElement(PodioBanner, { colocacoes, legenda }));
}

describe('numeração do pódio', () => {
  it('sem empate, as posições são 1, 2, 3', () => {
    const html = montar([
      { nome: 'Carol', nota: 98, posicao: 1 },
      { nome: 'Bruno', nota: 91, posicao: 2 },
      { nome: 'Rafa', nota: 72, posicao: 3 },
    ]);
    expect(html).toContain('Campeão do Auê');
    expect(html).toContain('>2<');
    expect(html).toContain('>3<');
  });

  it('obedece a posição recebida, e não a ordem do array', () => {
    /*
      O DEFEITO: o número saía de `index + 2`. Dois arrotos de 70,0 viravam 2º
      e 3º — um desempate que o app inventou, impresso na imagem que a mesa
      inteira vai ver.
    */
    const html = montar([
      { nome: 'Carol', nota: 90, posicao: 1 },
      { nome: 'Bruno', nota: 70, posicao: 2 },
      { nome: 'Rafa', nota: 70, posicao: 2 },
    ]);
    expect(html.split('>2<').length - 1).toBe(2);
    expect(html).not.toContain('>3<');
  });

  it('depois de um empate, a posição pula', () => {
    const html = montar([
      { nome: 'Carol', nota: 90, posicao: 1 },
      { nome: 'Bruno', nota: 70, posicao: 2 },
      { nome: 'Rafa', nota: 70, posicao: 2 },
      { nome: 'Julia', nota: 50, posicao: 4 },
    ]);
    expect(html).toContain('>4<');
    expect(html).not.toContain('>3<');
  });
});

describe('empate no topo', () => {
  it('não escolhe um campeão entre dois', () => {
    const html = montar([
      { nome: 'Carol', nota: 88, posicao: 1 },
      { nome: 'Bruno', nota: 88, posicao: 1 },
      { nome: 'Rafa', nota: 40, posicao: 3 },
    ]);
    expect(html).toContain('Empate no topo');
    expect(html).toContain('Carol e Bruno');
    // Quem empatou em primeiro não pode reaparecer na lista de baixo como 1º.
    expect(html).not.toContain('>1<');
  });

  it('a mesa inteira empatada continua sendo um pódio legível', () => {
    const html = montar([
      { nome: 'Carol', nota: 0, posicao: 1 },
      { nome: 'Bruno', nota: 0, posicao: 1 },
      { nome: 'Rafa', nota: 0, posicao: 1 },
    ]);
    expect(html).toContain('Carol, Bruno e Rafa');
    expect(html).toContain('0,0');
  });
});

describe('o que a imagem precisa carregar', () => {
  it('tem o id que o html2canvas fotografa', () => {
    // Sem ele, "Compartilhar o pódio" não tem o que capturar.
    expect(montar([{ nome: 'Carol', nota: 98, posicao: 1 }])).toContain(`id="${ID_DO_PODIO}"`);
  });

  it('carrega a marca e o endereço, porque a imagem viaja sozinha', () => {
    const html = montar([{ nome: 'Carol', nota: 98, posicao: 1 }]);
    expect(html).toContain('Auê!');
    expect(html).toContain('aue.vercel.app');
  });

  it('a legenda aparece quando existe, e não é inventada quando não existe', () => {
    expect(montar([{ nome: 'Carol', nota: 98, posicao: 1 }], 'Churrasco · 3 rounds')).toContain(
      'Churrasco · 3 rounds',
    );
    expect(montar([{ nome: 'Carol', nota: 98, posicao: 1 }])).toContain('Fim de jogo');
  });

  it('sem ninguém classificado, não desenha pódio vazio', () => {
    // Uma disputa em que ninguém conseguiu gravar não tem campeão.
    expect(montar([])).toBe('');
  });
});
