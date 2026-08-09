/**
 * OS SEIS ALVOS CONTRA AS CINCO ORIGENS DA FÓRMULA.
 *
 * A regra crítica está duplicada de propósito — a Arena tem o mapa, a fórmula
 * tem os pesos — e regra duplicada precisa de teste de paridade (AGENTS §6).
 *
 * O que quebra sem isto: alguém acrescenta um alvo com um `tipo` que a fórmula
 * não conhece. A conta cai no `undefined`, a nota sai errada, e nada acusa até
 * alguém arrotar escolhendo justo aquele botão.
 */
import { describe, expect, it } from 'vitest';

import { TODAS_AS_ORIGENS } from '../../features/audio/rules';
import { ALVOS_DE_ORIGEM, origensAlcancaveis } from './origens';

describe('os alvos de origem', () => {
  it('todo alvo aponta para uma origem que a fórmula conhece', () => {
    for (const alvo of ALVOS_DE_ORIGEM) {
      expect(TODAS_AS_ORIGENS, `o alvo "${alvo.rotulo}"`).toContain(alvo.tipo);
    }
  });

  it('todas as cinco origens da fórmula têm pelo menos um alvo', () => {
    // Origem sem botão é peso morto na fórmula: ninguém consegue escolher.
    const alcancaveis = origensAlcancaveis();
    for (const origem of TODAS_AS_ORIGENS) {
      expect(alcancaveis, `a origem "${origem}"`).toContain(origem);
    }
  });

  it('são seis alvos para cinco origens, e isso é de propósito', () => {
    // Cerveja e Refri são a mesma coisa para a conta e coisas diferentes para
    // quem arrotou. Quem "arrumar" isto para cinco botões tira uma escolha do
    // jogo para agradar uma tabela.
    expect(ALVOS_DE_ORIGEM).toHaveLength(6);
    expect(origensAlcancaveis()).toHaveLength(5);

    const bebida = ALVOS_DE_ORIGEM.filter((alvo) => alvo.tipo === 'Bebida');
    expect(bebida.map((alvo) => alvo.id).sort()).toEqual(['cerveja', 'refrigerante']);
  });

  it('nenhum alvo repete id nem rótulo', () => {
    expect(new Set(ALVOS_DE_ORIGEM.map((a) => a.id)).size).toBe(ALVOS_DE_ORIGEM.length);
    expect(new Set(ALVOS_DE_ORIGEM.map((a) => a.rotulo)).size).toBe(ALVOS_DE_ORIGEM.length);
  });
});
