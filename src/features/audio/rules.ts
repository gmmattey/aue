import { type AudioMetrics } from './engine';

export type Origin = 'Espontâneo' | 'Comida' | 'Bebida' | 'Puxei ar' | 'Outro';

/**
 * As origens válidas, em ordem de exibição.
 *
 * Existe para que a TELA e o TESTE DE PARIDADE leiam a mesma lista. Antes, a
 * folha de origem escrevia as strings à mão e o teste tinha uma quarta cópia —
 * acrescentar uma origem exigia lembrar de três lugares, e esquecer um deles é
 * silencioso no browser e fatal no banco (ver a nota de `calculateScore`).
 *
 * Não exporta os PESOS de propósito: `rules.formula.test.ts` sonda a função em
 * vez de ler constante, justamente para medir o que ela faz e não o que declara.
 */
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
  /*
    'Outro' = 80, e o critério está escrito aqui porque um número de peso sem
    justificativa vira folclore na próxima vez que alguém abrir o arquivo.

    O termo de origem premia o quanto o arroto veio SOZINHO: 100 quando não teve
    empurrão nenhum, 90 comida, 80 bebida, 0 quando a pessoa puxou ar (que é o
    único caso artificial, e por isso o único zero).

    'Outro' é "veio de alguma coisa que não está na lista" — informação honesta,
    mas menos informação. Ele recebe o PISO DAS ORIGENS HONESTAS, e não um valor
    próprio, por três razões:

    1. Não pode valer 100. Se a opção genérica pagasse o máximo, ela viraria a
       escolha ótima de quem quer nota — e a origem, que é declaração da pessoa,
       viraria botão de bônus. O §3.4 do contrato pede que a origem seja
       INFORMADA, não que ela seja disputada.
    2. Não pode valer 0. Zero é o peso do arroto forçado com ar, e é o que faz
       `is_artificial`. Empatar "não sei dizer" com "eu fabriquei" puniria
       honestidade e mentiria sobre o que aconteceu.
    3. Fica no piso (80) e não no meio (85, 90) para que escolher 'Outro' nunca
       seja MELHOR do que declarar o que de fato foi. Quem sabe, declara e ganha
       igual ou mais; quem não sabe, não é obrigado a inventar cerveja.

    Consequência aceita e conhecida: 'Outro' e 'Bebida' pagam o mesmo. Não é
    empate por descuido — é o piso do intervalo honesto, que hoje é ocupado pela
    bebida.
  */
  'Outro': 80,
};

function normalize(value: number, min: number, max: number): number {
  if (value <= min) return 0;
  if (value >= max) return 100;
  return ((value - min) / (max - min)) * 100;
}

/** As quatro parciais acústicas, já normalizadas em 0-100. */
export interface ParciaisAcusticas {
  duration: number;
  power: number;
  depth: number;
  texture: number;
}

/**
 * As quatro parciais que dependem SÓ do áudio — sem a origem, e portanto sem
 * nota.
 *
 * Extraída de `calculateScore` para a tela de julgamento poder desenhar as
 * barras reais enquanto a pessoa ainda não escolheu a origem. A alternativa era
 * a tela chamar `calculateScore` com uma origem qualquer e jogar fora o
 * resultado — o que faria uma tela de UI escolher origem por conta própria, que
 * é exatamente o que o §3.4 do contrato proíbe.
 *
 * `calculateScore` passou a usá-la, então não há segunda cópia da normalização.
 */
export function parciaisAcusticas(metrics: AudioMetrics): ParciaisAcusticas {
  return {
    // Duration: up to 5 seconds is max
    duration: normalize(metrics.duration, 0, 5),
    // Power: RMS is usually low. We scale it up. Max expected around 0.3
    power: normalize(metrics.rms, 0, 0.3),
    // Depth: Bass RMS. Max expected around 0.2
    depth: normalize(metrics.bassEnergy, 0, 0.2),
    // Texture: Zero crossing rate. Higher ZCR often means more noisy/textural.
    texture: normalize(metrics.texture, 0, 0.05),
  };
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
 *
 * ATENÇÃO 2, sobre a TABELA DE ORIGENS: ela também vive duas vezes, mas a
 * definição que vale no banco é a ÚLTIMA migração que redefine
 * `public.aue_origin_score_v1` — hoje a 20260807000035_origem_outro.sql, não a
 * 000011. Acrescentar ou renomear origem aqui sem migrar o banco junto não
 * degrada nada: a RPC `submit_resultado` levanta "Origem inválida" e o envio
 * para de funcionar em produção. `origem.paridade.test.ts` trava os dois lados.
 */
export function calculateScore(metrics: AudioMetrics, origin: Origin): ScoreResult {
  // Normalization parameters (heuristic for MVP) — ver `parciaisAcusticas`.
  const {
    duration: durationScore,
    power: powerScore,
    depth: depthScore,
    texture: textureScore,
  } = parciaisAcusticas(metrics);

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
