import { describe, expect, it } from 'vitest';

import {
  ESCALA_MAXIMA,
  MS_ATAQUE,
  MS_VOLTA,
  escalaDaBolha,
  msDaTransicao,
  nivelDaGravacao,
} from './bolhaQueOuve';

/**
 * As faixas são o CONTRATO da #56, não sugestão. Este arquivo existe para que
 * mexer no visual da bolha não desloque a resposta ao áudio sem alguém notar.
 */

describe('nivelDaGravacao', () => {
  it('usa o PICO, não a média — um arroto concentra energia em poucas faixas', () => {
    // Média seria 0,1. Se este teste passar a esperar 0,1, a bolha parou de
    // reagir a arroto de verdade.
    const umaFaixaEstourando = [0, 0, 0, 0, 100, 0, 0, 0, 0, 0];
    expect(nivelDaGravacao(umaFaixaEstourando)).toBe(1);
  });

  it('silêncio é zero, e sem barras também', () => {
    expect(nivelDaGravacao([0, 0, 0, 0, 0, 0, 0, 0, 0, 0])).toBe(0);
    expect(nivelDaGravacao([])).toBe(0);
  });

  it('não deixa número estranho escapar para dentro de um transform', () => {
    expect(nivelDaGravacao([150, 20])).toBe(1);
    expect(nivelDaGravacao([-30])).toBe(0);
    expect(nivelDaGravacao([Number.NaN])).toBe(0);
  });
});

describe('escalaDaBolha — as faixas da #56', () => {
  it('silêncio fica entre 1.00 e 1.02, e NÃO trava em 1.000', () => {
    const escala = escalaDaBolha([0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
    expect(escala).toBeGreaterThan(1);
    expect(escala).toBeLessThanOrEqual(1.02);
  });

  it('arroto forte chega ao teto de 1.15 e não passa', () => {
    expect(escalaDaBolha([100, 100, 100])).toBe(ESCALA_MAXIMA);
    expect(escalaDaBolha([999])).toBeLessThanOrEqual(ESCALA_MAXIMA);
  });

  it('a curva levanta o meio — arroto comum não fica espremido perto do silêncio', () => {
    /*
      A prova de que o mapeamento NÃO é linear. Com uma reta, metade do nível
      daria metade do caminho (~1.078). A curva tem que entregar mais do que
      isso, senão só arroto monstruoso mexe a bolha e a tela parece morta para
      todo mundo.
    */
    const meio = escalaDaBolha([50]);
    const metadeDoCaminhoNumaReta = 1.005 + (ESCALA_MAXIMA - 1.005) * 0.5;
    expect(meio).toBeGreaterThan(metadeDoCaminhoNumaReta);
    expect(meio).toBeLessThan(ESCALA_MAXIMA);
  });

  it('é monotônica: mais som nunca encolhe a bolha', () => {
    const escalas = [0, 10, 25, 40, 60, 80, 100].map((n) => escalaDaBolha([n]));
    for (let i = 1; i < escalas.length; i++) {
      expect(escalas[i]).toBeGreaterThanOrEqual(escalas[i - 1]);
    }
  });
});

describe('msDaTransicao — sobe rápido, volta devagar', () => {
  it('subir usa o ataque', () => {
    expect(msDaTransicao(1.12, 1.02)).toBe(MS_ATAQUE);
  });

  it('descer usa a volta', () => {
    expect(msDaTransicao(1.02, 1.12)).toBe(MS_VOLTA);
  });

  it('parado conta como ataque — não introduz lentidão em nível estável', () => {
    expect(msDaTransicao(1.05, 1.05)).toBe(MS_ATAQUE);
  });

  it('a volta é mais lenta que o ataque — é o que evita o tremor', () => {
    // Se alguém igualar os dois, a bolha passa a "tremer igual caixa de som
    // vagabunda", que é o texto da issue.
    expect(MS_VOLTA).toBeGreaterThan(MS_ATAQUE);
  });
});
