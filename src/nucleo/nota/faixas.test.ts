import { describe, expect, it } from 'vitest';

import { FAIXAS, faixaDaNota, falaDaNota, rotuloDaFaixa } from './faixas';

/**
 * A fala da nota tem três promessas, e é isto que está travado aqui:
 *
 * 1. **nenhuma nota fica muda** — as faixas cobrem a reta inteira;
 * 2. **mesmo arroto, mesma fala** — a derivação é estável por semente, senão a
 *    tela, a imagem fotografada e o X1 do amigo se contradizem;
 * 3. **as 42 são alcançáveis** — fala escrita e nunca sorteada é copy morta.
 */

const TODAS_AS_FALAS = FAIXAS.flatMap((faixa) => faixa.baralho);

/** Uma nota qualquer dentro de cada faixa, na ordem das faixas. */
const NOTA_DENTRO_DA_FAIXA = [10, 30, 50, 70, 80, 90, 97, 100];

describe('as faixas cobrem a reta inteira', () => {
  it('toda nota de 0 a 100 tem reação e frase, de décimo em décimo', () => {
    for (let n = 0; n <= 1000; n++) {
      const nota = n / 10;
      const fala = falaDaNota(nota, `semente-${n}`);
      expect(fala.reacao, `nota ${nota} sem reação`).toBeTruthy();
      expect(fala.fraseDoJuiz, `nota ${nota} sem frase`).toBeTruthy();
    }
  });

  it('nota fora do intervalo não quebra — cai na ponta mais próxima', () => {
    // A fórmula não produz nenhuma das duas, mas o tipo permite e uma exceção
    // aqui derrubaria a tela de resultado inteira.
    expect(rotuloDaFaixa(-5)).toBe('Foi isso?');
    expect(rotuloDaFaixa(120)).toBe('Tá roubado. Não é possível.');
  });

  it('os cortes são os mesmos de sempre', () => {
    expect(FAIXAS.map((f) => f.limite)).toEqual([
      20,
      40,
      60,
      75,
      85,
      95,
      100,
      Number.POSITIVE_INFINITY,
    ]);

    // A borda pertence à faixa de cima: 20 já não é mais "Foi isso?".
    expect(rotuloDaFaixa(19.99)).toBe('Foi isso?');
    expect(rotuloDaFaixa(20)).toBe('Tá fraco, hein.');
    expect(rotuloDaFaixa(99.99)).toBe('Esse bagulho tá apelão.');
    expect(rotuloDaFaixa(100)).toBe('Tá roubado. Não é possível.');
  });
});

describe('os oito rótulos são a tabela do VOZ.md §4', () => {
  it('o rótulo é sempre a primeira fala da faixa', () => {
    for (const nota of NOTA_DENTRO_DA_FAIXA) {
      expect(rotuloDaFaixa(nota)).toBe(faixaDaNota(nota).baralho[0].reacao);
    }
  });

  it('nenhum nome de criatura sobreviveu', () => {
    const velhos = [
      'Arroto de Hamster',
      'Tentativa Honesta',
      'Arroto Respeitável',
      'Pedreiro Certificado',
      'Trovão Gastrointestinal',
      'Monstro do Esgoto',
      'Arma Biológica',
      'O ARROTO',
    ];

    for (const fala of TODAS_AS_FALAS) {
      expect(velhos).not.toContain(fala.reacao);
    }
  });
});

describe('a derivação é estável', () => {
  it('mesma nota e mesma semente devolvem sempre o mesmo par', () => {
    const primeira = falaDaNota(91.4, 'a1b2c3d4-e5f6-4789-abcd-0123456789ab');

    for (let i = 0; i < 200; i++) {
      expect(falaDaNota(91.4, 'a1b2c3d4-e5f6-4789-abcd-0123456789ab')).toEqual(primeira);
    }
  });

  it('a reação e a frase vêm sempre do mesmo par, nunca cruzadas', () => {
    for (let i = 0; i < 500; i++) {
      const nota = (i % 101) + Number((i % 10) / 10);
      const fala = falaDaNota(nota, `id-${i}`);
      expect(faixaDaNota(nota).baralho).toContainEqual(fala);
    }
  });

  it('semente vazia devolve o rótulo, e não um sorteio de reserva', () => {
    for (const nota of NOTA_DENTRO_DA_FAIXA) {
      expect(falaDaNota(nota, '').reacao).toBe(rotuloDaFaixa(nota));
    }
  });

  it('id parecido não devolve sempre a mesma fala', () => {
    // UUID consecutivo compartilha prefixo. Sem espalhar a semente, uma sessão
    // inteira cairia na mesma fala e a variedade seria decoração.
    const falas = new Set(
      Array.from({ length: 50 }, (_, i) =>
        falaDaNota(70, `a1b2c3d4-e5f6-4789-abcd-01234567${String(i).padStart(4, '0')}`).reacao,
      ),
    );

    expect(falas.size).toBeGreaterThan(1);
  });
});

describe('as 42 falas', () => {
  it('são 42, e nenhuma repetida', () => {
    expect(TODAS_AS_FALAS).toHaveLength(42);
    expect(new Set(TODAS_AS_FALAS.map((f) => f.reacao)).size).toBe(42);
    expect(new Set(TODAS_AS_FALAS.map((f) => f.fraseDoJuiz)).size).toBe(42);
  });

  it('o tamanho de cada baralho é o combinado: 3+4+6+8+8+6+4+3', () => {
    expect(FAIXAS.map((f) => f.baralho.length)).toEqual([3, 4, 6, 8, 8, 6, 4, 3]);
  });

  it('todas são alcançáveis por alguma semente', () => {
    for (const [i, faixa] of FAIXAS.entries()) {
      const nota = NOTA_DENTRO_DA_FAIXA[i];
      const alcancadas = new Set<string>();

      for (let s = 0; s < 5000 && alcancadas.size < faixa.baralho.length; s++) {
        alcancadas.add(falaDaNota(nota, `semente-${s}`).reacao);
      }

      expect(alcancadas.size, `faixa < ${faixa.limite} não alcança o baralho todo`).toBe(
        faixa.baralho.length,
      );
    }
  });

  it('nenhuma fala tem emoji nem promete medição', () => {
    for (const { reacao, fraseDoJuiz } of TODAS_AS_FALAS) {
      const texto = `${reacao} ${fraseDoJuiz}`;
      expect(texto).not.toMatch(/\p{Extended_Pictographic}/u);
      expect(texto.toLowerCase()).not.toMatch(/decib|hertz|db\b|medi(u|ção)/);
    }
  });
});
