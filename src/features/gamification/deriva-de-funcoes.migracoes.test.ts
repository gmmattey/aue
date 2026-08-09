import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

/**
 * C1 — trava da válvula de acúmulo de XP.
 *
 * O PROBLEMA QUE ESTE ARQUIVO EXISTE PARA IMPEDIR
 * ------------------------------------------------
 * `proteger_estatisticas_do_perfil()` é um trigger BEFORE UPDATE em `perfis` que
 * reverte campos que o cliente não pode alterar. O acúmulo de XP passa por um
 * UPDATE em `perfis.xp_total` emitido por `atualizar_xp_do_perfil()` — e
 * `SECURITY DEFINER` NÃO desabilita triggers, então esse UPDATE legítimo cai no
 * mesmo trigger.
 *
 * A migração 20260807000010 resolveu isso com uma válvula: o trigger só deixa
 * xp_total/nivel mudarem quando `app.allow_stat_update` está ligada, e só
 * `atualizar_xp_do_perfil()` liga (o PostgREST não executa `set_config` arbitrário,
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
 * `proteger_estatisticas_do_perfil()`, que é a que vale no banco, ainda contém a válvula
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

const ASSINATURA = 'FUNCTION public.proteger_estatisticas_do_perfil()';

/**
 * Onde começa o CORPO da última definição da função, ou -1.
 *
 * Precisa ser mais específico que a `ASSINATURA` sozinha: ela também casa com
 * `COMMENT ON FUNCTION ...` e com `DROP FUNCTION ...`, que vêm ANTES ou DEPOIS
 * do corpo e fariam a fatia começar no lugar errado.
 *
 * Aceita `CREATE FUNCTION` e `CREATE OR REPLACE FUNCTION`. As duas formas
 * existem no repositório de propósito: quando uma migração muda a assinatura
 * (nome de parâmetro ou tipo de retorno), `OR REPLACE` não dá conta e a função
 * precisa ser derrubada antes — foi o que a 20260807000036 fez ao traduzir o
 * schema. Amarrar este guarda a uma das formas o deixaria verde sem conferir
 * nada, que é a única coisa pior do que não ter o guarda.
 */
function inicioDoCorpo(sql: string, assinatura: string): number {
  const ocorrencias = [
    ...sql.matchAll(
      new RegExp(`CREATE\\s+(?:OR REPLACE\\s+)?${assinatura.replace(/[.()]/g, '\\$&')}`, 'g'),
    ),
  ];
  return ocorrencias.length === 0 ? -1 : (ocorrencias[ocorrencias.length - 1].index ?? -1);
}

/** Campos que a função precisa continuar protegendo, com o motivo de cada um. */
const CAMPOS_PROTEGIDOS = [
  ['id', 'identidade do perfil'],
  ['criado_em', 'data de criação'],
  ['e_fundador', 'selo de fundador'],
  ['e_premium', 'assinatura'],
  ['xp_total', 'XP acumulado'],
  ['nivel', 'nível'],
] as const;

function migracoesQueDefinemAFuncao(): string[] {
  return readdirSync(DIR_MIGRACOES)
    .filter((nome) => nome.endsWith('.sql'))
    .filter((nome) => readFileSync(`${DIR_MIGRACOES}/${nome}`, 'utf8').includes(ASSINATURA))
    .sort(); // os nomes começam pelo número da versão, então ordem alfabética = ordem de aplicação
}

