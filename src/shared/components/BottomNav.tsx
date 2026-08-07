import React from 'react';

export type NavTab = 'ranking' | 'arrotar' | 'perfil' | 'feed' | 'campeonatos';

interface BottomNavProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
}

const navStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'flex-end',
  justifyContent: 'space-around',
  padding: '10px 16px calc(14px + env(safe-area-inset-bottom))',
  background: 'color-mix(in oklch, var(--bg) 92%, transparent)',
  backdropFilter: 'blur(14px)',
  borderTop: '1px solid var(--border)',
  zIndex: 50,
};

export const BottomNav: React.FC<BottomNavProps> = ({ activeTab, onTabChange }) => {
  return (
    <nav style={navStyle}>
      {/* Ranking */}
      <button
        type="button"
        onClick={() => onTabChange('ranking')}
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 4,
          color: activeTab === 'ranking' ? 'var(--fg)' : 'var(--muted)',
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: '0.02em',
          padding: '4px 10px',
        }}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ width: 22, height: 22 }}>
          <path d="M8 21h8M12 17v4M6 4h12v3a6 6 0 0 1-12 0V4Z" />
          <path d="M6 5H3v2a3 3 0 0 0 3 3M18 5h3v2a3 3 0 0 1-3 3" />
        </svg>
        Ranking
      </button>

      {/* Feed Comunidade */}
      <button
        type="button"
        onClick={() => onTabChange('feed')}
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 4,
          color: activeTab === 'feed' ? 'var(--fg)' : 'var(--muted)',
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: '0.02em',
          padding: '4px 10px',
        }}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ width: 22, height: 22 }}>
          <path d="M17 20v-1a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v1M9.5 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7ZM20 20v-1a3.5 3.5 0 0 0-2.5-3.36M14.5 4.14a3.5 3.5 0 0 1 0 6.72" />
        </svg>
        Feed
      </button>

      {/* Primary Elevated ARROTAR */}
      <button
        type="button"
        onClick={() => onTabChange('arrotar')}
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 4,
          color: 'var(--muted)',
          fontSize: 11,
          fontWeight: 600,
          padding: '0 10px',
        }}
      >
        <span
          style={{
            width: 52,
            height: 52,
            borderRadius: 999,
            background: 'var(--accent)',
            display: 'grid',
            placeItems: 'center',
            marginTop: -28,
            border: '5px solid var(--bg)',
            boxShadow: '0 4px 12px rgba(198, 255, 0, 0.3)',
          }}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 24, height: 24, color: 'var(--bg)' }}>
            <path d="M12 2a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
            <path d="M19 10v1a7 7 0 0 1-14 0v-1" />
          </svg>
        </span>
        Arrotar
      </button>

      {/* Campeonatos */}
      <button
        type="button"
        onClick={() => onTabChange('campeonatos')}
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 4,
          color: activeTab === 'campeonatos' ? 'var(--fg)' : 'var(--muted)',
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: '0.02em',
          padding: '4px 10px',
        }}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ width: 22, height: 22 }}>
          <path d="m14.5 17.5 3-3 3 3-3 3-3-3ZM6 3l3 3-3 3-3-3 3-3ZM8 15 15 8M11 12l6 6" />
        </svg>
        Ligas
      </button>

      {/* Perfil */}
      <button
        type="button"
        onClick={() => onTabChange('perfil')}
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 4,
          color: activeTab === 'perfil' ? 'var(--fg)' : 'var(--muted)',
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: '0.02em',
          padding: '4px 10px',
        }}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ width: 22, height: 22 }}>
          <circle cx="12" cy="8" r="4" />
          <path d="M4 21c0-4 3.6-7 8-7s8 3 8 7" />
        </svg>
        Perfil
      </button>
    </nav>
  );
};
