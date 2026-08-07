import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getChallenge, completeChallenge } from '../../db/supabase';
import { AudioRecorder } from './AudioRecorder';

/**
 * Traduz o veredito persistido pelo banco (`desafios.winner`) para a frase
 * exibida. A decisão em si NÃO acontece mais aqui: quem compara os dois
 * resultados é o trigger `on_desafio_set_winner` (migração 20260807000011).
 */
function winnerLabel(winner: string | null | undefined): string | null {
  if (winner === 'challenger') return 'Desafiante venceu!';
  if (winner === 'challenged') return 'Você venceu!';
  if (winner === 'tie') return 'Empate Técnico do Gás!';
  return null;
}

export const ChallengeView: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [challengeData, setChallengeData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Derivado do estado do servidor — não há mais estado de vencedor local.
  const winner = winnerLabel(challengeData?.winner);

  useEffect(() => {
    if (!id) return;
    getChallenge(id)
      .then(data => setChallengeData(data))
      .catch(err => {
        console.error(err);
        setError('Não foi possível carregar o desafio.');
      })
      .finally(() => setLoading(false));
  }, [id]);

  const handleRecordingComplete = async (dbResult: any) => {
    if (!dbResult?.id || !id) return;
    try {
      // O AudioRecorder já persistiu o resultado via `submit_resultado`.
      // Antes, esta função gravava um SEGUNDO resultado — linha e XP em dobro.
      const updated = await completeChallenge(id, dbResult.id);

      setChallengeData((prev: any) => ({
        ...prev,
        ...updated,               // traz `winner` e `resolved_at` do servidor
        challenged_result: dbResult,
      }));
    } catch (err) {
      console.error(err);
      setError('Não foi possível registrar sua resposta ao desafio.');
    }
  };

  if (loading) return <div>Carregando desafio...</div>;
  if (!challengeData) return <div>{error ?? 'Desafio não encontrado.'}</div>;

  return (
    <div style={{ padding: '20px', maxWidth: '600px', margin: '0 auto' }}>
      <h2>Desafio {id}</h2>

      {error && <p style={{ color: '#c62828' }}>{error}</p>}

      <div style={{ padding: '15px', background: '#ffebee', borderRadius: '8px', marginBottom: '20px' }}>
        <h3>Desafiante</h3>
        <p>Score: <strong>{Number(challengeData.challenger_result.score).toFixed(1)}</strong></p>
        <p>Classificação: {challengeData.challenger_result.classification}</p>
      </div>

      {!challengeData.challenged_result ? (
        <div>
          <h3>Sua vez de responder:</h3>
          <AudioRecorder onRecordingComplete={handleRecordingComplete} hideChallengeButton />
        </div>
      ) : (
        <div style={{ padding: '15px', background: '#e8f5e9', borderRadius: '8px', marginBottom: '20px' }}>
          <h3>Você</h3>
          <p>Score: <strong>{Number(challengeData.challenged_result.score).toFixed(1)}</strong></p>
          <p>Classificação: {challengeData.challenged_result.classification}</p>
        </div>
      )}

      {winner && (
        <div style={{ padding: '20px', background: '#fff3e0', borderRadius: '8px', textAlign: 'center', marginTop: '20px' }}>
          <h2>Resultado Final</h2>
          <h3>{winner}</h3>
          <Link to="/" style={{ display: 'inline-block', marginTop: '10px', padding: '10px', background: '#ccc', textDecoration: 'none', color: '#000', borderRadius: '4px' }}>
            Voltar ao Início
          </Link>
        </div>
      )}
    </div>
  );
};
