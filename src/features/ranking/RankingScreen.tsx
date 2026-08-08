import React, { useCallback, useEffect, useState } from 'react';
import { supabase } from '../../db/supabase';
import { formatarNota } from '../../shared/formato/nota';

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
  const [erro, setErro] = useState<string | null>(null);

  /*
    Havia três chips aqui — "Semana", "Natural", "Vitórias" — que trocavam a
    própria cor e nada mais: a consulta é sempre a mesma view e nenhum efeito
    dependia do filtro. Controle que responde ao toque sem mudar resultado é a
    mesma fachada que saiu do Perfil e das Configurações. Em vez de três
    filtros falsos, uma linha dizendo o que a lista de fato é.

    O que a view `global_ranking` entrega (migração 20260807000015): a melhor
    nota de cada usuário AUTENTICADO, sem gravações artificiais nem ocultadas,
    ordenada por nota, limitada a 50 linhas. Não é semanal e não conta
    vitórias.
  */
  const carregar = useCallback(async () => {
    setLoading(true);
    setErro(null);
    // O erro era descartado por um `if (!error && data)`: ranking que falhava
    // aparecia como "RANKING VAZIO", fazendo o produto parecer morto sem ser
    // verdade.
    const { data, error } = await supabase.from('global_ranking').select('*');
    if (error) {
      console.error('Falha ao carregar o ranking', error);
      setRanking([]);
      setErro('Não foi possível carregar o ranking.');
    } else {
      setRanking((data as RankingEntry[] | null) ?? []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  return (
    <div className="screen" style={{ paddingBottom: 80 }}>
      <p style={{ fontSize: 12.5, color: 'var(--muted)', paddingBottom: 16 }}>
        Melhor nota de cada arrotador com conta. Top 50.
      </p>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 40, color: 'var(--muted)' }}>
          Carregando ranking...
        </div>
      ) : erro ? (
        <div
          role="alert"
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 'var(--space-4)',
            textAlign: 'center',
            padding: 40,
          }}
        >
          <p style={{ fontSize: 14 }}>{erro}</p>
          <p style={{ fontSize: 12.5, color: 'var(--muted)' }}>
            Pode ser a sua conexão. Isto não quer dizer que o ranking está vazio.
          </p>
          <button type="button" className="btn btn-secondary" style={{ width: 'auto' }} onClick={carregar}>
            Tentar de novo
          </button>
        </div>
      ) : ranking.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 40, color: 'var(--muted)' }}>
          <p style={{ fontFamily: 'var(--font-display)', fontSize: 24, marginBottom: 8 }}>
            RANKING VAZIO
          </p>
          <p style={{ fontSize: 14 }}>Entre na sua conta, grave um arroto e lidere.</p>
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
                  {formatarNota(item.score)}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
