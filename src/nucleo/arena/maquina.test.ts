import { describe, expect, it } from 'vitest';

import { ESTADOS, type SituacaoDaArena } from './estados';
import { SAIDAS, SITUACAO_INICIAL, transicao } from './maquina';

/**
 * A máquina, testada sem renderizar nada.
 *
 * É este arquivo que prova o argumento do ADR: a regra do jogo roda em Node,
 * sem DOM, sem React e sem navegador. Se um dia precisar de `jsdom` para
 * passar, alguma coisa vazou para dentro do núcleo.
 */
describe('a máquina da Arena', () => {
  it('começa no IDLE', () => {
    expect(SITUACAO_INICIAL).toEqual({ estado: 'IDLE' });
  });

  it('tocar em ARROTAR não mexe a Arena', () => {
    // ARENA.md, IDLE: enquanto a caixinha de permissão está aberta, a Bolha
    // segue respirando e a chamada continua no lugar.
    const depois = transicao({ estado: 'IDLE' }, { tipo: 'TOCOU_ARROTAR' });
    expect(depois).toEqual({ estado: 'IDLE' });
  });

  it('microfone liberado leva a RECORDING', () => {
    expect(transicao({ estado: 'IDLE' }, { tipo: 'MICROFONE_LIBERADO' })).toEqual({
      estado: 'RECORDING',
    });
  });

  it('microfone negado leva a ERROR dizendo qual é o caso', () => {
    expect(transicao({ estado: 'IDLE' }, { tipo: 'MICROFONE_NEGADO' })).toEqual({
      estado: 'ERROR',
      caso: 'microfoneNegado',
    });
  });

  it('todo ERROR tem saída', () => {
    // Regra do ARENA.md: o estado honesto SEMPRE oferece um caminho de volta.
    const erro: SituacaoDaArena = { estado: 'ERROR', caso: 'microfoneNegado' };
    expect(transicao(erro, { tipo: 'TENTAR_DE_NOVO' })).toEqual({ estado: 'IDLE' });
    expect(SAIDAS.ERROR.length).toBeGreaterThan(0);
  });

  it('evento que não faz sentido devolve null, e a Arena não se mexe', () => {
    // O caso real: toque duplo, ou uma promessa de permissão que voltou depois
    // de a pessoa já ter saído do IDLE. Empurrar a partida por causa disso é
    // como deixar o jogo andar sozinho.
    expect(transicao({ estado: 'RECORDING' }, { tipo: 'TOCOU_ARROTAR' })).toBeNull();
    expect(transicao({ estado: 'IDLE' }, { tipo: 'TENTAR_DE_NOVO' })).toBeNull();
  });

  it('o que está ligado é subconjunto do grafo declarado', () => {
    // Nenhuma fatia pode inventar destino que o SAIDAS não autorize. O teste
    // varre todos os eventos contra todos os estados.
    const eventos = [
      { tipo: 'TOCOU_ARROTAR' },
      { tipo: 'MICROFONE_LIBERADO' },
      { tipo: 'MICROFONE_NEGADO' },
      { tipo: 'TENTAR_DE_NOVO' },
    ] as const;

    for (const estado of ESTADOS) {
      const partida: SituacaoDaArena =
        estado === 'ERROR' ? { estado, caso: 'microfoneNegado' } : { estado };

      for (const evento of eventos) {
        const destino = transicao(partida, evento);
        if (!destino || destino.estado === estado) continue;
        expect(
          SAIDAS[estado],
          `${estado} → ${destino.estado} não está declarado em SAIDAS`,
        ).toContain(destino.estado);
      }
    }
  });

  it('todo destino declarado é um estado que existe', () => {
    for (const estado of ESTADOS) {
      for (const destino of SAIDAS[estado]) {
        expect(ESTADOS).toContain(destino);
      }
    }
  });
});
