/**
 * O endereço público do Auê — o único lugar em `src/` onde ele é escrito.
 *
 * POR QUE UMA CONSTANTE, E NÃO `location.origin`
 * ---------------------------------------------
 * O QR Code e o botão "copiar link" da landing existem para levar a pessoa do
 * computador para o telefone dela. O que ela precisa receber é o endereço
 * OFICIAL do produto, não o endereço da aba onde ela está: numa URL de preview
 * da Vercel (`aue-git-feat-xxx.vercel.app`), num `localhost` ou atrás de um
 * proxy da empresa, `location.origin` produziria um QR que não abre em lugar
 * nenhum fora daquela máquina — e o defeito só aparece do outro lado, no
 * telefone de outra pessoa, onde ninguém está olhando o console.
 *
 * O preço é assumido: num deploy de preview, o QR manda para produção. Para
 * testar um preview no celular, use o link do preview direto.
 *
 * ESTE VALOR TEM CÓPIAS FORA DO TypeScript — e elas não podem divergir:
 *   1. `index.html` (canonical, og:url, og:image, twitter:image, JSON-LD)
 *   2. `privacidade.html` e `termos.html` (canonical de cada uma)
 *   3. `public/robots.txt` (linha `Sitemap:`)
 *   4. `public/sitemap.xml` (todas as `<loc>`)
 *   5. `supabase/functions/og-preview/index.ts`
 *
 * De 1 a 4 estão travados por `src/seo-publico.test.ts`: se alguém trocar o
 * domínio em um lugar e esquecer os outros, o teste cai. O item 5 é de outro
 * território (Edge Function) e continua sendo conferência à mão.
 */

/** Sem barra no fim. Origem, no sentido de `location.origin`. */
export const ORIGEM_CANONICA = 'https://aue.vercel.app';

/** Com barra no fim — é assim que a home é declarada no canonical e no sitemap. */
export const URL_CANONICA_DA_HOME = `${ORIGEM_CANONICA}/`;

/**
 * O que aparece escrito na landing ao lado do botão "copiar".
 *
 * Sem o `https://`, que só ocupa espaço e ninguém digita. O que vai para a área
 * de transferência e para o QR continua sendo a URL completa — abreviar ali
 * produziria um link que o WhatsApp não reconhece.
 */
export const ENDERECO_LEGIVEL = ORIGEM_CANONICA.replace(/^https?:\/\//, '');
