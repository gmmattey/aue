import type React from 'react';

/**
 * Cartão padrão das telas abertas por link compartilhado (`/d/:id` e
 * `/b/:code`).
 *
 * Mora num arquivo só de constante, e não junto de `MolduraDeLink.tsx`, por
 * uma razão de ferramenta: um módulo que exporta componentes E outras coisas
 * perde o fast refresh do Vite inteiro — qualquer edição no arquivo recarrega
 * a página em vez de trocar o componente no lugar. Numa tela cujo
 * desenvolvimento envolve gravar áudio para chegar ao estado que se quer ver,
 * perder o estado a cada salvamento é caro.
 */
export const cartaoDeLink: React.CSSProperties = {
  padding: 'var(--space-4)',
  background: 'var(--surface)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius-lg)',
  marginBottom: 'var(--space-4)',
};
