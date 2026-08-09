import type React from 'react';

/**
 * Os dois ícones do fluxo, copiados dos SVG do protótipo (`gravacao.html`,
 * `permissao.html`, `permissao-negada.html`).
 *
 * Ficam num arquivo só porque aparecem em três telas e porque `currentColor` +
 * `viewBox` são a única coisa que precisa ser igual entre elas. Sempre
 * `aria-hidden`: nenhum deles carrega informação que o texto ao lado já não
 * diga.
 */

export const IconeDeMicrofone: React.FC = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M12 2a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
    <path d="M19 10v1a7 7 0 0 1-14 0v-1" />
    <path d="M12 18v4M9 22h6" />
  </svg>
);

/** Microfone riscado — o estado de permissão negada. */
export const IconeDeMicrofoneBloqueado: React.FC = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M12 2a3 3 0 0 0-3 3v6a3 3 0 0 0 .4 1.5M15 11V5a3 3 0 0 0-5.2-2M19 10v1a7 7 0 0 1-1 3.6M5 10v1a7 7 0 0 0 9.8 6.4M12 18v4M9 22h6M2 2l20 20" />
  </svg>
);
