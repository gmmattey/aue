import React, { useCallback, useEffect, useState } from 'react';
import { getUserConquistasCatalog } from '../../db/supabase';

interface ConquistaCatalogItem {
  id: string;
  nome: string;
  descricao: string;
  icone: string;
  categoria: string;
  is_rare: boolean;
  is_secret: boolean;
  unlocked: boolean;
  unlocked_at?: string | null;
}

interface ConquistasScreenProps {
  userId?: string;
  onBack?: () => void;
}

export const ConquistasScreen: React.FC<ConquistasScreenProps> = ({ userId, onBack }) => {
  const [items, setItems] = useState<ConquistaCatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  /*
    Antes existia aqui uma lista fixa (`defaultPrototypeBadges`) com 9 de 12
    conquistas marcadas como desbloqueadas — "Primeiro Auê", "Top 20",
    "Nível 4", "Primeira vitória". Ela entrava em DOIS caminhos: quando a
    consulta falhava e quando não havia sessão. O cabeçalho então anunciava
    "9 de 12 desbloqueadas" para quem nunca tinha gravado nada.

    Falha agora é falha, e ausência de sessão é ausência de sessão. A tela
    nunca exibe progresso que o usuário não tem.
  */
  const carregar = useCallback(async () => {
    if (!userId) {
      setItems([]);
      setErro(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setErro(null);
    try {
      const data = await getUserConquistasCatalog(userId);
      setItems((data as ConquistaCatalogItem[] | null) ?? []);
    } catch (err) {
      console.error('Falha ao carregar as conquistas', err);
      setItems([]);
      setErro('Não foi possível carregar suas conquistas.');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const unlockedCount = items.filter((i) => i.unlocked).length;
  const mostrarContagem = !loading && !erro && items.length > 0;

  return (
    <div className="screen" style={{ paddingBottom: 80 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        {onBack && (
          <button type="button" className="icon-btn" onClick={onBack} aria-label="Voltar">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="m15 18-6-6 6-6" />
            </svg>
          </button>
        )}
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 24, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          Conquistas
        </h1>
        <span style={{ width: 44 }} />
      </div>

      {mostrarContagem && (
        <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 16 }}>
          <b style={{ color: 'var(--fg)', fontFamily: 'var(--font-mono)' }}>{unlockedCount}</b> de {items.length} desbloqueadas
        </p>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: 40, color: 'var(--muted)' }}>Carregando conquistas...</div>
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
            Pode ser a sua conexão. Nada foi perdido — o que você já desbloqueou continua lá.
          </p>
          <button type="button" className="btn btn-secondary" style={{ width: 'auto' }} onClick={carregar}>
            Tentar de novo
          </button>
        </div>
      ) : !userId ? (
        <div style={{ textAlign: 'center', padding: 40, color: 'var(--muted)', fontSize: 14 }}>
          Entre na sua conta para acompanhar suas conquistas.
        </div>
      ) : items.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 40, color: 'var(--muted)', fontSize: 14 }}>
          Nenhuma conquista disponível ainda.
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
          {items.map((badge) => {
            const isUnlocked = badge.unlocked;
            const isSecret = badge.is_secret && !isUnlocked;

            return (
              <div
                key={badge.id}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 8,
                  textAlign: 'center',
                  padding: '14px 8px',
                  borderRadius: 'var(--radius-lg)',
                  border: `1px solid ${isUnlocked ? 'var(--accent)' : 'var(--border)'}`,
                  background: 'var(--surface)',
                  opacity: !isUnlocked ? 0.6 : 1,
                  position: 'relative',
                }}
              >
                {badge.is_rare && isUnlocked && (
                  <span
                    style={{
                      position: 'absolute',
                      top: 6,
                      right: 6,
                      fontSize: 9,
                      fontWeight: 700,
                      color: 'var(--accent)',
                      border: '1px solid var(--accent)',
                      padding: '2px 4px',
                      borderRadius: 4,
                    }}
                  >
                    RARA
                  </span>
                )}
                <div
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 999,
                    display: 'grid',
                    placeItems: 'center',
                    border: `1px solid ${isUnlocked ? 'var(--accent)' : 'var(--border)'}`,
                    background: isUnlocked ? 'var(--accent-soft)' : 'var(--surface-2)',
                    color: isUnlocked ? 'var(--accent)' : 'var(--muted)',
                  }}
                >
                  <BadgeIcon name={isSecret ? 'lock' : badge.icone} />
                </div>
                <span
                  style={{
                    fontSize: 11.5,
                    fontWeight: 600,
                    lineHeight: 1.3,
                    color: isUnlocked ? 'var(--fg)' : 'var(--muted)',
                  }}
                >
                  {isSecret ? '???' : badge.nome}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

const BadgeIcon: React.FC<{ name: string }> = ({ name }) => {
  switch (name) {
    case 'mic':
      return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" style={{ width: 20, height: 20 }}><path d="M12 2a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" /><path d="M19 10v1a7 7 0 0 1-14 0v-1" /></svg>;
    case 'star':
      return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" style={{ width: 20, height: 20 }}><path d="M12 2v20M2 12h20" /></svg>;
    case 'trophy':
      return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" style={{ width: 20, height: 20 }}><path d="M8 21h8M12 17v4M6 4h12v3a6 6 0 0 1-12 0V4Z" /></svg>;
    case 'sun':
      return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" style={{ width: 20, height: 20 }}><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M2 12h2M20 12h2" /></svg>;
    case 'flame':
      return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" style={{ width: 20, height: 20 }}><path d="M4 4h16v16H4z" /><path d="M4 10h16" /></svg>;
    case 'swords':
      return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" style={{ width: 20, height: 20 }}><path d="m14.5 17.5 3-3 3 3-3 3-3-3ZM6 3l3 3-3 3-3-3 3-3Z" /></svg>;
    case 'crown':
      return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" style={{ width: 20, height: 20 }}><path d="M8 21h8M12 17v4M6 4h12v3a6 6 0 0 1-12 0V4Z" /><path d="M6 5H3v2a3 3 0 0 0 3 3M18 5h3v2a3 3 0 0 1-3 3" /></svg>;
    case 'zap':
      return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" style={{ width: 20, height: 20 }}><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" /></svg>;
    default:
      return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" style={{ width: 20, height: 20 }}><circle cx="12" cy="12" r="9" /><path d="M9.5 9.5a2.5 2.5 0 1 1 3.6 2.25c-.7.35-1.1.9-1.1 1.75M12 17h.01" /></svg>;
  }
};
