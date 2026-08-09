// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { createElement } from 'react';

import { BottomNav } from './BottomNav';

/**
 * A barra tem que ficar no RODAPÉ.
 *
 * jsdom não calcula flexbox, então isto não é teste de layout: é trava de
 * regressão sobre a única propriedade que prende a barra embaixo quando não há
 * conteúdo suficiente para empurrá-la. Ela sumiu uma vez — a Home perdeu o
 * feed no corte do MVP, ficou só com o hero (`flex-shrink: 0`), e a barra
 * passou a boiar no meio da tela num celular de verdade.
 *
 * `position: sticky` NÃO cobre esse caso: sticky age quando algo rola, e ali
 * não havia rolagem, havia espaço vazio. Por isso os dois são verificados.
 */

afterEach(cleanup);

describe('a barra fica presa no rodapé', () => {
  it('come o espaço sobrando com margin-top auto', () => {
    render(createElement(BottomNav, { activeTab: 'inicio', onTabChange: () => {} }));
    const nav = screen.getByRole('navigation');
    expect(nav.style.marginTop).toBe('auto');
  });

  it('continua sticky, que é o que a segura quando a tela rola', () => {
    render(createElement(BottomNav, { activeTab: 'inicio', onTabChange: () => {} }));
    const nav = screen.getByRole('navigation');
    expect(nav.style.position).toBe('sticky');
    expect(nav.style.bottom).toBe('0px');
  });

  it('não encolhe quando o conteúdo aperta', () => {
    render(createElement(BottomNav, { activeTab: 'inicio', onTabChange: () => {} }));
    expect(screen.getByRole('navigation').style.flexShrink).toBe('0');
  });
});
