import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import { calculateScore, TODAS_AS_ORIGENS } from './rules';
import type { Origin } from './rules';
import type { AudioMetrics } from './engine';

/**
 * PARIDADE DA TABELA DE ORIGENS entre `rules.ts` e o banco.
 *
 * O PROBLEMA QUE ESTE ARQUIVO EXISTE PARA IMPEDIR
 * ------------------------------------------------
 * A origem escolhida na tela vira `p_tipo_de_origem` na RPC `enviar_resultado`.
 * Lá o servidor pergunta o peso a `public.aue_origin_score_v1` e, se a função
 * não conhecer o valor, LEVANTA "Origem inválida" — o envio inteiro falha. Duas
 * constraints (`resultados_tipo_de_origem_valido` e
 * `resultados_nota_da_origem_coerente`) barram a linha mesmo por outro caminho.
 *
 * Ou seja: acrescentar uma origem só no TypeScript não degrada nada. Derruba o
 * fluxo principal em produção, para quem tocar naquele botão, e não quebra
 * NENHUM teste de unidade — porque não há Postgres neste ambiente.
 *
 * `rules.formula.test.ts` já trava os PESOS DAS PARCIAIS e as faixas. Este
 * arquivo trava a outra metade, que aquele não cobria: o CONJUNTO de origens.
 * Ele é bidirecional de propósito — origem só no TS e origem só no SQL falham
 * as duas.
 *
 * "A ÚLTIMA DEFINIÇÃO É A QUE VALE"
 * ---------------------------------
 * Mesma técnica de `deriva-de-funcoes.migracoes.test.ts`: as migrações são
 * lidas em ordem de versão e só a ÚLTIMA que redefine cada objeto é conferida.
 * Fixar o caminho da 000011 faria o teste continuar verde enquanto o banco já
 * estaria em outra definição — que é a forma mais convincente de teste inútil.
 *
 * LIMITE HONESTO DESTA TRAVA
 * --------------------------
 * É análise de texto dos ARQUIVOS versionados, não do BANCO. Se a migração
 * nunca foi aplicada, ou se alguém redefinir a função direto no SQL Editor,
 * este teste continua verde e o ambiente está diferente. O que ele garante é
 * que os dois arquivos versionados não divergem entre si.
 */

const DIR_MIGRACOES = fileURLToPath(new URL('../../../supabase/migrations', import.meta.url));

/** Migrações que mencionam um trecho, em ordem de aplicação (= ordem do nome). */
function migracoesQueMencionam(trecho: string): string[] {
  return readdirSync(DIR_MIGRACOES)
    .filter((nome) => nome.endsWith('.sql'))
    .filter((nome) => readFileSync(`${DIR_MIGRACOES}/${nome}`, 'utf8').includes(trecho))
    .sort();
}

/** Conteúdo da ÚLTIMA migração que menciona o trecho, com o nome do arquivo. */
function ultimaQueMenciona(trecho: string): { nome: string; sql: string } {
  const arquivos = migracoesQueMencionam(trecho);
  if (arquivos.length === 0) {
    throw new Error(
      `Nenhuma migração menciona "${trecho}". Se o objeto foi renomeado, ` +
        'atualize este teste — não o apague.',
    );
  }
  const nome = arquivos[arquivos.length - 1];
  return { nome, sql: readFileSync(`${DIR_MIGRACOES}/${nome}`, 'utf8') };
}

const ASSINATURA_ORIGEM = 'FUNCTION public.aue_origin_score_v1';

/** A tabela de origens do BANCO, lida da última definição da função. */
function origensDoSql(): { nome: string; tabela: Map<string, number> } {
  const { nome, sql } = ultimaQueMenciona(ASSINATURA_ORIGEM);

  const inicio = sql.lastIndexOf(`CREATE OR REPLACE ${ASSINATURA_ORIGEM}`);
  expect(inicio, `Não achei a definição de aue_origin_score_v1 em "${nome}".`).toBeGreaterThanOrEqual(0);

  const abre = sql.indexOf('AS $$', inicio);
  const fecha = sql.indexOf('$$;', abre);
  expect(abre, `Não consegui delimitar o corpo de aue_origin_score_v1 em "${nome}".`).toBeGreaterThan(-1);
  expect(fecha).toBeGreaterThan(abre);

  const corpo = sql.slice(abre + 'AS $$'.length, fecha);
  const tabela = new Map<string, number>();
  const when = /WHEN\s+'([^']+)'\s+THEN\s+([0-9]*\.?[0-9]+)/g;
  let achado: RegExpExecArray | null;
  while ((achado = when.exec(corpo)) !== null) {
    tabela.set(achado[1], Number(achado[2]));
  }

  return { nome, tabela };
}

