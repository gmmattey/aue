import { describe, expect, it } from 'vitest';

import { mensagemDeFalhaNoTurno } from './mensagemDeFalhaNoTurno';

/**
 * A MENSAGEM QUE MENTIA.
 *
 * Havia uma frase única para toda falha de turno: "A nota saiu, mas não entrou
 * na disputa. Tenta gravar de novo." Ela é certa para rede caindo e ERRADA para
 * o caso mais provável de um churrasco — dois toques no botão, que batem no
 * índice único `rodadas_uma_por_participante_por_round`. Ali a nota ENTROU, e o
 * app mandava repetir algo que vai falhar de novo pelo mesmo motivo.
 *
 * Cada teste aqui é um SQLSTATE que as migrações 30 e 31 levantam de verdade.
 */

/** O formato de `PostgrestError` no que interessa: o código. */
function erroDoBanco(code: string) {
  return { code, message: 'texto do postgres', details: null, hint: null };
}

describe('nota que já tinha entrado (23505)', () => {
  it('não manda gravar de novo', () => {
    // A frase antiga mandava repetir o arroto. Repetir bate no MESMO índice
    // único e falha de novo, com a mesa parada esperando.
    const falha = mensagemDeFalhaNoTurno(erroDoBanco('23505'));
    expect(falha.mensagem).not.toContain('Tenta gravar de novo');
    expect(falha.mensagem).toContain('já tinha entrado');
  });

  it('pede releitura, que é o que faz o turno andar', () => {
    expect(mensagemDeFalhaNoTurno(erroDoBanco('23505')).resincronizar).toBe(true);
  });
});

describe('round já fechado (54000)', () => {
  it('diz que fechou e ressincroniza em vez de insistir', () => {
    const falha = mensagemDeFalhaNoTurno(erroDoBanco('54000'));
    expect(falha.mensagem).toContain('fechou');
    expect(falha.resincronizar).toBe(true);
  });
});

describe('disputa fora do ar (P0002)', () => {
  it('manda começar outra, e NÃO tenta reler o que não existe', () => {
    const falha = mensagemDeFalhaNoTurno(erroDoBanco('P0002'));
    expect(falha.mensagem).toContain('não está mais no ar');
    expect(falha.resincronizar).toBe(false);
  });
});

describe('identidade recusada (42501)', () => {
  it('não sugere gravar de novo: gravar de novo não resolve identidade', () => {
    const falha = mensagemDeFalhaNoTurno(erroDoBanco('42501'));
    expect(falha.mensagem).not.toContain('Tenta gravar de novo');
    expect(falha.resincronizar).toBe(false);
  });
});

describe('o resto', () => {
  it('rede caindo continua recebendo o conselho certo: gravar de novo', () => {
    // É o único caso em que a frase original estava certa, e ela fica.
    const falha = mensagemDeFalhaNoTurno(new Error('Failed to fetch'));
    expect(falha.mensagem).toBe('A nota saiu, mas não entrou na disputa. Tenta gravar de novo.');
    expect(falha.resincronizar).toBe(false);
  });

  it('aguenta lixo no lugar do erro sem quebrar a tela', () => {
    // O `catch` recebe `unknown`. Um `null` ali não pode derrubar a disputa.
    for (const lixo of [null, undefined, 'erro', 42, {}]) {
      expect(mensagemDeFalhaNoTurno(lixo).mensagem.length).toBeGreaterThan(0);
    }
  });
});
