import { describe, expect, it } from 'vitest';

import { textoDoCompartilhamento } from './compartilhamento';

/*
  A montagem do texto que sai no zap.

  Testado aqui, no núcleo, e não pela Arena: é regra pura, e o teste da Arena
  prova que ela CHAMA isto com o que está na tela — outra pergunta.
*/
describe('o texto que viaja', () => {
  it('põe nota no título e classificação, frase e provocação no corpo', () => {
    const { titulo, texto } = textoDoCompartilhamento({
      notaEscrita: '91,4',
      classificacao: 'Monstro do Esgoto',
      frase: 'Isso foi nojento. Parabéns.',
    });

    expect(titulo).toBe('Fiz 91,4 no Auê');
    expect(texto).toBe('Monstro do Esgoto. Isso foi nojento. Parabéns. Duvido bater.');
  });

  it('não dobra ponto quando a frase já vem pontuada', () => {
    // "Tá maluco.. Duvido bater." é o tipo de detalhe que ninguém testa e todo
    // mundo lê.
    const { texto } = textoDoCompartilhamento({
      notaEscrita: '80,0',
      classificacao: 'Aceitável',
      frase: 'Tá maluco.',
    });

    expect(texto).toBe('Aceitável. Tá maluco. Duvido bater.');
    expect(texto).not.toContain('..');
  });

  it('fecha com ponto a frase que veio sem pontuação', () => {
    const { texto } = textoDoCompartilhamento({
      notaEscrita: '12,0',
      classificacao: 'Vergonha',
      frase: 'Isso foi um suspiro',
    });

    expect(texto).toBe('Vergonha. Isso foi um suspiro. Duvido bater.');
  });

  it('respeita exclamação e interrogação em vez de emendar ponto', () => {
    const { texto } = textoDoCompartilhamento({
      notaEscrita: '99,9',
      classificacao: 'Lenda',
      frase: 'Que porra foi essa?',
    });

    expect(texto).toBe('Lenda. Que porra foi essa? Duvido bater.');
  });

  it('aguenta classificação ou frase vazias sem deixar buraco no texto', () => {
    /*
      O motor sempre manda as duas hoje. Isto existe porque o texto vai para
      FORA do app: um espaço duplo ou um ponto solto no meio do grupo do zap é
      o tipo de coisa que ninguém consegue consertar depois de mandada.
    */
    const { texto } = textoDoCompartilhamento({
      notaEscrita: '50,0',
      classificacao: '',
      frase: 'Passou raspando.',
    });

    expect(texto).toBe('Passou raspando. Duvido bater.');
    expect(texto).not.toContain('  ');
  });

  it('a nota vai como veio escrita — com vírgula, nunca com ponto', () => {
    // Formatar é de `shared/formato/nota.ts`. Aqui só não se pode estragar.
    const { titulo } = textoDoCompartilhamento({
      notaEscrita: '7,3',
      classificacao: 'Fraco',
      frase: 'Nem tenta.',
    });

    expect(titulo).toContain('7,3');
    expect(titulo).not.toContain('7.3');
  });
});
