import { describe, expect, it } from 'vitest';

import {
  PROVOCACOES_PRONTAS,
  provocacoesDaImagem,
  proximaProvocacao,
  textoDoCompartilhamento,
} from './compartilhamento';

/*
  A montagem do texto que sai no zap.

  Testado aqui, no núcleo, e não pela Arena: é regra pura, e o teste da Arena
  prova que ela CHAMA isto com o que está na tela — outra pergunta.
*/
describe('o texto que viaja', () => {
  it('põe nota no título e classificação, frase e provocação no corpo', () => {
    const { titulo, texto } = textoDoCompartilhamento({
      notaEscrita: '91,4',
      classificacao: 'Tá maluco.',
      frase: 'Isso foi nojento. Parabéns.',
    });

    expect(titulo).toBe('Fiz 91,4 no Auê');
    expect(texto).toBe('Tá maluco. Isso foi nojento. Parabéns. Duvido bater.');
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

describe('a lista de provocações da imagem', () => {
  it('começa pela reação que está na tela', () => {
    // A imagem já nasce dizendo o que a pessoa acabou de ler. Trocar é opção,
    // não obrigação.
    const lista = provocacoesDaImagem('Caralho, veio forte.');
    expect(lista[0]).toBe('Caralho, veio forte.');
  });

  it('leva as quatro prontas depois dela', () => {
    const lista = provocacoesDaImagem('Tá maluco.');
    expect(lista.slice(1)).toEqual([...PROVOCACOES_PRONTAS]);
    expect(lista).toHaveLength(5);
  });

  it('sem frase do juiz, sobram só as prontas', () => {
    expect(provocacoesDaImagem('  ')).toEqual(PROVOCACOES_PRONTAS);
  });

  it('roda em círculo e volta pra reação do juiz', () => {
    const lista = provocacoesDaImagem('Tá maluco.');
    let i = 0;
    const passeio = [lista[i]];
    for (let passo = 0; passo < lista.length; passo++) {
      i = proximaProvocacao(i, lista.length);
      passeio.push(lista[i]);
    }
    // Cinco toques a partir do começo devolvem ao começo.
    expect(passeio[passeio.length - 1]).toBe(lista[0]);
    expect(new Set(passeio).size).toBe(lista.length);
  });

  it('lista vazia não trava o botão num índice inválido', () => {
    expect(proximaProvocacao(3, 0)).toBe(0);
  });

  it('nenhuma promete batalha — quem recebe imagem não tem X1 esperando', () => {
    for (const frase of PROVOCACOES_PRONTAS) {
      expect(frase.toLowerCase()).not.toMatch(/revanche|x1|desafi|placar/);
      expect(frase.length).toBeLessThanOrEqual(20);
    }
  });
});

describe('a provocação escolhida no texto', () => {
  it('entra no lugar da fixa', () => {
    const { texto } = textoDoCompartilhamento({
      notaEscrita: '91,4',
      classificacao: 'Tá maluco.',
      frase: 'Isso foi nojento.',
      provocacao: 'Peita essa.',
    });
    expect(texto).toBe('Tá maluco. Isso foi nojento. Peita essa.');
  });

  it('não repete a frase do juiz quando ela é a própria provocação', () => {
    /*
      É o caso PADRÃO: item 0 da lista é a reação que está na tela. Sem a
      guarda, o zap recebia "Isso foi nojento. Isso foi nojento." — e depois de
      mandado não tem conserto.
    */
    const { texto } = textoDoCompartilhamento({
      notaEscrita: '91,4',
      classificacao: 'Tá maluco.',
      frase: 'Isso foi nojento.',
      provocacao: 'Isso foi nojento.',
    });
    expect(texto).toBe('Tá maluco. Isso foi nojento.');
  });
});