/**
 * A lista de origens aceita pela constraint, lida da última migração que a
 * define. O `.pop()` pega a ÚLTIMA ocorrência no arquivo porque a migração faz
 * DROP e ADD, e um arquivo futuro pode redefini-la mais de uma vez.
 */
function origensDaConstraint(): { nome: string; lista: string[] } {
  const { nome, sql } = ultimaQueMenciona('resultados_tipo_de_origem_valido');

  const ocorrencias = [
    ...sql.matchAll(
      /ADD CONSTRAINT\s+resultados_tipo_de_origem_valido\s+CHECK\s*\(\s*tipo_de_origem\s+IN\s*\(([^)]*)\)\s*\)/g,
    ),
  ];
  expect(
    ocorrencias.length,
    `"${nome}" menciona resultados_tipo_de_origem_valido mas não a define no formato esperado.`,
  ).toBeGreaterThan(0);

  const lista = [...ocorrencias[ocorrencias.length - 1][1].matchAll(/'([^']+)'/g)].map((m) => m[1]);
  return { nome, lista };
}

const SEM_SOM: AudioMetrics = {
  duration: 0,
  rms: 0,
  bassEnergy: 0,
  texture: 0,
  activeDuration: 0,
  activeRms: 0,
  bassRatio: 0,
};

/** Peso de origem do lado TypeScript, medido pela função e não lido de constante. */
function pesoNoTs(origem: Origin): number {
  return calculateScore(SEM_SOM, origem).partialScores.origin;
}

// =============================================================================

