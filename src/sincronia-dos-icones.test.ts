import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

/**
 * O que o jogo serve tem que ser o que o design system gerou.
 *
 * POR QUE ISTO EXISTE. Existiam DUAS gerações de ícone no repositório: o
 * conjunto gerado em `docs/design/design-system/assets/favicon/` e uma cópia
 * antiga em `public/`, feita à mão uma vez e nunca mais. Cinco dos sete pares
 * abaixo estavam diferentes — o `public/favicon.svg` era o símbolo cru, sem a
 * correção óptica, e os PNGs de PWA vinham de outra rodada do script.
 *
 * Resultado: refinar a marca no design system não mudava nada no produto. E o
 * modo de falha é mudo dos dois lados — cada arquivo abre bonito sozinho.
 *
 * Compara BYTES, não conteúdo interpretado: a promessa é "é o mesmo arquivo".
 * Se este teste reprovar, rode `npm run assets:marca` — a cópia é parte do
 * script, não um passo manual.
 *
 * `maskable-192.png` não está aqui de propósito: o manifest não declara esse
 * tamanho, e arquivo que ninguém lê não entra em `public/`.
 */

const PARES: ReadonlyArray<readonly [string, string]> = [
  ['favicon.ico', 'favicon.ico'],
  ['favicon.svg', 'favicon.svg'],
  ['apple-touch-icon.png', 'apple-touch-icon.png'],
  ['android-chrome-192.png', 'pwa-192x192.png'],
  ['android-chrome-512.png', 'pwa-512x512.png'],
  ['maskable-512.png', 'pwa-maskable-512x512.png'],
  ['og-image.png', 'og-image.png'],
];

function ler(caminhoRelativo: string): Buffer {
  return readFileSync(fileURLToPath(new URL(caminhoRelativo, import.meta.url)));
}

describe('os ícones que o jogo serve são os que o script gerou', () => {
  it.each(PARES)('%s é byte a byte public/%s', (gerado, servido) => {
    const doDesignSystem = ler(`../docs/design/design-system/assets/favicon/${gerado}`);
    const doJogo = ler(`../public/${servido}`);
    expect(doJogo.equals(doDesignSystem)).toBe(true);
  });
});
