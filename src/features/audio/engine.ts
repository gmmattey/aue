import {
  RMS_MINIMO_AUDIVEL,
  medidasDoTrechoAtivo,
  type MedidasDoTrechoAtivo,
} from '../../nucleo/julgamento/trechoAtivo';

/**
 * O que sai da análise de um arroto.
 *
 * As três medidas do trecho ativo (`activeDuration`, `activeRms`, `bassRatio`)
 * são **obrigatórias**. Elas são a régua da nota v2, e a régua foi calibrada
 * para o trecho ativo. Quem preencher só os campos legados vai ter a nota
 * calculada em cima da duração do arquivo inteiro — o defeito que a v2 veio
 * consertar — e sem erro nenhum aparecendo. Por isso o tipo não deixa.
 */
export interface AudioMetrics extends MedidasDoTrechoAtivo {
  /** Duração total da gravação. Mantida para diagnóstico e compatibilidade. */
  duration: number;
  /** RMS da gravação inteira. Mantido para a trava de silêncio. */
  rms: number;
  /** RMS absoluto após low-pass de 150 Hz. Legado/diagnóstico. */
  bassEnergy: number;
  /** Zero crossing rate. Legado/diagnóstico; não entra mais na nota v2. */
  texture: number;
}

/**
 * Erro de análise reconhecível pela interface — permite distinguir "gravação
 * vazia/curta demais" (culpa recuperável do usuário) de falha inesperada.
 */
export class AudioVazioError extends Error {
  constructor() {
    super('Não deu para ouvir nada nessa gravação.');
    this.name = 'AudioVazioError';
  }
}

/** Gravou, mas não havia som nenhum para pontuar. */
export class AudioMudoError extends Error {
  readonly rms: number;

  constructor(rms: number) {
    super('Não deu para ouvir nada nessa gravação.');
    this.name = 'AudioMudoError';
    this.rms = rms;
  }
}

export async function analyzeAudio(audioBlob: Blob): Promise<AudioMetrics> {
  if (audioBlob.size === 0) throw new AudioVazioError();

  const arrayBuffer = await audioBlob.arrayBuffer();

  // Contexto temporário só para decodificar; o AudioBuffer preserva o sample rate real.
  const offlineCtx = new OfflineAudioContext(1, 44100, 44100);
  const audioBuffer = await offlineCtx.decodeAudioData(arrayBuffer);
  const duration = audioBuffer.duration;
  const channelData = audioBuffer.getChannelData(0);

  if (channelData.length === 0) throw new AudioVazioError();

  let sumSquares = 0;
  let zeroCrossings = 0;

  for (let i = 0; i < channelData.length; i++) {
    sumSquares += channelData[i] * channelData[i];
    if (
      i > 0 &&
      ((channelData[i] >= 0 && channelData[i - 1] < 0) ||
        (channelData[i] < 0 && channelData[i - 1] >= 0))
    ) {
      zeroCrossings++;
    }
  }

  const rms = Math.sqrt(sumSquares / channelData.length);
  const zcr = zeroCrossings / channelData.length;

  if (rms < RMS_MINIMO_AUDIVEL) throw new AudioMudoError(rms);

  const renderCtx = new OfflineAudioContext(1, audioBuffer.length, audioBuffer.sampleRate);
  const source = renderCtx.createBufferSource();
  source.buffer = audioBuffer;

  const lowpass = renderCtx.createBiquadFilter();
  lowpass.type = 'lowpass';
  lowpass.frequency.value = 150;

  source.connect(lowpass);
  lowpass.connect(renderCtx.destination);
  source.start(0);

  const filteredBuffer = await renderCtx.startRendering();
  const filteredData = filteredBuffer.getChannelData(0);

  let bassSumSquares = 0;
  for (let i = 0; i < filteredData.length; i++) {
    bassSumSquares += filteredData[i] * filteredData[i];
  }
  const bassRms = Math.sqrt(bassSumSquares / filteredData.length);
  const calibradas = medidasDoTrechoAtivo(channelData, filteredData, audioBuffer.sampleRate);

  return {
    duration,
    rms,
    bassEnergy: bassRms,
    texture: zcr,
    ...calibradas,
  };
}
