import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

/**
 * Trava de segurança da `20260826000001_telemetria_de_eventos.sql`.
 *
 * O QUE ESTE ARQUIVO EXISTE PARA IMPEDIR
 * ----------------------------------------
 * `eventos_de_telemetria` é WRITE-ONLY para o cliente, por pedido explícito
 * do Giam e pela lição da issue #178 (29 funções SECURITY DEFINER com EXECUTE
 * liberado para `anon`, a maioria sem dono conhecido). Uma migração futura que
 * "só" acrescente uma policy de SELECT para "facilitar" uma tela de debug
 * reabriria a tabela inteira para qualquer um com a chave anônima — que é
 * pública, vai no bundle, e não muda entre deploys.
 *
 * COMO A TRAVA FUNCIONA
 * ---------------------
 * Não há Postgres neste ambiente (mesmo limite de
 * `leitura-fechada.migracoes.test.ts` e `nomenclatura-ptbr.migracoes.test.ts`):
 * isto é leitura de texto do arquivo de migração versionado, não execução do
 * SQL. Uma policy criada à mão pelo SQL Editor do painel passa por aqui sem
 * encostar.
 */

const CAMINHO_DA_MIGRACAO = fileURLToPath(
  new URL('../../supabase/migrations/20260826000001_telemetria_de_eventos.sql', import.meta.url),
);

function sql(): string {
  return readFileSync(CAMINHO_DA_MIGRACAO, 'utf8');
}

/** Espaço em branco colapsado — a mesma técnica de `leitura-fechada.migracoes.test.ts`. */
function normalizado(): string {
  return sql().replace(/\s+/g, ' ');
}

describe('a migração da telemetria existe e cria a tabela certa', () => {
  it('cria public.eventos_de_telemetria', () => {
    expect(normalizado()).toMatch(/CREATE TABLE public\.eventos_de_telemetria/i);
  });

  it('liga RLS na tabela', () => {
    expect(normalizado()).toMatch(
      /ALTER TABLE public\.eventos_de_telemetria ENABLE ROW LEVEL SECURITY/i,
    );
  });
});

describe('public.eventos_de_telemetria é write-only para o cliente', () => {
  it('existe policy de INSERT para anon e authenticated', () => {
    expect(normalizado()).toMatch(
      /CREATE POLICY "[^"]+" ON public\.eventos_de_telemetria FOR INSERT TO anon, authenticated/i,
    );
  });

  it.each(['SELECT', 'UPDATE', 'DELETE'] as const)(
    'NÃO existe policy de %s para o cliente',
    (comando) => {
      const regex = new RegExp(
        `CREATE POLICY "[^"]+" ON public\\.eventos_de_telemetria FOR ${comando}`,
        'i',
      );
      expect(
        regex.test(normalizado()),
        `Achou uma policy de ${comando} em eventos_de_telemetria. A tabela é WRITE-ONLY ` +
          'para o cliente por decisão de produto — SELECT/UPDATE/DELETE não têm policy ' +
          'nenhuma, de propósito.',
      ).toBe(false);
    },
  );

  it('revoga tudo de anon/authenticated antes de conceder o INSERT (não confia só na ausência de policy)', () => {
    const texto = normalizado();
    const iRevoke = texto.search(/REVOKE ALL ON public\.eventos_de_telemetria FROM/i);
    const iGrant = texto.search(/GRANT INSERT ON public\.eventos_de_telemetria TO anon, authenticated/i);

    expect(iRevoke, 'Falta o REVOKE explícito antes do GRANT — ver a lição da 20260812000001.').toBeGreaterThanOrEqual(0);
    expect(iGrant, 'Falta o GRANT INSERT explícito para anon e authenticated.').toBeGreaterThanOrEqual(0);
    expect(iRevoke).toBeLessThan(iGrant);
  });

  it('não cria nenhuma função (issue #178: nada de RPC nova para contornar RLS)', () => {
    /*
      Checa a existência do comando, não a ausência da frase "SECURITY
      DEFINER" no texto puro — o cabeçalho desta migração CITA a issue #178 e
      o termo aparece várias vezes em comentário, explicando por que a
      migração NÃO cria função nenhuma. O que prova a garantia é não haver
      `CREATE FUNCTION`: sem função, não existe onde `SECURITY DEFINER` pegar.
    */
    expect(normalizado()).not.toMatch(/CREATE (OR REPLACE )?FUNCTION/i);
  });
});

describe('o CHECK do nome do evento cobre exatamente os dez eventos do v1', () => {
  const EVENTOS_V1 = [
    'abriu_arena',
    'iniciou_arroto',
    'recebeu_nota',
    'tentou_novamente',
    'compartilhou',
    'criou_x1',
    'abriu_x1',
    'respondeu_x1',
    'pediu_revanche',
    'concluiu_roda',
  ] as const;

  function corpoDoCheck(): string {
    const texto = normalizado();
    const inicio = texto.search(/CONSTRAINT eventos_de_telemetria_evento_valido CHECK \(/i);
    expect(inicio, 'Não achou o CONSTRAINT eventos_de_telemetria_evento_valido.').toBeGreaterThanOrEqual(0);
    const fechamentoDoCheck = texto.indexOf('),', inicio);
    return texto.slice(inicio, fechamentoDoCheck === -1 ? undefined : fechamentoDoCheck);
  }

  it.each(EVENTOS_V1)('o evento "%s" está no CHECK', (evento) => {
    expect(corpoDoCheck()).toContain(`'${evento}'`);
  });

  it('o CHECK não tem nenhum evento além dos dez do v1', () => {
    const ocorrencias = corpoDoCheck().match(/'[a-z_0-9]+'/g) ?? [];
    expect(new Set(ocorrencias.map((s) => s.slice(1, -1)))).toEqual(new Set(EVENTOS_V1));
  });
});

describe('a tabela não guarda o uuid interno de batalha', () => {
  it('a coluna é batalha_codigo (texto), não batalha_id/uuid', () => {
    const texto = normalizado();
    expect(texto).toMatch(/batalha_codigo text/i);
    expect(texto).not.toMatch(/batalha_id uuid/i);
  });

  it('não referencia public.batalhas por FK — telemetria não pode falhar por causa de uma tabela operacional', () => {
    expect(normalizado()).not.toMatch(/REFERENCES public\.batalhas/i);
  });
});
