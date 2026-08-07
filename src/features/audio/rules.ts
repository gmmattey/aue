import { type AudioMetrics } from './engine';

export type Origin = 'Espontâneo' | 'Comida' | 'Bebida' | 'Puxei ar';

export interface ScoreResult {
  score: number;
  classification: string;
  isArtificial: boolean;
  partialScores: {
    duration: number;
    power: number;
    depth: number;
    texture: number;
    origin: number;
  };
}

const ORIGIN_SCORES: Record<Origin, number> = {
  'Espontâneo': 100,
  'Comida': 90,
  'Bebida': 80,
  'Puxei ar': 0,
};

function normalize(value: number, min: number, max: number): number {
  if (value <= min) return 0;
  if (value >= max) return 100;
  return ((value - min) / (max - min)) * 100;
}

/**
 * Judgement Engine local (aue-score-v1).
 *
 * ATENÇÃO: o resultado desta função é uma PRÉVIA. O score oficial é
 * recalculado no servidor pela RPC `submit_resultado`, que aplica exatamente a
 * mesma fórmula (ver `public.aue_score_v1` em
 * 20260807000011_server_side_score_and_duel.sql). Qualquer mudança de pesos,
 * de normalização ou das faixas de classificação PRECISA ser espelhada lá,
 * senão a constraint `resultados_score_coherent` rejeita as gravações.
 */
export function calculateScore(metrics: AudioMetrics, origin: Origin): ScoreResult {
  // Normalization parameters (heuristic for MVP)
  // Duration: up to 5 seconds is max
  const durationScore = normalize(metrics.duration, 0, 5);
  
  // Power: RMS is usually low. We scale it up. Max expected around 0.3
  const powerScore = normalize(metrics.rms, 0, 0.3);
  
  // Depth: Bass RMS. Max expected around 0.2
  const depthScore = normalize(metrics.bassEnergy, 0, 0.2);
  
  // Texture: Zero crossing rate. Higher ZCR often means more noisy/textural. Max expected around 0.05
  const textureScore = normalize(metrics.texture, 0, 0.05);
  
  const originScore = ORIGIN_SCORES[origin];

  const score = (
    (durationScore * 0.25) +
    (powerScore * 0.20) +
    (depthScore * 0.25) +
    (textureScore * 0.20) +
    (originScore * 0.10)
  );

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
    }
  };
}

/**
 * @deprecated NÃO use para decidir duelos.
 *
 * O vencedor é decidido e persistido pelo banco
 * (`public.aue_compare_results_v1` / trigger `on_desafio_set_winner`, migração
 * 20260807000011_server_side_score_and_duel.sql). Esta versão permanece apenas
 * como referência do algoritmo e para comparações locais sem valor oficial.
 * Qualquer alteração aqui precisa ser espelhada no SQL.
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

  return 'TIE'; // Empate Técnico do Gás
}
