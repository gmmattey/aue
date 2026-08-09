import React from 'react';

import { FLAGS } from '../flags';

/**
 * `inicio` e `arrotar` são a navegação do lançamento. São duas porque o MVP é
 * uma coisa só: abrir e gravar.
 *
 * `ranking`, `perfil` e `campeonatos` continuam no tipo porque as views
 * existem e o código não foi apagado — cada uma volta à barra quando a flag
 * correspondente for ligada (`VITE_FEATURE_RANKING`, `VITE_FEATURE_PERFIL`,
 * `VITE_FEATURE_LIGAS`).
 */
export type NavTab = 'inicio' | 'arrotar' | 'disputa' | 'ranking' | 'perfil' | 'campeonatos';

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
  /*
    A barra é o ÚLTIMO filho flex do `.app-shell`, e `margin-top: auto` come
    todo o espaço sobrando acima dela — é o que a prende no rodapé.

    Sem isto ela ficava logo abaixo do conteúdo, boiando no meio da tela. O
    `sticky` acima não resolve esse caso: ele prende a barra quando algo ROLA,
    e aqui não há rolagem nenhuma — há espaço vazio. Foi o que apareceu quando
    o feed saiu do corte do MVP: a `HomeScreen` passou a ser só o hero, que é
    `flex-shrink: 0` e não cresce, e o shell ficou sem nenhum filho para
    ocupar a altura. A tela de gravar escapou por acidente, porque o `App`
    a embrulha num `.screen` (`flex: 1`).

    Fica na barra, e não numa `div` em volta de cada tela, justamente para não
    depender de toda tela nova lembrar de crescer.
  */
  marginTop: 'auto',
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

      {/*
        Disputa presencial — a segunda fatia do lançamento. Entra na barra
        porque é um MODO do produto, não uma tela secundária: a pessoa decide
        entre "arrotar sozinho e mandar o link" e "disputar com quem está aqui".
      */}
      {FLAGS.disputaLocal && (
        <button
          type="button"
          onClick={() => onTabChange('disputa')}
          aria-current={activeTab === 'disputa' ? 'page' : undefined}
          style={itemStyle(activeTab === 'disputa')}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ width: 22, height: 22 }}>
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
          Disputa
        </button>
      )}

      {/*
        Ranking: fora do lançamento desde o login anônimo. A view
        `global_ranking` se protegia de anônimos com `user_id IS NOT NULL`, e
        esse filtro deixou de filtrar quando toda visita passou a ter sessão —
        o ranking listaria visitantes chamados "Arrotador a1b2c3".

        Mesma regra das Ligas: o botão não é renderizado (não é
        `display:none`), e o App recusa a view mesmo que a aba escape.
      */}
      {FLAGS.ranking && (
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
      )}

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
