// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createElement } from 'react';

import type { Batalha, ResultadoRow } from '../../db/supabase';

/**
 * A DISPUTA PRESENCIAL COMO ELA ACONTECE: um telefone, várias mãos.
 *
 * Até aqui a disputa tinha `turnos.test.ts` (lógica pura) e mais nada. Os três
 * defeitos que este arquivo trava não aparecem em lógica pura — todos eles são
 * de ORQUESTRAÇÃO de tela, e todos só apareceriam no churrasco:
 *
 *   1. a nota de quem arrotou sumia sozinha, porque trocar a batalha remontava
 *      o `AudioRecorder` e levava junto a tela de resultado dele;
 *   2. recarregar a página no meio de 15 gravações jogava fora o `codigo_de_acesso`
 *      e, com ele, o caminho de volta para notas que estavam salvas;
 *   3. o erro de nota duplicada mandava gravar de novo uma nota que ENTROU.
 *
 * O `AudioRecorder` é DUBLADO de propósito. Ele é dono do microfone, do envio,
 * do Storage e do banco; montá-lo aqui testaria tudo menos o que importa nesta
 * tela, que é a coreografia dos turnos. O dublê expõe o único contrato que a
 * `DisputaLocalScreen` usa dele: `onRecordingComplete(linhaSalva)`.
 */

const criarBatalhaPresencial = vi.fn();
const obterBatalha = vi.fn();
const responderBatalha = vi.fn();

vi.mock('../../db/supabase', () => ({
  criarBatalhaPresencial: (...args: unknown[]) => criarBatalhaPresencial(...args),
  obterBatalha: (...args: unknown[]) => obterBatalha(...args),
  responderBatalha: (...args: unknown[]) => responderBatalha(...args),
}));

/** O gravador, reduzido ao que esta tela consome dele. */
vi.mock('../audio/AudioRecorder', () => ({
  AudioRecorder: ({ onRecordingComplete }: { onRecordingComplete?: (r: ResultadoRow) => void }) =>
    createElement(
      'button',
      { type: 'button', onClick: () => onRecordingComplete?.(resultadoFalso()) },
      'Arrotar (dublê)',
    ),
}));

/*
  Import estático mesmo com `vi.mock` acima: as duas fábricas só DEREFERENCIAM
  os `vi.fn()` dentro de funções que rodam no clique, nunca no corpo da
  fábrica — que é o que quebraria com o hoisting do `vi.mock`.
*/
import { DisputaLocalScreen } from './DisputaLocalScreen';

/* -------------------------------------------------------------------------- */

let proximaNota = 80;

function resultadoFalso(): ResultadoRow {
  proximaNota += 1;
  return {
    id: `resultado-${proximaNota}`,
    nota: proximaNota,
    classificacao: 'Tá maluco.',
    potencia: 88,
    duracao: 76,
    caminho_do_audio: 'audio/qualquer.webm',
  } as ResultadoRow;
}

const CAROL = { id: 'a', apelido: 'Carol' };
const BRUNO = { id: 'b', apelido: 'Bruno' };

function batalhaFalsa(
  rodadas: { participante_id: string; nota: number }[],
  roundsTotal = 1,
  venue: Batalha['tipo_de_local'] = null,
): Batalha {
  return {
    codigo_de_acesso: 'ABCDEFGHIJ',
    tipo_de_batalha: 'presencial',
    tipo_de_local: venue,
    total_de_rodadas: roundsTotal,
    criado_em: '2026-08-08T00:00:00Z',
    expira_em: '2026-08-15T00:00:00Z',
    finalizada_em: null,
    participantes: [CAROL, BRUNO],
    rodadas: rodadas.map((r, i) => ({ ...r, posicao: i + 1 })),
    lider: null,
  } as unknown as Batalha;
}

/** Preenche os dois nomes, abre a disputa e espera a primeira tela dela. */
async function abrirDisputa(retorno: Batalha, primeiraTela = 'Vez de Carol') {
  criarBatalhaPresencial.mockResolvedValue(retorno);
  fireEvent.change(screen.getByLabelText('Nome do participante 1'), {
    target: { value: 'Carol' },
  });
  fireEvent.change(screen.getByLabelText('Nome do participante 2'), {
    target: { value: 'Bruno' },
  });
  fireEvent.click(screen.getByText('Começar a disputa'));
  await screen.findByText(primeiraTela);
}

