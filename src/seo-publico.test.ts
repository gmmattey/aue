import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import { ORIGEM_CANONICA, URL_CANONICA_DA_HOME } from './shared/enderecoPublico';

function ler(caminhoRelativo: string): string {
  return readFileSync(fileURLToPath(new URL(caminhoRelativo, import.meta.url)), 'utf8');
}

const ENTRADAS: ReadonlyArray<{ caminho: string; arquivo: string }> = [
  { caminho: '/', arquivo: '../index.html' },
  { caminho: '/en/', arquivo: '../en/index.html' },
  { caminho: '/como-jogar', arquivo: '../como-jogar.html' },
  { caminho: '/en/how-to-play', arquivo: '../en/how-to-play.html' },
  { caminho: '/privacidade', arquivo: '../privacidade.html' },
  { caminho: '/termos', arquivo: '../termos.html' },
];

function canonicalDe(html: string): string | null {
  const achado = /<link\s+rel="canonical"\s+href="([^"]+)"\s*\/?>/.exec(html);
  return achado ? achado[1] : null;
}

function urlEsperada(caminho: string): string {
  if (caminho === '/') return URL_CANONICA_DA_HOME;
  return `${ORIGEM_CANONICA}${caminho}`;
}

function locsDoSitemap(): string[] {
  const sitemap = ler('../public/sitemap.xml');
  return [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
}

function hreflangsDe(html: string): Record<string, string> {
  const pares = [
    ...html.matchAll(/<link\s+rel="alternate"\s+hreflang="([^"]+)"\s+href="([^"]+)"\s*\/?>/g),
  ];
  return Object.fromEntries(pares.map((m) => [m[1], m[2]]));
}

describe('SEO público — domínio, sitemap e canonical contam a mesma história', () => {
  it('o Firebase é a origem canônica', () => {
    expect(ORIGEM_CANONICA).toBe('https://aue.web.app');
    expect(URL_CANONICA_DA_HOME).toBe('https://aue.web.app/');
  });

  it('cada URL indexável tem HTML próprio e canonical para ela mesma', () => {
    for (const { caminho, arquivo } of ENTRADAS) {
      expect(canonicalDe(ler(arquivo)), `${arquivo} com canonical errado`).toBe(
        urlEsperada(caminho),
      );
    }
  });

  it('toda URL do sitemap corresponde a uma entrada indexável', () => {
    const declaradas = ENTRADAS.map(({ caminho }) => urlEsperada(caminho));
    for (const loc of locsDoSitemap()) {
      expect(declaradas, `${loc} está no sitemap sem entrada HTML própria`).toContain(loc);
    }
  });

  it('as homes PT/EN, os dois guias e as páginas legais estão no sitemap', () => {
    const locs = locsDoSitemap();
    for (const caminho of ['/', '/en/', '/como-jogar', '/en/how-to-play', '/privacidade', '/termos']) {
      expect(locs).toContain(urlEsperada(caminho));
    }
  });

  it('nenhuma entrada indexável pede noindex', () => {
    for (const { arquivo } of ENTRADAS) {
      expect(ler(arquivo), `${arquivo} pede noindex`).not.toMatch(
        /<meta\s+name="robots"[^>]*noindex/i,
      );
    }
  });

  it('robots.txt aponta para o sitemap canônico', () => {
    expect(ler('../public/robots.txt')).toContain(`Sitemap: ${ORIGEM_CANONICA}/sitemap.xml`);
  });

  it('batalhas e desafios continuam fora do sitemap', () => {
    for (const loc of locsDoSitemap()) {
      expect(loc).not.toMatch(/\/(b|d)\//);
    }
  });

  it('os HTMLs públicos não carregam o domínio antigo da Vercel', () => {
    for (const { arquivo } of ENTRADAS) {
      expect(ler(arquivo), `${arquivo} ainda aponta para a Vercel`).not.toContain('aue.vercel.app');
    }
    expect(ler('../public/robots.txt')).not.toContain('aue.vercel.app');
    expect(ler('../public/sitemap.xml')).not.toContain('aue.vercel.app');
  });
});

describe('SEO público — português e inglês são versões equivalentes', () => {
  it('as duas homes apontam uma para a outra e para si mesmas', () => {
    const pt = hreflangsDe(ler('../index.html'));
    const en = hreflangsDe(ler('../en/index.html'));

    for (const mapa of [pt, en]) {
      expect(mapa['pt-BR']).toBe(`${ORIGEM_CANONICA}/`);
      expect(mapa.en).toBe(`${ORIGEM_CANONICA}/en/`);
      expect(mapa['x-default']).toBe(`${ORIGEM_CANONICA}/en/`);
    }
  });

  it('Como jogar e How to play apontam uma para a outra e para si mesmas', () => {
    const pt = hreflangsDe(ler('../como-jogar.html'));
    const en = hreflangsDe(ler('../en/how-to-play.html'));

    for (const mapa of [pt, en]) {
      expect(mapa['pt-BR']).toBe(`${ORIGEM_CANONICA}/como-jogar`);
      expect(mapa.en).toBe(`${ORIGEM_CANONICA}/en/how-to-play`);
      expect(mapa['x-default']).toBe(`${ORIGEM_CANONICA}/en/how-to-play`);
    }
  });

  it('cada idioma se descreve como competição, não como diagnóstico', () => {
    const pt = ler('../index.html').toLowerCase();
    const en = ler('../en/index.html').toLowerCase();

    expect(pt).toContain('competição de arroto online');
    expect(pt).toContain('placar');
    expect(en).toContain('online burp competition');
    expect(en).toContain('score');
    expect(en).toContain('1v1');
  });

  it('o conteúdo inglês cobre buscas naturais sem meta keywords', () => {
    const indexavel = `${ler('../en/index.html')} ${ler('../en/how-to-play.html')}`.toLowerCase();

    for (const termo of ['burp competition', 'burp game', 'burp challenge', 'burping contest']) {
      expect(indexavel, `termo internacional ausente: ${termo}`).toContain(termo);
    }
    expect(indexavel).not.toContain('name="keywords"');
  });
});

describe('SEO público — cards e dados estruturados', () => {
  it('as homes usam OG e imagem no domínio canônico', () => {
    for (const arquivo of ['../index.html', '../en/index.html']) {
      const html = ler(arquivo);
      const canonical = canonicalDe(html);
      expect(html).toContain(`<meta property="og:url" content="${canonical}" />`);
      expect(html).toContain(`content="${ORIGEM_CANONICA}/og-image.png"`);
      expect(html).toContain('name="twitter:card" content="summary_large_image"');
    }
  });

  it('JSON-LD declara jogo gratuito nos dois idiomas', () => {
    for (const arquivo of ['../index.html', '../en/index.html']) {
      const html = ler(arquivo);
      const bloco = /<script type="application\/ld\+json">([\s\S]*?)<\/script>/.exec(html)?.[1];
      expect(bloco, `${arquivo} sem JSON-LD`).toBeTruthy();
      const dados = JSON.parse(bloco as string) as Record<string, unknown>;
      expect(dados.applicationCategory).toBe('GameApplication');
      expect(dados.isAccessibleForFree).toBe(true);
      expect(dados.url).toBe(canonicalDe(html));
    }
  });
});

describe('SEO público — build e hospedagem servem as rotas certas', () => {
  it('todas as páginas indexáveis entram no build', () => {
    const vite = ler('../vite.config.ts');
    for (const arquivo of [
      "entrada('index.html')",
      "entrada('como-jogar.html')",
      "entrada('privacidade.html')",
      "entrada('termos.html')",
      "entrada('en/index.html')",
      "entrada('en/how-to-play.html')",
    ]) {
      expect(vite).toContain(arquivo);
    }
  });

  it('Vercel serve conteúdo extensionless antes do catch-all', () => {
    const config = JSON.parse(ler('../vercel.json')) as {
      rewrites: Array<{ source: string; destination: string }>;
    };
    const posicao = (source: string) => config.rewrites.findIndex((r) => r.source === source);
    const catchAll = posicao('/(.*)');

    const esperadas: Record<string, string> = {
      '/privacidade': '/privacidade.html',
      '/termos': '/termos.html',
      '/como-jogar': '/como-jogar.html',
      '/en': '/en/index.html',
      '/en/how-to-play': '/en/how-to-play.html',
    };

    for (const [rota, destino] of Object.entries(esperadas)) {
      const indice = posicao(rota);
      expect(indice, `${rota} sem rewrite na Vercel`).toBeGreaterThan(-1);
      expect(indice).toBeLessThan(catchAll);
      expect(config.rewrites[indice].destination).toBe(destino);
    }
  });

  it('Firebase serve as mesmas rotas antes do catch-all', () => {
    const config = JSON.parse(ler('../firebase.json')) as {
      hosting: { rewrites: Array<{ source: string; destination: string }> };
    };
    const rewrites = config.hosting.rewrites;
    const posicao = (source: string) => rewrites.findIndex((r) => r.source === source);
    const catchAll = posicao('**');

    const esperadas: Record<string, string> = {
      '/privacidade': '/privacidade.html',
      '/termos': '/termos.html',
      '/como-jogar': '/como-jogar.html',
      '/en': '/en/index.html',
      '/en/how-to-play': '/en/how-to-play.html',
    };

    for (const [rota, destino] of Object.entries(esperadas)) {
      const indice = posicao(rota);
      expect(indice, `${rota} sem rewrite no Firebase`).toBeGreaterThan(-1);
      expect(indice).toBeLessThan(catchAll);
      expect(rewrites[indice].destination).toBe(destino);
    }
  });

  it('todas as entradas mantêm suporte de instalação do iPhone', () => {
    for (const { arquivo } of ENTRADAS) {
      const html = ler(arquivo);
      expect(html).toContain('<link rel="apple-touch-icon" href="/apple-touch-icon.png" />');
      expect(html).toContain('name="apple-mobile-web-app-capable"');
    }
  });
});
