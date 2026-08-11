import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import { calculateScore, compareResults, parciaisAcusticas, TODAS_AS_ORIGENS } from './rules';
import type { Origin, ScoreResult } from './rules';
import type { AudioMetrics } from './engine';

/**
 * Guarda do Auê Score v2.
 *
 * A fórmula continua vivendo dos dois lados da fronteira:
 * - TypeScript: prévia local em `rules.ts`;
 * - Postgres: `public.aue_score_v2`, que grava a nota oficial.
 *
 * O teste mede comportamento do TS e lê a última definição SQL. Não basta os
 * dois comentários dizerem a mesma coisa: os números precisam bater.
 */

const DIR_MIGRACOES = fileURLToPath(new URL('../../../supabase/migrations', import.meta.url));

function ultimaMigracaoQueMenciona(trecho: string): string {
  const arquivos = readdirSync(DIR_MIGRACOES)
    .filter((nome) => nome.endsWith('.sql'))
    .filter((nome) => readFileSync(`${DIR_MIGRACOES}/${nome}`, 'utf8').includes(trecho))
    .sort();

  if (arquivos.length === 0) {
    throw new Error(`Nenhuma migração menciona "${trecho}".`);
  }

  return readFileSync(`${DIR_MIGRACOES}/${arquivos[arquivos.length - 1]}`, 'utf8');
}

function corpoDaUltimaDefinicao(nome: string): string {
  const assinatura = `FUNCTION public.${nome}`;
  const sql = ultimaMigracaoQueMenciona(assinatura);
  const criacoes = [
    ...sql.matchAll(new RegExp(`CREATE\\s+(?:OR REPLACE\\s+)?FUNCTION public\\.${nome}\\b`, 'g')),
  ];

  if (criacoes.length === 0) {
    throw new Error(`Não achei a definição de public.${nome}.`);
  }

  const inicio = criacoes[criacoes.length - 1].index ?? 0;
  const abre = sql.indexOf('AS $$', inicio);
  const fecha = sql.indexOf('$$;', abre);
  if (abre === -1 || fecha === -1) throw new Error(`Corpo de public.${nome} inválido.`);
  return sql.slice(abre + 'AS $$'.length, fecha);
}

const SCORE_BODY = corpoDaUltimaDefinicao('aue_score_v2');
const CLASSIFICATION_BODY = corpoDaUltimaDefinicao('aue_classification_v1');
const ORIGIN_BODY = corpoDaUltimaDefinicao('aue_origin_score_v1');
const COMPARE_BODY = corpoDaUltimaDefinicao('aue_compare_results_v1');

function sqlWeight(param: string): number {
  const match = SCORE_BODY.match(
    new RegExp(`\\(\\s*p_${param}\\s*\\*\\s*([0-9]*\\.?[0-9]+)\\s*\\)`),
  );
  if (!match) throw new Error(`Não achei o peso de p_${param} em aue_score_v2.`);
  return Number(match[1]);
}

function sqlOriginScore(origin: Origin): number {
  const match = ORIGIN_BODY.match(
    new RegExp(`WHEN\\s+'${origin}'\\s+THEN\\s+([0-9]*\\.?[0-9]+)`),
  );
  if (!match) throw new Error(`Não achei a origem '${origin}' em aue_origin_score_v1.`);
  return Number(match[1]);
}

interface SqlBand {
  upperBound: number;
  label: string;
}

function sqlClassificationBands(): SqlBand[] {
  const bands: SqlBand[] = [];
  const when = /WHEN\s+p_score\s*<\s*([0-9]*\.?[0-9]+)\s+THEN\s+'([^']+)'/g;
  let match: RegExpExecArray | null;
  while ((match = when.exec(CLASSIFICATION_BODY)) !== null) {
    bands.push({ upperBound: Number(match[1]), label: match[2] });
  }
  const fallback = CLASSIFICATION_BODY.match(/ELSE\s+'([^']+)'/);
  if (!fallback) throw new Error('aue_classification_v1 ficou sem ELSE.');
  bands.push({ upperBound: Number.POSITIVE_INFINITY, label: fallback[1] });
  return bands;
}

const CALIBRACAO = {
  folego: { min: 0.40, max: 2.50 },
  forca: { min: 0.03, max: 0.20 },
  // Reproduz o BiquadFilter low-pass de 150 Hz do Web Audio (Q padrão 1).
  grave: { min: 0.10, max: 0.30 },
  textureMax: 0.05,
} as const;

interface Partials {
  duration?: number;
  power?: number;
  depth?: number;
  texture?: number;
}

function interpola(parcial: number, min: number, max: number): number {
  return min + (parcial / 100) * (max - min);
}

