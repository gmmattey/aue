/**
 * A REGRA DO ROUND ESTÁ ESCRITA DUAS VEZES, E TEM QUE SER A MESMA.
 *
 * No cliente é `calcularTurno`; no servidor é o trecho de `responder_batalha`
 * que deriva o número da rodada. Não dá para ter uma só: a tela precisa saber de
 * quem é a vez ANTES de gravar, e o servidor não pode confiar no número que o
 * cliente mandar — deixar o cliente escolher permitiria refazer um round já
 * fechado, e o ranking do round 1 mudaria depois de anunciado.
 *
 * O QUE QUEBRA SE ELAS DIVERGIREM: a tela passa a vez de quem não gravou e o
 * servidor recusa a gravação seguinte, com o telefone na mão de alguém e a mesa
 * inteira olhando. AGENTS.md §6 exige teste de paridade para regra crítica
 * duplicada — este é o dela.
 *
 * ISTO NÃO RODA SQL. Ele lê a migração aplicada e confere que ela continua
 * dizendo o que a regra do cliente assume. É o mesmo espírito de
 * `origens.paridade.test.ts` e `pontuacao.paridade.test.ts`.
 */
import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { ROTULO_DO_LOCAL } from './locais';
import { ROUNDS_POSSIVEIS } from './regras';
import { calcularTurno } from './turnos';
import type { ParticipanteDaRoda } from '../../portas/disputaLocal';

/** A definição que está no ar hoje. A 36 é a última a recriar a RPC. */
const MIGRACAO = readFileSync(
  'supabase/migrations/20260807000036_nomenclatura_ptbr_mvp1.sql',
  'utf8',
).replace(/\r\n/g, '\n');

/** Onde o CHECK dos cinco lugares nasceu. */
const MIGRACAO_DO_CHECK = readFileSync(
  'supabase/migrations/20260807000030_batalhas_em_sessao.sql',
  'utf8',
).replace(/\r\n/g, '\n');

const RESPONDER = /CREATE FUNCTION public\.responder_batalha\(([\s\S]*?)\n\$\$;/.exec(MIGRACAO);

const MESA: ParticipanteDaRoda[] = [
  { id: 'a', nome: 'Carol' },
  { id: 'b', nome: 'Bruno' },
  { id: 'c', nome: 'Rafa' },
];

describe('o round, no cliente e no servidor', () => {
  it('a migração ainda define `responder_batalha` — sem isso o resto não prova nada', () => {
    expect(RESPONDER, 'não achei `responder_batalha` na 20260807000036').toBeTruthy();
  });

  it('o servidor deriva o round contando o que AQUELA pessoa já gravou', () => {
    const corpo = RESPONDER![1];

    /*
      O trecho exato: conta as rodadas daquele participante naquela batalha e
      soma um. É a mesma frase de `calcularTurno` — "quantas vezes ele já
      gravou, mais um" — e é ela que este teste guarda.
    */
    expect(corpo).toMatch(/SELECT\s+COALESCE\(count\(\*\), 0\) \+ 1 INTO v_round/);
    expect(corpo).toMatch(/FROM public\.rodadas_batalha rb/);
    expect(corpo).toMatch(/AND rb\.participante_id = p_participante_id/);
  });

  it('o servidor NÃO aceita o round vindo do cliente', () => {
    const assinatura = RESPONDER![1].slice(0, RESPONDER![1].indexOf(')'));
    // Um parâmetro de round na assinatura seria a porta para refazer um round
    // já fechado.
    expect(assinatura).not.toMatch(/round|rodada/i);
  });

  it('o servidor recusa gravação além do total de rounds', () => {
    expect(RESPONDER![1]).toMatch(/IF v_round > COALESCE\(v_b\.total_de_rodadas, 1\) THEN/);
  });

  it('o cliente chega no mesmo número que o servidor chegaria', () => {
    /*
      A simulação: o servidor conta as gravações da pessoa da vez e soma um. O
      cliente diz qual é o round corrente. Os dois têm de bater em toda etapa de
      uma roda de 3 pessoas × 3 rounds.
    */
    const gravados: { participanteId: string; nota: number }[] = [];

    for (let i = 0; i < MESA.length * 3; i += 1) {
      const turno = calcularTurno(MESA, gravados, 3);
      expect(turno.acabou).toBe(false);

      const quem = turno.daVez!;
      const comoOServidorContaria =
        gravados.filter((g) => g.participanteId === quem.id).length + 1;

      expect(turno.round, `no arroto ${i + 1}`).toBe(comoOServidorContaria);
      gravados.push({ participanteId: quem.id, nota: 50 });
    }

    expect(calcularTurno(MESA, gravados, 3).acabou).toBe(true);
  });

  it('os rounds que a tela oferece são os que o servidor aceita', () => {
    // `criar_batalha_presencial` recusa fora de 1..3.
    expect(MIGRACAO).toMatch(/p_total_de_rodadas NOT BETWEEN 1 AND 3/);
    expect(ROUNDS_POSSIVEIS).toEqual([1, 2, 3]);
  });

  it('os cinco lugares são exatamente os do CHECK do banco', () => {
    const check = /venue_type IN \(([^)]*)\)/.exec(MIGRACAO_DO_CHECK);
    expect(check, 'sumiu o CHECK de `tipo_de_local`').toBeTruthy();

    const doBanco = [...check![1].matchAll(/'([a-z]+)'/g)].map(([, valor]) => valor).sort();
    expect(Object.keys(ROTULO_DO_LOCAL).sort()).toEqual(doBanco);
  });
});
