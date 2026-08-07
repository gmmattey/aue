import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../../db/supabase';

export const ChampionshipLeaderboard = ({ championshipId, onClose }: { championshipId: string, onClose: () => void }) => {
  const [leaderboard, setLeaderboard] = useState<any[]>([]);

  const fetchLeaderboard = useCallback(async () => {
    const { data, error } = await supabase
      .rpc('get_championship_leaderboard', { champ_id: championshipId });
    if (error) {
      console.error('Error fetching leaderboard', error);
    } else {
      setLeaderboard(data || []);
    }
  }, [championshipId]);

  useEffect(() => {
    fetchLeaderboard();
  }, [fetchLeaderboard]);

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
      <div style={{ background: '#fff', padding: 20, borderRadius: 8, width: 400, maxHeight: '80vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
          <h3>Ranking do Campeonato</h3>
          <button onClick={onClose}>X</button>
        </div>
        
        {leaderboard.length === 0 && <p>Nenhum resultado registrado neste campeonato ainda.</p>}
        
        {leaderboard.map((player, index) => (
          <div key={player.user_id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #eee' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontWeight: 'bold', fontSize: '1.2em', color: index === 0 ? 'gold' : index === 1 ? 'silver' : index === 2 ? '#cd7f32' : '#333' }}>
                #{index + 1}
              </span>
              {player.avatar_url && <img src={player.avatar_url} width={30} height={30} style={{ borderRadius: '50%' }} alt="Avatar" />}
              <span>{player.apelido || 'Anônimo'}</span>
            </div>
            <strong style={{ color: '#1976d2' }}>{player.highest_score} pts</strong>
          </div>
        ))}
      </div>
    </div>
  );
};
