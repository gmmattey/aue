export interface AudioMetrics {
  duration: number;
  rms: number;
  bassEnergy: number; // Simple metric for bass
  texture: number; // Zero crossing rate based metric
}

export async function analyzeAudio(audioBlob: Blob): Promise<AudioMetrics> {
  const arrayBuffer = await audioBlob.arrayBuffer();
  
  // Create an OfflineAudioContext to process the audio
  const offlineCtx = new OfflineAudioContext(1, 44100, 44100); // Temporary context just to decode
  const audioBuffer = await offlineCtx.decodeAudioData(arrayBuffer);
  
  const duration = audioBuffer.duration;
  
  // Calculate RMS & ZCR (Zero Crossing Rate)
  const channelData = audioBuffer.getChannelData(0); // Mono processing
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
