/**
 * A CAIXA DO LINK RECÉM-CRIADO — o que ela promete e o que ela avisa.
 *
 * Dois defeitos moram aqui, e os dois são de VERDADE NA INTERFACE (§ objetivo 4
 * do AGENTS.md), não de layout:
 *
 *   1. o prazo era um "7 dias" fixo. Enquanto esta caixa aparecer segundos
 *      depois de criar a batalha, isso é verdade — mas basta alguém passar o
 *      prazo real para o componente para o texto ter de contar as horas, e o
 *      teste garante que ele conta em vez de repetir a frase decorada;
 *
 *   2. este é o ÚNICO lugar do app onde o código da batalha existe para quem a
 *      criou. Não há listagem de batalhas — `batalhas` tem RLS ligada e nenhuma
 *      policy de SELECT (20260807000030), que é o que faz "só quem tem o link"
 *      valer de graça. Fechou a aba sem mandar para ninguém, o link se perde.
 *      A tela avisa; quem apagar o aviso quebra a promessa em silêncio.
 *
 * `renderToStaticMarkup` como nos vizinhos: sem DOM, sem efeito, sem rede.
 */
import { describe, expect, it } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import { LinkDaBatalha } from './LinkDaBatalha';

const LINK = 'https://aue.vercel.app/b/K7M3PQ9XTR';

function desenhar(expiraEm?: string): string {
  return renderToStaticMarkup(createElement(LinkDaBatalha, { link: LINK, expiraEm }));
}

describe('LinkDaBatalha', () => {
  it('mostra o link inteiro, clicável', () => {
    const html = desenhar();
    expect(html).toContain(`href="${LINK}"`);
    expect(html).toContain(LINK);
  });

  it('sem o prazo real, a frase se ancora no agora em vez de decair', () => {
    // A batalha acabou de nascer com sete dias: aqui "7 dias" é verdade. O
    // "contando de agora" é o que impede a frase de virar mentira se um dia
    // esta caixa passar a ser reexibida depois.
    expect(desenhar()).toContain('em 7 dias, contando de agora');
  });

  it('com o prazo real, conta o que resta de verdade', () => {
    // Três horas E UM MINUTO: o arredondamento é para baixo, e "exatamente
    // três horas" vira "2 horas" no milissegundo que o teste leva para
    // renderizar. A folga é do teste, não do componente.
    const daquiA3Horas = new Date(Date.now() + 3 * 60 * 60 * 1000 + 60_000).toISOString();
    const html = desenhar(daquiA3Horas);

    expect(html).toContain('Ele para de funcionar em 3 horas.');
    expect(html).not.toContain('7 dias');
  });

  it('avisa que o link não volta a aparecer', () => {
    // O Auê não tem — e não vai ter no MVP1 — lista de batalhas.
    expect(desenhar()).toContain('o Auê não tem lista de batalhas');
  });
});
