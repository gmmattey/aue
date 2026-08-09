import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import { calculateScore, compareResults, TODAS_AS_ORIGENS } from './rules';
import type { Origin, ScoreResult } from './rules';
import type { AudioMetrics } from './engine';

/**
 * R2 — trava da fórmula `aue-score-v1`.
 *
 * O PROBLEMA QUE ESTE ARQUIVO EXISTE PARA IMPEDIR
 * ------------------------------------------------
 * A fórmula de score vive DUAS VEZES:
 *   * em TypeScript, em `src/features/audio/rules.ts` (prévia no browser);
 *   * em SQL, em
 *     `supabase/migrations/20260807000011_server_side_score_and_duel.sql`
 *     (`aue_score_v1`, `aue_origin_score_v1`, `aue_classification_v1`), que é
 *     quem manda de verdade e ainda alimenta a constraint
 *     `resultados_score_coherent`.
 *
 * Se alguém mudar um peso só de um lado, a constraint passa a rejeitar TODA
 * gravação. Em dev isso é silencioso (ninguém roda o Postgres aqui); em
 * produção derruba a feature principal.
 *
 * COMO A TRAVA FUNCIONA
 * ---------------------
 * Três camadas, de propósito redundantes:
 *
 *   1. VETORES FIXOS com resultado escrito na mão. Mudar qualquer peso ou
 *      faixa quebra estes números. Pega mudança feita nos dois lados ao mesmo
 *      tempo, que a camada 3 sozinha deixaria passar.
 *
 *   2. EXTRAÇÃO COMPORTAMENTAL do lado TS. Os pesos e as faixas não são
 *      exportados por `rules.ts`, então em vez de ler constantes o teste
 *      SONDA a função: alimenta uma parcial por vez no máximo e lê o score
 *      resultante. Isso mede o que a função faz, não o que ela declara.
 *
 *   3. EXTRAÇÃO TEXTUAL do lado SQL. O teste LÊ O ARQUIVO DA MIGRAÇÃO e puxa
 *      os pesos, os valores de origem e as faixas de classificação por regex.
 *      Depois compara com a camada 2. Divergiu em qualquer um dos lados,
 *      falha.
 *
 * LIMITE HONESTO DESTA TRAVA
 * --------------------------
 * A camada 3 confere o ARQUIVO da migração, não o BANCO. Se a migração 000011
 * nunca foi aplicada, ou se alguém redefinir `aue_score_v1` direto no Postgres
 * (ou numa migração posterior), este teste continua verde e o banco está
 * diferente. Não há Postgres neste ambiente para fechar essa lacuna — é o
 * mesmo limite já registrado no README. O que o teste garante é que os DOIS
 * ARQUIVOS versionados não divergem entre si.
 */

// -----------------------------------------------------------------------------
// Lado SQL: leitura do arquivo da migração
// -----------------------------------------------------------------------------

const MIGRATION_PATH = fileURLToPath(
  new URL(
    '../../../supabase/migrations/20260807000011_server_side_score_and_duel.sql',
    import.meta.url,
  ),
);

const SQL = readFileSync(MIGRATION_PATH, 'utf8');

/** Corpo de uma função SQL (o que está entre `AS $$` e `$$;`). */
function sqlFunctionBody(name: string): string {
  const declaration = SQL.indexOf(`FUNCTION public.${name}`);
  if (declaration === -1) {
    throw new Error(
      `Função public.${name} não existe mais em ${MIGRATION_PATH}. ` +
        'Se ela foi renomeada ou movida para outra migração, atualize este teste ' +
        '— não o apague.',
    );
  }
  const open = SQL.indexOf('AS $$', declaration);
  const close = SQL.indexOf('$$;', open);
  if (open === -1 || close === -1) {
    throw new Error(`Não consegui delimitar o corpo de public.${name}.`);
  }
  return SQL.slice(open + 'AS $$'.length, close);
}

const SCORE_BODY = sqlFunctionBody('aue_score_v1');
const CLASSIFICATION_BODY = sqlFunctionBody('aue_classification_v1');

/**
 * `aue_origin_score_v1` e `aue_compare_results_v1` já foram redefinidas depois
 * da 000011 — a 20260807000035 acrescentou a origem 'Outro', e a
 * 20260807000036 traduziu o corpo da comparação para as colunas em português.
 * Ler a 000011 para elas deixaria este arquivo conferindo uma definição que o
 * banco não usa mais — verde e inútil.
 *
 * `aue_score_v1` e `aue_classification_v1` continuam vindo da 000011 porque é
 * lá que elas vivem: nenhuma migração posterior tocou nelas, e os CHECKs de
 * coerência de `resultados` as prendem lá.
 *
 * A paridade do CONJUNTO de origens (a mais, a menos, renomeada) mora em
 * `origem.paridade.test.ts`. Aqui ficam só os VALORES.
 */
