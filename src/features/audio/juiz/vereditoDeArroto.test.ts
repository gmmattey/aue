import { describe, expect, it } from 'vitest';

import {
  LIMIAR_DE_ARROTO,
  MAIOR_FALSO_POSITIVO_MEDIDO,
  MENOR_ARROTO_MEDIDO,
  pontuacaoLiberada,
  vereditoDeArroto,
} from './vereditoDeArroto';

describe('o limiar', () => {
  /**
   * O TESTE QUE OBRIGA MEDIÇÃO.
   *
   * O GATE da #19 diz que mexer nos limites sem rótulo humano "é chute com cara
   * de número". Este teste é o que impede o limiar do juiz de virar isso: ele
   * trava a constante DENTRO do vão que a medição de 2026-08-09 encontrou
   * (43 clipes reais do banco de arroto + os 2 clipes de demonstração
   * publicados pelo Google).
   *
   * Quem quiser mudar o limiar para fora desse intervalo vai ter que mudar
   * também os dois números medidos — e mudar número de medição sem medição nova
   * é uma coisa que dá para ver na revisão de PR, ao contrário de um `0.2`
   * virando `0.6` sozinho.
   */
  it('fica dentro do vão medido entre fala e arroto', () => {
    expect(MAIOR_FALSO_POSITIVO_MEDIDO).toBeLessThan(MENOR_ARROTO_MEDIDO);
    expect(LIMIAR_DE_ARROTO).toBeGreaterThan(MAIOR_FALSO_POSITIVO_MEDIDO);
    expect(LIMIAR_DE_ARROTO).toBeLessThan(MENOR_ARROTO_MEDIDO);
  });

  it('erra para o lado permissivo, como o GATE mandou', () => {
    /*
      "Recusar o arroto de quem arrotou de verdade é pior do que dar nota para
      uma conversa." Em número: a folga até o arroto mais fraco tem que ser
      MAIOR que a folga até o falso positivo mais forte — ou seja, o limiar mora
      na metade de baixo do vão.
    */
    const meioDoVao = (MAIOR_FALSO_POSITIVO_MEDIDO + MENOR_ARROTO_MEDIDO) / 2;
    expect(LIMIAR_DE_ARROTO).toBeLessThan(meioDoVao);
  });
});

describe('vereditoDeArroto', () => {
  it('libera quando um quadro passa do limiar', () => {
    expect(vereditoDeArroto([0.01, 0.98, 0.02])).toEqual({
      status: 'arroto',
      confianca: 0.98,
      limiar: LIMIAR_DE_ARROTO,
    });
  });

  it('recusa a conversa que o lote inteiro produziu de pior', () => {
    // O maior score de arroto entre os três clipes de fala medidos.
    const veredito = vereditoDeArroto([0.0001, MAIOR_FALSO_POSITIVO_MEDIDO, 0.003]);
    expect(veredito.status).toBe('nao-e-arroto');
  });

  it('aceita o arroto mais fraco do lote', () => {
    expect(vereditoDeArroto([0.001, MENOR_ARROTO_MEDIDO]).status).toBe('arroto');
  });

  it('usa o MÁXIMO, não a média — dez segundos não afundam um arroto de um', () => {
    /*
      O caso é real e está no lote: um clipe de 11,6 s com o arroto cravando 1,0
      num quadro tem MÉDIA 0,29. Com média e este limiar ele passaria raspando; e
      com o dobro de silêncio no fim, não passaria mais. Isso mediria a paciência
      de quem demora para tocar em PARAR.
    */
    const umArrotoEmVinteQuadrosDeSilencio = [1, ...Array<number>(19).fill(0)];
    const media = umArrotoEmVinteQuadrosDeSilencio.reduce((a, b) => a + b, 0) / 20;

    expect(media).toBeLessThan(LIMIAR_DE_ARROTO);
    expect(vereditoDeArroto(umArrotoEmVinteQuadrosDeSilencio).status).toBe('arroto');
  });

  it('exatamente no limiar, passa', () => {
    // A borda pertence a quem arrotou — de novo, a assimetria do GATE.
    expect(vereditoDeArroto([LIMIAR_DE_ARROTO]).status).toBe('arroto');
  });

  it('sem quadro nenhum, não inventa veredito', () => {
    expect(vereditoDeArroto([]).status).toBe('indisponivel');
  });

  it('NaN vira "indisponível", e não uma recusa silenciosa', () => {
    /*
      Este é o defeito que o teste existe para impedir: `NaN >= 0.2` é falso, e
      sem a checagem uma inferência corrompida RECUSARIA a gravação de quem
      arrotou — com cara de veredito, sem nenhum sinal de que deu errado.
    */
    expect(vereditoDeArroto([0.9, Number.NaN]).status).toBe('indisponivel');
    expect(vereditoDeArroto([Number.POSITIVE_INFINITY]).status).toBe('indisponivel');
  });
});

describe('pontuacaoLiberada — o jogo não para porque o juiz parou', () => {
  it('só a recusa fecha a porta', () => {
    expect(pontuacaoLiberada(vereditoDeArroto([0.9]))).toBe(true);
    expect(pontuacaoLiberada(vereditoDeArroto([0.001]))).toBe(false);
  });

  it('modelo indisponível LIBERA — falha do produto não pode punir o usuário', () => {
    expect(pontuacaoLiberada({ status: 'indisponivel', motivo: 'não baixou' })).toBe(true);
    expect(pontuacaoLiberada(vereditoDeArroto([]))).toBe(true);
    expect(pontuacaoLiberada(vereditoDeArroto([Number.NaN]))).toBe(true);
  });
});
