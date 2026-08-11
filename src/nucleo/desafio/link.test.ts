import { describe, expect, it } from 'vitest';

import { linkComPrevia } from './link';

describe('o link que viaja', () => {
  it('troca /b/ por /x/ mantendo o código', () => {
    expect(linkComPrevia('https://aue.web.app/b/ABCDEFGHJK')).toBe(
      'https://aue.web.app/x/ABCDEFGHJK',
    );
  });

  it('funciona em qualquer endereço, inclusive no antigo e no localhost', () => {
    // O link nasce da origem onde o jogo está rodando, então isto vale para
    // preview, desenvolvimento e para o endereço que a gente deixou pra trás.
    expect(linkComPrevia('https://aue.vercel.app/b/K7M3PQ9XTR')).toBe(
      'https://aue.vercel.app/x/K7M3PQ9XTR',
    );
    expect(linkComPrevia('http://localhost:5173/b/ABC123')).toBe('http://localhost:5173/x/ABC123');
  });

  it('formato que não reconhece volta como veio', () => {
    /*
      É a regra do ADR 0003 §7 vista de perto: na dúvida, o link direto. Um
      `/x/` inventado em cima de uma URL que ninguém previu levaria a lugar
      nenhum, e o link direto pelo menos abre.
    */
    expect(linkComPrevia('https://aue.web.app/')).toBe('https://aue.web.app/');
    expect(linkComPrevia('https://aue.web.app/d/ABC123')).toBe('https://aue.web.app/d/ABC123');
    expect(linkComPrevia('https://aue.web.app/b/abc123')).toBe('https://aue.web.app/b/abc123');
  });

  it('não mexe num /b/ que não está no fim', () => {
    // Só o código no fim da URL é caminho de batalha. O resto é coincidência.
    expect(linkComPrevia('https://aue.web.app/b/ABC123/algo')).toBe(
      'https://aue.web.app/b/ABC123/algo',
    );
  });
});