describe('origens — a lista do TS e a do banco são a mesma', () => {
  it('toda origem do TS existe em aue_origin_score_v1, com o mesmo peso', () => {
    const { nome, tabela } = origensDoSql();

    for (const origem of TODAS_AS_ORIGENS) {
      expect(
        tabela.has(origem),
        `A origem '${origem}' existe em rules.ts e NÃO existe em aue_origin_score_v1 ` +
          `("${nome}"). Em produção isso não degrada nada: a RPC enviar_resultado ` +
          'levanta "Origem inválida" e a gravação não é salva.',
      ).toBe(true);

      expect(tabela.get(origem), `peso de '${origem}'`).toBe(pesoNoTs(origem));
    }
  });

  it('toda origem do banco existe no TS — nada sobra do outro lado', () => {
    const { nome, tabela } = origensDoSql();

    for (const origem of tabela.keys()) {
      expect(
        (TODAS_AS_ORIGENS as readonly string[]).includes(origem),
        `'${origem}' é aceita por aue_origin_score_v1 ("${nome}") e não existe em ` +
          'TODAS_AS_ORIGENS. Origem que o banco aceita e a tela não oferece é regra ' +
          'órfã: ninguém consegue escolhê-la e ninguém sabe que ela está lá.',
      ).toBe(true);
    }
  });

  it('a constraint resultados_tipo_de_origem_valido aceita exatamente as mesmas origens', () => {
    const { nome, lista } = origensDaConstraint();

    // Comparação de conjunto ordenado: pega origem a mais, a menos e renomeada.
    expect(
      [...lista].sort(),
      `A constraint em "${nome}" e TODAS_AS_ORIGENS divergiram. A função pode aceitar ` +
        'a origem e a constraint rejeitar a linha mesmo assim — o INSERT falha depois ' +
        'de tudo já ter dado certo.',
    ).toEqual([...TODAS_AS_ORIGENS].sort());
  });

  it('enviar_resultado continua DELEGANDO o peso, em vez de repetir a lista', () => {
    const { nome, sql } = ultimaQueMenciona('FUNCTION public.enviar_resultado');

    /*
      A âncora precisa ser o CREATE, e não `public.enviar_resultado(` solto: o
      arquivo termina com `GRANT EXECUTE ON FUNCTION public.enviar_resultado(...)`,
      que vem DEPOIS do corpo e faria a fatia começar no lugar errado — o teste
      falhava sobre uma migração perfeitamente correta.
    */
    const criacoes = [...sql.matchAll(/CREATE\s+(?:OR REPLACE\s+)?FUNCTION public\.enviar_resultado\(/g)];
    expect(criacoes.length, `Não achei a definição de enviar_resultado em "${nome}".`).toBeGreaterThan(0);

    const corpo = sql.slice(criacoes[criacoes.length - 1].index);

    // Se a RPC passar a ter o próprio CASE de origens, acrescentar uma origem
    // exige lembrar de mais um lugar — e esquecer um lugar foi o que matou o
    // acúmulo de XP duas vezes neste repositório.
    expect(
      corpo.includes('aue_origin_score_v1'),
      `A última definição de enviar_resultado ("${nome}") não chama ` +
        'aue_origin_score_v1(). A tabela de origens tem que viver num lugar só do ' +
        'lado do banco.',
    ).toBe(true);
  });
});

describe('origens — as regras que dão sentido aos pesos', () => {
  it('só "Puxei ar" é artificial, e ela é a única a valer zero', () => {
    for (const origem of TODAS_AS_ORIGENS) {
      const artificial = calculateScore(SEM_SOM, origem).isArtificial;
      expect(artificial, `e_artificial de '${origem}'`).toBe(origem === 'Puxei ar');
      expect(pesoNoTs(origem) === 0, `peso zero de '${origem}'`).toBe(origem === 'Puxei ar');
    }

    const { nome, sql } = ultimaQueMenciona('resultados_e_artificial_coerente');
    expect(
      sql.includes("e_artificial = (tipo_de_origem = 'Puxei ar')"),
      `A última definição de resultados_e_artificial_coerente ("${nome}") mudou de ` +
        'forma. Se outra origem virar artificial, o cliente e o banco precisam mudar ' +
        'juntos — e este teste é o lugar de registrar a decisão.',
    ).toBe(true);
  });

  it('"Outro" fica no piso das origens honestas — nunca é a escolha ótima', () => {
    const outro = pesoNoTs('Outro');
    const honestas = TODAS_AS_ORIGENS.filter((o) => o !== 'Puxei ar').map(pesoNoTs);

    // Não é 0: zero é o peso de quem puxou ar, e empatar "não sei dizer" com
    // "eu fabriquei" seria mentira sobre o que aconteceu.
    expect(outro).toBeGreaterThan(0);
    // Não é o topo: se a opção genérica pagasse o máximo, ela viraria o atalho
    // de quem quer nota, e a origem deixaria de ser declaração.
    expect(outro).toBeLessThan(Math.max(...honestas));
    // É o piso: declarar o que de fato foi nunca pode pagar menos do que não
    // declarar nada.
    expect(outro).toBe(Math.min(...honestas));
  });

  it('o contrato §3.4 tem para onde mandar as cinco opções mínimas', () => {
    /*
      As cinco do contrato: cerveja, refrigerante, comida, puxando ar e outro.
      Cerveja e refrigerante NÃO são `tipo_de_origem` — são `subtipo_de_origem` de
      'Bebida', e é assim que a constraint `resultados_subtipo_de_origem_coerente`
      (20260807000023) espera receber. O que este teste trava é que exista um
      destino válido para cada uma das cinco.
    */
    const destinos: Array<[rotulo: string, tipo: Origin]> = [
      ['cerveja', 'Bebida'],
      ['refrigerante', 'Bebida'],
      ['comida', 'Comida'],
      ['puxando ar', 'Puxei ar'],
      ['outro', 'Outro'],
    ];

    for (const [rotulo, tipo] of destinos) {
      expect(
        (TODAS_AS_ORIGENS as readonly string[]).includes(tipo),
        `A opção mínima "${rotulo}" do §3.4 mapeia para '${tipo}', que não existe mais.`,
      ).toBe(true);
    }
  });
});
