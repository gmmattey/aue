import React from 'react';

import { FLAGS } from '../flags';

/**
 * `inicio`, `arrotar` e `ranking` são a navegação do lançamento.
 *
 * `perfil` continua no tipo porque é uma view real do app — ela só saiu da
 * barra: agora se chega nela pelo avatar do cabeçalho.
 *
 * `campeonatos` continua no tipo porque o código do campeonato não foi
 * apagado; a aba volta a aparecer quando `VITE_FEATURE_LIGAS` estiver ligada.
 */
export type NavTab = 'inicio' | 'arrotar' | 'ranking' | 'perfil' | 'campeonatos';

interface BottomNavProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
}

const navStyle: React.CSSProperties = {
  /*
    Em telas pequenas o `.app-shell` é `min-height: 100dvh` sem altura fixa e o
    `.screen` (flex: 1; overflow-y: auto) nunca chega a rolar sozinho: quem
    rola é o documento. Sem `position`, esta barra rolava junto e sumia — e com
    a Home mostrando o feed, ela some logo no primeiro gesto, levando embora o
    botão elevado de gravar. `sticky` a prende na base da janela enquanto o
    shell estiver visível. Em >=560px o shell tem altura fixa e `overflow:
    hidden`; ali a barra já ficava no lugar e o sticky é inócuo.
  */
  position: 'sticky',
  bottom: 0,
  flexShrink: 0,
  display: 'flex',
  alignItems: 'flex-end',
  justifyContent: 'space-around',
  padding: '10px 16px calc(14px + env(safe-area-inset-bottom))',
  background: 'color-mix(in oklch, var(--bg) 92%, transparent)',
  backdropFilter: 'blur(14px)',
  borderTop: '1px solid var(--border)',
  zIndex: 50,
};

function itemStyle(ativo: boolean): React.CSSProperties {
  return {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 4,
    color: ativo ? 'var(--fg)' : 'var(--muted)',
    fontSize: 11,
    fontWeight: 600,
    letterSpacing: '0.02em',
    padding: '4px 10px',
  };
}

export const BottomNav: React.FC<BottomNavProps> = ({ activeTab, onTabChange }) => {
  return (
    <nav style={navStyle}>
      {/* Início — Home com o convite para gravar e o feed da comunidade */}
      <button
        type="button"
        onClick={() => onTabChange('inicio')}
        aria-current={activeTab === 'inicio' ? 'page' : undefined}
        style={itemStyle(activeTab === 'inicio')}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ width: 22, height: 22 }}>
          <path d="M3 10.5 12 3l9 7.5" />
          <path d="M5 9.5V20a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V9.5" />
          <path d="M9.5 21v-6h5v6" />
        </svg>
        Início
      </button>

      {/* Ação principal, elevada */}
      <button
        type="button"
        onClick={() => onTabChange('arrotar')}
        aria-current={activeTab === 'arrotar' ? 'page' : undefined}
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

      {/* Ranking */}
      <button
        type="button"
        onClick={() => onTabChange('ranking')}
        aria-current={activeTab === 'ranking' ? 'page' : undefined}
        style={itemStyle(activeTab === 'ranking')}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ width: 22, height: 22 }}>
          <path d="M8 21h8M12 17v4M6 4h12v3a6 6 0 0 1-12 0V4Z" />
          <path d="M6 5H3v2a3 3 0 0 0 3 3M18 5h3v2a3 3 0 0 1-3 3" />
        </svg>
        Ranking
      </button>

      {/*
        Ligas: fora do lançamento. A aba só existe com `VITE_FEATURE_LIGAS`
        ligada — não é `display:none`, o botão não é renderizado. O App também
        recusa a view quando a flag está desligada, então esconder aqui não é a
        única barreira.
      */}
      {FLAGS.ligas && (
        <button
          type="button"
          onClick={() => onTabChange('campeonatos')}
          aria-current={activeTab === 'campeonatos' ? 'page' : undefined}
          style={itemStyle(activeTab === 'campeonatos')}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ width: 22, height: 22 }}>
            <path d="m14.5 17.5 3-3 3 3-3 3-3-3ZM6 3l3 3-3 3-3-3 3-3ZM8 15 15 8M11 12l6 6" />
          </svg>
          Ligas
        </button>
      )}
    </nav>
  );
};
