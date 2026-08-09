// @vitest-environment jsdom
import { cleanup, render, screen, fireEvent } from '@testing-library/react';
import { createElement } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { EscolhaDeOrigem } from './EscolhaDeOrigem';
import { OPCOES_DE_ORIGEM } from './origens';
import { TODAS_AS_ORIGENS } from '../rules';

/**
 * AS CINCO OPÇÕES MÍNIMAS DO §3.4, no nível principal.
 *
 * O contrato do MVP1 é explícito: cerveja, refrigerante, comida, puxando ar e
 * outro. Antes deste passo, cerveja e refrigerante estavam dois toques abaixo
 * (submenu "Pós bebida") e "outro" simplesmente não existia — nem na tela, nem
 * no tipo `Origin`, nem no banco.
 *
 * Este arquivo trava as três coisas que podem regredir em silêncio: a lista, o
 * PAR que cada opção envia para a RPC, e o estado desabilitado.
 */

/*
  `cleanup` explícito: o projeto não roda com `globals: true`, então o
  Testing Library NÃO registra o afterEach automático. Sem isto, o `it.each`
  abaixo empilha seis árvores no mesmo documento e `getByRole` passa a achar
  dois botões com o mesmo nome.
*/
afterEach(cleanup);

/** Rótulos exigidos pelo §3.4, e o que cada um precisa produzir no banco. */
const EXIGIDAS: Array<[rotulo: RegExp, tipo: string, subtipo: string | undefined]> = [
  [/cerveja/i, 'Bebida', 'Cerveja'],
  [/refri/i, 'Bebida', 'Refrigerante'],
  [/comida/i, 'Comida', undefined],
  [/puxando ar/i, 'Puxei ar', undefined],
  [/outro/i, 'Outro', undefined],
];

describe('EscolhaDeOrigem — §3.4 do contrato', () => {
  it.each(EXIGIDAS)('oferece %s em um toque só, e manda (%s, %s)', (rotulo, tipo, subtipo) => {
    const escolher = vi.fn();
    render(createElement(EscolhaDeOrigem, { onEscolher: escolher, desabilitado: false }));

    fireEvent.click(screen.getByRole('button', { name: rotulo }));
    fireEvent.click(screen.getByRole('button', { name: /julga essa porra/i }));

    // `undefined` no subtipo é intencional e verificado: a constraint
    // `resultados_subtipo_de_origem_coerente` (20260807000023) só aceita subtipo
    // em 'Comida' e 'Bebida'.
    expect(escolher).toHaveBeenCalledWith(tipo, subtipo);
  });

  it('toda opção da lista aponta para uma origem que existe de verdade', () => {
    // Um rótulo novo com `tipo` inventado passaria pelo TypeScript se alguém
    // usasse `as Origin`, e só quebraria no envio, em produção.
    for (const opcao of OPCOES_DE_ORIGEM) {
      expect(
        (TODAS_AS_ORIGENS as readonly string[]).includes(opcao.tipo),
        `A opção "${opcao.rotulo}" manda '${opcao.tipo}', que não é uma origem válida.`,
      ).toBe(true);
    }
  });

  it('só Comida e Bebida carregam subtipo', () => {
    for (const opcao of OPCOES_DE_ORIGEM) {
      if (opcao.subtipo === undefined) continue;
      expect(
        ['Comida', 'Bebida'],
        `"${opcao.rotulo}" manda subtipo com origem '${opcao.tipo}', e a constraint ` +
          'resultados_subtipo_de_origem_coerente rejeita a linha inteira.',
      ).toContain(opcao.tipo);
    }
  });

  it('desabilitado, nenhum toque escapa', () => {
    /*
      NÃO É ENFEITE. Tocar numa origem antes de a análise terminar cairia no
      `if (!metricas) return` do useEnvioDoResultado: o toque sumiria sem erro,
      sem tela e sem nota — que é a definição de botão que finge funcionar.
    */
    const escolher = vi.fn();
    render(createElement(EscolhaDeOrigem, { onEscolher: escolher, desabilitado: true }));

    // `jest-dom` não está instalado aqui, então nada de `toBeDisabled()`: a
    // propriedade do elemento diz a mesma coisa sem dependência nova.
    for (const botao of screen.getAllByRole('button')) {
      expect((botao as HTMLButtonElement).disabled).toBe(true);
      botao.click();
    }
    expect(escolher).not.toHaveBeenCalled();
  });
});
