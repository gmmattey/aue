import React, { useState } from 'react';

interface Participant {
  id: string;
  name: string;
  avatar: string;
  status: 'played' | 'current_turn' | 'waiting';
  score?: number;
}

interface ChampionshipLobbyScreenProps {
  onStartRecordingForTurn?: () => void;
  onBack?: () => void;
}

export const ChampionshipLobbyScreen: React.FC<ChampionshipLobbyScreenProps> = ({
  onStartRecordingForTurn,
  onBack,
}) => {
  const [showPodium, setShowPodium] = useState(false);

  const participants: Participant[] = [
    { id: '1', name: 'Carol', avatar: 'C', status: 'played', score: 98.1 },
    { id: '2', name: 'Você', avatar: 'V', status: 'current_turn' },
    { id: '3', name: 'Bruno', avatar: 'B', status: 'waiting' },
    { id: '4', name: 'Julia', avatar: 'J', status: 'waiting' },
  ];

  if (showPodium) {
    return (
      <div className="screen" style={{ paddingBottom: 80, gap: 24, textAlign: 'center' }}>
        <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
          <button type="button" className="icon-btn" onClick={() => setShowPodium(false)} aria-label="Voltar">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
          </button>
        </div>

        {/* Podium Hero */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" style={{ width: 52, height: 52, color: 'var(--accent)' }}>
            <path d="M8 21h8M12 17v4M6 4h12v3a6 6 0 0 1-12 0V4Z" />
            <path d="M6 5H3v2a3 3 0 0 0 3 3M18 5h3v2a3 3 0 0 1-3 3" />
          </svg>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--muted)' }}>
            Fim de jogo
          </span>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 32, textTransform: 'uppercase' }}>Campeão do Auê</h1>
          <div style={{ width: 84, height: 84, borderRadius: 999, background: 'var(--accent)', display: 'grid', placeItems: 'center', fontFamily: 'var(--font-display)', fontSize: 32, color: 'var(--bg)', marginTop: 6 }}>
            C
          </div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 24, textTransform: 'uppercase', marginTop: 4 }}>Carol</div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 20, color: 'var(--accent)', fontWeight: 700 }}>98,1</div>
        </div>

        {/* Roast Line */}
        <p style={{ fontFamily: 'var(--font-display)', fontSize: 18, color: 'var(--fg)', maxWidth: '26ch', margin: '0 auto', lineHeight: 1.3 }}>
          Tecnicamente excelente. Socialmente indefensável.
        </p>

        {/* Podium List */}
        <div style={{ display: 'flex', flexDirection: 'column', textAlign: 'left' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '11px 10px', borderTop: '1px solid var(--border)' }}>
            <span style={{ width: 28, height: 28, borderRadius: 999, display: 'grid', placeItems: 'center', fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 700, border: '1px solid var(--silver)', color: 'var(--silver)', background: 'var(--surface)' }}>2</span>
            <div style={{ width: 38, height: 38, borderRadius: 999, background: 'var(--border)', display: 'grid', placeItems: 'center', fontFamily: 'var(--font-display)', fontSize: 14 }}>B</div>
            <div style={{ flex: 1, fontWeight: 600, fontSize: 14 }}>Bruno</div>
            <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, fontSize: 15, color: 'var(--silver)' }}>95,6</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '11px 10px', borderTop: '1px solid var(--border)' }}>
            <span style={{ width: 28, height: 28, borderRadius: 999, display: 'grid', placeItems: 'center', fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 700, border: '1px solid var(--bronze)', color: 'var(--bronze)', background: 'var(--surface)' }}>3</span>
            <div style={{ width: 38, height: 38, borderRadius: 999, background: 'var(--border)', display: 'grid', placeItems: 'center', fontFamily: 'var(--font-display)', fontSize: 14 }}>R</div>
            <div style={{ flex: 1, fontWeight: 600, fontSize: 14 }}>Rafa</div>
            <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, fontSize: 15, color: 'var(--bronze)' }}>93,0</span>
          </div>
        </div>

        <button type="button" className="btn btn-secondary" onClick={() => setShowPodium(false)}>
          Nova rodada
        </button>
      </div>
    );
  }

  return (
    <div className="screen" style={{ paddingBottom: 80, gap: 20 }}>
      {/* Appbar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        {onBack && (
          <button type="button" className="icon-btn" onClick={onBack} aria-label="Sair do lobby">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
          </button>
        )}
        <span style={{ fontFamily: 'var(--font-display)', fontSize: 18, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          Galera do Escritório
        </span>
        <span style={{ width: 44 }} />
      </div>

      {/* Turn Banner */}
      <div style={{ textAlign: 'center', padding: '8px 0 12px' }}>
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: 12, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--muted)' }}>
          É a sua vez
        </p>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 30, textTransform: 'uppercase', marginTop: 4 }}>
          Vez de Você
        </h1>
      </div>

      {/* Players list */}
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {participants.map((p) => {
          const isCurrent = p.status === 'current_turn';
          const isDone = p.status === 'played';

          return (
            <div
              key={p.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 14,
                padding: '13px 10px',
                borderTop: isCurrent ? 'none' : '1px solid var(--border)',
                background: isCurrent ? 'var(--accent-soft)' : 'transparent',
                borderRadius: isCurrent ? 14 : 0,
                margin: isCurrent ? '2px 0' : 0,
              }}
            >
              <div style={{ width: 24, height: 24, flexShrink: 0, display: 'grid', placeItems: 'center', color: isDone || isCurrent ? 'var(--accent)' : 'var(--muted)' }}>
                {isDone ? '✓' : isCurrent ? '➔' : ''}
              </div>

              <div style={{ width: 38, height: 38, borderRadius: 999, background: 'var(--border)', display: 'grid', placeItems: 'center', fontFamily: 'var(--font-display)', fontSize: 14 }}>
                {p.avatar}
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{p.name}</div>
                <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                  {isDone ? 'Já jogou' : isCurrent ? 'Sua vez' : 'Aguardando'}
                </div>
              </div>

              {p.score && (
                <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 15 }}>
                  {p.score.toFixed(1).replace('.', ',')}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Foot CTA */}
      <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 14, alignItems: 'center' }}>
        <button type="button" className="btn btn-primary" onClick={onStartRecordingForTurn}>
          Arrotar
        </button>

        <button
          type="button"
          onClick={() => setShowPodium(true)}
          style={{ fontSize: 13, color: 'var(--muted)', fontWeight: 600 }}
        >
          Todo mundo já jogou? Ver pódio →
        </button>
      </div>
    </div>
  );
};
