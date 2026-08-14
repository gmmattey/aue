import React from 'react';

/**
 * Ícones das técnicas de `/como-arrotar`.
 *
 * Mesma linguagem visual dos ícones que já existem no jogo (os cinco ícones de
 * lugar na roda, o ícone de "tirar participante" em `AbrirARoda.tsx`):
 * `viewBox="0 0 24 24"`, sem preenchimento, traço de 2px, pontas e junções
 * arredondadas. A cor não vem daqui — quem usa o ícone decide via `color` no
 * CSS (ver `.desktop-step-icone svg` e `.publico-tipo-card svg` em
 * `LayoutPublico.css`).
 */
const propsBase = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
};

/** Golinhos em sequência: três chevrons empilhados descendo. */
export const IconeGolinhos: React.FC = () => (
  <svg {...propsBase}>
    <path d="M8 3l4 4 4-4" />
    <path d="M8 9l4 4 4-4" />
    <path d="M8 15l4 4 4-4" />
  </svg>
);

/** Bebida com gás: uma lata e as bolhas subindo. */
export const IconeLata: React.FC = () => (
  <svg {...propsBase}>
    <rect x="5" y="6" width="10" height="14" rx="2" />
    <path d="M5 10h10" />
    <circle cx="18" cy="15" r="1" />
    <circle cx="19.5" cy="10.5" r="1" />
    <circle cx="17.5" cy="6.5" r="1" />
  </svg>
);

/** Postura: corpo inclinado pra frente. */
export const IconePostura: React.FC = () => (
  <svg {...propsBase}>
    <circle cx="9" cy="5" r="2" />
    <path d="M9 7l5 8" />
    <path d="M14 15l3 5" />
    <path d="M11 9l5 3" />
  </svg>
);

/** Sequência: duas setas fechando um círculo, repetição. */
export const IconeRepeticao: React.FC = () => (
  <svg {...propsBase}>
    <path d="M3 12a9 9 0 0 1 15-6.7L21 8" />
    <path d="M21 3v5h-5" />
    <path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
    <path d="M3 21v-5h5" />
  </svg>
);

/** Volume: alto-falante com os arcos de som crescendo. */
export const IconeVolume: React.FC = () => (
  <svg {...propsBase}>
    <path d="M4 9v6h4l5 4V5L8 9H4Z" />
    <path d="M16 8a5 5 0 0 1 0 8" />
    <path d="M18.5 5.5a9 9 0 0 1 0 13" />
  </svg>
);
