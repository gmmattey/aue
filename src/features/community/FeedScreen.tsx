import React, { useCallback, useEffect, useState } from 'react';
import { createSocialPost, getCommunityFeed } from '../../db/supabase';

interface FeedPost {
  id: string;
  post_type: 'audio_result' | 'social_link' | 'text_announcement';
  topic: string;
  social_network?: string | null;
  social_url?: string | null;
  content?: string | null;
  created_at: string;
  profile?: {
    id: string;
    apelido?: string | null;
    avatar_url?: string | null;
  } | null;
  result?: {
    id: string;
    score: number;
    classification: string;
  } | null;
  comentarios?: { count: number }[];
  reacoes?: { reaction_type: string }[];
}

interface FeedScreenProps {
  groupId?: string;
  onOpenComments?: (postId: string) => void;
}

export const FeedScreen: React.FC<FeedScreenProps> = ({ groupId, onOpenComments }) => {
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTopic, setActiveTopic] = useState('Todos');

  // Form composer state
  const [socialNetwork, setSocialNetwork] = useState<'Instagram' | 'TikTok' | 'YouTube' | 'X'>('Instagram');
  const [socialUrl, setSocialUrl] = useState('');
  const [posting, setPosting] = useState(false);

  const topics = ['Todos', 'Arrotos lendários', 'Campeonato', 'Pós-bebida'];

  const loadFeed = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getCommunityFeed(groupId, activeTopic);
      if (data) setPosts(data as unknown as FeedPost[]);
    } catch {
      setPosts(mockFeedPosts);
    }
    setLoading(false);
  }, [groupId, activeTopic]);

  useEffect(() => {
    loadFeed();
  }, [loadFeed]);


  async function handleSocialSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!socialUrl.trim()) return;
    setPosting(true);
    try {
      await createSocialPost({
        groupId,
        socialNetwork,
        socialUrl: socialUrl.trim(),
        topic: activeTopic,
      });
      setSocialUrl('');
      loadFeed();
    } catch {
      alert('Erro ao publicar link. Verifique a URL.');
    }
    setPosting(false);
  }

  return (
    <div className="screen" style={{ paddingBottom: 80, gap: 16 }}>
      {/* Topics Filters */}
      <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
        {topics.map((topic) => (
          <button
            key={topic}
            type="button"
            onClick={() => setActiveTopic(topic)}
            style={{
              flexShrink: 0,
              border: '1px solid var(--border)',
              borderRadius: 999,
              padding: '8px 14px',
              color: activeTopic === topic ? 'var(--fg)' : 'var(--muted)',
              background: activeTopic === topic ? 'var(--surface)' : 'transparent',
              fontSize: 12,
              fontWeight: 600,
            }}
          >
            {topic}
          </button>
        ))}
      </div>

      {/* Composer for Social Network Link */}
      <form
        onSubmit={handleSocialSubmit}
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
          padding: '16px 0',
          borderBottom: '1px solid var(--border)',
        }}
      >
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--muted)' }}>
          Postar link de rede social
        </span>
        <div style={{ display: 'flex', gap: 8 }}>
          <select
            value={socialNetwork}
            onChange={(e) => setSocialNetwork(e.target.value as 'Instagram' | 'TikTok' | 'YouTube' | 'X')}
            style={{
              width: 110,
              minHeight: 44,
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-md)',
              background: 'var(--surface)',
              color: 'var(--fg)',
              padding: '0 10px',
              font: 'inherit',
              fontSize: 13,
            }}
          >
            <option>Instagram</option>
            <option>TikTok</option>
            <option>YouTube</option>
            <option>X</option>
          </select>
          <input
            type="url"
            placeholder="https://..."
            value={socialUrl}
            onChange={(e) => setSocialUrl(e.target.value)}
            required
            style={{
              flex: 1,
              minWidth: 0,
              minHeight: 44,
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-md)',
              background: 'var(--surface)',
              color: 'var(--fg)',
              padding: '0 12px',
              font: 'inherit',
              fontSize: 13,
            }}
          />
          <button
            type="submit"
            disabled={posting}
            style={{
              minHeight: 44,
              padding: '0 14px',
              border: '1px solid var(--border)',
              borderRadius: 999,
              color: 'var(--fg)',
              fontSize: 12,
              fontWeight: 700,
              textTransform: 'uppercase',
            }}
          >
            {posting ? '...' : 'Postar'}
          </button>
        </div>
      </form>

      {/* Feed Posts */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 40, color: 'var(--muted)' }}>Carregando feed...</div>
      ) : posts.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 40, color: 'var(--muted)' }}>Nenhum post no momento.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {posts.map((post) => (
            <article
              key={post.id}
              style={{
                padding: '16px 0',
                borderTop: '1px solid var(--border)',
                display: 'flex',
                flexDirection: 'column',
                gap: 12,
              }}
            >
              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 999,
                    background: 'var(--border)',
                    display: 'grid',
                    placeItems: 'center',
                    fontFamily: 'var(--font-display)',
                    fontSize: 15,
                  }}
                >
                  {(post.profile?.apelido || 'A').charAt(0).toUpperCase()}
                </div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{post.profile?.apelido || 'Arrotador'}</div>
                  <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                    {post.post_type === 'social_link' ? 'link social' : 'arroto'} · {new Date(post.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>

              {/* Body */}
              {post.post_type === 'social_link' && post.social_url ? (
                <a
                  href={post.social_url}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: 12,
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--surface)',
                  }}
                >
                  <div style={{ width: 32, height: 32, borderRadius: 999, background: 'var(--border)', display: 'grid', placeItems: 'center', fontSize: 14 }}>
                    ↗
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
                    <span style={{ fontSize: 12, fontWeight: 700 }}>{post.social_network} de {post.profile?.apelido || 'Usuário'}</span>
                    <span style={{ fontSize: 12, color: 'var(--muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {post.social_url}
                    </span>
                  </div>
                </a>
              ) : (
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 30, fontWeight: 700, color: 'var(--accent)' }}>
                    {Number(post.result?.score || 85.0).toFixed(1).replace('.', ',')}
                  </span>
                  <span style={{ fontFamily: 'var(--font-display)', fontSize: 14, textTransform: 'uppercase' }}>
                    {post.result?.classification || 'Mestre Arrotador'}
                  </span>
                </div>
              )}

              {/* Actions */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <button
                  type="button"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '8px 14px',
                    borderRadius: 999,
                    border: '1px solid var(--border)',
                    color: 'var(--muted)',
                    fontSize: 13,
                    fontWeight: 600,
                  }}
                >
                  👍 12
                </button>
                {onOpenComments && (
                  <button
                    type="button"
                    onClick={() => onOpenComments(post.id)}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      padding: '8px 14px',
                      borderRadius: 999,
                      border: '1px solid var(--border)',
                      color: 'var(--muted)',
                      fontSize: 13,
                      fontWeight: 600,
                      marginLeft: 'auto',
                    }}
                  >
                    Comentar ({post.comentarios?.[0]?.count || 0})
                  </button>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
};

const mockFeedPosts: FeedPost[] = [
  {
    id: 'post-1',
    post_type: 'social_link',
    topic: 'Todos',
    social_network: 'Instagram',
    social_url: 'https://instagram.com/carol.arrota',
    created_at: new Date().toISOString(),
    profile: { id: 'user-1', apelido: 'Carol' },
    comentarios: [{ count: 6 }],
  },
  {
    id: 'post-2',
    post_type: 'audio_result',
    topic: 'Arrotos lendários',
    created_at: new Date().toISOString(),
    profile: { id: 'user-1', apelido: 'Carol' },
    result: { id: 'res-1', score: 98.1, classification: 'Deus do Auê' },
    comentarios: [{ count: 12 }],
  },
  {
    id: 'post-3',
    post_type: 'audio_result',
    topic: 'Pós-bebida',
    created_at: new Date().toISOString(),
    profile: { id: 'user-2', apelido: 'Bruno' },
    result: { id: 'res-2', score: 95.6, classification: 'Mestre Arrotador' },
    comentarios: [{ count: 3 }],
  },
];
