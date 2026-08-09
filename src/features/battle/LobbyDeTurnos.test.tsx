import { describe, expect, it } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import { LobbyDeTurnos, type ParticipanteEmTurno } from './LobbyDeTurnos';

/**
 * A TELA QUE DIZ DE QUEM É A VEZ.
 *
 * Num jogo em que o telefone passa de mão em mão, esta lista é a única coisa
 * que impede duas pessoas arrotarem no mesmo turno ou ninguém arrotar. Ela
 * estava sem teste nenhum.
 *
 * Componente puro: `renderToStaticMarkup`, sem DOM e sem rede, como no resto
 * da suíte.
 */

const MESA: ParticipanteEmTurno[] = [
  { id: 'a', nome: 'Carol', status: 'jogou', score: 98.1 },
  { id: 'b', nome: 'Bruno', status: 'vez' },
  { id: 'c', nome: 'Rafa', status: 'esperando' },
];

function montar(participantes: ParticipanteEmTurno[], rotuloDoRound?: string): string {
  return renderToStaticMarkup(createElement(LobbyDeTurnos, { participantes, rotuloDoRound }));
}

describe('de quem é a vez', () => {
  it('põe o nome de quem está na vez no título', () => {
    expect(montar(MESA)).toContain('Vez de Bruno');
  });

  it('mostra os três estados, cada um com seu texto', () => {
    const html = montar(MESA);
    expect(html).toContain('Já jogou');
    expect(html).toContain('Na vez');
    expect(html).toContain('Aguardando');
  });

  it('sem ninguém na vez, diz que todo mundo jogou', () => {
    const html = montar(MESA.map((p) => ({ ...p, status: 'jogou' as const })));
    expect(html).toContain('Todo mundo jogou');
    expect(html).not.toContain('Vez de');
  });

  it('o rótulo do round aparece quando existe', () => {
    expect(montar(MESA, 'Round 2 de 3')).toContain('Round 2 de 3');
    // Sem rótulo, o lugar dele não fica vazio.
    expect(montar(MESA)).toContain('É a vez de');
  });
});

describe('as notas na lista', () => {
  it('escreve a nota em português', () => {
    expect(montar(MESA)).toContain('98,1');
  });

  it('MOSTRA a nota de quem tirou zero', () => {
    /*
      O original usava `{p.score && ...}`, que esconde 0. Zero é uma nota
      possível e engraçada neste jogo — sumir com ela faria parecer que a
      gravação falhou, e o dono do arroto ia querer gravar de novo à toa.
    */
    const html = montar([{ id: 'a', nome: 'Carol', status: 'jogou', score: 0 }]);
    expect(html).toContain('0,0');
  });

  it('quem ainda não gravou não recebe nota inventada', () => {
    const html = montar([{ id: 'c', nome: 'Rafa', status: 'esperando' }]);
    expect(html).not.toContain('0,0');
    expect(html).not.toContain('—');
  });
});
