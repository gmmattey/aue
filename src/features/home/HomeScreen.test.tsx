import { describe, expect, it, vi } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

/**
 * O CONVITE PARA A DISPUTA PRESENCIAL, na tela onde as pessoas chegam.
 *
 * Sem ele, o segundo modo do produto existia apenas como o quarto ícone da
 * barra de baixo: um desenho de duas pessoas, sem uma palavra de contexto.
 * Quem abre o app num churrasco nunca descobriria por ali que dá para jogar
 * com a mesa inteira no mesmo aparelho.
 *
 * As três regras travadas aqui:
 *   1. com a flag desligada, o convite NÃO existe (é o corte de lançamento);
 *   2. sem o handler de navegação, o convite NÃO existe — botão que não leva a
 *      lugar nenhum é o "finge que funciona" que o contrato barra;
 *   3. a bolha continua sendo a ação principal em qualquer caso.
 */

/*
  `vi.hoisted` porque `vi.mock` sobe para o topo do arquivo: um `const` comum
  aqui ainda não existiria quando a fábrica roda. O objeto é mutado entre os
  testes de propósito — a Home lê `FLAGS.disputaLocal` no render.
*/
const { FLAGS } = vi.hoisted(() => ({ FLAGS: { feed: false, disputaLocal: false } }));

vi.mock('../../shared/flags', () => ({ FLAGS }));

import { HomeScreen } from './HomeScreen';

function montar(props: { onDisputar?: () => void } = {}): string {
  return renderToStaticMarkup(
    createElement(HomeScreen, { onGravar: () => {}, ...props }),
  );
}

describe('convite para a disputa presencial', () => {
  it('com a flag desligada, não aparece', () => {
    FLAGS.disputaLocal = false;
    expect(montar({ onDisputar: () => {} })).not.toContain('Tem gente do lado?');
  });

  it('com a flag ligada e sem para onde ir, também não aparece', () => {
    // O `App` é quem sabe trocar de aba. Sem o handler, o botão seria um
    // enfeite que não navega.
    FLAGS.disputaLocal = true;
    expect(montar()).not.toContain('Tem gente do lado?');
    FLAGS.disputaLocal = false;
  });

  it('com flag e handler, aparece e explica o que é', () => {
    FLAGS.disputaLocal = true;
    const html = montar({ onDisputar: () => {} });
    expect(html).toContain('Tem gente do lado?');
    expect(html).toContain('um aparelho, todo mundo em volta');
    FLAGS.disputaLocal = false;
  });
});

describe('a ação principal não muda', () => {
  it('a bolha continua na tela com ou sem o convite', () => {
    expect(montar()).toContain('ARROTAR');

    FLAGS.disputaLocal = true;
    expect(montar({ onDisputar: () => {} })).toContain('ARROTAR');
    FLAGS.disputaLocal = false;
  });
});

/**
 * "Resto quieto" — o requisito da #54 que é fácil de perder na próxima ideia boa.
 *
 * A tela de entrada acumula bem: hoje é uma dica, amanhã um card explicando o
 * produto, depois um contador de arrotos da semana. Cada um desses parece
 * inofensivo sozinho e todos juntos devolvem a Home ao estado que a issue
 * chama de "já cagou": o cara abre e fica procurando o que fazer.
 */
describe('#54 — entrada: marca pequena, bolha mandando, resto quieto', () => {
  it('o texto é "Manda." e a instrução é o CTA — nada de historinha', () => {
    const html = montar();
    expect(html).toContain('Manda.');
    expect(html).toContain('ARROTAR');
    // A dica que existia antes, e o convite que ela era.
    expect(html).not.toContain('Toca na bolha');
    expect(html).not.toContain('É rápido, é bobo');
  });

  it('a tela de entrada não pede nada nem explica nada', () => {
    const html = montar();
    // Nenhum formulário (o §3.1 do contrato) e nenhum parágrafo de venda.
    expect(html).not.toContain('<input');
    expect(html).not.toContain('<form');
    expect(html).not.toMatch(/bem-vindo/i);
  });
});
