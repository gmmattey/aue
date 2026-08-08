import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

/**
 * C1 — trava da válvula de acúmulo de XP.
 *
 * O PROBLEMA QUE ESTE ARQUIVO EXISTE PARA IMPEDIR
 * ------------------------------------------------
 * `protect_profile_stats()` é um trigger BEFORE UPDATE em `profiles` que
 * reverte campos que o cliente não pode alterar. O acúmulo de XP passa por um
 * UPDATE em `profiles.xp_total` emitido por `update_profile_xp()` — e
 * `SECURITY DEFINER` NÃO desabilita triggers, então esse UPDATE legítimo cai no
 * mesmo trigger.
 *
 * A migração 20260807000010 resolveu isso com uma válvula: o trigger só deixa
 * xp_total/nivel mudarem quando `app.allow_stat_update` está ligada, e só
 * `update_profile_xp()` liga (o PostgREST não executa `set_config` arbitrário,
 * e o terceiro argumento `true` a torna local à transação).
 *
 * O QUE DEU ERRADO DUAS VEZES
 * ---------------------------
 * A função foi redefinida em cinco migrações. Duas delas — a de `is_founder` e
 * a de `is_premium` — recopiaram o corpo à mão para acrescentar um campo, e no
 * caminho DESCARTARAM a válvula. Resultado: o XP parou de acumular, sem erro,
 * sem log, sem nada. O defeito não aparece em nenhum teste de unidade porque
 * vive inteiramente no SQL.
 *
 * COMO A TRAVA FUNCIONA
 * ---------------------
 * Não há Postgres neste ambiente, então o teste não executa SQL. Ele faz o que
 * `rules.formula.test.ts` já faz para a fórmula de score: LÊ OS ARQUIVOS DE
 * MIGRAÇÃO e verifica uma propriedade textual — que a ÚLTIMA definição de
 * `protect_profile_stats()`, que é a que vale no banco, ainda contém a válvula
 * e ainda protege todos os campos.
 *
 * LIMITE HONESTO DESTA TRAVA
 * --------------------------
 * É análise de texto de arquivos versionados, não do banco. Se alguém redefinir
 * a função direto no Postgres pelo SQL Editor, este teste continua verde e o
 * banco está diferente. Ele impede a regressão *pelo caminho que já aconteceu
 * duas vezes* — uma migração nova recopiando o corpo — e nada além disso.
 */

const DIR_MIGRACOES = fileURLToPath(new URL('../../../supabase/migrations', import.meta.url));

const ASSINATURA = 'FUNCTION public.protect_profile_stats()';

/**
 * Âncora do CORPO da função. Precisa ser específica: `ASSINATURA` sozinha também
 * casa com `COMMENT ON FUNCTION public.protect_profile_stats()`, que vem DEPOIS
 * do corpo e faria a fatia começar no lugar errado.
 */
const ANCORA_CORPO = `CREATE OR REPLACE ${ASSINATURA}`;

/** Campos que a função precisa continuar protegendo, com o motivo de cada um. */
const CAMPOS_PROTEGIDOS = [
  ['id', 'identidade do perfil'],
  ['created_at', 'data de criação'],
  ['is_founder', 'selo de fundador'],
  ['is_premium', 'assinatura'],
  ['xp_total', 'XP acumulado'],
  ['nivel', 'nível'],
] as const;

function migracoesQueDefinemAFuncao(): string[] {
  return readdirSync(DIR_MIGRACOES)
    .filter((nome) => nome.endsWith('.sql'))
    .filter((nome) => readFileSync(`${DIR_MIGRACOES}/${nome}`, 'utf8').includes(ASSINATURA))
    .sort(); // os nomes começam pelo número da versão, então ordem alfabética = ordem de aplicação
}

