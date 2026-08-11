/**
 * O endereço público do Auê — o único lugar em `src/` onde ele é escrito.
 *
 * `aue.web.app` foi validado no Firebase Hosting em celular real e com link de
 * batalha recebido no WhatsApp em 10/08/2026. A partir desta fatia ele também é
 * o endereço canônico de aquisição/SEO. O endereço antigo da Vercel continua
 * respondendo para não matar link que já circulou.
 *
 * ESTE VALOR TEM CÓPIAS FORA DO TypeScript — e elas não podem divergir:
 *   1. `index.html` + entradas internacionais (canonical, OG e JSON-LD)
 *   2. `privacidade.html`, `termos.html` e páginas públicas de conteúdo
 *   3. `public/robots.txt`
 *   4. `public/sitemap.xml`
 *   5. `supabase/functions/og-preview/index.ts`
 *
 * As declarações indexáveis são travadas por `src/seo-publico.test.ts`.
 */

/** Sem barra no fim. Origem, no sentido de `location.origin`. */
export const ORIGEM_CANONICA = 'https://aue.web.app';

/** Com barra no fim — é assim que a home é declarada no canonical e no sitemap. */
export const URL_CANONICA_DA_HOME = `${ORIGEM_CANONICA}/`;

/** Endereço curto mostrado ao lado do QR. */
export const ENDERECO_LEGIVEL = ORIGEM_CANONICA.replace(/^https?:\/\//, '');
