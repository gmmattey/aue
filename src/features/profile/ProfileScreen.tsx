import React from 'react';

import { FLAGS } from '../../shared/flags';

interface ProfileScreenProps {
  userProfile?: {
    id: string;
    apelido?: string | null;
    titulo?: string | null;
    url_do_avatar?: string | null;
    xp_total?: number;
    nivel?: number;
    bio?: string | null;
    instagram?: string | null;
    tiktok?: string | null;
    youtube?: string | null;
    twitter?: string | null;
    e_fundador?: boolean;
    e_premium?: boolean;
  } | null;
  onOpenHistorico?: () => void;
  onOpenSeguidores?: () => void;
  onOpenAssinatura?: () => void;
  onOpenSettings?: () => void;
}

export const ProfileScreen: React.FC<ProfileScreenProps> = ({
  userProfile,
  onOpenHistorico,
  onOpenSeguidores,
  onOpenAssinatura,
  onOpenSettings,
}) => {
  const apelido = userProfile?.apelido || 'Você';
  /*
    Os padrões eram 'Trovão Humano', nível 4 e 640 XP: um usuário recém-criado
    via a tela anunciar um progresso que ele não tinha. Agora o padrão é o
    começo real — sem título até o banco dar um, nível 1, zero XP.
  */
  const titulo = userProfile?.titulo || null;
  const nivel = userProfile?.nivel ?? 1;
  const xpTotal = userProfile?.xp_total ?? 0;
  const xpNext = Math.max(1, nivel) * 200;
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
          {userProfile?.e_fundador && <span style={{ color: 'var(--gold)', marginLeft: 6, fontSize: 16 }}>👑 Fundador</span>}
        </div>
        <div style={{ fontSize: 13, color: 'var(--muted)' }}>
          {titulo ? `${titulo} · ` : ''}Nível {nivel}
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

      {/*
        REMOVIDO no corte de lançamento: a barra de estatísticas trazia "87,4"
        (melhor Auê), "14" (vitórias) e "9" (conquistas) escritos à mão no
        código. Eram os números do protótipo, iguais para todo mundo, sem
        nenhuma consulta por trás — o usuário via um histórico que não era
        dele. Para voltar, precisa de uma consulta real (melhor score em
        `resultados`, contagem de desafios vencidos e de conquistas do
        usuário) chegando por prop, como `userProfile`.
      */}

      {/* Action Buttons Row */}
      <div style={{ display: 'flex', gap: 10 }}>
        {/*
          "Histórico" só aparece quando existe para onde ir. Hoje o App não
          passa `onOpenHistorico`, então o botão era um controle que respondia
          ao toque e não fazia nada.
        */}
        {onOpenHistorico && (
          <button type="button" className="btn btn-secondary" onClick={onOpenHistorico}>
            Histórico
          </button>
        )}
      </div>

      {/*
        Followers Row — mesma regra: sem `onOpenSeguidores` não há tela de
        seguidores para abrir. A legenda também era inventada ("128 seguidores
        · seguindo 86", fixo no código); quando a linha voltar, as contagens
        têm de vir de `getSeguidores`/`getSeguindo`, não do texto.
      */}
      {onOpenSeguidores && (
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
            <div style={{ fontSize: 14, fontWeight: 600 }}>Seguidores</div>
          </div>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ width: 16, height: 16, color: 'var(--muted)' }}>
            <path d="m9 6 6 6-6 6" />
          </svg>
        </button>
      )}

      {/*
        Subscription Banner Row — Auê+ está OFF (`FLAGS.assinatura`). O banner
        já era inerte (o App não passa `onOpenAssinatura`), mas continuava
        ocupando a tela vendendo uma feature desligada, sem provedor de
        pagamento integrado.
      */}
      {FLAGS.assinatura && onOpenAssinatura && (
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
              {userProfile?.e_premium ? 'Assinatura ativa · Premium' : 'Sem anúncios, arrotos ilimitados e favoritos'}
            </div>
          </div>
        </div>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ width: 16, height: 16, color: 'var(--muted)' }}>
          <path d="m9 6 6 6-6 6" />
        </svg>
      </button>
      )}
    </div>
  );
};
