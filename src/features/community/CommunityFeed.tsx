import { useEffect, useState } from 'react';
import { supabase } from '../../db/supabase';
import { CommentsModal } from './CommentsModal';
import { AdBanner } from '../../shared/components/AdBanner';

export const CommunityFeed = () => {
  const [resultados, setResultados] = useState<any[]>([]);
  const [activeCommentResultId, setActiveCommentResultId] = useState<string | null>(null);

  useEffect(() => {
    fetchResultados();
  }, []);

  const fetchResultados = async () => {
    const { data } = await supabase
      .from('resultados')
      .select('*, profiles(apelido, avatar_url)')
      .order('created_at', { ascending: false })
      .limit(20);
    if (data) setResultados(data);
  };

  const handleReaction = async (resultId: string, type: 'like' | 'dislike') => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return alert("Faça login para interagir.");

    // Simple implementation for MVP - overwriting reaction if exists
    await supabase.from('reacoes').upsert({
      result_id: resultId,
      user_id: session.user.id,
      reaction_type: type
    }, { onConflict: 'result_id,user_id' });
    
    alert(`Reação '${type}' registrada!`);
  };

  return (
    <div style={{ maxWidth: 600, margin: '0 auto', padding: 20 }}>
      <h2>Feed da Comunidade</h2>
      <AdBanner />
      {resultados.map(r => (
        <div key={r.id} style={{ background: '#f5f5f5', padding: 15, borderRadius: 8, marginBottom: 15 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
            {r.profiles?.avatar_url && <img src={r.profiles.avatar_url} width={30} height={30} style={{ borderRadius: '50%' }}/>}
            <strong>{r.profiles?.apelido || r.player_name || 'Anônimo'}</strong>
            <span style={{ color: '#666', fontSize: '0.8em' }}>Score: {r.score}</span>
          </div>
          <p>Classificação: {r.classification}</p>
          <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
            <button onClick={() => handleReaction(r.id, 'like')}>👍 Curtir</button>
            <button onClick={() => handleReaction(r.id, 'dislike')}>👎 Descurtir</button>
            <button onClick={() => setActiveCommentResultId(r.id)}>💬 Comentários</button>
          </div>
        </div>
      ))}

      {activeCommentResultId && (
        <CommentsModal 
          resultId={activeCommentResultId} 
          onClose={() => setActiveCommentResultId(null)} 
        />
      )}
    </div>
  );
};
