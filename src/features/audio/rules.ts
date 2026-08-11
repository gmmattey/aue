import { type AudioMetrics } from './engine';

export type Origin = 'Espontâneo' | 'Comida' | 'Bebida' | 'Puxei ar' | 'Outro';

export const TODAS_AS_ORIGENS: readonly Origin[] = [
  'Espontâneo',
  'Comida',
  'Bebida',
  'Puxei ar',
  'Outro',
];

export interface ScoreResult {
  score: number;
  classification: string;
  isArtificial: boolean;
  partialScores: {
    /** FÔLEGO na interface. */
    duration: number;
    /** FORÇA na interface. */
    power: number;
    /** GRAVE na interface. */
    depth: number;
    /** Legado/diagnóstico. Não pesa mais na nota v2. */
    texture: number;
    origin: number;
  };
}

const ORIGIN_SCORES: Record<Origin, number> = {
  'Espontâneo': 100,
  'Comida': 90,
  'Bebida': 80,
  'Puxei ar': 0,
  'Outro': 80,
};

function normalize(value: number, min: number, max: number): number {
  if (value <= min) return 0;
  if (value >= max) return 100;
  return ((value - min) / (max - min)) * 100;
}

/**
 * Régua do Auê Score v2, medida no banco de 43 arquivos recebido em 2026-08-10.
 *
 * Depois de remover 8 duplicatas e 3 gravações de voz, sobraram 32 arrotos
 * únicos. Os limites abaixo não são "máximos físicos": são a faixa de jogo que
 * espalha aquele banco de exemplos reais por 0..100 sem premiar silêncio antes
 * ou depois do arroto.
 *
 * O grave foi calibrado reproduzindo o BiquadFilter low-pass de 150 Hz usado
 * pelo Web Audio (Q padrão 1), e não com um Butterworth offline diferente.
 *
 * Detalhes e tabela por arquivo:
 * `docs/technical/calibracao-motor-arroto-2026-08.md`.
 */
const CALIBRACAO_V2 = {
  forca: { min: 0.03, max: 0.20 },
  folego: { min: 0.40, max: 2.50 },
  grave: { min: 0.10, max: 0.30 },
} as const;

/** As parciais acústicas normalizadas em 0-100. */
export interface ParciaisAcusticas {
  /** Fôlego — duração do maior trecho ativo. */
  duration: number;
  /** Força — RMS do trecho ativo. */
  power: number;
  /** Grave — proporção de energia abaixo de 150 Hz no trecho ativo. */
  depth: number;
  /** ZCR legado. Persistido por compatibilidade, mas com peso zero na v2. */
  texture: number;
}

/**
 * Traduz a medição bruta para as três categorias de jogo: FORÇA, FÔLEGO e
 * GRAVE. A nota não tenta mais transformar "textura/nojeira" em qualidade.
 *
 * Os fallbacks mantêm compatibilidade com testes/consumidores antigos que ainda
 * constroem `AudioMetrics` sem as três métricas calibradas. Em produção,
 * `analyzeAudio` sempre entrega `activeDuration`, `activeRms` e `bassRatio`.
 */
export function parciaisAcusticas(metrics: AudioMetrics): ParciaisAcusticas {
  const folegoBruto = metrics.activeDuration ?? metrics.duration;
  const forcaBruta = metrics.activeRms ?? metrics.rms;
  const graveBruto =
    metrics.bassRatio ?? (metrics.rms > 0 ? metrics.bassEnergy / metrics.rms : 0);

  return {
    duration: normalize(folegoBruto, CALIBRACAO_V2.folego.min, CALIBRACAO_V2.folego.max),
    power: normalize(forcaBruta, CALIBRACAO_V2.forca.min, CALIBRACAO_V2.forca.max),
    depth: normalize(graveBruto, CALIBRACAO_V2.grave.min, CALIBRACAO_V2.grave.max),
    // Mantido só para persistência/diagnóstico. Não participa da nota v2.
    texture: normalize(metrics.texture, 0, 0.05),
  };
}

/**
 * Auê Score v2.
 *
 * A v1 dava 20% da nota para ZCR ("textura/sujeira") e media duração sobre o
 * arquivo inteiro. No banco real isso comprimia quase todos os arrotos na mesma
 * faixa e permitia que silêncio/espera ajudassem o resultado.
 *
 * A v2 usa somente as três categorias aprovadas de áudio, com pesos iguais:
 *
 * - FÔLEGO 30%
 * - FORÇA 30%
 * - GRAVE 30%
 * - ORIGEM 10% (regra de produto já existente)
 *
 * `texture` continua no contrato com o banco para não exigir uma migração de
 * coluna destrutiva, mas pesa ZERO. A prévia local precisa continuar em paridade
 * com `public.aue_nota_v2`, criado na migração 20260811000001.
 */
export function calculateScore(metrics: AudioMetrics, origin: Origin): ScoreResult {
  const {
    duration: durationScore,
    power: powerScore,
    depth: depthScore,
    texture: textureScore,
  } = parciaisAcusticas(metrics);

  const originScore = ORIGIN_SCORES[origin];

  const score =
    durationScore * 0.30 +
    powerScore * 0.30 +
    depthScore * 0.30 +
    originScore * 0.10;

  // As faixas persistidas ficam inalteradas nesta calibração. A Arena apresenta
  // reações de jogo; estes títulos continuam como contrato histórico do banco.
  let classification = 'Desconhecido';
  if (score < 20) classification = 'Arroto de Hamster';
  else if (score < 40) classification = 'Tentativa Honesta';
  else if (score < 60) classification = 'Arroto Respeitável';
  else if (score < 75) classification = 'Pedreiro Certificado';
  else if (score < 85) classification = 'Trovão Gastrointestinal';
  else if (score < 95) classification = 'Monstro do Esgoto';
  else if (score < 100) classification = 'Arma Biológica';
  else classification = 'O ARROTO';

  return {
    score: Math.min(100, Math.max(0, score)),
    classification,
    isArtificial: origin === 'Puxei ar',
    partialScores: {
      duration: durationScore,
      power: powerScore,
      depth: depthScore,
      texture: textureScore,
      origin: originScore,
    },
  };
}

/**
 * @deprecated NÃO use para decidir duelos.
 *
 * O vencedor é decidido e persistido pelo banco. A ordem continua: nota,
 * grave, força, fôlego. A troca v1 -> v2 muda a nota, não o desempate.
 */
export function compareResults(resultA: ScoreResult, resultB: ScoreResult): 'A' | 'B' | 'TIE' {
  if (resultA.score > resultB.score) return 'A';
  if (resultB.score > resultA.score) return 'B';

  if (resultA.partialScores.depth > resultB.partialScores.depth) return 'A';
  if (resultB.partialScores.depth > resultA.partialScores.depth) return 'B';

  if (resultA.partialScores.power > resultB.partialScores.power) return 'A';
  if (resultB.partialScores.power > resultA.partialScores.power) return 'B';

  if (resultA.partialScores.duration > resultB.partialScores.duration) return 'A';
  if (resultB.partialScores.duration > resultA.partialScores.duration) return 'B';

  return 'TIE';
}