beforeEach(() => {
  proximaNota = 80;
  window.localStorage.clear();
  obterBatalha.mockReset();
  responderBatalha.mockReset();
  criarBatalhaPresencial.mockReset();
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

/* -------------------------------------------------------------------------- */

describe('a nota de quem arrotou fica na tela', () => {
  it('mostra a nota com o nome e NÃO some sozinha quando a batalha atualiza', async () => {
    /*
      O DEFEITO ORIGINAL, em uma frase: `onRecordingComplete` trocava a batalha,
      a `key` do gravador mudava, o React remontava tudo e a nota da Carol
      desaparecia sem ninguém tocar em nada — com o telefone ainda na mão dela.
    */
    render(createElement(DisputaLocalScreen));
    await abrirDisputa(batalhaFalsa([]));

    responderBatalha.mockResolvedValue(batalhaFalsa([{ participante_id: 'a', nota: 81 }]));
    fireEvent.click(screen.getByText('Arrotar (dublê)'));

    expect(await screen.findByText('Carol mandou.')).toBeTruthy();
    expect(screen.getByText('81,0')).toBeTruthy();

    // A batalha JÁ trocou aqui. A nota continua.
    await waitFor(() => expect(responderBatalha).toHaveBeenCalled());
    await screen.findByText('Próximo turno');
    expect(screen.getByText('Carol mandou.')).toBeTruthy();
    expect(screen.getByText('81,0')).toBeTruthy();
  });

  it('só o toque em "Próximo turno" passa a vez', async () => {
    render(createElement(DisputaLocalScreen));
    await abrirDisputa(batalhaFalsa([]));

    responderBatalha.mockResolvedValue(batalhaFalsa([{ participante_id: 'a', nota: 81 }]));
    fireEvent.click(screen.getByText('Arrotar (dublê)'));
    await screen.findByText('Próximo turno');

    // Antes do toque, o lobby do Bruno não existe.
    expect(screen.queryByText('Vez de Bruno')).toBeNull();
    expect(screen.getByText('Agora é a vez de Bruno. Passa o telefone.')).toBeTruthy();

    fireEvent.click(screen.getByText('Próximo turno'));
    expect(await screen.findByText('Vez de Bruno')).toBeTruthy();
  });

  it('o último arroto da disputa também é lido antes do pódio', async () => {
    // Sem isto a tela pularia do último arroto direto para o ranking, e a nota
    // que decide a disputa seria a única que ninguém veria.
    render(createElement(DisputaLocalScreen));
    await abrirDisputa(batalhaFalsa([{ participante_id: 'a', nota: 81 }]), 'Vez de Bruno');

    responderBatalha.mockResolvedValue(
      batalhaFalsa([
        { participante_id: 'a', nota: 81 },
        { participante_id: 'b', nota: 95 },
      ]),
    );
    fireEvent.click(screen.getByText('Arrotar (dublê)'));

    expect(await screen.findByText('Bruno mandou.')).toBeTruthy();
    await screen.findByText('Ver o pódio');
    expect(screen.queryByText('Campeão do Auê')).toBeNull();

    fireEvent.click(screen.getByText('Ver o pódio'));
    expect(await screen.findByText('Campeão do Auê')).toBeTruthy();
  });

});

describe('erro no turno', () => {
  it('nota duplicada NÃO manda gravar de novo, e relê a disputa', async () => {
    render(createElement(DisputaLocalScreen));
    await abrirDisputa(batalhaFalsa([]));

    responderBatalha.mockRejectedValue({ code: '23505', message: 'unique violation' });
    obterBatalha.mockResolvedValue(batalhaFalsa([{ participante_id: 'a', nota: 81 }]));

    fireEvent.click(screen.getByText('Arrotar (dublê)'));

    expect(await screen.findByText(/já tinha entrado/)).toBeTruthy();
    expect(screen.queryByText(/Tenta gravar de novo/)).toBeNull();

    // A releitura é o que faz a vez andar em vez de travar na Carol.
    await waitFor(() => expect(obterBatalha).toHaveBeenCalledWith('ABCDEFGHIJ'));
    fireEvent.click(screen.getByText('Próximo turno'));
    expect(await screen.findByText('Vez de Bruno')).toBeTruthy();
  });

  it('falha de rede continua mandando gravar de novo, e a vez não anda', async () => {
    render(createElement(DisputaLocalScreen));
    await abrirDisputa(batalhaFalsa([]));

    responderBatalha.mockRejectedValue(new Error('Failed to fetch'));
    fireEvent.click(screen.getByText('Arrotar (dublê)'));

    expect(await screen.findByText(/Tenta gravar de novo/)).toBeTruthy();
    expect(obterBatalha).not.toHaveBeenCalled();

    fireEvent.click(screen.getByText('Próximo turno'));
    expect(await screen.findByText('Vez de Carol')).toBeTruthy();
  });
});

describe('a disputa sobrevive a fechar a tela', () => {
  it('guarda o código ao abrir a disputa', async () => {
    render(createElement(DisputaLocalScreen));
    await abrirDisputa(batalhaFalsa([]));

    expect(window.localStorage.getItem('aue.disputa.v1')).toContain('ABCDEFGHIJ');
  });

  it('retoma a disputa ao remontar a tela', async () => {
    render(createElement(DisputaLocalScreen));
    await abrirDisputa(batalhaFalsa([{ participante_id: 'a', nota: 81 }]), 'Vez de Bruno');
    cleanup();

    // O aparelho apagou a tela, alguém apertou "voltar", a aba morreu.
    obterBatalha.mockResolvedValue(batalhaFalsa([{ participante_id: 'a', nota: 81 }]));
    render(createElement(DisputaLocalScreen));

    expect(await screen.findByText('Vez de Bruno')).toBeTruthy();
    expect(obterBatalha).toHaveBeenCalledWith('ABCDEFGHIJ');
  });

  it('disputa vencida limpa o bilhete e explica, em vez de travar a tela', async () => {
    window.localStorage.setItem('aue.disputa.v1', JSON.stringify({ codigo: 'VENCIDAAAA' }));
    obterBatalha.mockResolvedValue(null);

    render(createElement(DisputaLocalScreen));

    expect(await screen.findByText(/venceu ou sumiu/)).toBeTruthy();
    expect(screen.getByText('Começar a disputa')).toBeTruthy();
    expect(window.localStorage.getItem('aue.disputa.v1')).toBeNull();
  });

  it('falha de rede na retomada NÃO apaga a disputa guardada', async () => {
    // Sinal ruim de churrasco não é prova de que a disputa acabou. Apagar aqui
    // destruiria uma disputa viva.
    window.localStorage.setItem('aue.disputa.v1', JSON.stringify({ codigo: 'ABCDEFGHIJ' }));
    obterBatalha.mockRejectedValue(new Error('Failed to fetch'));

    render(createElement(DisputaLocalScreen));

    expect(await screen.findByText(/Não deu para retomar/)).toBeTruthy();
    expect(window.localStorage.getItem('aue.disputa.v1')).toContain('ABCDEFGHIJ');
  });

  it('encerrar exige dois toques e larga o que estava guardado', async () => {
    render(createElement(DisputaLocalScreen));
    await abrirDisputa(batalhaFalsa([]));

    fireEvent.click(screen.getByText('Encerrar esta disputa'));
    // Um toque só não larga nada: no celular, o primeiro é sempre o acidental.
    expect(screen.getByText('Vez de Carol')).toBeTruthy();
    expect(window.localStorage.getItem('aue.disputa.v1')).toContain('ABCDEFGHIJ');

    fireEvent.click(screen.getByText('Toca de novo pra largar essa disputa'));
    expect(await screen.findByText('Começar a disputa')).toBeTruthy();
    expect(window.localStorage.getItem('aue.disputa.v1')).toBeNull();
  });
});

describe('o lugar da disputa', () => {
  it('"Outro lugar" nunca vai para a legenda do pódio', async () => {
    /*
      O chip "outro" só diz que nenhum dos quatro serviu. Imprimir "Outro
      lugar" gasta a linha da legenda do banner para informar zero — pior do
      que não dizer nada.
    */
    render(createElement(DisputaLocalScreen));

    fireEvent.change(screen.getByLabelText('Nome do participante 1'), { target: { value: 'Carol' } });
    fireEvent.change(screen.getByLabelText('Nome do participante 2'), { target: { value: 'Bruno' } });
    fireEvent.click(screen.getByText('Outro lugar'));
    fireEvent.change(screen.getByLabelText('Nome do lugar da disputa'), {
      target: { value: 'Laje do Rian' },
    });

    criarBatalhaPresencial.mockResolvedValue(
      batalhaFalsa(
        [
          { participante_id: 'a', nota: 81 },
          { participante_id: 'b', nota: 70 },
        ],
        1,
        'outro',
      ),
    );
    fireEvent.click(screen.getByText('Começar a disputa'));

    expect(await screen.findByText(/Laje do Rian/)).toBeTruthy();
    expect(screen.queryByText(/Outro lugar · /)).toBeNull();
  });

  it('o campo de texto só aparece quando "outro" está escolhido', () => {
    render(createElement(DisputaLocalScreen));
    expect(screen.queryByLabelText('Nome do lugar da disputa')).toBeNull();

    fireEvent.click(screen.getByText('Churrasco'));
    expect(screen.queryByLabelText('Nome do lugar da disputa')).toBeNull();

    fireEvent.click(screen.getByText('Outro lugar'));
    expect(screen.getByLabelText('Nome do lugar da disputa')).toBeTruthy();
  });
});

describe('compartilhar o pódio', () => {
  it('sem Web Share API, a tela DIZ — em vez de não fazer nada', async () => {
    /*
      O retorno do `shareResult` era descartado. Em todo desktop e em parte do
      Android, tocar em "Compartilhar o pódio" não fazia nada e não falava
      nada. A pessoa toca de novo, e de novo.
    */
    render(createElement(DisputaLocalScreen));
    await abrirDisputa(
      batalhaFalsa([
        { participante_id: 'a', nota: 81 },
        { participante_id: 'b', nota: 70 },
      ]),
      'Campeão do Auê',
    );

    fireEvent.click(screen.getByText('Compartilhar o pódio'));

    // jsdom não tem `navigator.share`, que é exatamente o caso 'indisponivel'.
    expect(await screen.findByText(/não abre o compartilhamento do sistema/)).toBeTruthy();
  });
});