describe('C1 — proteger_estatisticas_do_perfil() e o acúmulo de XP', () => {
  it('alguma migração define a função', () => {
    expect(migracoesQueDefinemAFuncao().length).toBeGreaterThan(0);
  });

  it('a ÚLTIMA definição preserva a válvula app.allow_stat_update', () => {
    const arquivos = migracoesQueDefinemAFuncao();
    const ultima = arquivos[arquivos.length - 1];
    const sql = readFileSync(`${DIR_MIGRACOES}/${ultima}`, 'utf8');

    // A definição que vale é a última aplicada. Se ela não tiver a válvula, o
    // trigger reverte o UPDATE de `atualizar_xp_do_perfil()` e o XP nunca acumula.
    expect(
      sql.includes('app.allow_stat_update'),
      `A última migração que redefine proteger_estatisticas_do_perfil() é "${ultima}", e ela NÃO menciona ` +
        '`app.allow_stat_update`. Isso reintroduz o bug C1: o XP para de acumular silenciosamente. ' +
        'Se você precisava proteger um campo novo, edite a definição consolidada em ' +
        '20260807000023_corrige_regressao_xp_e_endurecimento.sql em vez de recopiar o corpo da função.',
    ).toBe(true);
  });

  it('a ÚLTIMA definição condiciona xp_total e nivel à válvula, em vez de revertê-los sempre', () => {
    const arquivos = migracoesQueDefinemAFuncao();
    const ultima = arquivos[arquivos.length - 1];
    const sql = readFileSync(`${DIR_MIGRACOES}/${ultima}`, 'utf8');

    const inicioCorpo = inicioDoCorpo(sql, ASSINATURA);
    expect(inicioCorpo, `Não achei a definição de ${ASSINATURA} em "${ultima}".`)
      .toBeGreaterThanOrEqual(0);

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
      `A última definição de proteger_estatisticas_do_perfil() ("${ultima}") não menciona NEW.${campo}. ` +
        'Consolidar a função significa manter TODOS os campos protegidos, não trocar um pelo outro — ' +
        'foi exatamente assim que a válvula se perdeu duas vezes.',
    ).toBe(true);
  });
});

/**
 * Mesma classe de defeito, segunda função exposta a ela.
 *
 * `criar_perfil_do_novo_usuario()` já foi redefinida em QUATRO migrações (000001, 000004,
 * 000022, 000024), cada uma recopiando o corpo para mexer num detalhe. É o
 * mesmo padrão que matou o XP duas vezes em `proteger_estatisticas_do_perfil()`, só que
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
const ASSINATURA_NOVO_USUARIO = 'FUNCTION public.criar_perfil_do_novo_usuario()';
const FUNCAO_DA_VAGA = 'aue_vaga_de_fundador_disponivel';

function migracoesQueDefinemNovoUsuario(): string[] {
  return readdirSync(DIR_MIGRACOES)
    .filter((nome) => nome.endsWith('.sql'))
    .filter((nome) => readFileSync(`${DIR_MIGRACOES}/${nome}`, 'utf8').includes(ASSINATURA_NOVO_USUARIO))
    .sort();
}

describe('M7/M8 — criar_perfil_do_novo_usuario() e o corte de fundador', () => {
  it('alguma migração define a função', () => {
    expect(migracoesQueDefinemNovoUsuario().length).toBeGreaterThan(0);
  });

  it('a ÚLTIMA definição fixa o search_path', () => {
    const arquivos = migracoesQueDefinemNovoUsuario();
    const ultima = arquivos[arquivos.length - 1];
    const sql = readFileSync(`${DIR_MIGRACOES}/${ultima}`, 'utf8');

    expect(
      /SET\s+search_path/i.test(sql),
      `A última migração que redefine criar_perfil_do_novo_usuario() é "${ultima}" e não fixa SET search_path. ` +
        'A função é SECURITY DEFINER num trigger de auth.users — é o advisor ' +
        '"Function Search Path Mutable" do Supabase.',
    ).toBe(true);
  });

  it('a ÚLTIMA definição delega o selo de fundador, em vez de conceder a todos', () => {
    const arquivos = migracoesQueDefinemNovoUsuario();
    const ultima = arquivos[arquivos.length - 1];
    const sql = readFileSync(`${DIR_MIGRACOES}/${ultima}`, 'utf8');

    const inicioCorpo = inicioDoCorpo(sql, ASSINATURA_NOVO_USUARIO);
    expect(inicioCorpo, `Não achei a definição de criar_perfil_do_novo_usuario() em "${ultima}".`).toBeGreaterThanOrEqual(0);

    expect(
      sql.slice(inicioCorpo).includes(FUNCAO_DA_VAGA),
      `A última definição de criar_perfil_do_novo_usuario() ("${ultima}") não chama ${FUNCAO_DA_VAGA}(). ` +
        'Sem essa chamada, e_fundador volta a ser concedido a todo usuário novo e o corte de ' +
        '500 vagas some sem aviso. Para mudar a regra, edite AQUELA função — não recopie o ' +
        'corpo de criar_perfil_do_novo_usuario() numa migração nova.',
    ).toBe(true);
  });
});

/**
 * A2 — `esconder_por_denuncias()` e o botão de sabotagem.
 *
 * TERCEIRA função exposta à mesma classe de defeito, e a de consequência mais
 * feia. Ela já foi definida em três migrações (000014, 000023, 000028), e cada
 * redefinição recopiou o corpo para acrescentar uma condição.
 *
 * A 20260807000014 contava LINHAS de `denuncias`. Como a tabela não tinha dono
 * e a policy era `TO public WITH CHECK (true)`, três POSTs anônimos escondiam
 * qualquer gravação — inclusive a primeira colocada do ranking. A 20260807000023
 * trocou por `count(DISTINCT user_id)` e passou a exigir conta.
 *
 * Se uma migração futura recopiar o corpo e voltar a `count(*)`, a sabotagem
 * retorna EM SILÊNCIO: nada falha, nada aparece em log, e gravações legítimas
 * começam a sumir do feed. O mesmo vale para o `SET search_path`, que a função
 * precisa manter por ser SECURITY DEFINER.
 *
 * Mesmo limite honesto dos blocos acima: isto é análise de texto dos arquivos
 * versionados, não do banco.
 */