const DIR_MIGRACOES = fileURLToPath(new URL('../../../supabase/migrations', import.meta.url));

/** Conteúdo da ÚLTIMA migração que menciona um trecho. */
function ultimaMigracaoQueMenciona(trecho: string): string {
  const arquivos = readdirSync(DIR_MIGRACOES)
    .filter((nome) => nome.endsWith('.sql'))
    .filter((nome) => readFileSync(`${DIR_MIGRACOES}/${nome}`, 'utf8').includes(trecho))
    .sort();

  if (arquivos.length === 0) {
    throw new Error(`Nenhuma migração menciona "${trecho}". Atualize este teste — não o apague.`);
  }

  return readFileSync(`${DIR_MIGRACOES}/${arquivos[arquivos.length - 1]}`, 'utf8');
}

/**
 * Corpo da ÚLTIMA definição de uma função, em qualquer migração.
 *
 * Aceita `CREATE FUNCTION` e `CREATE OR REPLACE FUNCTION`: a 20260807000036
 * precisou derrubar funções para renomear parâmetros, e uma âncora presa a
 * `OR REPLACE` deixaria de encontrá-las.
 */
function corpoDaUltimaDefinicao(nome: string): string {
  const assinatura = `FUNCTION public.${nome}`;
  const sql = ultimaMigracaoQueMenciona(assinatura);

  const criacoes = [
    ...sql.matchAll(new RegExp(`CREATE\\s+(?:OR REPLACE\\s+)?FUNCTION public\\.${nome}\\b`, 'g')),
  ];
  if (criacoes.length === 0) {
    throw new Error(`Não achei a definição de public.${nome} na última migração que a menciona.`);
  }

  const abre = sql.indexOf('AS $$', criacoes[criacoes.length - 1].index);
  return sql.slice(abre + 'AS $$'.length, sql.indexOf('$$;', abre));
}

const ORIGIN_BODY = corpoDaUltimaDefinicao('aue_origin_score_v1');
const COMPARE_BODY = corpoDaUltimaDefinicao('aue_compare_results_v1');

/** Peso de uma parcial dentro de `aue_score_v1`: `(p_duration * 0.25)`. */
function sqlWeight(param: string): number {
  const match = SCORE_BODY.match(
    new RegExp(`\\(\\s*p_${param}\\s*\\*\\s*([0-9]*\\.?[0-9]+)\\s*\\)`),
  );
  if (!match) {
    throw new Error(`Não achei o peso de p_${param} em aue_score_v1.`);
  }
  return Number(match[1]);
}

/** Valor de uma origem dentro de `aue_origin_score_v1`. */
function sqlOriginScore(origin: Origin): number {
  const match = ORIGIN_BODY.match(
    new RegExp(`WHEN\\s+'${origin}'\\s+THEN\\s+([0-9]*\\.?[0-9]+)`),
  );
  if (!match) {
    throw new Error(`Não achei a origem '${origin}' em aue_origin_score_v1.`);
  }
  return Number(match[1]);
}

interface SqlBand {
  /** Limite superior exclusivo. `Infinity` representa o ramo `ELSE`. */
  upperBound: number;
  label: string;
}

/** Faixas de `aue_classification_v1`, na ordem em que aparecem no CASE. */
function sqlClassificationBands(): SqlBand[] {
  const bands: SqlBand[] = [];
  const when = /WHEN\s+p_score\s*<\s*([0-9]*\.?[0-9]+)\s+THEN\s+'([^']+)'/g;
  let match: RegExpExecArray | null;
  while ((match = when.exec(CLASSIFICATION_BODY)) !== null) {
    bands.push({ upperBound: Number(match[1]), label: match[2] });
  }
  const fallback = CLASSIFICATION_BODY.match(/ELSE\s+'([^']+)'/);
  if (!fallback) {
    throw new Error('aue_classification_v1 não tem ramo ELSE.');
  }
  bands.push({ upperBound: Number.POSITIVE_INFINITY, label: fallback[1] });
  return bands;
}

// -----------------------------------------------------------------------------
// Lado TS: sondagem comportamental
// -----------------------------------------------------------------------------

