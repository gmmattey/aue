import React, { useState } from 'react';

interface SettingsScreenProps {
  onBack?: () => void;
  onSignOut?: () => void;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({ onBack, onSignOut }) => {
  const [showAssinatura, setShowAssinatura] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const [notifChallenges, setNotifChallenges] = useState(true);
  const [notifRanking, setNotifRanking] = useState(true);
  const [notifCommunity, setNotifCommunity] = useState(true);

  if (showAssinatura) {
    return (
      <div className="screen" style={{ paddingBottom: 80, gap: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button type="button" className="icon-btn" onClick={() => setShowAssinatura(false)} aria-label="Fechar">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
          </button>
        </div>

        {/* Hero */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 12 }}>
          <div style={{ width: 72, height: 72, borderRadius: 999, background: 'var(--accent-soft)', display: 'grid', placeItems: 'center' }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" style={{ width: 30, height: 30, color: 'var(--accent)' }}>
              <path d="m12 2 2.9 6.3 6.9.8-5.1 4.7 1.4 6.8L12 17.3l-6.1 3.3 1.4-6.8L2.2 9l6.9-.8L12 2Z" />
            </svg>
          </div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 28, textTransform: 'uppercase', lineHeight: 1.1 }}>
            Auê! sem limite.
          </h1>
          <p style={{ color: 'var(--muted)', fontSize: 14, maxWidth: '32ch' }}>
            Assine e jogue sem interrupção — sem anúncio, sem trava, sem esquecer o melhor arroto.
          </p>
        </div>

        {/* Benefits */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
            <div style={{ width: 38, height: 38, borderRadius: 999, background: 'var(--surface)', border: '1px solid var(--border)', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
              🚫
            </div>
            <div>
              <div style={{ fontSize: 14.5, fontWeight: 700 }}>Remove anúncios</div>
              <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 2 }}>Ranking, campeonatos e comunidades sem anúncio.</div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
            <div style={{ width: 38, height: 38, borderRadius: 999, background: 'var(--surface)', border: '1px solid var(--border)', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
              🎙️
            </div>
            <div>
              <div style={{ fontSize: 14.5, fontWeight: 700 }}>Arrotos ilimitados</div>
              <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 2 }}>Grave e envie quantos quiser, sem limite diário.</div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
            <div style={{ width: 38, height: 38, borderRadius: 999, background: 'var(--surface)', border: '1px solid var(--border)', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
              ⭐
            </div>
            <div>
              <div style={{ fontSize: 14.5, fontWeight: 700 }}>Favoritos salvos</div>
              <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 2 }}>Guarde seus melhores arrotos e reveja quando quiser.</div>
            </div>
          </div>
        </div>

        {/* Price Card */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
            padding: '20px',
            borderRadius: 'var(--radius-lg)',
            background: 'var(--surface)',
            border: '1px solid var(--border)',
          }}
        >
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--muted)' }}>
            Plano mensal
          </span>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginTop: 4 }}>
            <span style={{ fontFamily: 'var(--font-display)', fontSize: 20 }}>R$</span>
            <span style={{ fontFamily: 'var(--font-display)', fontSize: 48 }}>4,99</span>
            <span style={{ fontSize: 14, color: 'var(--muted)' }}>/mês</span>
          </div>
        </div>

