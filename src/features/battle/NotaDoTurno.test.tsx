// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createElement } from 'react';
import type { ComponentProps } from 'react';

import { NotaDoTurno } from './NotaDoTurno';

/**
 * O passo humano entre a nota e o próximo turno.
 *
 * Este componente existe porque a nota de quem arrotava sumia sozinha. O que os
 * testes travam aqui não é layout: é que a tela NÃO ande sem um toque, que ela
 * diga de quem é a próxima vez, e que ela conte quando o áudio não subiu — o
 * aviso que o `AudioRecorder` dava e que saía de cena junto com ele.
 */

/*
  Anotado com as props do componente, e não inferido do literal: `typeof BASE`
  fechava `erro` em `null` e `proximo` em `string`, então os dois casos que mais
  importam aqui — disputa acabada (`proximo: null`) e turno com erro — não
  compilavam. O teste passava no vitest e quebrava no `typecheck`.
*/
const BASE: ComponentProps<typeof NotaDoTurno> = {
  nome: 'Bruno',
  round: 2,
  roundsTotal: 3,
  score: 84,
  classificacao: 'Tá maluco.',
  potencia: 88,
  comprimento: 76,
  audioFalhou: false,
  erro: null,
  salvando: false,
  proximo: 'Carol',
  onAvancar: () => {},
};

function montar(extra: Partial<ComponentProps<typeof NotaDoTurno>> = {}) {
  return render(createElement(NotaDoTurno, { ...BASE, ...extra }));
}

afterEach(cleanup);

describe('a nota na tela', () => {
  it('diz o nome, o round e a nota em português', () => {
    montar();
    expect(screen.getByText('Bruno mandou.')).toBeTruthy();
    expect(screen.getByText('Disputa aqui · round 2 de 3')).toBeTruthy();
    // Vírgula, não ponto. É a regra de `shared/formato/nota.ts`.
    expect(screen.getByText('84,0')).toBeTruthy();
    expect(screen.getByText('Tá maluco.')).toBeTruthy();
  });

  it('não anda sozinha: a saída é um toque', () => {
    const avancar = vi.fn();
    montar({ onAvancar: avancar });

    expect(avancar).not.toHaveBeenCalled();
    fireEvent.click(screen.getByText('Próximo turno'));
    expect(avancar).toHaveBeenCalledTimes(1);
  });

  it('diz de quem é a próxima vez, para o telefone ir para a mão certa', () => {
    montar();
    expect(screen.getByText('Agora é a vez de Carol. Passa o telefone.')).toBeTruthy();
  });
});

describe('fim da disputa', () => {
  it('sem próximo, o botão leva ao pódio', () => {
    montar({ proximo: null });
    expect(screen.getByText('Ver o pódio')).toBeTruthy();
    expect(screen.queryByText('Próximo turno')).toBeNull();
    expect(screen.queryByText(/Passa o telefone/)).toBeNull();
  });
});

describe('enquanto o turno está sendo guardado', () => {
  it('o botão trava, senão a vez andaria com a rodada faltando', () => {
    montar({ salvando: true });
    const botao = screen.getByText('Guardando...') as HTMLButtonElement;
    expect(botao.disabled).toBe(true);
  });

  it('não promete o próximo antes de saber quem é', () => {
    montar({ salvando: true });
    expect(screen.queryByText(/Passa o telefone/)).toBeNull();
  });
});

describe('verdade sobre o áudio e sobre a falha', () => {
  it('avisa quando o arroto não subiu, sem invalidar a nota', () => {
    /*
      A disputa presencial NÃO exige áudio de propósito (a mesa já ouviu ao
      vivo). O preço é que uma rodada muda entra no pódio sem ninguém saber —
      a menos que a tela conte, que é o que este teste trava.
    */
    montar({ audioFalhou: true });
    const aviso = screen.getByText(/O áudio não subiu/);
    expect(aviso.textContent).toContain('A nota vale');
  });

  it('sem falha de áudio, não inventa aviso', () => {
    montar();
    expect(screen.queryByText(/O áudio não subiu/)).toBeNull();
  });

  it('o erro do turno aparece como alerta, junto da nota', () => {
    montar({ erro: 'Essa nota já tinha entrado.' });
    expect(screen.getByRole('alert').textContent).toBe('Essa nota já tinha entrado.');
  });
});