/**
 * Tetos de normalização de `rules.ts` (`normalize(value, 0, max)`).
 *
 * Estão duplicados aqui de propósito: são a ponte entre "métrica bruta de
 * áudio" e "parcial 0-100", e o teste precisa conseguir pedir uma parcial
 * exata. Se alguém mexer nestes tetos em `rules.ts` sem mexer aqui, os testes
 * de pesos falham (a parcial deixa de bater 100) — que é o comportamento
 * desejado, já que mexer neles muda o score de todo mundo.
 */
const NORMALIZATION_MAX = {
  duration: 5,
  rms: 0.3,
  bassEnergy: 0.2,
  texture: 0.05,
} as const;

interface Partials {
  duration?: number;
  power?: number;
  depth?: number;
  texture?: number;
}

/** Converte parciais 0-100 nas métricas brutas que as produzem. */
function metricsFor(partials: Partials): AudioMetrics {
  return {
    duration: ((partials.duration ?? 0) / 100) * NORMALIZATION_MAX.duration,
    rms: ((partials.power ?? 0) / 100) * NORMALIZATION_MAX.rms,
    bassEnergy: ((partials.depth ?? 0) / 100) * NORMALIZATION_MAX.bassEnergy,
    texture: ((partials.texture ?? 0) / 100) * NORMALIZATION_MAX.texture,
  };
}

function scoreOf(partials: Partials, origin: Origin): number {
  return calculateScore(metricsFor(partials), origin).score;
}

/**
 * Peso efetivo de uma parcial, medido: manda a parcial no máximo, todas as
 * outras em zero, e usa 'Puxei ar' (origem = 0) para não somar o termo de
 * origem.
 */
function tsWeight(partial: keyof Partials): number {
  return scoreOf({ [partial]: 100 }, 'Puxei ar') / 100;
}

/** Peso efetivo do termo de origem: tudo zerado, origem no máximo. */
function tsOriginWeight(): number {
  return scoreOf({}, 'Espontâneo') / 100;
}

/**
 * Métricas + origem que produzem um score alvo.
 *
 * Com as quatro parciais iguais a `x`, o score é `x * (soma dos pesos das
 * parciais) + origem * peso_origem`. Duas faixas cobrem 0-100:
 *   * 'Puxei ar' (origem 0) alcança 0 a 90;
 *   * 'Espontâneo' (origem 100, +10) alcança 10 a 100.
 */
const PARTIAL_WEIGHT_SUM =
  tsWeight('duration') + tsWeight('power') + tsWeight('depth') + tsWeight('texture');
const ORIGIN_TERM_MAX = tsOriginWeight() * 100;

function inputsForScore(target: number): { metrics: AudioMetrics; origin: Origin } {
  if (target <= 90) {
    const x = target / PARTIAL_WEIGHT_SUM;
    return {
      metrics: metricsFor({ duration: x, power: x, depth: x, texture: x }),
      origin: 'Puxei ar',
    };
  }

  const x = (target - ORIGIN_TERM_MAX) / PARTIAL_WEIGHT_SUM;
  return {
    metrics: metricsFor({ duration: x, power: x, depth: x, texture: x }),
    origin: 'Espontâneo',
  };
}

function classificationAt(target: number): string {
  const { metrics, origin } = inputsForScore(target);
  return calculateScore(metrics, origin).classification;
}

/**
 * Varre 0..100 em passos de 0,01 e devolve onde a classificação muda.
 *
 * O passo é contado em INTEIROS (`i / 100`) e não acumulado com `+= 0.01`:
 * acumulação de float faria o ponto de corte cair meio passo para o lado
 * errado e o teste piscaria sem nenhuma mudança de código.
 */
const SCAN_STEP = 0.01;

function observedBands(): SqlBand[] {
  const bands: SqlBand[] = [];
  let current = classificationAt(0);
  for (let i = 0; i <= 10000; i++) {
    const s = i / 100;
    const label = classificationAt(s);
    if (label !== current) {
      bands.push({ upperBound: s, label: current });
      current = label;
    }
  }
  bands.push({ upperBound: Number.POSITIVE_INFINITY, label: current });
  return bands;
}

function resultWith(score: number, depth: number, power: number, duration: number): ScoreResult {
  return {
    score,
    classification: 'irrelevante para o desempate',
    isArtificial: false,
    partialScores: { duration, power, depth, texture: 0, origin: 0 },
  };
}

// =============================================================================