describe('C1 — protect_profile_stats() e o acúmulo de XP', () => {
  it('alguma migração define a função', () => {
    expect(migracoesQueDefinemAFuncao().length).toBeGreaterThan(0);
  });

  it('a ÚLTIMA definição preserva a válvula app.allow_stat_update', () => {
    const arquivos = migracoesQueDefinemAFuncao();
    const ultima = arquivos[arquivos.length - 1];
    const sql = readFileSync(`${DIR_MIGRACOES}/${ultima}`, 'utf8');

    // A definição que vale é a última aplicada. Se ela não tiver a válvula, o
    // trigger reverte o UPDATE de `update_profile_xp()` e o XP nunca acumula.
    expect(
      sql.includes('app.allow_stat_update'),
      `A última migração que redefine protect_profile_stats() é "${ultima}", e ela NÃO menciona ` +
        '`app.allow_stat_update`. Isso reintroduz o bug C1: o XP para de acumular silenciosamente. ' +
        'Se você precisava proteger um campo novo, edite a definição consolidada em ' +
        '20260807000023_corrige_regressao_xp_e_endurecimento.sql em vez de recopiar o corpo da função.',
    ).toBe(true);
  });

  it('a ÚLTIMA definição condiciona xp_total e nivel à válvula, em vez de revertê-los sempre', () => {
    const arquivos = migracoesQueDefinemAFuncao();
    const ultima = arquivos[arquivos.length - 1];
    const sql = readFileSync(`${DIR_MIGRACOES}/${ultima}`, 'utf8');

    const inicioCorpo = sql.lastIndexOf(ANCORA_CORPO);
    expect(inicioCorpo, `Não achei "${ANCORA_CORPO}" em "${ultima}".`).toBeGreaterThanOrEqual(0);

    const corpo = sql.slice(inicioCorpo);
    const posValvula = corpo.indexOf('app.allow_stat_update');

    for (const campo of ['xp_total', 'nivel']) {
      const posCampo = corpo.indexOf(`NEW.${campo}`);
      expect(
        posCampo > posValvula,
        `Em "${ultima}", NEW.${campo} é atribuído ANTES da checagem de app.allow_stat_update — ` +
          'ou seja, fora do IF que a válvula controla. Assim ele é revertido em todo UPDATE, ' +
          'inclusive no do fluxo de gamificação.',
      ).toBe(true);
    }
  });

  it.each(CAMPOS_PROTEGIDOS)('a ÚLTIMA definição ainda protege %s (%s)', (campo) => {
    const arquivos = migracoesQueDefinemAFuncao();
    const ultima = arquivos[arquivos.length - 1];
    const sql = readFileSync(`${DIR_MIGRACOES}/${ultima}`, 'utf8');

    expect(
      sql.includes(`NEW.${campo}`),
      `A última definição de protect_profile_stats() ("${ultima}") não menciona NEW.${campo}. ` +
        'Consolidar a função significa manter TODOS os campos protegidos, não trocar um pelo outro — ' +
        'foi exatamente assim que a válvula se perdeu duas vezes.',
    ).toBe(true);
  });
});

/**
 * Mesma classe de defeito, segunda função exposta a ela.
 *
 * `handle_new_user()` já foi redefinida em QUATRO migrações (000001, 000004,
 * 000022, 000024), cada uma recopiando o corpo para mexer num detalhe. É o
 * mesmo padrão que matou o XP duas vezes em `protect_profile_stats()`, só que
 * aqui ainda não deu errado.
 *
 * Duas propriedades da última definição são travadas abaixo:
 *
 *   1. `SET search_path` — a função é SECURITY DEFINER e roda num trigger de
 *      `auth.users`. Sem search_path fixo é o advisor "Function Search Path
 *      Mutable" do Supabase.
 *
 *   2. A concessão do selo de fundador tem de DELEGAR a
 *      `aue_vaga_de_fundador_disponivel()`. Um `true` literal no lugar da
 *      chamada devolve o comportamento sem corte — todo usuário vira fundador
 *      de novo, silenciosamente, e o limite de 500 vagas deixa de existir.
 */
const ASSINATURA_NOVO_USUARIO = 'FUNCTION public.handle_new_user()';
const FUNCAO_DA_VAGA = 'aue_vaga_de_fundador_disponivel';

function migracoesQueDefinemNovoUsuario(): string[] {
  return readdirSync(DIR_MIGRACOES)
    .filter((nome) => nome.endsWith('.sql'))
    .filter((nome) => readFileSync(`${DIR_MIGRACOES}/${nome}`, 'utf8').includes(ASSINATURA_NOVO_USUARIO))
    .sort();
}

describe('M7/M8 — handle_new_user() e o corte de fundador', () => {
  it('alguma migração define a função', () => {
    expect(migracoesQueDefinemNovoUsuario().length).toBeGreaterThan(0);
  });

  it('a ÚLTIMA definição fixa o search_path', () => {
    const arquivos = migracoesQueDefinemNovoUsuario();
    const ultima = arquivos[arquivos.length - 1];
    const sql = readFileSync(`${DIR_MIGRACOES}/${ultima}`, 'utf8');

    expect(
      /SET\s+search_path/i.test(sql),
      `A última migração que redefine handle_new_user() é "${ultima}" e não fixa SET search_path. ` +
        'A função é SECURITY DEFINER num trigger de auth.users — é o advisor ' +
        '"Function Search Path Mutable" do Supabase.',
    ).toBe(true);
  });

  it('a ÚLTIMA definição delega o selo de fundador, em vez de conceder a todos', () => {
    const arquivos = migracoesQueDefinemNovoUsuario();
    const ultima = arquivos[arquivos.length - 1];
    const sql = readFileSync(`${DIR_MIGRACOES}/${ultima}`, 'utf8');

    const inicioCorpo = sql.lastIndexOf(`CREATE OR REPLACE ${ASSINATURA_NOVO_USUARIO}`);
    expect(inicioCorpo, `Não achei a definição de handle_new_user() em "${ultima}".`).toBeGreaterThanOrEqual(0);

    expect(
      sql.slice(inicioCorpo).includes(FUNCAO_DA_VAGA),
      `A última definição de handle_new_user() ("${ultima}") não chama ${FUNCAO_DA_VAGA}(). ` +
        'Sem essa chamada, is_founder volta a ser concedido a todo usuário novo e o corte de ' +
        '500 vagas some sem aviso. Para mudar a regra, edite AQUELA função — não recopie o ' +
        'corpo de handle_new_user() numa migração nova.',
    ).toBe(true);
  });
});
