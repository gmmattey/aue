import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import { ORIGEM_CANONICA, URL_CANONICA_DA_HOME } from './shared/enderecoPublico';

/**
 * O contrato entre sitemap, canonical, robots e o endereço que o app usa.
 *
 * POR QUE ISTO EXISTE
 * -------------------
 * O domínio do Auê está escrito em seis lugares, em quatro linguagens
 * diferentes: HTML, XML, texto puro e TypeScript. Nenhum deles falha quando
 * diverge — o site continua no ar, o build passa, os testes passam, e o único
 * sintoma é o buscador tratando as páginas como duplicata de outra coisa,
 * semanas depois, sem aviso.
 *
 * Foi exatamente esse o defeito que esta mudança conserta: `sitemap.xml`
 * declarava `/privacidade` como URL indexável enquanto o `index.html` servido
 * naquele caminho dizia que a canônica era a raiz. Duas fontes discordando sobre
 * a mesma URL, e quem decide é o canonical.
 *
 * A REGRA TRAVADA AQUI: **toda URL do sitemap tem que ter um HTML de entrada com
 * o canonical apontando para ela mesma.** É o que separa "listado" de
 * "indexável", e é a única forma de a lista não voltar a mentir.
 *
 * O que este arquivo NÃO promete: que a página vá ser indexada, ou ranquear. Ele
 * garante que a declaração está coerente. Contrato MVP1 §3.11 pede preparo
 * técnico e diz, com todas as letras, que aparecer no Google não é critério de
 * aceite.
 */

function ler(caminhoRelativo: string): string {
  return readFileSync(fileURLToPath(new URL(caminhoRelativo, import.meta.url)), 'utf8');
}

/**
 * Cada rota indexável e o arquivo HTML que a serve.
 *
 * As entradas vêm de `vite.config.ts` (`build.rollupOptions.input`) e são
 * apontadas pelos rewrites de `vercel.json`. Acrescentar uma rota ao sitemap sem
 * acrescentar a entrada aqui derruba o teste — que é o ponto.
 */
const ENTRADAS: ReadonlyArray<{ caminho: string; arquivo: string }> = [
  { caminho: '/', arquivo: '../index.html' },
  { caminho: '/privacidade', arquivo: '../privacidade.html' },
  { caminho: '/termos', arquivo: '../termos.html' },
];

function canonicalDe(html: string): string | null {
  const achado = /<link\s+rel="canonical"\s+href="([^"]+)"\s*\/?>/.exec(html);
  return achado ? achado[1] : null;
}

