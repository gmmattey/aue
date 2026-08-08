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

interface ResultadoResumo {
  id: string;
  score: number;
  classification: string;
}

interface DesafioCarregado {
  id: string;
  winner: 'challenger' | 'challenged' | 'tie' | null;
  resolved_at: string | null;
  challenger_result: ResultadoResumo;
  challenged_result: ResultadoResumo | null;
}

const cartao: React.CSSProperties = {
  padding: 'var(--space-4)',
  background: 'var(--surface)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius-lg)',
  marginBottom: 'var(--space-4)',
};

export const ChallengeView: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [challengeData, setChallengeData] = useState<DesafioCarregado | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Derivado do estado do servidor — não há mais estado de vencedor local.
  const winner = winnerLabel(challengeData?.winner);

  useEffect(() => {
    if (!id) return;
    getChallenge(id)
      .then(data => setChallengeData(data as DesafioCarregado))
      .catch(err => {
        console.error(err);
        setError('Não foi possível carregar o desafio.');
      })
      .finally(() => setLoading(false));
  }, [id]);

  const handleRecordingComplete = async (dbResult: ResultadoResumo) => {
    if (!dbResult?.id || !id) return;
    try {
      // O AudioRecorder já persistiu o resultado via `submit_resultado`.
      // Antes, esta função gravava um SEGUNDO resultado — linha e XP em dobro.
      const updated = await completeChallenge(id, dbResult.id);

      setChallengeData((prev) => (prev ? {
        ...prev,
        ...updated,               // traz `winner` e `resolved_at` do servidor
        challenged_result: dbResult,
      } : prev));
    } catch (err) {
      console.error(err);
      setError('Não foi possível registrar sua resposta ao desafio.');
    }
  };

  if (loading) return <div className="screen">Carregando desafio...</div>;
  if (!challengeData) return <div className="screen">{error ?? 'Desafio não encontrado.'}</div>;

  return (
    <div className="app-shell">
      <header className="appbar">
        <span className="appbar-title">Desafio {id}</span>
      </header>

      <div className="screen">
        {error && (
          <p role="alert" style={{ color: 'var(--danger)', marginBottom: 'var(--space-4)' }}>
            {error}
          </p>
        )}

        <div style={cartao}>
          <div style={{ fontSize: 11, textTransform: 'uppercase', color: 'var(--muted)' }}>Desafiante</div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 40, color: 'var(--accent)', lineHeight: 1.1 }}>
            {Number(challengeData.challenger_result.score).toFixed(1)}
          </div>
          <div style={{ fontSize: 14 }}>{challengeData.challenger_result.classification}</div>
        </div>

        {!challengeData.challenged_result ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 20, textTransform: 'uppercase' }}>
              Sua vez de responder
            </h2>
            <AudioRecorder onRecordingComplete={handleRecordingComplete} hideChallengeButton />
          </div>
        ) : (
          <div style={cartao}>
            <div style={{ fontSize: 11, textTransform: 'uppercase', color: 'var(--muted)' }}>Você</div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 40, color: 'var(--accent)', lineHeight: 1.1 }}>
              {Number(challengeData.challenged_result.score).toFixed(1)}
            </div>
            <div style={{ fontSize: 14 }}>{challengeData.challenged_result.classification}</div>
          </div>
        )}

        {winner && (
          <div style={{ ...cartao, textAlign: 'center', marginTop: 'var(--space-4)' }}>
            <div style={{ fontSize: 11, textTransform: 'uppercase', color: 'var(--muted)' }}>Resultado final</div>
            <div
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 24,
                textTransform: 'uppercase',
                margin: 'var(--space-2) 0 var(--space-4)',
              }}
            >
              {winner}
            </div>
            <Link to="/" className="btn btn-secondary">
              Voltar ao início
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};
