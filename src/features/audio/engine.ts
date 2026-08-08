export interface AudioMetrics {
  duration: number;
  rms: number;
  bassEnergy: number; // Simple metric for bass
  texture: number; // Zero crossing rate based metric
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
 * Abaixo disto não há arroto nenhum — é ruído de fundo, e a gravação não pode
 * virar nota.
 *
 * POR QUE ESTE NÚMERO EXISTE (observado em aparelho real, 2026-08-08):
 * um iPhone gravou, o áudio não subiu, e mesmo assim a tela mostrou **54,2 —
 * "Arroto Respeitável"**, com DURAÇÃO 96, POTÊNCIA 0, PROFUND. 0 e TEXTURA 100.
 *
 * Aquilo não era um arroto fraco: era silêncio. E a fórmula premia silêncio por
 * acidente, porque três das cinco parcelas não dependem de haver som:
 *
 *   - duração    -> 96, só por ter gravado ~4,8 s;
 *   - origem     -> 100, porque a pessoa escolheu "Espontâneo";
 *   - textura    -> 100, e este é o mais traiçoeiro. A textura é a taxa de
 *                   cruzamentos por zero. Um sinal quase mudo fica oscilando em
 *                   torno do zero o tempo todo, então o silêncio SATURA a
 *                   textura em vez de zerá-la.
 *
 * 96·0,25 + 0·0,20 + 0·0,25 + 100·0,20 + 100·0,10 = 54,2. Metade da nota
 * máxima, sem um único decibel.
 *
 * O valor: 0,005 de RMS é cerca de -46 dBFS, o chão de ruído de um telefone
 * numa sala silenciosa. Um arroto perto do microfone dá RMS entre 0,05 e 0,3 —
 * dez a sessenta vezes mais. A margem é grande o bastante para não recusar um
 * arroto tímido, e apertada o bastante para não deixar passar sala vazia.
 *
 * Isto é validação de ENTRADA, não mudança de fórmula: a fórmula continua
 * idêntica (e continua espelhada no SQL, ver `rules.ts`). O que muda é que uma
 * gravação sem som deixa de entrar nela.
 */
const RMS_MINIMO_AUDIVEL = 0.005;

/** Gravou, mas não havia som nenhum para julgar. */
export class AudioMudoError extends Error {
  /** O RMS medido, para diagnóstico no console. */
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

  // Create an OfflineAudioContext to process the audio
  const offlineCtx = new OfflineAudioContext(1, 44100, 44100); // Temporary context just to decode
  const audioBuffer = await offlineCtx.decodeAudioData(arrayBuffer);

  const duration = audioBuffer.duration;

  // Calculate RMS & ZCR (Zero Crossing Rate)
  const channelData = audioBuffer.getChannelData(0); // Mono processing

  // Sem esta guarda, `sumSquares / channelData.length` divide por zero, o RMS
  // vira NaN e as parciais NaN chegam à RPC, que rejeita com erro genérico.
  // Acontece de verdade: toque rápido demais no botão, ou permissão concedida
  // com o microfone mudo, produzem buffer de comprimento zero.
  if (channelData.length === 0) throw new AudioVazioError();

  let sumSquares = 0;
  let zeroCrossings = 0;
  
  for (let i = 0; i < channelData.length; i++) {
    sumSquares += channelData[i] * channelData[i];
    if (i > 0 && ((channelData[i] >= 0 && channelData[i - 1] < 0) || (channelData[i] < 0 && channelData[i - 1] >= 0))) {
      zeroCrossings++;
    }
  }
  
  const rms = Math.sqrt(sumSquares / channelData.length);
  const zcr = zeroCrossings / channelData.length;

  /*
    A checagem acontece AQUI, antes do filtro passa-baixa, por dois motivos:
    ela é o caminho barato (o RMS já está calculado) e não faz sentido gastar
    uma renderização inteira num sinal que já sabemos não ter som.

    Ver `RMS_MINIMO_AUDIVEL` para o caso real que originou isto.
  */
  if (rms < RMS_MINIMO_AUDIVEL) throw new AudioMudoError(rms);

  // For Bass energy, we can use an OfflineAudioContext with a lowpass filter
  const renderCtx = new OfflineAudioContext(
    1, 
    audioBuffer.length, 
    audioBuffer.sampleRate
  );
  
  const source = renderCtx.createBufferSource();
  source.buffer = audioBuffer;
  
  const lowpass = renderCtx.createBiquadFilter();
  lowpass.type = 'lowpass';
  lowpass.frequency.value = 150; // Bass frequency cutoff
  
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
  
  return {
    duration,
    rms,
    bassEnergy: bassRms,
    texture: zcr,
  };
}
