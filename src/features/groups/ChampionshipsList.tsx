import { useState, useEffect } from 'react';
import { supabase } from '../../db/supabase';
import { ChampionshipLeaderboard } from './ChampionshipLeaderboard';

export const ChampionshipsList = () => {
  const [campeonatos, setCampeonatos] = useState<any[]>([]);
  const [activeLeaderboard, setActiveLeaderboard] = useState<string | null>(null);

  useEffect(() => {
    fetchCampeonatos();
  }, []);

  const fetchCampeonatos = async () => {
    const { data } = await supabase.from('campeonatos').select('*, grupos(nome)').order('start_date', { ascending: false });
    if (data) setCampeonatos(data);
  };

  const handleJoin = async (championshipId: string) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return alert("Faça login para participar.");
    const { error } = await supabase.from('participantes_campeonato').insert([{ championship_id: championshipId, user_id: session.user.id }]);
    if (error) alert("Erro: " + error.message);
    else alert("Você entrou no campeonato!");
  };

  return (
    <div style={{ padding: 20 }}>
      <h2>Campeonatos</h2>
      {campeonatos.length === 0 && <p>Nenhum campeonato ativo no momento.</p>}
      {campeonatos.map(c => (
        <div key={c.id} style={{ border: '1px solid #ff9800', padding: 15, borderRadius: 8, marginBottom: 10, background: '#fff3e0' }}>
          <h3>{c.nome}</h3>
          <p>Grupo: {c.grupos?.nome}</p>
          <p>Início: {new Date(c.start_date).toLocaleDateString()}</p>
          <p>Fim: {new Date(c.end_date).toLocaleDateString()}</p>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button onClick={() => handleJoin(c.id)}>Participar do Campeonato</button>
            <button onClick={() => setActiveLeaderboard(c.id)} style={{ background: '#2196F3' }}>Ver Ranking</button>
          </div>
        </div>
      ))}
      {activeLeaderboard && (
        <ChampionshipLeaderboard championshipId={activeLeaderboard} onClose={() => setActiveLeaderboard(null)} />
      )}
    </div>
  );
};
