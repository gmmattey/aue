import { useState, useEffect } from 'react';
import { supabase } from '../../db/supabase';

export const GroupsList = () => {
  const [grupos, setGrupos] = useState<any[]>([]);
  const [nome, setNome] = useState('');
  const [descricao, setDescricao] = useState('');

  useEffect(() => {
    fetchGrupos();
  }, []);

  const fetchGrupos = async () => {
    const { data } = await supabase.from('grupos').select('*').order('created_at', { ascending: false });
    if (data) setGrupos(data);
  };

  const handleCreateGroup = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return alert("Faça login para criar grupos.");

    const { data, error } = await supabase.from('grupos').insert([
      { nome, descricao, created_by: session.user.id }
    ]).select().single();

    if (error) {
      alert("Erro ao criar grupo: " + error.message);
    } else {
      setNome('');
      setDescricao('');
      // Auto-join the creator to the group
      await supabase.from('membros_grupo').insert([{ group_id: data.id, user_id: session.user.id, role: 'admin' }]);
      fetchGrupos();
    }
  };

  const handleJoin = async (groupId: string) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return alert("Faça login para entrar.");
    const { error } = await supabase.from('membros_grupo').insert([{ group_id: groupId, user_id: session.user.id }]);
    if (error) alert("Erro: " + error.message);
    else alert("Você entrou no grupo!");
  };

  return (
    <div style={{ padding: 20 }}>
      <h2>Grupos do Auê</h2>
      <div style={{ background: '#e3f2fd', padding: 15, borderRadius: 8, marginBottom: 20 }}>
        <h3>Criar novo grupo</h3>
        <input placeholder="Nome" value={nome} onChange={e => setNome(e.target.value)} style={{ display: 'block', marginBottom: 10, padding: 8, width: '100%' }} />
        <textarea placeholder="Descrição" value={descricao} onChange={e => setDescricao(e.target.value)} style={{ display: 'block', marginBottom: 10, padding: 8, width: '100%' }} />
        <button onClick={handleCreateGroup}>Criar Grupo</button>
      </div>

      <div>
        {grupos.map(g => (
          <div key={g.id} style={{ border: '1px solid #ccc', padding: 15, borderRadius: 8, marginBottom: 10 }}>
            <h3>{g.nome}</h3>
            <p>{g.descricao}</p>
            <button onClick={() => handleJoin(g.id)}>Entrar no Grupo</button>
          </div>
        ))}
      </div>
    </div>
  );
};