/** Produz métricas brutas que geram exatamente as parciais pedidas. */
function metricsFor(partials: Partials): AudioMetrics {
  const folego = interpola(partials.duration ?? 0, CALIBRACAO.folego.min, CALIBRACAO.folego.max);
  const forca = interpola(partials.power ?? 0, CALIBRACAO.forca.min, CALIBRACAO.forca.max);
  const grave = interpola(partials.depth ?? 0, CALIBRACAO.grave.min, CALIBRACAO.grave.max);
  const texture = ((partials.texture ?? 0) / 100) * CALIBRACAO.textureMax;

  return {
    duration: folego,
    rms: forca,
    bassEnergy: forca * grave,
    texture,
    activeDuration: folego,
    activeRms: forca,
    bassRatio: grave,
  };
}

function scoreOf(partials: Partials, origin: Origin): number {
  return calculateScore(metricsFor(partials), origin).score;
}

function tsWeight(partial: keyof Partials): number {
  return scoreOf({ [partial]: 100 }, 'Puxei ar') / 100;
}

function tsOriginWeight(): number {
  return scoreOf({}, 'Espontâneo') / 100;
}

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

const SCAN_STEP = 0.01;

function observedBands(): SqlBand[] {
  const bands: SqlBand[] = [];
  let current = classificationAt(0);

  for (let i = 0; i <= 10000; i++) {
    const score = i / 100;
    const label = classificationAt(score);
    if (label !== current) {
      bands.push({ upperBound: score, label: current });
      current = label;
    }
  }

  bands.push({ upperBound: Number.POSITIVE_INFINITY, label: current });
  return bands;
}

function resultWith(score: number, depth: number, power: number, duration: number): ScoreResult {
  return {
    score,
    classification: 'irrelevante para desempate',
    isArtificial: false,
    partialScores: { duration, power, depth, texture: 0, origin: 0 },
  };
}

describe('calibração acústica — FORÇA, FÔLEGO e GRAVE', () => {
  it('trava os limites medidos do lote de 10/08/2026', () => {
    expect(parciaisAcusticas(metricsFor({ duration: 0, power: 0, depth: 0 }))).toMatchObject({
      duration: 0,
      power: 0,
      depth: 0,
    });

    expect(parciaisAcusticas(metricsFor({ duration: 100, power: 100, depth: 100 }))).toMatchObject({
      duration: 100,
      power: 100,
      depth: 100,
    });
  });

  it('usa trecho ativo, não o tamanho total do arquivo', () => {
    const metrics = metricsFor({ duration: 50, power: 50, depth: 50 });
    metrics.duration = 10;
    metrics.rms = 0.30;
    metrics.bassEnergy = 0.30;

    const parciais = parciaisAcusticas(metrics);
    expect(parciais.duration).toBeCloseTo(50, 9);
    expect(parciais.power).toBeCloseTo(50, 9);
    expect(parciais.depth).toBeCloseTo(50, 9);
  });

  it('mantém fallback para métricas antigas sem os campos calibrados', () => {
    const antigas: AudioMetrics = {
      duration: 1.45,
      rms: 0.115,
      bassEnergy: 0.115 * 0.20,
      texture: 0.01,
    };
    const parciais = parciaisAcusticas(antigas);
    expect(parciais.duration).toBeCloseTo(50, 6);
    expect(parciais.power).toBeCloseTo(50, 6);
    expect(parciais.depth).toBeCloseTo(50, 6);
  });
});

describe('aue-score-v2 — vetores fixos', () => {
  const vectors: Array<{
    name: string;
    partials: Required<Partials>;
    origin: Origin;
    score: number;
    classification: string;
  }> = [
    {
      name: 'tudo zero e puxando ar',
      partials: { duration: 0, power: 0, depth: 0, texture: 0 },
      origin: 'Puxei ar',
      score: 0,
      classification: 'Arroto de Hamster',
    },
    {
      name: 'as três categorias no máximo e espontâneo',
      partials: { duration: 100, power: 100, depth: 100, texture: 0 },
      origin: 'Espontâneo',
      score: 100,
      classification: 'O ARROTO',
    },
    {
      name: 'as três categorias no máximo mas puxando ar',
      partials: { duration: 100, power: 100, depth: 100, texture: 100 },
      origin: 'Puxei ar',
      score: 90,
      classification: 'Monstro do Esgoto',
    },
    {
      name: 'parciais assimétricas com Comida',
      partials: { duration: 80, power: 60, depth: 40, texture: 100 },
      origin: 'Comida',
      score: 63,
      classification: 'Pedreiro Certificado',
    },
    {
      name: 'parciais iguais com Bebida',
      partials: { duration: 50, power: 50, depth: 50, texture: 50 },
      origin: 'Bebida',
      score: 53,
      classification: 'Arroto Respeitável',
    },
    {
      name: 'só Grave, espontâneo',
      partials: { duration: 0, power: 0, depth: 100, texture: 100 },
      origin: 'Espontâneo',
      score: 40,
      classification: 'Arroto Respeitável',
    },
  ];

  for (const vector of vectors) {
    it(vector.name, () => {
      const result = calculateScore(metricsFor(vector.partials), vector.origin);
      expect(result.score).toBeCloseTo(vector.score, 9);
      expect(result.classification).toBe(vector.classification);
      expect(result.isArtificial).toBe(vector.origin === 'Puxei ar');
    });
  }

  it('textura não muda mais a nota', () => {
    expect(scoreOf({ texture: 0 }, 'Puxei ar')).toBeCloseTo(0, 9);
    expect(scoreOf({ texture: 100 }, 'Puxei ar')).toBeCloseTo(0, 9);
  });
});