        {/* Actions */}
        <button type="button" className="btn btn-primary" onClick={() => alert('Integração de pagamento pronta!')}>
          Assinar por R$ 4,99/mês
        </button>
      </div>
    );
  }

  if (showDeleteConfirm) {
    return (
      <div className="screen" style={{ paddingBottom: 80, gap: 24, textAlign: 'center', justifyContent: 'center' }}>
        <div style={{ fontSize: 48 }}>⚠️</div>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 28, textTransform: 'uppercase' }}>
          Tem certeza que quer apagar?
        </h1>
        <p style={{ color: 'var(--muted)', fontSize: 14, maxWidth: '32ch', margin: '0 auto' }}>
          Essa ação apaga seu perfil, histórico de arrotos, conquistas e conquistas para sempre. Não dá para desfazer.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 20 }}>
          <button
            type="button"
            className="btn"
            style={{ background: 'var(--danger)', color: '#fff' }}
            onClick={() => alert('Solicitação de exclusão processada.')}
          >
            Sim, apagar minha conta
          </button>
          <button type="button" className="btn btn-secondary" onClick={() => setShowDeleteConfirm(false)}>
            Cancelar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="screen" style={{ paddingBottom: 80, gap: 20 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {onBack && (
          <button type="button" className="icon-btn" onClick={onBack} aria-label="Voltar">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="m15 18-6-6 6-6" /></svg>
          </button>
        )}
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 22, textTransform: 'uppercase' }}>Configurações</h1>
      </div>

      {/* Conta */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11.5, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--muted)', paddingLeft: 4 }}>
          Conta
        </span>
        <div style={{ display: 'flex', flexDirection: 'column', borderRadius: 'var(--radius-lg)', background: 'var(--surface)', border: '1px solid var(--border)', overflow: 'hidden' }}>
          <button
            type="button"
            onClick={() => setShowAssinatura(true)}
            style={settingRowStyle}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" style={{ width: 19, height: 19, color: 'var(--accent)' }}>
                <path d="m12 2 2.9 6.3 6.9.8-5.1 4.7 1.4 6.8L12 17.3l-6.1 3.3 1.4-6.8L2.2 9l6.9-.8L12 2Z" />
              </svg>
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontSize: 14, fontWeight: 600 }}>Assinatura</div>
                <div style={{ fontSize: 12, color: 'var(--muted)' }}>Auê! sem limite · R$ 4,99/mês</div>
              </div>
            </div>
            <ChevronRight />
          </button>
        </div>
      </div>

      {/* Notificações */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11.5, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--muted)', paddingLeft: 4 }}>
          Notificações
        </span>
        <div style={{ display: 'flex', flexDirection: 'column', borderRadius: 'var(--radius-lg)', background: 'var(--surface)', border: '1px solid var(--border)', overflow: 'hidden' }}>
          <div style={settingRowStyle}>
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontSize: 14, fontWeight: 600 }}>Desafios e revanches</div>
              <div style={{ fontSize: 12, color: 'var(--muted)' }}>Quando alguém te desafia</div>
            </div>
            <input type="checkbox" checked={notifChallenges} onChange={(e) => setNotifChallenges(e.target.checked)} />
          </div>

          <div style={{ ...settingRowStyle, borderTop: '1px solid var(--border)' }}>
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontSize: 14, fontWeight: 600 }}>Ranking e campeonatos</div>
              <div style={{ fontSize: 12, color: 'var(--muted)' }}>Mudanças de posição</div>
            </div>
            <input type="checkbox" checked={notifRanking} onChange={(e) => setNotifRanking(e.target.checked)} />
          </div>

          <div style={{ ...settingRowStyle, borderTop: '1px solid var(--border)' }}>
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontSize: 14, fontWeight: 600 }}>Comunidade</div>
              <div style={{ fontSize: 12, color: 'var(--muted)' }}>Comentários e atividade</div>
            </div>
            <input type="checkbox" checked={notifCommunity} onChange={(e) => setNotifCommunity(e.target.checked)} />
          </div>
        </div>
      </div>

      {/* Sair / Apagar */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ display: 'flex', flexDirection: 'column', borderRadius: 'var(--radius-lg)', background: 'var(--surface)', border: '1px solid var(--border)', overflow: 'hidden' }}>
          {onSignOut && (
            <button type="button" onClick={onSignOut} style={settingRowStyle}>
              <span style={{ fontSize: 14, fontWeight: 600 }}>Sair da conta</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => setShowDeleteConfirm(true)}
            style={{ ...settingRowStyle, borderTop: '1px solid var(--border)', color: 'var(--danger)' }}
          >
            <span style={{ fontSize: 14, fontWeight: 600 }}>Apagar conta</span>
          </button>
        </div>
      </div>

      <p style={{ textAlign: 'center', fontFamily: 'var(--font-mono)', fontSize: 11.5, color: 'var(--muted)', marginTop: 'auto' }}>
        Auê! · versão 1.0.0
      </p>
    </div>
  );
};

const settingRowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 12,
  padding: '15px 16px',
  width: '100%',
  color: 'var(--fg)',
};

const ChevronRight = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ width: 16, height: 16, color: 'var(--muted)' }}>
    <path d="m9 6 6 6-6 6" />
  </svg>
);
