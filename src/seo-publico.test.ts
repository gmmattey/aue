import { readFileSync, readdirSync } from 'node:fs';
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
  { caminho: '/como-jogar', arquivo: '../como-jogar.html' },
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
      '../como-jogar.html',
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
    for (const arquivo of ['../como-jogar.html', '../privacidade.html', '../termos.html']) {
      const html = ler(arquivo);
      expect(html, `${arquivo} sem <noscript>`).toContain('<noscript>');
      expect(html).toContain('<h1>');
    }
  });

  it('o rewrite de /como-jogar vem antes do catch-all', () => {
    const vercel = JSON.parse(ler('../vercel.json')) as {
      rewrites: Array<{ source: string; destination: string }>;
    };
    const posicao = (fonte: string) => vercel.rewrites.findIndex((r) => r.source === fonte);
    const indice = posicao('/como-jogar');

    expect(indice, '/como-jogar não tem rewrite próprio').toBeGreaterThan(-1);
    expect(indice, '/como-jogar está depois do catch-all e seria servida com o HTML da home')
      .toBeLessThan(posicao('/(.*)'));
    expect(vercel.rewrites[indice].destination).toBe('/como-jogar.html');
  });

  it('/como-jogar é uma entrada de build — senão o rewrite aponta para um arquivo que não existe', () => {
    // O `vercel.json` manda para `/como-jogar.html`. Esse arquivo só chega ao
    // `dist/` porque o `vite.config.ts` o declara como entrada. Tirar a entrada
    // e manter o rewrite dá 404 numa URL que o sitemap jura que existe.
    expect(ler('../vite.config.ts')).toContain("entrada('como-jogar.html')");
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

    /*
      `cleanUrls` NÃO pode voltar, e isto custou uma produção quebrada.

      Ele foi ligado aqui para evitar que `/privacidade.html` respondesse como
      uma segunda URL com o mesmo conteúdo. O efeito colateral não apareceu em
      teste nenhum: com `cleanUrls`, a Vercel deixa de endereçar destinos com
      `.html`, e o catch-all `/(.*)` -> `/index.html` para de resolver. Toda
      rota de SPA passou a devolver **404** em produção — `/b/CODIGO`, que é a
      mecânica viral inteira, incluída.

      As duas rotas legais sobreviveram por acidente: com `cleanUrls` elas eram
      servidas direto pelo arquivo, sem passar pelo rewrite. Ou seja, a
      configuração que "funcionava" nas rotas testadas era a mesma que matava
      todas as outras.

      A duplicata `/privacidade.html` continua existindo e é aceita: cada HTML
      declara o próprio `canonical` apontando para a URL sem extensão, que é o
      mecanismo pensado exatamente para isso.
    */
    expect(
      vercel.cleanUrls,
      'cleanUrls quebra o catch-all e faz /b/CODIGO devolver 404',
    ).toBeUndefined();
  });
});

/**
 * O POSICIONAMENTO — o que o buscador precisa entender sem renderizar nada.
 *
 * O defeito que estes testes travam não é um erro de sintaxe: é o produto ser
 * descrito pela MECÂNICA e nunca pela CATEGORIA. "Grave seu arroto e desafie os
 * amigos" explica o que se faz e não diz o que a coisa é — quem indexa fica sem
 * saber se isto é jogo, rede social ou gravador de voz.
 *
 * A frase que decide é **jogo de arroto online**, e ela é verdade
 * (`docs/jogo/VISAO.md`), não enfeite de busca. Estes testes existem para que
 * uma revisão de copy futura não a apague sem perceber o que está apagando.
 */
