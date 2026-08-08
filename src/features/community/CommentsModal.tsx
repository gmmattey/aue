import React, { useCallback, useEffect, useState } from 'react';
import {
  listarComentariosDoPost,
  criarComentarioNoPost,
  apagarComentario,
  type ComentarioRow,
} from '../../db/supabase';

const LIMITE_CARACTERES = 500;

interface CommentsModalProps {
  postId: string;
  /** Id do usuário logado. Sem ele, o modal é somente leitura. */
  userId?: string;
  onClose: () => void;
  /** Avisa o feed para atualizar o contador sem recarregar tudo. */
  onComentarioCriado?: () => void;
  onComentarioApagado?: () => void;
}

/**
 * Folha de comentários de um post do feed.
 *
 * Antes este componente existia mas NINGUÉM o montava, e ele consultava apenas
 * `result_id` — o feed roteado é de `posts_comunidade`. Além disso usava
 * `select('*, profiles(apelido)')`, embed que o PostgREST não resolve porque
 * `comentarios.user_id` referencia `auth.users`, não `profiles`. Agora vai pela
 * RPC `listar_comentarios`, que faz o join explícito.
 */
export const CommentsModal: React.FC<CommentsModalProps> = ({
  postId,
  userId,
  onClose,
  onComentarioCriado,
  onComentarioApagado,
}) => {
  const [comentarios, setComentarios] = useState<ComentarioRow[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [texto, setTexto] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    setCarregando(true);
    setErro(null);
    try {
      setComentarios(await listarComentariosDoPost(postId));
    } catch (err) {
      console.error('Falha ao carregar comentários', err);
      setErro('Não foi possível carregar os comentários.');
    } finally {
      setCarregando(false);
    }
  }, [postId]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  // Fechar com Esc — a folha cobre a tela inteira e o único outro caminho é o
  // botão de fechar.
  useEffect(() => {
    const aoTeclar = (evento: KeyboardEvent) => {
      if (evento.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', aoTeclar);
    return () => window.removeEventListener('keydown', aoTeclar);
  }, [onClose]);

  async function enviar(evento: React.FormEvent) {
    evento.preventDefault();
    const conteudo = texto.trim();
    if (!conteudo || enviando) return;

    setEnviando(true);
    setErro(null);
    try {
      await criarComentarioNoPost(postId, conteudo);
      setTexto('');
      await carregar();
      onComentarioCriado?.();
    } catch (err) {
      console.error('Falha ao publicar comentário', err);
      setErro('Não foi possível publicar seu comentário.');
    } finally {
      setEnviando(false);
    }
  }

  async function apagar(comentarioId: string) {
    try {
      await apagarComentario(comentarioId);
      setComentarios((atuais) => atuais.filter((c) => c.id !== comentarioId));
      onComentarioApagado?.();
    } catch (err) {
      console.error('Falha ao apagar comentário', err);
      setErro('Não foi possível apagar o comentário.');
    }
  }

  const restantes = LIMITE_CARACTERES - texto.length;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Comentários"
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 120,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-end',
      }}
    >
      <div
        onClick={onClose}
        style={{ position: 'absolute', inset: 0, background: 'rgba(10, 10, 8, 0.7)', backdropFilter: 'blur(4px)' }}
      />

      <div
        style={{
          position: 'relative',
          zIndex: 121,
          background: 'var(--bg)',
          border: '1px solid var(--border)',
          borderBottom: 'none',
          borderRadius: 'var(--radius-lg) var(--radius-lg) 0 0',
          padding: 'var(--space-4) var(--space-5) var(--space-5)',
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--space-4)',
          maxHeight: '80%',
        }}
      >
        <div style={{ width: 40, height: 4, borderRadius: 999, background: 'var(--border)', margin: '0 auto' }} />

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 20, textTransform: 'uppercase' }}>
            Comentários
          </h2>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Fechar comentários">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {erro && (
          <p role="alert" style={{ fontSize: 13, color: 'var(--danger)' }}>
            {erro}
          </p>
        )}

        <div style={{ overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 'var(--space-4)', flex: 1 }}>
          {carregando ? (
            <p style={{ fontSize: 13, color: 'var(--muted)', textAlign: 'center', padding: 'var(--space-5)' }}>
              Carregando...
            </p>
          ) : comentarios.length === 0 ? (
            <p style={{ fontSize: 13, color: 'var(--muted)', textAlign: 'center', padding: 'var(--space-5)' }}>
              Ninguém comentou ainda. Seja o primeiro.
            </p>
          ) : (
            comentarios.map((comentario) => (
              <div key={comentario.id} style={{ display: 'flex', gap: 'var(--space-3)' }}>
                <div
                  style={{
                    width: 32,
                    height: 32,
                    flexShrink: 0,
                    borderRadius: 999,
                    background: 'var(--border)',
                    display: 'grid',
                    placeItems: 'center',
                    fontFamily: 'var(--font-display)',
                    fontSize: 13,
                  }}
                >
                  {(comentario.apelido || 'A').charAt(0).toUpperCase()}
                </div>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{comentario.apelido || 'Arrotador'}</div>
                  <p style={{ fontSize: 14, color: 'var(--fg)', wordBreak: 'break-word' }}>{comentario.content}</p>
                </div>
                {userId === comentario.user_id && (
                  <button
                    type="button"
                    onClick={() => apagar(comentario.id)}
                    aria-label="Apagar meu comentário"
                    style={{ fontSize: 12, color: 'var(--muted)', alignSelf: 'flex-start' }}
                  >
                    apagar
                  </button>
                )}
              </div>
            ))
          )}
        </div>

        {userId ? (
          <form onSubmit={enviar} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
            <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
              <input
                value={texto}
                onChange={(evento) => setTexto(evento.target.value)}
                maxLength={LIMITE_CARACTERES}
                placeholder="Escreva um comentário..."
                aria-label="Escreva um comentário"
                style={{
                  flex: 1,
                  minWidth: 0,
                  minHeight: 44,
                  padding: '0 14px',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--surface)',
                  color: 'var(--fg)',
                  font: 'inherit',
                  fontSize: 14,
                }}
              />
              <button
                type="submit"
                disabled={enviando || texto.trim().length === 0}
                style={{
                  minHeight: 44,
                  padding: '0 18px',
                  borderRadius: 999,
                  border: '1px solid transparent',
                  background: 'var(--accent)',
                  color: 'var(--accent-on)',
                  fontSize: 13,
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  opacity: enviando || texto.trim().length === 0 ? 0.5 : 1,
                }}
              >
                {enviando ? '...' : 'Enviar'}
              </button>
            </div>
            {restantes < 80 && (
              <span style={{ fontSize: 11, color: restantes < 0 ? 'var(--danger)' : 'var(--muted)', textAlign: 'right' }}>
                {restantes} caracteres restantes
              </span>
            )}
          </form>
        ) : (
          <p style={{ fontSize: 13, color: 'var(--muted)', textAlign: 'center' }}>
            Entre para comentar.
          </p>
        )}
      </div>
    </div>
  );
};
