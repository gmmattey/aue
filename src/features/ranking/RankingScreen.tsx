import React, { useEffect, useState } from 'react';
import { supabase } from '../../db/supabase';

interface RankingEntry {
  identifier: string;
  user_id: string | null;
  player_name: string | null;
  score: number;
  result_id: string;
  created_at: string;
}

export const RankingScreen: React.FC = () => {
  const [ranking, setRanking] = useState<RankingEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<'Semana' | 'Natural' | 'Vitórias'>('Semana');

  useEffect(() => {
    async function fetchRanking() {
      setLoading(true);
      const { data, error } = await supabase.from('global_ranking').select('*');
      if (!error && data) {
        setRanking(data as RankingEntry[]);
      }
      setLoading(false);
    }
    fetchRanking();
  }, []);

  return (
    <div className="screen" style={{ paddingBottom: 80 }}>
      {/* Filters */}
      <div style={{ display: 'flex', gap: 8, paddingBottom: 16, overflowX: 'auto' }}>
        {(['Semana', 'Natural', 'Vitórias'] as const).map((filter) => (
          <button
            key={filter}
            type="button"
            onClick={() => setActiveFilter(filter)}
            style={{
              padding: '8px 14px',
              borderRadius: 999,
              fontSize: 13,
              fontWeight: 600,
              border: '1px solid var(--border)',
              background: activeFilter === filter ? 'var(--accent)' : 'var(--surface)',
              color: activeFilter === filter ? 'var(--bg)' : 'var(--muted)',
            }}
          >
            {filter}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 40, color: 'var(--muted)' }}>
          Carregando ranking...
        </div>
      ) : ranking.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 40, color: 'var(--muted)' }}>
          <p style={{ fontFamily: 'var(--font-display)', fontSize: 24, marginBottom: 8 }}>
            RANKING VAZIO
          </p>
          <p style={{ fontSize: 14 }}>Seja o primeiro a gravar um arroto para liderar!</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {ranking.map((item, index) => {
            const isFirst = index === 0;
            return (
              <div
                key={item.result_id || index}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '14px 10px',
                  borderTop: index === 0 ? 'none' : '1px solid var(--border)',
                }}
              >
                {/* Position */}
                <span
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 14,
                    color: isFirst ? 'var(--gold)' : 'var(--muted)',
                    width: 28,
                    textAlign: 'center',
                    fontWeight: 700,
                  }}
                >
                  {isFirst ? '👑' : index + 1}
                </span>

                {/* Avatar */}
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 999,
                    background: isFirst ? 'var(--gold)' : 'var(--surface)',
                    border: `1px solid ${isFirst ? 'var(--gold)' : 'var(--border)'}`,
                    display: 'grid',
                    placeItems: 'center',
                    fontFamily: 'var(--font-display)',
                    fontSize: 16,
                    color: isFirst ? 'var(--bg)' : 'var(--fg)',
                  }}
                >
                  {(item.player_name || 'A').charAt(0).toUpperCase()}
                </div>

                {/* Name */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 14, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {item.player_name || 'Arrotador Anônimo'}
                  </div>
                </div>

                {/* Score */}
                <span
                  style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: 22,
                    color: isFirst ? 'var(--gold)' : 'var(--accent)',
                  }}
                >
                  {Number(item.score).toFixed(1).replace('.', ',')}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
