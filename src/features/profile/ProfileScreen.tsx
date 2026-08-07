import React from 'react';

interface ProfileScreenProps {
  userProfile?: {
    id: string;
    apelido?: string | null;
    titulo?: string | null;
    avatar_url?: string | null;
    xp_total?: number;
    nivel?: number;
    bio?: string | null;
    instagram_handle?: string | null;
    tiktok_handle?: string | null;
    youtube_handle?: string | null;
    twitter_handle?: string | null;
    is_founder?: boolean;
    is_premium?: boolean;
  } | null;
  onOpenConquistas?: () => void;
  onOpenHistorico?: () => void;
  onOpenSeguidores?: () => void;
  onOpenAssinatura?: () => void;
  onOpenSettings?: () => void;
}

export const ProfileScreen: React.FC<ProfileScreenProps> = ({
  userProfile,
  onOpenConquistas,
  onOpenHistorico,
  onOpenSeguidores,
  onOpenAssinatura,
  onOpenSettings,
}) => {
  const apelido = userProfile?.apelido || 'Você';
  const titulo = userProfile?.titulo || 'Trovão Humano';
  const nivel = userProfile?.nivel || 4;
  const xpTotal = userProfile?.xp_total || 640;
  const xpNext = nivel * 200;
  const xpPercent = Math.min(100, Math.round((xpTotal / xpNext) * 100));

  return (
    <div className="screen" style={{ paddingBottom: 80, gap: 20 }}>
      {/* Header with Appbar action */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 24, textTransform: 'uppercase' }}>Perfil</h1>
        <div style={{ display: 'flex', gap: 8 }}>
          {onOpenSettings && (
            <button type="button" className="icon-btn" onClick={onOpenSettings} aria-label="Configurações">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1.04 1.56V21a2 2 0 0 1-4 0v-.09A1.7 1.7 0 0 0 9 19.37a1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.7 1.7 0 0 0 4.63 15a1.7 1.7 0 0 0-1.56-1.04H3a2 2 0 0 1 0-4h.09A1.7 1.7 0 0 0 4.63 9a1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.7 1.7 0 0 0 9 4.63a1.7 1.7 0 0 0 1.04-1.56V3a2 2 0 0 1 4 0v.09A1.7 1.7 0 0 0 15 4.63a1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.7 1.7 0 0 0 19.37 9a1.7 1.7 0 0 0 1.56 1.04H21a2 2 0 0 1 0 4h-.09a1.7 1.7 0 0 0-1.56 1.04Z" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Profile Identity Block */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 6 }}>
        <div
          style={{
            width: 88,
            height: 88,
            borderRadius: 999,
            background: 'var(--accent)',
            display: 'grid',
            placeItems: 'center',
            fontFamily: 'var(--font-display)',
            fontSize: 34,
            color: 'var(--bg)',
            boxShadow: '0 8px 24px rgba(198, 255, 0, 0.2)',
          }}
        >
          {apelido.charAt(0).toUpperCase()}
        </div>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 24, textTransform: 'uppercase', marginTop: 8 }}>
          {apelido}
          {userProfile?.is_founder && <span style={{ color: 'var(--gold)', marginLeft: 6, fontSize: 16 }}>👑 Fundador</span>}
        </div>
        <div style={{ fontSize: 13, color: 'var(--muted)' }}>
          {titulo} · Nível {nivel}
        </div>
      </div>

      {/* XP Progress Bar */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--muted)', fontFamily: 'var(--font-mono)' }}>
          <span>Nível {nivel}</span>
          <b style={{ color: 'var(--fg)' }}>{xpTotal} / {xpNext} XP</b>
        </div>
        <div style={{ height: 8, borderRadius: 999, background: 'var(--border)', overflow: 'hidden' }}>
          <div style={{ height: '100%', borderRadius: 999, background: 'var(--accent)', width: `${xpPercent}%` }} />
        </div>
      </div>

      {/* Stats Bar */}
      <div style={{ display: 'flex', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}>
        <div style={{ flex: 1, padding: '16px 4px', textAlign: 'center' }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 20, fontWeight: 600 }}>87,4</div>
          <div style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: 4 }}>Melhor Auê</div>
        </div>
        <div style={{ flex: 1, padding: '16px 4px', textAlign: 'center', borderLeft: '1px solid var(--border)' }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 20, fontWeight: 600 }}>14</div>
          <div style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: 4 }}>Vitórias</div>
        </div>
        <div style={{ flex: 1, padding: '16px 4px', textAlign: 'center', borderLeft: '1px solid var(--border)' }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 20, fontWeight: 600 }}>9</div>
          <div style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: 4 }}>Conquistas</div>
        </div>
      </div>

      {/* Action Buttons Row */}
      <div style={{ display: 'flex', gap: 10 }}>
        <button type="button" className="btn btn-secondary" onClick={onOpenConquistas}>
          Conquistas
        </button>
        <button type="button" className="btn btn-secondary" onClick={onOpenHistorico}>
          Histórico
        </button>
      </div>

      {/* Followers Row */}
      <button
        type="button"
        onClick={onOpenSeguidores}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          padding: '14px 16px',
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)',
          textAlign: 'left',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ width: 20, height: 20, color: 'var(--accent)' }}>
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600 }}>Seguidores</div>
            <div style={{ fontSize: 12, color: 'var(--muted)' }}>128 seguidores · seguindo 86</div>
          </div>
        </div>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ width: 16, height: 16, color: 'var(--muted)' }}>
          <path d="m9 6 6 6-6 6" />
        </svg>
      </button>

      {/* Subscription Banner Row */}
      <button
        type="button"
        onClick={onOpenAssinatura}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          padding: '14px 16px',
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)',
          textAlign: 'left',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ width: 20, height: 20, color: 'var(--accent)' }}>
            <path d="m12 2 2.9 6.3 6.9.8-5.1 4.7 1.4 6.8L12 17.3l-6.1 3.3 1.4-6.8L2.2 9l6.9-.8L12 2Z" />
          </svg>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600 }}>Auê! sem limite</div>
            <div style={{ fontSize: 12, color: 'var(--muted)' }}>
              {userProfile?.is_premium ? 'Assinatura ativa · Premium' : 'Sem anúncios, arrotos ilimitados e favoritos'}
            </div>
          </div>
        </div>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ width: 16, height: 16, color: 'var(--muted)' }}>
          <path d="m9 6 6 6-6 6" />
        </svg>
      </button>
    </div>
  );
};
