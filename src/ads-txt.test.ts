import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

/**
 * O `public/ads.txt` e o id do AdSense precisam falar do mesmo publisher.
 *
 * POR QUE ISTO EXISTE. São dois lugares com o MESMO número escrito de formas
 * DIFERENTES: o ads.txt usa `pub-5542349230926522` e o cliente do AdSense usa
 * `ca-pub-5542349230926522`. É o tipo de par que ninguém confere, porque os
 * dois "parecem" certos isoladamente.
 *
 * E o modo de falha é mudo dos dois lados: um ads.txt apontando para outro
 * publisher não gera erro em lugar nenhum — o site continua no ar, o script
 * continua carregando, e o Google simplesmente não serve anúncio, com um aviso
 * dentro do painel dele que ninguém abre todo dia.
 *
 * Lê os dois ARQUIVOS-FONTE em vez de comparar com uma constante daqui: uma
 * constante repetiria o número e criaria um terceiro lugar para divergir.
 */

function ler(caminhoRelativo: string): string {
  return readFileSync(fileURLToPath(new URL(caminhoRelativo, import.meta.url)), 'utf8');
}

const ADS_TXT = ler('../public/ads.txt');
const ENV_EXAMPLE = ler('../.env.example');

/** As linhas de declaração do ads.txt, sem comentários nem linhas vazias. */
function declaracoes(): string[] {
  /*
    `\r?\n` e não `\n`: em Windows o checkout entrega CRLF (`core.autocrlf`), o
    `\r` sobrava no fim da linha, e a regex de comentário logo abaixo — que
    termina em `$` — deixava de casar. As quatro asserções deste arquivo
    falhavam na máquina de quem desenvolve e passavam na CI, que roda em Linux.

    Falha que só existe de um lado é pior que falha nenhuma: ensina a ignorar a
    suíte.
  */
  return ADS_TXT.split(/\r?\n/)
    .map((l) => l.replace(/#.*$/, '').trim())
    .filter(Boolean);
}

describe('ads.txt — autorização de venda do inventário', () => {
  it('declara exatamente um vendedor, e é o Google', () => {
    // Mais de uma linha não é erro no formato, mas neste projeto seria: só
    // existe uma conta. Uma linha a mais é sinal de cópia de outro site.
    expect(declaracoes()).toEqual(['google.com, pub-5542349230926522, DIRECT, f08c47fec0942fa0']);
  });

  it('a relação é DIRECT, não RESELLER', () => {
    // RESELLER diria que outra empresa revende nosso inventário. Não é o caso,
    // e declarar errado é o tipo de coisa que derruba a conta em auditoria.
    const [, , relacao] = declaracoes()[0].split(',').map((c) => c.trim());
    expect(relacao).toBe('DIRECT');
  });

  it('o TAG-ID do Google é o canônico', () => {
    // `f08c47fec0942fa0` é o id da autoridade certificadora do Google e é fixo
    // para todo mundo. Errar um caractere invalida a linha inteira em silêncio.
    const [, , , tagId] = declaracoes()[0].split(',').map((c) => c.trim());
    expect(tagId).toBe('f08c47fec0942fa0');
  });

  it('o publisher do ads.txt é o mesmo id documentado para o VITE_ADSENSE_CLIENT', () => {
    const doAdsTxt = declaracoes()[0].split(',')[1].trim(); // pub-...
    const noEnvExample = /ca-(pub-\d+)/.exec(ENV_EXAMPLE);

    expect(noEnvExample, 'o .env.example deixou de documentar o id `ca-pub-...`').toBeTruthy();
    // `ca-pub-X` no AdSense é o mesmo publisher que `pub-X` no ads.txt. É essa
    // igualdade — e não o prefixo — que precisa valer.
    expect(noEnvExample![1]).toBe(doAdsTxt);
  });
});
