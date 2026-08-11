import { describe, expect, it } from 'vitest';

import {
  AVISO_A_PARTIR_DE_MS,
  RMS_MINIMO_AUDIVEL,
  TETO_DE_GRAVACAO_MS,
  estaAcabando,
  estourouOTeto,
  formatarCronometro,
  houveSom,
} from './regras';

describe('o piso de silêncio', () => {
  it('é o mesmo 0,005 que veio do iPhone', () => {
    /*
      O CASO REAL (2026-08-08): uma gravação SEM SOM NENHUM recebeu 54,2 e
      "Dá pro gasto." porque três das cinco parcelas da nota não dependem
      de haver som. Este número é o que separa silêncio de arroto, e ele está
      travado aqui para ninguém "ajustar" sem saber o que está mexendo.

      A aritmética do caso original continua travada em
      `features/audio/silencio.test.ts`.
    */
    expect(RMS_MINIMO_AUDIVEL).toBe(0.005);
  });

  it('silêncio de sala não passa', () => {
    expect(houveSom({ rms: 0.001, pico: 0.004 })).toBe(false);
  });

  it('arroto perto do microfone passa com folga', () => {
    // Um arroto de verdade dá entre 0,05 e 0,3 de RMS — dez a sessenta vezes
    // o piso.
    expect(houveSom({ rms: 0.12, pico: 0.4 })).toBe(true);
  });

  it('arroto curto no fim de uma gravação longa não é chamado de mudo', () => {
    // A média afunda quando a pessoa segura o botão e só arrota no fim. O pico
    // é a segunda chance, e existe para não acusar de mímica quem arrotou.
    expect(houveSom({ rms: 0.002, pico: 0.25 })).toBe(true);
  });

  it('exatamente no piso já conta como som', () => {
    expect(houveSom({ rms: RMS_MINIMO_AUDIVEL, pico: 0 })).toBe(true);
  });
});

describe('o teto de tempo', () => {
  it('são dez segundos, iguais aos do fluxo de hoje', () => {
    expect(TETO_DE_GRAVACAO_MS).toBe(10_000);
  });

  it('o aviso vem antes do teto, com folga para fechar o arroto', () => {
    expect(AVISO_A_PARTIR_DE_MS).toBeLessThan(TETO_DE_GRAVACAO_MS);
    expect(TETO_DE_GRAVACAO_MS - AVISO_A_PARTIR_DE_MS).toBeGreaterThanOrEqual(1500);
  });

  it('avisa a partir do momento certo, e não antes', () => {
    expect(estaAcabando(AVISO_A_PARTIR_DE_MS - 1)).toBe(false);
    expect(estaAcabando(AVISO_A_PARTIR_DE_MS)).toBe(true);
  });

  it('estoura no teto, e não um décimo depois', () => {
    expect(estourouOTeto(TETO_DE_GRAVACAO_MS - 1)).toBe(false);
    expect(estourouOTeto(TETO_DE_GRAVACAO_MS)).toBe(true);
  });
});

describe('o cronômetro', () => {
  it('mostra décimos, com vírgula', () => {
    expect(formatarCronometro(0)).toBe('0,0s');
    expect(formatarCronometro(1500)).toBe('1,5s');
    expect(formatarCronometro(3990)).toBe('3,9s');
  });

  it('nunca passa do teto na tela', () => {
    // Mostrar 10,4s num teto de 10 segundos seria o jogo se contradizendo na
    // cara de quem está olhando.
    expect(formatarCronometro(10_400)).toBe('10,0s');
  });

  it('não mostra tempo negativo se o relógio pular para trás', () => {
    expect(formatarCronometro(-500)).toBe('0,0s');
  });
});
