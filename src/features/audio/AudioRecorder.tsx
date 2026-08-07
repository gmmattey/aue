import React, { useState, useRef, useEffect } from 'react';
import { analyzeAudio, type AudioMetrics } from './engine';
import { calculateScore, type Origin, type ScoreResult } from './rules';
import { submitResult, createChallenge } from '../../db/supabase';
import { useShareResult } from './useShareResult';

interface AudioRecorderProps {
  /**
   * Recebe a linha JÁ PERSISTIDA pelo servidor (com score e classificação
   * oficiais). Antes recebia apenas o `ScoreResult` local, e o consumidor
   * gravava um SEGUNDO resultado — duplicando linha e XP.
   */
  onRecordingComplete?: (dbResult: any) => void;
  hideChallengeButton?: boolean;
}

export const AudioRecorder: React.FC<AudioRecorderProps> = ({ onRecordingComplete, hideChallengeButton }) => {
  const [permissionGranted, setPermissionGranted] = useState<boolean | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [timeLeft, setTimeLeft] = useState(10);
  const [metrics, setMetrics] = useState<AudioMetrics | null>(null);
  const [scoreResult, setScoreResult] = useState<ScoreResult | null>(null);
  const [dbResult, setDbResult] = useState<any | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [origin, setOrigin] = useState<Origin>('Espontâneo');
  const [challengeLink, setChallengeLink] = useState<string | null>(null);

  const { shareResult } = useShareResult();

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);

  const requestPermission = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setPermissionGranted(true);
      setError(null);
      
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };
      
      mediaRecorder.onstop = async () => {
        const mimeType = mediaRecorder.mimeType || 'audio/webm';
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        audioChunksRef.current = [];
        
        setIsAnalyzing(true);
        try {
          const result = await analyzeAudio(audioBlob);
          setMetrics(result);

          // Score local = apenas PRÉVIA. O valor oficial é o que o servidor
          // recalcula em `submit_resultado` a partir das parciais.
          const localScore = calculateScore(result, origin);
          setScoreResult(localScore);

          // Só as parciais e a origem vão para o servidor. O score não faz
          // parte do payload — não há como falsificá-lo por aqui.
          const savedResult = await submitResult({
            duration: localScore.partialScores.duration,
            power: localScore.partialScores.power,
            depth: localScore.partialScores.depth,
            texture: localScore.partialScores.texture,
            originType: origin,
            playerName: 'Anônimo',
          });
          setDbResult(savedResult);

          // Exibir o veredito oficial, não a prévia local.
          if (savedResult) {
            setScoreResult({
              ...localScore,
              score: Number(savedResult.score),
              classification: savedResult.classification,
              isArtificial: savedResult.is_artificial,
            });
          }

          if (onRecordingComplete) {
            onRecordingComplete(savedResult);
          }
        } catch (err) {
          console.error('Error analyzing audio:', err);
          setError('Failed to analyze audio');
        } finally {
          setIsAnalyzing(false);
        }
      };
      
    } catch (err) {
      console.error('Microphone permission denied', err);
      setPermissionGranted(false);
      setError('Microphone permission denied.');
    }
  };

  const startRecording = () => {
    if (!mediaRecorderRef.current || mediaRecorderRef.current.state === 'recording') return;
    
    setMetrics(null);
    setScoreResult(null);
    setDbResult(null);
    setChallengeLink(null);
    audioChunksRef.current = [];
    mediaRecorderRef.current.start();
    setIsRecording(true);
    setTimeLeft(10);
    
    timerRef.current = window.setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          stopRecording();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  };

  const handleCreateChallenge = async () => {
    if (!dbResult) return;
    try {
      const challenge = await createChallenge(dbResult.id);
      setChallengeLink(`${window.location.origin}/d/${challenge.id}`);
    } catch (err) {
      console.error('Failed to create challenge', err);
      setError('Erro ao criar desafio.');
    }
  };

  const handleShare = () => {
    shareResult('score-card', challengeLink);
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (mediaRecorderRef.current && mediaRecorderRef.current.stream) {
        mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  if (permissionGranted === null) {
    return (
      <div style={{ padding: '20px', border: '1px solid #ccc', borderRadius: '8px' }}>
        <h2>Auê Audio Recorder</h2>
        <p>We need microphone access to record the Auê.</p>
        <button onClick={requestPermission}>Allow Microphone</button>
        {error && <p style={{ color: 'red' }}>{error}</p>}
      </div>
    );
  }

  if (permissionGranted === false) {
    return (
      <div style={{ padding: '20px', border: '1px solid #ccc', borderRadius: '8px' }}>
        <h2>Permission Denied</h2>
        <p style={{ color: 'red' }}>Please enable microphone permissions in your browser settings to continue.</p>
        <button onClick={requestPermission}>Try Again</button>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px', border: '1px solid #ccc', borderRadius: '8px', maxWidth: '400px', margin: '0 auto' }}>
      <h2>Record your Auê</h2>
      
      <div style={{ marginBottom: '15px' }}>
        <label style={{ display: 'block', marginBottom: '5px' }}>Origem:</label>
        <select 
          value={origin} 
          onChange={(e) => {
            const newOrigin = e.target.value as Origin;
            setOrigin(newOrigin);
          }}
          style={{ padding: '8px', width: '100%' }}
        >
          <option value="Espontâneo">Espontâneo</option>
          <option value="Comida">Comida</option>
          <option value="Bebida">Bebida</option>
          <option value="Puxei ar">Puxei ar</option>
        </select>
      </div>

      {!isRecording ? (
        <button 
          onClick={startRecording}
          disabled={isAnalyzing}
          style={{ padding: '10px 20px', background: 'green', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', width: '100%' }}
        >
          {isAnalyzing ? 'Analyzing...' : 'Start Recording'}
        </button>
      ) : (
        <button 
          onClick={stopRecording}
          style={{ padding: '10px 20px', background: 'red', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', width: '100%' }}
        >
          Stop Recording ({timeLeft}s)
        </button>
      )}

      {scoreResult && (
        <div style={{ marginTop: '20px' }}>
          <div id="score-card" style={{ padding: '15px', background: '#e3f2fd', borderRadius: '4px', color: '#333' }}>
            <h2 style={{ margin: '0 0 10px 0', fontSize: '2em', textAlign: 'center' }}>
              {scoreResult.score.toFixed(1)}
            </h2>
            <h3 style={{ margin: '0 0 15px 0', textAlign: 'center', color: '#1565c0' }}>
              {scoreResult.classification}
            </h3>
            {scoreResult.isArtificial && (
              <p style={{ textAlign: 'center', color: '#c62828', fontWeight: 'bold' }}>
                Categoria Artificial
              </p>
            )}

            {dbResult && dbResult.user_id && (
              <div style={{ marginTop: '10px', padding: '10px', background: '#fff', borderRadius: '4px', textAlign: 'center' }}>
                {dbResult.is_xp_eligible ? (
                  <p style={{ color: 'green', fontWeight: 'bold', margin: 0 }}>+{dbResult.xp_earned} XP Ganhos!</p>
                ) : (
                  <p style={{ color: 'orange', fontSize: '0.9em', margin: 0 }}>Limite diário de 5 gravações atingido. Sem XP desta vez!</p>
                )}
              </div>
            )}

            <hr style={{ borderTop: '1px solid #bbdefb', margin: '15px 0 10px 0' }} />
            <div style={{ fontSize: '0.9em' }}>
              <p><strong>Duração:</strong> {scoreResult.partialScores.duration.toFixed(0)}</p>
              <p><strong>Potência:</strong> {scoreResult.partialScores.power.toFixed(0)}</p>
              <p><strong>Profundidade:</strong> {scoreResult.partialScores.depth.toFixed(0)}</p>
              <p><strong>Textura:</strong> {scoreResult.partialScores.texture.toFixed(0)}</p>
            </div>
          </div>

          <button 
            onClick={handleShare}
            style={{ padding: '10px', background: '#4caf50', color: 'white', border: 'none', borderRadius: '4px', width: '100%', cursor: 'pointer', marginTop: '10px' }}
          >
            Compartilhar Imagem
          </button>
          
          {!hideChallengeButton && !challengeLink && (
            <button 
              onClick={handleCreateChallenge}
              style={{ padding: '10px', background: '#1976d2', color: 'white', border: 'none', borderRadius: '4px', width: '100%', cursor: 'pointer', marginTop: '10px' }}
            >
              Gerar Link de Desafio
            </button>
          )}

          {challengeLink && (
            <div style={{ marginTop: '15px', padding: '10px', background: '#fff', border: '1px dashed #1976d2' }}>
              <p style={{ margin: '0 0 5px 0' }}>Link do Desafio:</p>
              <a href={challengeLink} target="_blank" rel="noreferrer" style={{ wordBreak: 'break-all' }}>{challengeLink}</a>
            </div>
          )}
        </div>
      )}

      {metrics && (
        <div style={{ marginTop: '20px', padding: '10px', background: '#f5f5f5', borderRadius: '4px', color: '#666', fontSize: '0.8em' }}>
          <h4>Raw Debug Metrics</h4>
          <p>Duration: {metrics.duration.toFixed(2)}s | RMS: {metrics.rms.toFixed(5)}</p>
          <p>Bass: {metrics.bassEnergy.toFixed(5)} | ZCR: {metrics.texture.toFixed(5)}</p>
        </div>
      )}
      
      {error && <p style={{ color: 'red', marginTop: '10px' }}>{error}</p>}
    </div>
  );
};
