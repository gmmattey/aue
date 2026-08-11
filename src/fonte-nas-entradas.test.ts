import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

/**
 * O contrato do carregamento de fonte entre as entradas HTML e o CSS.
 *
 * POR QUE ISTO EXISTE
 * -------------------
 * A fonte saiu de dentro do CSS. Antes era um `@import` na primeira linha de
 * `src/index.css`: um lugar só para mexer, e o pior lugar possível — o
 * navegador só descobre a fonte depois de baixar o CSS inteiro, então o
 * primeiro texto da Arena espera duas viagens de rede em vez de uma.
 *
 * O preço de consertar isso é que agora a mesma declaração vive em QUATRO
 * arquivos `.html`, e nenhum deles falha quando diverge. Uma entrada sem o
 * `<link>` não quebra build, não quebra teste e não dá erro no console: ela
 * simplesmente serve a página no fallback do sistema, com outra cara, e
 * ninguém descobre até alguém abrir aquela URL específica e achar estranho.
 *
 * Já tem entrada nova esperando na fila (a landing de desktop cria mais duas).
 * Este arquivo é o que faz ela nascer gritando em vez de nascer sem fonte.
 *
 * A REGRA TRAVADA AQUI: **toda entrada de build declarada em `vite.config.ts`
 * carrega o MESMO `<link>` de fonte, e o CSS não carrega fonte nenhuma.**
 *
 * A lista de entradas é lida do `vite.config.ts`, não escrita à mão — quem
 * acrescentar uma entrada lá já entra neste teste sem perceber, que é o ponto.
 */

function ler(caminhoRelativo: string): string {
  return readFileSync(fileURLToPath(new URL(caminhoRelativo, import.meta.url)), 'utf8');
}

/** As entradas HTML do build, direto de `vite.config.ts`. */
function entradasDoBuild(): string[] {
  const config = ler('../vite.config.ts');
  const achados = [...config.matchAll(/entrada\('([^']+\.html)'\)/g)].map((m) => m[1]);
  return [...new Set(achados)];
}

/** A URL do Google Fonts que a entrada carrega, ou `null` se ela não carrega nenhuma. */
function urlDaFonte(html: string): string | null {
  const achado = /<link[^>]*href="(https:\/\/fonts\.googleapis\.com\/css2[^"]+)"/.exec(html);
  return achado ? achado[1] : null;
}

const CSS_RAIZ = ler('./index.css');

