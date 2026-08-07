import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../db/supabase';

export const CommentsModal = ({ resultId, onClose }: { resultId: string, onClose: () => void }) => {
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState('');

  const fetchComments = useCallback(async () => {
    const { data } = await supabase
      .from('comentarios')
      .select('*, profiles(apelido)')
      .eq('result_id', resultId)
      .order('created_at', { ascending: false });
    if (data) setComments(data);
  }, [resultId]);

  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  const handlePost = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return alert("Faça login para comentar.");

    const { error } = await supabase.from('comentarios').insert([
      { result_id: resultId, user_id: session.user.id, content: newComment }
    ]);
    if (!error) {
      setNewComment('');
      fetchComments();
    }
  };

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
      <div style={{ background: '#fff', padding: 20, borderRadius: 8, width: 400, maxHeight: '80vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
          <h3>Comentários</h3>
          <button onClick={onClose}>X</button>
        </div>
        <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
          <input 
            value={newComment} 
            onChange={(e) => setNewComment(e.target.value)} 
            placeholder="Escreva um comentário..."
            style={{ flex: 1, padding: 8 }}
          />
          <button onClick={handlePost}>Postar</button>
        </div>
        <div>
          {comments.map(c => (
            <div key={c.id} style={{ borderBottom: '1px solid #eee', padding: '10px 0' }}>
              <strong>{c.profiles?.apelido || 'Anônimo'}</strong>: {c.content}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