describe('SEO público — o Auê se declara um jogo de arroto', () => {
  const home = () => ler('../index.html');
  const comoJogar = () => ler('../como-jogar.html');

  it('o título e a descrição da home nomeiam a categoria', () => {
    const html = home();
    const titulo = /<title>([^<]+)<\/title>/.exec(html)?.[1] ?? '';
    const descricao = /<meta name="description" content="([^"]+)"/.exec(html)?.[1] ?? '';

    expect(titulo.toLowerCase()).toContain('jogo de arroto online');
    expect(descricao.toLowerCase()).toContain('jogo de arroto');
  });

  it('o card compartilhado também diz o que é, não só o que faz', () => {
    // O card é o que chega no grupo do WhatsApp. Se ele descrever só a
    // mecânica, o link continua parecendo qualquer coisa.
    const html = home();
    for (const tag of ['og:title', 'twitter:title']) {
      const valor =
        new RegExp(`(?:property|name)="${tag}" content="([^"]+)"`).exec(html)?.[1] ?? '';
      expect(valor.toLowerCase(), `${tag} sem a categoria`).toContain('jogo de arroto');
    }
  });

  it('os termos do produto aparecem no texto que o rastreador lê sem JavaScript', () => {
    /*
      Não é keyword stuffing: são as quatro formas pelas quais alguém procura
      exatamente este produto, e todas descrevem o que o jogo faz de verdade. O
      lugar delas é o <noscript> da home e a página que explica o jogo — o único
      conteúdo que existe antes do React montar.
    */
    const textoIndexavel = `${home()} ${comoJogar()}`.toLowerCase();

    for (const termo of [
      'jogo de arroto',
      'competição de arroto',
      'desafiar amigos',
      'burp game',
    ]) {
      expect(textoIndexavel, `sumiu do conteúdo indexável: ${termo}`).toContain(termo);
    }
  });

  it('o JSON-LD da home declara jogo e declara gratuito', () => {
    const bloco = /<script type="application\/ld\+json">([\s\S]*?)<\/script>/.exec(home())?.[1];
    expect(bloco, 'a home ficou sem dados estruturados').toBeTruthy();

    const dados = JSON.parse(bloco as string) as Record<string, unknown>;
    expect(dados.applicationCategory).toBe('GameApplication');
    expect(dados.isAccessibleForFree).toBe(true);
    expect(String(dados.description).toLowerCase()).toContain('jogo de arroto');
    expect(dados.url).toBe(URL_CANONICA_DA_HOME);
  });

  it('a página de como jogar responde as cinco perguntas, sem JavaScript', () => {
    // Se o texto só existisse no React, um rastreador que não renderiza veria
    // uma página vazia — e uma página vazia no sitemap é pior que nenhuma.
    const html = comoJogar().toLowerCase();
    const noscript = /<noscript>([\s\S]*?)<\/noscript>/.exec(html)?.[1] ?? '';

    expect(noscript).toContain('jogo de arroto');
    expect(noscript).toContain('nota');
    expect(noscript).toContain('x1');
    expect(noscript).toContain('navegador');
    expect(noscript).toContain('de graça');
  });

  it('batalha e desafio continuam FORA do sitemap', () => {
    // Conteúdo efêmero e por usuário. Listar `/b/` seria pedir para o buscador
    // indexar o link privado de uma disputa — que é a chave de acesso dela.
    for (const loc of locsDoSitemap()) {
      expect(loc, `${loc} não devia estar no sitemap`).not.toMatch(/\/(b|d)\//);
    }
  });

  it('o robots continua liberando o site e as rotas de batalha', () => {
    /*
      Liberar não é listar. O facebookexternalhit lê o robots ANTES de montar o
      card do link compartilhado — bloquear `/b/` mataria a prévia, que é o
      único jeito de o jogo se espalhar.
    */
    const robots = ler('../public/robots.txt');
    expect(robots).toMatch(/^User-agent: \*$/m);
    for (const rota of ['Allow: /', 'Allow: /b/', 'Allow: /d/']) {
      expect(robots, `robots.txt sem "${rota}"`).toContain(rota);
    }
    expect(robots, 'apareceu um Disallow — o site inteiro é público').not.toMatch(
      /^Disallow: \S/m,
    );
  });

  it('o arquivo de verificação do Search Console continua servido e íntegro', () => {
    /*
      É o que prova ao Google que o site é do dono. Ele mora em `public/`, e não
      é entrada de build de propósito: arquivo em `public/` é copiado como está e
      servido pela hospedagem ANTES de qualquer rewrite — o mesmo caminho do
      `favicon.ico`. Passar pelo `vite` transformaria o conteúdo, e o Google
      compara byte a byte.

      O conteúdo tem que repetir o próprio nome do arquivo. Renomear um sem o
      outro derruba a verificação em silêncio, semanas depois, e o sintoma é o
      site sumir do Search Console sem ninguém entender por quê.

      NÃO é segredo: este arquivo é publicamente acessível por natureza — é
      justamente assim que a verificação funciona.
    */
    const nomes = readdirSync(fileURLToPath(new URL('../public', import.meta.url))).filter((n) =>
      /^google[a-f0-9]+\.html$/.test(n),
    );

    expect(nomes.length, 'sumiu o arquivo de verificação do Google em public/').toBe(1);
    expect(ler(`../public/${nomes[0]}`).trim()).toBe(`google-site-verification: ${nomes[0]}`);
  });

  it('as duas páginas legais continuam de pé e indexáveis', () => {
    for (const arquivo of ['../privacidade.html', '../termos.html']) {
      const html = ler(arquivo);
      expect(html).toMatch(/<meta name="robots" content="index, follow"/);
      expect(html).toContain('<link rel="canonical"');
    }
    const locs = locsDoSitemap();
    expect(locs).toContain(`${ORIGEM_CANONICA}/privacidade`);
    expect(locs).toContain(`${ORIGEM_CANONICA}/termos`);
    expect(locs).toContain(`${ORIGEM_CANONICA}/como-jogar`);
  });
});
