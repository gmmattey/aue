import React, { useEffect, useState } from 'react';

// Import relativo INTERNO ao `shared`: nenhuma seta para `features`. É por causa
// deste consumidor que o utilitário mora em `shared/formato` e não em
// `features/audio`.
import { formatarNota } from '../formato/nota';

export type BubbleState = 'idle' | 'calibrating' | 'recording' | 'processing' | 'reveal' | 'victory' | 'error';

interface AueBubbleProps {
  state?: BubbleState;
  power?: number;       // 0 - 100
  depth?: number;       // 0 - 100
  texture?: number;     // 0 - 100
  duration?: number;    // seconds
  size?: number;        // base size in px (default 140)
  scoreDisplay?: number | null;
}

export const AueBubble: React.FC<AueBubbleProps> = ({
  state = 'idle',
  power = 50,
  depth = 50,
  texture = 50,
  size = 140,
  scoreDisplay = null,
}) => {
  const [pulse, setPulse] = useState(1.0);

  useEffect(() => {
    let animationFrameId: number;
    let startTime = Date.now();

    const animate = () => {
      const elapsed = (Date.now() - startTime) / 1000;

      if (state === 'idle') {
        setPulse(1.0 + 0.04 * Math.sin(elapsed * 2.5));
      } else if (state === 'calibrating') {
        setPulse(0.88 + 0.02 * Math.sin(elapsed * 5));
      } else if (state === 'recording') {
        const powerFactor = (power / 100) * 0.3;
        setPulse(1.0 + powerFactor + 0.06 * Math.sin(elapsed * 10));
      } else if (state === 'processing') {
        setPulse(1.1 + 0.1 * Math.sin(elapsed * 8));
      } else if (state === 'victory') {
        setPulse(1.15 + 0.05 * Math.sin(elapsed * 4));
      } else if (state === 'error') {
        setPulse(0.9 + 0.03 * Math.sin(elapsed * 12));
      } else {
        setPulse(1.0);
      }

      animationFrameId = requestAnimationFrame(animate);
    };

    animate();
    return () => cancelAnimationFrame(animationFrameId);
  }, [state, power]);

  // Color mapping based on state
  let fillColor = 'var(--surface-2)';
  let strokeColor = 'var(--accent)';
  let opacity = 0.15;

  if (state === 'recording') {
    fillColor = 'var(--accent)';
    strokeColor = 'var(--accent-strong)';
    opacity = 0.9;
  } else if (state === 'calibrating') {
    fillColor = 'var(--accent)';
    opacity = 0.4;
  } else if (state === 'processing') {
    fillColor = 'var(--fg)';
    opacity = 0.6;
  } else if (state === 'victory') {
    fillColor = 'var(--gold)';
    strokeColor = 'var(--gold-strong)';
    opacity = 0.95;
  } else if (state === 'error') {
    fillColor = 'var(--danger)';
    strokeColor = 'var(--danger-strong)';
    opacity = 0.9;
  }

  // Deform factor based on depth and texture
  const borderRadius = `${45 + (texture % 15)}% ${55 - (depth % 10)}% ${60 - (power % 15)}% ${40 + (depth % 15)}% / ${50 + (power % 10)}% ${50 - (texture % 10)}% ${50 + (depth % 10)}% ${50 - (power % 10)}%`;

  return (
    <div
      style={{
        width: size,
        height: size,
        display: 'grid',
        placeItems: 'center',
        position: 'relative',
      }}
    >
      <div
        style={{
          width: '100%',
          height: '100%',
          borderRadius,
          background: fillColor,
          opacity,
          border: `2px solid ${strokeColor}`,
          transform: `scale(${pulse})`,
          transition: 'border-color 0.3s ease, background 0.3s ease, transform 0.1s linear',
          boxShadow: state === 'victory' ? '0 0 40px rgba(244, 196, 48, 0.4)' : 'none',
        }}
      />
      {scoreDisplay !== null && (
        <div
          style={{
            position: 'absolute',
            fontFamily: 'var(--font-display)',
            fontSize: size * 0.4,
            color: state === 'victory' ? 'var(--bg)' : 'var(--accent)',
            zIndex: 2,
          }}
        >
          {formatarNota(scoreDisplay)}
        </div>
      )}
    </div>
  );
};