function locsDoSitemap(): string[] {
  const sitemap = ler('../public/sitemap.xml');
  return [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
}

/** A URL absoluta esperada para um caminho. A home leva barra; as outras, não. */
function urlEsperada(caminho: string): string {
  return caminho === '/' ? URL_CANONICA_DA_HOME : `${ORIGEM_CANONICA}${caminho}`;
}

describe('SEO público — sitemap, canonical e robots contam a mesma história', () => {
  it('cada entrada HTML declara o canonical da PRÓPRIA rota', () => {
    for (const { caminho, arquivo } of ENTRADAS) {
      const canonical = canonicalDe(ler(arquivo));
      expect(canonical, `${arquivo} ficou sem <link rel="canonical">`).toBe(urlEsperada(caminho));
    }
  });

  it('toda URL do sitemap tem uma entrada HTML que a reivindica', () => {
    // A direção que importa: listar no sitemap uma URL cujo HTML aponta para
    // outro canonical é pedir para o buscador ignorar a página.
    const declaradas = ENTRADAS.map(({ caminho }) => urlEsperada(caminho));
    for (const loc of locsDoSitemap()) {
      expect(declaradas, `${loc} está no sitemap sem entrada HTML com canonical próprio`).toContain(
        loc,
      );
    }
  });

  it('as duas páginas legais estão listadas — o Contrato MVP1 §3.10 pede as duas', () => {
    const locs = locsDoSitemap();
    expect(locs).toContain(`${ORIGEM_CANONICA}/privacidade`);
    expect(locs).toContain(`${ORIGEM_CANONICA}/termos`);
  });

  it('nenhuma entrada indexável se declara noindex', () => {
    for (const { arquivo } of ENTRADAS) {
      expect(ler(arquivo), `${arquivo} pede para não ser indexado`).not.toMatch(
        /<meta\s+name="robots"[^>]*noindex/i,
      );
    }
  });

  it('robots.txt aponta para o sitemap no mesmo domínio', () => {
    const robots = ler('../public/robots.txt');
    expect(robots).toContain(`Sitemap: ${ORIGEM_CANONICA}/sitemap.xml`);
  });

  it('o domínio é o mesmo em todo lugar — inclusive no og:url e no JSON-LD da home', () => {
    /*
      A home é a única página com Open Graph. Se alguém trocar o domínio no
      canonical e esquecer do og:url, o card compartilhado no WhatsApp passa a
      apontar para um endereço morto — e isso é o produto inteiro, porque o Auê
      se espalha por link.
    */
    const home = ler('../index.html');
    expect(home).toContain(`<meta property="og:url" content="${URL_CANONICA_DA_HOME}" />`);
    expect(home).toContain(`"url": "${URL_CANONICA_DA_HOME}"`);
    expect(home).toContain(`content="${ORIGEM_CANONICA}/og-image.png"`);
  });

  it('nenhum arquivo público carrega um domínio antigo', () => {
    // `aue.app` foi o domínio SUPOSTO antes de 2026-08-08 e chegou a estar
    // escrito em vários lugares. Um resto dele em qualquer arquivo público é
    // canonical mentindo de novo.
    for (const arquivo of [
      '../index.html',
      '../privacidade.html',
      '../termos.html',
      '../public/sitemap.xml',
      '../public/robots.txt',
    ]) {
      const conteudo = ler(arquivo);
      // O `.replace` tira ponto final de frase: os comentários dos arquivos
      // citam o endereço no meio do texto, e `https://aue.vercel.app.` não é
      // outro domínio, é pontuação.
      const suspeitas = [...conteudo.matchAll(/https?:\/\/[a-z0-9.-]+/gi)].map((m) =>
        m[0].replace(/\.+$/, ''),
      );
      for (const url of suspeitas) {
        // Fontes e esquemas de terceiros são permitidos; o que não pode é outro
        // domínio do próprio Auê.
        if (/aue/i.test(url)) {
          expect(url, `${arquivo} referencia um domínio do Auê que não é o canônico`).toBe(
            ORIGEM_CANONICA,
          );
        }
      }
    }
  });

  it('as entradas legais avisam o rastreador sem JavaScript, em vez de servir vazio', () => {
    // Nenhuma delas é prerenderizada — o texto legal só aparece com JS. O
    // <noscript> é o que impede a URL de ser, para um rastreador que não
    // renderiza, uma página em branco.
    for (const arquivo of ['../privacidade.html', '../termos.html']) {
      const html = ler(arquivo);
      expect(html, `${arquivo} sem <noscript>`).toContain('<noscript>');
      expect(html).toContain('<h1>');
    }
  });

  it('a instalação no iPhone tem ícone de verdade em todas as entradas', () => {
    // A landing de desktop ENSINA "Adicionar à Tela de Início". Sem estas tags,
    // seguir a instrução gera um ícone genérico.
    for (const { arquivo } of ENTRADAS) {
      const html = ler(arquivo);
      expect(html, `${arquivo} sem apple-touch-icon`).toContain(
        '<link rel="apple-touch-icon" href="/apple-touch-icon.png" />',
      );
      expect(html).toContain('name="apple-mobile-web-app-capable"');
    }
  });

  it('o vercel.json serve cada rota legal pelo HTML dela antes de cair no catch-all', () => {
    /*
      Ordem importa: o rewrite `/(.*)` -> `/index.html` engole tudo o que vier
      depois dele. Se alguém mover as duas linhas específicas para o fim, as
      páginas legais voltam a ser servidas com o canonical da home — o defeito
      original, de novo, sem nenhum sintoma no build.

      `vercel.json` não aceita comentário, então o aviso mora aqui.
    */
    const vercel = JSON.parse(ler('../vercel.json')) as {
      cleanUrls?: boolean;
      rewrites: Array<{ source: string; destination: string }>;
    };

    const posicao = (fonte: string) => vercel.rewrites.findIndex((r) => r.source === fonte);
    const catchAll = posicao('/(.*)');

    expect(catchAll, 'o rewrite de SPA sumiu — /b/:code voltaria a dar 404').toBeGreaterThan(-1);

    for (const rota of ['/privacidade', '/termos']) {
      const indice = posicao(rota);
      expect(indice, `${rota} não tem rewrite próprio`).toBeGreaterThan(-1);
      expect(indice, `${rota} está DEPOIS do catch-all e nunca será alcançada`).toBeLessThan(
        catchAll,
      );
      expect(vercel.rewrites[indice].destination).toBe(`${rota}.html`);
    }

    // Sem `cleanUrls`, `/privacidade.html` responderia como uma segunda URL com
    // o mesmo conteúdo — duplicata criada pela própria correção do canonical.
    expect(vercel.cleanUrls).toBe(true);
  });
});