describe('a fonte chega igual em toda entrada HTML', () => {
  it('o build tem as quatro entradas conhecidas — se mudou, o resto deste arquivo cobre as novas', () => {
    // Não é a lista que importa, é a leitura funcionar. Se o regex parar de
    // achar as entradas, os testes abaixo passariam varrendo array vazio.
    const entradas = entradasDoBuild();
    expect(entradas).toContain('index.html');
    expect(entradas).toContain('como-jogar.html');
    expect(entradas).toContain('privacidade.html');
    expect(entradas).toContain('termos.html');
  });

  it('toda entrada carrega a fonte, e nenhuma fica para trás', () => {
    for (const arquivo of entradasDoBuild()) {
      expect(
        urlDaFonte(ler(`../${arquivo}`)),
        `${arquivo} ficou sem o <link> da fonte — vai servir a página no fallback do sistema`,
      ).not.toBeNull();
    }
  });

  it('todas carregam exatamente a MESMA URL', () => {
    // Duas entradas pedindo listas de peso diferentes é o mesmo defeito de
    // sempre, só que mais caro: baixa fonte a mais em uma e falta na outra.
    const urls = new Set(entradasDoBuild().map((arquivo) => urlDaFonte(ler(`../${arquivo}`))));
    expect([...urls], 'as entradas HTML discordam sobre qual fonte carregar').toHaveLength(1);
  });

  it('toda entrada abre a conexão antes com os dois preconnect', () => {
    /*
      Sem os dois, o `<link>` da fonte ainda funciona — só que o navegador
      resolve DNS, TLS e handshake na hora em que precisa do arquivo. O
      `crossorigin` no gstatic não é enfeite: sem ele o preconnect abre uma
      conexão que a requisição de fonte (que é CORS) não reaproveita, e a
      economia vira zero.
    */
    for (const arquivo of entradasDoBuild()) {
      const html = ler(`../${arquivo}`);
      expect(html, `${arquivo} sem preconnect do fonts.googleapis.com`).toContain(
        '<link rel="preconnect" href="https://fonts.googleapis.com" />',
      );
      expect(html, `${arquivo} sem preconnect com crossorigin do fonts.gstatic.com`).toContain(
        '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />',
      );
    }
  });

  it('a URL pede Anton, Archivo em 400/600/700, e nada além disso', () => {
    const url = urlDaFonte(ler('../index.html')) as string;

    expect(url).toContain('family=Anton');
    expect(url).toContain('family=Archivo:wght@400;600;700');

    // 500 não é usado por nenhum CSS do Auê. Ele estava na URL antiga da Inter
    // e está na do protótipo; carregar peso que ninguém aplica é rede jogada
    // fora no primeiro paint. Quem precisar dele acrescenta aqui JUNTO com o
    // CSS que usa.
    expect(url, 'voltou um peso que nenhum CSS usa').not.toContain('500');

    // Sem `swap`, o navegador esconde o texto enquanto espera a fonte. Num
    // jogo que abre pedindo para a pessoa arrotar, tela sem texto é tela
    // quebrada.
    expect(url, 'sumiu o display=swap — o texto ficaria invisível esperando a fonte').toContain(
      'display=swap',
    );
  });

  it('o CSS não carrega fonte nenhuma — o @import não pode voltar', () => {
    /*
      Este é o defeito que a mudança conserta, e ele volta fácil: `@import` de
      Google Fonts é o jeito que toda documentação ensina, e ninguém percebe
      o custo porque em rede boa a diferença some.
    */
    expect(CSS_RAIZ, 'o @import de fonte voltou para dentro do CSS').not.toMatch(
      /@import\s+url\(\s*['"]https:\/\/fonts\.googleapis\.com/,
    );
  });
});

describe('os tokens de tipografia batem com o protótipo canônico', () => {
  function token(nome: string): string {
    const achado = new RegExp(`--${nome}:\\s*([^;]+);`).exec(CSS_RAIZ);
    expect(achado, `--${nome} sumiu de src/index.css`).toBeTruthy();
    return (achado as RegExpExecArray)[1].replace(/\s+/g, ' ').trim();
  }

  it('o display continua sendo Anton, intocado', () => {
    // A troca era da fonte de INTERFACE. Se o display mudou junto, alguém
    // mexeu no que não devia.
    expect(token('font-display')).toBe("'Anton', 'Archivo Black', Impact, system-ui, sans-serif");
  });

  it('a interface é Archivo, e a Inter só sobra como fallback tardio', () => {
    const body = token('font-body');
    expect(body.startsWith("'Archivo'"), `--font-body não começa em Archivo: ${body}`).toBe(true);

    // Inter continua no stack de propósito: quem já tem ela instalada cai num
    // lugar razoável. O que não pode é ela voltar para a frente da fila.
    const posicaoNarrow = body.indexOf("'Archivo Narrow'");
    const posicaoInter = body.indexOf("'Inter'");
    expect(posicaoNarrow, "sumiu 'Archivo Narrow' do fallback").toBeGreaterThan(-1);
    expect(posicaoInter, "sumiu 'Inter' do fallback").toBeGreaterThan(-1);
    expect(posicaoInter, 'Inter voltou para a frente da Archivo Narrow').toBeGreaterThan(
      posicaoNarrow,
    );
  });

  it('o mono não foi tocado', () => {
    expect(token('font-mono')).toBe("ui-monospace, 'JetBrains Mono', 'SF Mono', Menlo, monospace");
  });

  it('nenhum token de fonte diverge do protótipo canônico', () => {
    /*
      O protótipo é quem decide aparência (AGENTS.md §2). Estes três tokens
      foram COPIADOS de lá; este teste é o que impede o app de sair andando
      sozinho de novo — foi exatamente assim que a Inter sobreviveu meses
      depois de a decisão já estar escrita.
    */
    const prototipo = ler('../docs/design/prototipo-arena/arena.html');
    const normalizar = (valor: string) => valor.replace(/['\s]/g, '').toLowerCase();

    for (const nome of ['font-display', 'font-body', 'font-mono']) {
      const achado = new RegExp(`--${nome}:([^;]+);`).exec(prototipo);
      expect(achado, `--${nome} sumiu do protótipo`).toBeTruthy();
      expect(normalizar(token(nome)), `--${nome} divergiu do protótipo`).toBe(
        normalizar((achado as RegExpExecArray)[1]),
      );
    }
  });
});
