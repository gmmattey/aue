/**
 * `/como-jogar` e `/como-arrotar` passaram a usar `LayoutPublico`, a mesma
 * família visual da landing de desktop, em vez de `LayoutLegal`. O conteúdo
 * (título, texto, ordem) não mudou — só a moldura. Este arquivo trava as duas
 * coisas: que o conteúdo continua lá, e que a moldura é mesmo a compartilhada
 * (`desktop-*`), não uma reinvenção por página.
 */
import { describe, expect, it } from 'vitest';
import { createElement } from 'react';
import type { FC } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';

import { ComoJogar } from './ComoJogar';
import { ComoArrotar } from './ComoArrotar';

function montar(componente: FC): string {
  return renderToStaticMarkup(createElement(MemoryRouter, null, createElement(componente)));
}

describe('/como-jogar com a moldura da landing', () => {
  it('tem um H1 só, e é o da página', () => {
    const html = montar(ComoJogar);
    expect([...html.matchAll(/<h1[\s>]/g)]).toHaveLength(1);
    expect(html).toMatch(/<h1>[\s\S]*Como jogar o Auê/);
  });

  it('mantém o conteúdo que já existia', () => {
    const html = montar(ComoJogar);
    expect(html).toContain('nota de 0 a 100');
    expect(html).toContain('Depois da nota, chame alguém para o X1');
    expect(html).toContain('sem baixar app');
    expect(html).toContain('burp game');
  });

  it('usa a casca compartilhada com a landing, não uma própria', () => {
    const html = montar(ComoJogar);
    expect(html).toContain('desktop-site');
    expect(html).toContain('desktop-topbar');
    expect(html).toContain('desktop-footer');
  });

  it('leva pra política de privacidade e de volta pro jogo', () => {
    const html = montar(ComoJogar);
    expect(html).toContain('href="/privacidade"');
    expect(html).toContain('href="/"');
  });

  it('o rodapé tem os quatro links institucionais, igual a landing', () => {
    const html = montar(ComoJogar);
    expect(html).toContain('href="/como-jogar"');
    expect(html).toContain('href="/como-arrotar"');
    expect(html).toContain('href="/privacidade"');
    expect(html).toContain('href="/termos"');
  });
});

describe('/como-arrotar com a moldura da landing', () => {
  it('tem um H1 só, e é o da página', () => {
    const html = montar(ComoArrotar);
    expect([...html.matchAll(/<h1[\s>]/g)]).toHaveLength(1);
    expect(html).toMatch(/<h1>[\s\S]*Como arrotar/);
  });

  it('tem as cinco técnicas, o framing dos dois tipos e o desvio pro médico', () => {
    const html = montar(ComoArrotar);
    expect(html).toContain('Engole ar, devolve ar');
    expect(html).toContain('trapaça');
    expect(html).toContain('O corpo ajuda, se você deixar');
    expect(html).toContain('Arroto renovado');
    expect(html).toContain('Arrotar alto');
    expect(html).toContain('Arroto de ar');
    expect(html).toContain('Arroto de estômago');
    expect(html).toContain('assunto de médico');
    expect(html).toContain('não de jogo');
  });

  it('usa a casca compartilhada com a landing, não uma própria', () => {
    const html = montar(ComoArrotar);
    expect(html).toContain('desktop-site');
    expect(html).toContain('desktop-topbar');
    expect(html).toContain('desktop-footer');
  });

  it('leva de volta pro jogo e pra como jogar', () => {
    const html = montar(ComoArrotar);
    expect(html).toContain('href="/"');
    expect(html).toContain('href="/como-jogar"');
  });
});