describe('aue-score-v1 — vetores fixos (camada 1)', () => {
  // Mudar QUALQUER peso ou faixa quebra esta tabela. Os valores foram
  // calculados na mão a partir de 0,25/0,20/0,25/0,20/0,10.
  const vectors: Array<{
    name: string;
    partials: Required<Partials>;
    origin: Origin;
    score: number;
    classification: string;
    isArtificial: boolean;
  }> = [
    {
      name: 'tudo no zero, puxando ar',
      partials: { duration: 0, power: 0, depth: 0, texture: 0 },
      origin: 'Puxei ar',
      score: 0,
      classification: 'Arroto de Hamster',
      isArtificial: true,
    },
    {
      name: 'tudo no máximo, espontâneo — o teto',
      partials: { duration: 100, power: 100, depth: 100, texture: 100 },
      origin: 'Espontâneo',
      score: 100,
      classification: 'O ARROTO',
      isArtificial: false,
    },
    {
      name: 'tudo no máximo, mas puxando ar — origem zera 10% do bolo',
      // 100*0,90 + 0*0,10 = 90. O teto de quem puxa ar é 90, nunca 100.
      partials: { duration: 100, power: 100, depth: 100, texture: 100 },
      origin: 'Puxei ar',
      score: 90,
      classification: 'Monstro do Esgoto',
      isArtificial: true,
    },
    {
      name: 'parciais assimétricas com Comida',
      // 80*0,25 + 60*0,20 + 40*0,25 + 20*0,20 + 90*0,10
      // =  20   +   12    +   10    +    4    +    9    = 55
      partials: { duration: 80, power: 60, depth: 40, texture: 20 },
      origin: 'Comida',
      score: 55,
      classification: 'Arroto Respeitável',
      isArtificial: false,
    },
    {
      name: 'parciais iguais com Bebida',
      // 50*0,90 + 80*0,10 = 45 + 8 = 53
      partials: { duration: 50, power: 50, depth: 50, texture: 50 },
      origin: 'Bebida',
      score: 53,
      classification: 'Arroto Respeitável',
      isArtificial: false,
    },
    {
      name: 'quase perfeito, espontâneo',
      // 90*0,90 + 100*0,10 = 81 + 10 = 91
      partials: { duration: 90, power: 90, depth: 90, texture: 90 },
      origin: 'Espontâneo',
      score: 91,
      classification: 'Monstro do Esgoto',
      isArtificial: false,
    },
    {
      name: 'só profundidade, espontâneo',
      // 100*0,25 + 100*0,10 = 35
      partials: { duration: 0, power: 0, depth: 100, texture: 0 },
      origin: 'Espontâneo',
      score: 35,
      classification: 'Tentativa Honesta',
      isArtificial: false,
    },
  ];

  for (const vector of vectors) {
    it(vector.name, () => {
      const result = calculateScore(metricsFor(vector.partials), vector.origin);
      // Tolerância de 1e-9: aritmética de float64, não folga de regra.
      expect(result.score).toBeCloseTo(vector.score, 9);
      expect(result.classification).toBe(vector.classification);
      expect(result.isArtificial).toBe(vector.isArtificial);
    });
  }

  it('nunca ultrapassa 0..100 mesmo com parciais fora da faixa', () => {
    const acima = calculateScore(
      metricsFor({ duration: 500, power: 500, depth: 500, texture: 500 }),
      'Espontâneo',
    );
    expect(acima.score).toBe(100);

    const abaixo = calculateScore(
      metricsFor({ duration: -500, power: -500, depth: -500, texture: -500 }),
      'Puxei ar',
    );
    expect(abaixo.score).toBe(0);
  });
});