const ASSINATURA_DENUNCIAS = 'FUNCTION public.esconder_por_denuncias()';

function migracoesQueDefinemOcultacao(): string[] {
  return readdirSync(DIR_MIGRACOES)
    .filter((nome) => nome.endsWith('.sql'))
    .filter((nome) => readFileSync(`${DIR_MIGRACOES}/${nome}`, 'utf8').includes(ASSINATURA_DENUNCIAS))
    .sort();
}

describe('A2 — esconder_por_denuncias() e a ocultação por denúncia', () => {
  it('alguma migração define a função', () => {
    expect(migracoesQueDefinemOcultacao().length).toBeGreaterThan(0);
  });

  it('a ÚLTIMA definição conta PESSOAS distintas, não linhas', () => {
    const arquivos = migracoesQueDefinemOcultacao();
    const ultima = arquivos[arquivos.length - 1];
    const sql = readFileSync(`${DIR_MIGRACOES}/${ultima}`, 'utf8');

    const inicioCorpo = inicioDoCorpo(sql, ASSINATURA_DENUNCIAS);
    expect(inicioCorpo, `Não achei a definição de esconder_por_denuncias() em "${ultima}".`)
      .toBeGreaterThanOrEqual(0);

    const corpo = sql.slice(inicioCorpo);

    expect(
      /count\(\s*DISTINCT\s+user_id\s*\)/i.test(corpo),
      `A última definição de esconder_por_denuncias() ("${ultima}") não conta ` +
        '`count(DISTINCT user_id)`. Contar LINHAS devolve o defeito A2: três inserções da mesma ' +
        'origem voltam a esconder qualquer gravação, e o defeito é silencioso.',
    ).toBe(true);
  });

  it('a ÚLTIMA definição fixa o search_path', () => {
    const arquivos = migracoesQueDefinemOcultacao();
    const ultima = arquivos[arquivos.length - 1];
    const sql = readFileSync(`${DIR_MIGRACOES}/${ultima}`, 'utf8');

    const corpo = sql.slice(inicioDoCorpo(sql, ASSINATURA_DENUNCIAS));

    expect(
      /SET\s+search_path/i.test(corpo),
      `A última definição de esconder_por_denuncias() ("${ultima}") não fixa SET search_path, ` +
        'e a função é SECURITY DEFINER — advisor "Function Search Path Mutable".',
    ).toBe(true);
  });

  it('a ÚLTIMA definição respeita a decisão humana', () => {
    const arquivos = migracoesQueDefinemOcultacao();
    const ultima = arquivos[arquivos.length - 1];
    const sql = readFileSync(`${DIR_MIGRACOES}/${ultima}`, 'utf8');

    const corpo = sql.slice(inicioDoCorpo(sql, ASSINATURA_DENUNCIAS));

    // Sem esta leitura, restaurar um resultado é gesto vazio: a próxima
    // denúncia de uma terceira pessoa distinta o esconde de novo.
    expect(
      corpo.includes('esta_travado_por_moderacao'),
      `A última definição de esconder_por_denuncias() ("${ultima}") não lê esta_travado_por_moderacao. ` +
        'Sem isso o gatilho volta a sobrepor a decisão de quem revisou à mão, e "restaurar" ' +
        'deixa de significar alguma coisa.',
    ).toBe(true);
  });
});
