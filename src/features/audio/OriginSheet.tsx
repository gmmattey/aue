import React, { useState } from 'react';

interface OriginSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectOrigin: (originType: string, originSubtype?: string) => void;
}

export const OriginSheet: React.FC<OriginSheetProps> = ({ isOpen, onClose, onSelectOrigin }) => {
  const [subView, setSubView] = useState<'main' | 'bebida' | 'comida'>('main');

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 100,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-end',
      }}
    >
      {/* Scrim Overlay */}
      <div
        onClick={onClose}
        style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(10, 10, 8, 0.7)',
          backdropFilter: 'blur(4px)',
        }}
      />

      {/* Sheet Content */}
      <div
        style={{
          position: 'relative',
          background: 'var(--bg)',
          border: '1px solid var(--border)',
          borderBottom: 'none',
          borderRadius: '24px 24px 0 0',
          padding: '16px 20px 32px',
          boxShadow: '0 -24px 60px -20px rgba(0,0,0,0.6)',
          zIndex: 101,
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
        }}
      >
        <div style={{ width: 40, height: 4, borderRadius: 999, background: 'var(--border)', margin: '0 auto 8px' }} />

        {subView === 'main' && (
          <>
            <div style={{ textAlign: 'center' }}>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 22, textTransform: 'uppercase' }}>
                E isso veio de onde?
              </h2>
              <p style={{ fontSize: 13, color: 'var(--muted)', marginTop: 4 }}>Ajuda a julgar direito.</p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <button
                type="button"
                onClick={() => onSelectOrigin('Espontâneo')}
                style={rowStyle}
              >
                <span style={{ fontSize: 22 }}>⚡</span>
                <div style={{ textAlign: 'left', flex: 1 }}>
                  <div style={{ fontSize: 15, fontWeight: 600 }}>Espontâneo</div>
                  <div style={{ fontSize: 12, color: 'var(--muted)' }}>Auê 100% natural sem empurrão</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setSubView('bebida')}
                style={rowStyle}
              >
                <span style={{ fontSize: 22 }}>🍺</span>
                <div style={{ textAlign: 'left', flex: 1 }}>
                  <div style={{ fontSize: 15, fontWeight: 600 }}>Pós bebida</div>
                  <div style={{ fontSize: 12, color: 'var(--muted)' }}>Cerveja, refrigerante, vinho...</div>
                </div>
                <ChevronRight />
              </button>

              <button
                type="button"
                onClick={() => setSubView('comida')}
                style={rowStyle}
              >
                <span style={{ fontSize: 22 }}>🍕</span>
                <div style={{ textAlign: 'left', flex: 1 }}>
                  <div style={{ fontSize: 15, fontWeight: 600 }}>Comida</div>
                  <div style={{ fontSize: 12, color: 'var(--muted)' }}>Pizza, hambúrguer, pesada...</div>
                </div>
                <ChevronRight />
              </button>

              <button
                type="button"
                onClick={() => onSelectOrigin('Puxei ar')}
                style={rowStyle}
              >
                <span style={{ fontSize: 22 }}>💨</span>
                <div style={{ textAlign: 'left', flex: 1 }}>
                  <div style={{ fontSize: 15, fontWeight: 600 }}>Forçado com ar</div>
                  <div style={{ fontSize: 12, color: 'var(--muted)' }}>Puxou ar pra garganta</div>
                </div>
              </button>
            </div>
          </>
        )}

        {subView === 'bebida' && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <button type="button" className="icon-btn" onClick={() => setSubView('main')}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="m15 18-6-6 6-6" /></svg>
              </button>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 20, textTransform: 'uppercase' }}>Qual bebida?</h2>
              <span style={{ width: 44 }} />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {['Cerveja', 'Refrigerante', 'Vinho', 'Outra'].map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => onSelectOrigin('Bebida', item)}
                  style={rowStyle}
                >
                  <span style={{ fontSize: 22 }}>{item === 'Cerveja' ? '🍺' : item === 'Refrigerante' ? '🥤' : item === 'Vinho' ? '🍷' : '🤷'}</span>
                  <span style={{ fontSize: 15, fontWeight: 600 }}>{item}</span>
                </button>
              ))}
            </div>
          </>
        )}

        {subView === 'comida' && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <button type="button" className="icon-btn" onClick={() => setSubView('main')}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="m15 18-6-6 6-6" /></svg>
              </button>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 20, textTransform: 'uppercase' }}>Qual comida?</h2>
              <span style={{ width: 44 }} />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {['Pizza', 'Hambúrguer', 'Almoço pesado', 'Outra'].map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => onSelectOrigin('Comida', item)}
                  style={rowStyle}
                >
                  <span style={{ fontSize: 22 }}>{item === 'Pizza' ? '🍕' : item === 'Hambúrguer' ? '🍔' : item === 'Almoço pesado' ? '🍲' : '🤷'}</span>
                  <span style={{ fontSize: 15, fontWeight: 600 }}>{item}</span>
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

const rowStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: 14,
  padding: '14px 12px',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius-md)',
  background: 'var(--surface)',
  width: '100%',
  color: 'var(--fg)',
} as const;

const ChevronRight = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ width: 18, height: 18, color: 'var(--muted)' }}>
    <path d="m9 6 6 6-6 6" />
  </svg>
);