describe('aue-score-v1 — TS espelha o SQL da migração 000011 (camadas 2 e 3)', () => {
  it('os pesos das parciais batem entre rules.ts e aue_score_v1', () => {
    expect(tsWeight('duration')).toBeCloseTo(sqlWeight('duration'), 9);
    expect(tsWeight('power')).toBeCloseTo(sqlWeight('power'), 9);
    expect(tsWeight('depth')).toBeCloseTo(sqlWeight('depth'), 9);
    expect(tsWeight('texture')).toBeCloseTo(sqlWeight('texture'), 9);
    expect(tsOriginWeight()).toBeCloseTo(sqlWeight('origin_score'), 9);
  });

  it('os pesos somam 1 — score máximo é 100 sem depender do clamp', () => {
    const soma =
      sqlWeight('duration') +
      sqlWeight('power') +
      sqlWeight('depth') +
      sqlWeight('texture') +
      sqlWeight('origin_score');
    expect(soma).toBeCloseTo(1, 9);
  });

  it('os valores de origem batem entre rules.ts e aue_origin_score_v1', () => {
    // A lista vem de `rules.ts`, e não de um literal aqui: uma origem nova
    // entra neste teste sozinha, em vez de esperar alguém lembrar.
    for (const origin of TODAS_AS_ORIGENS) {
      const ts = calculateScore(metricsFor({}), origin).partialScores.origin;
      expect(ts, `origem ${origin}`).toBe(sqlOriginScore(origin));
    }
  });

  it('as faixas de classificação batem entre rules.ts e aue_classification_v1', () => {
    // Comparação de tabela inteira: pega faixa a mais, a menos, renomeada ou
    // com limite deslocado, dos dois lados.
    const observed = observedBands();
    const expected = sqlClassificationBands();

    expect(
      observed.map((b) => b.label),
      'as faixas do TS e do SQL divergiram em quantidade, ordem ou nome',
    ).toEqual(expected.map((b) => b.label));

    for (const [i, band] of expected.entries()) {
      if (band.upperBound === Number.POSITIVE_INFINITY) {
        expect(observed[i].upperBound).toBe(Number.POSITIVE_INFINITY);
        continue;
      }
      // Margem de um passo da varredura: o corte só pode ser localizado com a
      // resolução com que foi procurado. Deslocar uma faixa em 0,01 é mudança
      // sem efeito prático; deslocar em 1 ponto quebra o teste.
      expect(
        Math.abs(observed[i].upperBound - band.upperBound),
        `faixa "${band.label}": SQL corta em ${band.upperBound}, TS corta em ${observed[i].upperBound}`,
      ).toBeLessThanOrEqual(SCAN_STEP * 1.5);
    }
  });

  it('a constraint de coerência existe e tem tolerância desprezível', () => {
    const match = SQL.match(
      /resultados_score_coherent[\s\S]*?abs\(score - public\.aue_score_v1\([^)]*\)\)\s*<=\s*([0-9]*\.?[0-9]+)/,
    );
    expect(
      match,
      'a constraint resultados_score_coherent sumiu da migração 000011',
    ).not.toBeNull();
    // Se alguém afrouxar a tolerância para esconder divergência de fórmula,
    // este teste é o que reclama.
    expect(Number(match![1])).toBeLessThanOrEqual(0.01);
  });

  it('is_artificial continua sendo exatamente "puxou ar" nos dois lados', () => {
    expect(calculateScore(metricsFor({}), 'Puxei ar').isArtificial).toBe(true);
    expect(calculateScore(metricsFor({}), 'Espontâneo').isArtificial).toBe(false);
    // Lê a ÚLTIMA declaração da constraint, não a da 000011: ela foi
    // redeclarada na 20260807000036 com as colunas em português.
    expect(ultimaMigracaoQueMenciona('resultados_e_artificial_coerente')).toContain(
      "e_artificial = (tipo_de_origem = 'Puxei ar')",
    );
  });
});

describe('desempate do duelo — compareResults vs aue_compare_results_v1', () => {
  it('score decide primeiro', () => {
    expect(compareResults(resultWith(80, 0, 0, 0), resultWith(79, 100, 100, 100))).toBe('A');
    expect(compareResults(resultWith(79, 100, 100, 100), resultWith(80, 0, 0, 0))).toBe('B');
  });

  it('empatado no score, profundidade decide', () => {
    expect(compareResults(resultWith(80, 50, 0, 0), resultWith(80, 49, 100, 100))).toBe('A');
    expect(compareResults(resultWith(80, 49, 100, 100), resultWith(80, 50, 0, 0))).toBe('B');
  });

  it('empatado no score e na profundidade, potência decide', () => {
    expect(compareResults(resultWith(80, 50, 30, 0), resultWith(80, 50, 29, 100))).toBe('A');
    expect(compareResults(resultWith(80, 50, 29, 100), resultWith(80, 50, 30, 0))).toBe('B');
  });

  it('empatado no score, profundidade e potência, duração decide', () => {
    expect(compareResults(resultWith(80, 50, 30, 10), resultWith(80, 50, 30, 9))).toBe('A');
    expect(compareResults(resultWith(80, 50, 30, 9), resultWith(80, 50, 30, 10))).toBe('B');
  });

  it('tudo igual é Empate Técnico do Gás', () => {
    expect(compareResults(resultWith(80, 50, 30, 10), resultWith(80, 50, 30, 10))).toBe('TIE');
  });

  it('a ordem dos critérios no SQL é a mesma: nota, profundidade, potência, duração', () => {
    const ordem = ['nota', 'profundidade', 'potencia', 'duracao'].map((campo) =>
      COMPARE_BODY.indexOf(`a.${campo} >`),
    );
    expect(ordem, 'algum critério sumiu de aue_compare_results_v1').not.toContain(-1);
    expect(ordem, 'a ordem dos desempates divergiu do TS').toEqual([...ordem].sort((x, y) => x - y));
  });
});