describe('aue-score-v2 — TS e SQL contam a mesma história', () => {
  it('pesos são 30/30/30/0/10 e batem nos dois lados', () => {
    for (const parcial of ['duration', 'power', 'depth', 'texture'] as const) {
      expect(tsWeight(parcial)).toBeCloseTo(sqlWeight(parcial), 9);
    }
    expect(tsOriginWeight()).toBeCloseTo(sqlWeight('origin_score'), 9);

    expect(sqlWeight('duration')).toBeCloseTo(0.30, 9);
    expect(sqlWeight('power')).toBeCloseTo(0.30, 9);
    expect(sqlWeight('depth')).toBeCloseTo(0.30, 9);
    expect(sqlWeight('texture')).toBeCloseTo(0, 9);
    expect(sqlWeight('origin_score')).toBeCloseTo(0.10, 9);
  });

  it('pesos somam 1', () => {
    const soma =
      sqlWeight('duration') +
      sqlWeight('power') +
      sqlWeight('depth') +
      sqlWeight('texture') +
      sqlWeight('origin_score');
    expect(soma).toBeCloseTo(1, 9);
  });

  it('origens continuam em paridade com aue_origin_score_v1', () => {
    for (const origin of TODAS_AS_ORIGENS) {
      expect(calculateScore(metricsFor({}), origin).partialScores.origin).toBe(sqlOriginScore(origin));
    }
  });

  it('faixas persistidas de classificação permanecem em paridade', () => {
    const observed = observedBands();
    const expected = sqlClassificationBands();
    expect(observed.map((b) => b.label)).toEqual(expected.map((b) => b.label));

    for (const [i, band] of expected.entries()) {
      if (band.upperBound === Number.POSITIVE_INFINITY) continue;
      expect(Math.abs(observed[i].upperBound - band.upperBound)).toBeLessThanOrEqual(
        SCAN_STEP * 1.5,
      );
    }
  });

  it('a constraint vigente exige aue_score_v2 com tolerância de no máximo 0,01', () => {
    const sql = ultimaMigracaoQueMenciona('resultados_nota_coerente');
    const match = sql.match(
      /resultados_nota_coerente[\s\S]*?abs\(nota - public\.aue_score_v2\([^)]*\)\)\s*<=\s*([0-9]*\.?[0-9]+)/,
    );
    expect(match).not.toBeNull();
    expect(Number(match![1])).toBeLessThanOrEqual(0.01);
  });

  it('enviar_resultado vigente grava pela v2', () => {
    const body = corpoDaUltimaDefinicao('enviar_resultado');
    expect(body).toContain('public.aue_score_v2(');
    expect(body).not.toContain('public.aue_score_v1(');
  });

  it('isArtificial continua sendo exatamente "Puxei ar"', () => {
    expect(calculateScore(metricsFor({}), 'Puxei ar').isArtificial).toBe(true);
    expect(calculateScore(metricsFor({}), 'Espontâneo').isArtificial).toBe(false);
  });
});

describe('desempate — nota, Grave, Força, Fôlego', () => {
  it('nota decide primeiro', () => {
    expect(compareResults(resultWith(80, 0, 0, 0), resultWith(79, 100, 100, 100))).toBe('A');
  });

  it('empatado na nota, Grave decide', () => {
    expect(compareResults(resultWith(80, 50, 0, 0), resultWith(80, 49, 100, 100))).toBe('A');
  });

  it('empatado também no Grave, Força decide', () => {
    expect(compareResults(resultWith(80, 50, 30, 0), resultWith(80, 50, 29, 100))).toBe('A');
  });

  it('empatado também na Força, Fôlego decide', () => {
    expect(compareResults(resultWith(80, 50, 30, 10), resultWith(80, 50, 30, 9))).toBe('A');
  });

  it('tudo igual é empate', () => {
    expect(compareResults(resultWith(80, 50, 30, 10), resultWith(80, 50, 30, 10))).toBe('TIE');
  });

  it('SQL mantém a mesma ordem', () => {
    const ordem = ['nota', 'profundidade', 'potencia', 'duracao'].map((campo) =>
      COMPARE_BODY.indexOf(`a.${campo} >`),
    );
    expect(ordem).not.toContain(-1);
    expect(ordem).toEqual([...ordem].sort((a, b) => a - b));
  });
});
