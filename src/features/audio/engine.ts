export interface AudioMetrics {
  /** Duração total da gravação. Mantida para diagnóstico e compatibilidade. */
  duration: number;
  /** RMS da gravação inteira. Mantido para a trava de silêncio. */
  rms: number;
  /** RMS absoluto após low-pass de 150 Hz. Legado/diagnóstico. */
  bassEnergy: number;
  /** Zero crossing rate. Legado/diagnóstico; não entra mais na nota v2. */
  texture: number;

  /**
   * Métricas calibradas no banco real de 43 arquivos de 2026-08-10.
   *
   * São opcionais para não quebrar consumidores/testes que constroem
   * `AudioMetrics` antigos à mão. `rules.ts` tem fallback explícito para os
   * campos legados, mas `analyzeAudio` sempre devolve as três em produção.
   */
  activeDuration?: number;
  activeRms?: number;
  bassRatio?: number;
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

/**
 * Abaixo disto não há som útil — é ruído de fundo, e a gravação não pode virar
 * nota. O valor continua sendo 0,005 RMS (~-46 dBFS), validado em aparelho real.
 */
const RMS_MINIMO_AUDIVEL = 0.005;

/** Gravou, mas não havia som nenhum para pontuar. */
export class AudioMudoError extends Error {
  readonly rms: number;

  constructor(rms: number) {
    super('Não deu para ouvir nada nessa gravação.');
    this.name = 'AudioMudoError';
    this.rms = rms;
  }
}

const JANELA_S = 0.025;
const PASSO_S = 0.010;
const BURACO_CURTO_S = 0.120;
const QUEDA_DO_PICO_DB = 25;

function percentile(valores: readonly number[], fracao: number): number {
  if (valores.length === 0) return 0;
  const ordenados = [...valores].sort((a, b) => a - b);
  const posicao = (ordenados.length - 1) * fracao;
  const inferior = Math.floor(posicao);
  const superior = Math.ceil(posicao);
  if (inferior === superior) return ordenados[inferior];
  const peso = posicao - inferior;
  return ordenados[inferior] * (1 - peso) + ordenados[superior] * peso;
}

function rmsDaJanela(amostras: Float32Array, inicio: number, tamanho: number): number {
  const fim = Math.min(amostras.length, inicio + tamanho);
  if (fim <= inicio) return 0;
  let soma = 0;
  for (let i = inicio; i < fim; i++) soma += amostras[i] * amostras[i];
  return Math.sqrt(soma / (fim - inicio));
}

function rmsPorQuadro(amostras: Float32Array, sampleRate: number): number[] {
  const tamanho = Math.max(1, Math.round(sampleRate * JANELA_S));
  const passo = Math.max(1, Math.round(sampleRate * PASSO_S));

  if (amostras.length <= tamanho) return [rmsDaJanela(amostras, 0, amostras.length)];

  const valores: number[] = [];
  for (let inicio = 0; inicio + tamanho <= amostras.length; inicio += passo) {
    valores.push(rmsDaJanela(amostras, inicio, tamanho));
  }
  return valores;
}

function preencherBuracosCurtos(mascara: boolean[]): boolean[] {
  const saida = [...mascara];
  const limite = Math.round(BURACO_CURTO_S / PASSO_S);

  let i = 0;
  while (i < saida.length) {
    if (saida[i]) {
      i++;
      continue;
    }

    let fim = i;
    while (fim < saida.length && !saida[fim]) fim++;
    const tamanho = fim - i;

    if (i > 0 && fim < saida.length && tamanho <= limite) {
      for (let j = i; j < fim; j++) saida[j] = true;
    }
    i = fim;
  }

  return saida;
}

function maiorTrechoAtivo(mascara: readonly boolean[]): number {
  let atual = 0;
  let maior = 0;

  for (const ativo of mascara) {
    if (ativo) {
      atual++;
      if (atual > maior) maior = atual;
    } else {
      atual = 0;
    }
  }

  if (maior === 0) return 0;
  return JANELA_S + (maior - 1) * PASSO_S;
}

/**
 * Extrai as três grandezas que o jogo mostra como FORÇA, FÔLEGO e GRAVE.
 *
 * A gravação inteira não pode ser a régua: esperar para tocar em "JÁ FOI" não
 * deixa o arroto melhor. Por isso identificamos quadros ativos (25 ms, passo de
 * 10 ms), ignoramos silêncio de borda e fechamos buracos de até 120 ms.
 *
 * - Força: percentil 75 do RMS dos quadros ativos;
 * - Fôlego: maior trecho ativo contínuo;
 * - Grave: percentil 75 da razão low-pass(150 Hz) / RMS nos quadros ativos.
 *
 * O limiar de atividade é relativo ao próprio clipe (25 dB abaixo do pico), mas
 * nunca cai abaixo do piso audível de 0,005 RMS.
 */
function metricasDoTrechoAtivo(
  original: Float32Array,
  filtrado: Float32Array,
  sampleRate: number,
): Pick<AudioMetrics, 'activeDuration' | 'activeRms' | 'bassRatio'> {
  const rmsOriginal = rmsPorQuadro(original, sampleRate);
  const rmsFiltrado = rmsPorQuadro(filtrado, sampleRate);
  const pico = Math.max(...rmsOriginal, 0);
  const quedaLinear = Math.pow(10, -QUEDA_DO_PICO_DB / 20);
  const limiar = Math.max(RMS_MINIMO_AUDIVEL, pico * quedaLinear);
  const mascara = preencherBuracosCurtos(rmsOriginal.map((valor) => valor >= limiar));

  const ativos: number[] = [];
  const razoesDeGrave: number[] = [];

  for (let i = 0; i < mascara.length; i++) {
    if (!mascara[i]) continue;
    const total = rmsOriginal[i] ?? 0;
    const grave = rmsFiltrado[i] ?? 0;
    ativos.push(total);
    razoesDeGrave.push(Math.min(1, Math.max(0, grave / Math.max(total, 1e-9))));
  }

  return {
    activeDuration: maiorTrechoAtivo(mascara),
    activeRms: percentile(ativos, 0.75),
    bassRatio: percentile(razoesDeGrave, 0.75),
  };
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
  const calibradas = metricasDoTrechoAtivo(channelData, filteredData, audioBuffer.sampleRate);

  return {
    duration,
    rms,
    bassEnergy: bassRms,
    texture: zcr,
    ...calibradas,
  };
}
