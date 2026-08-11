import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import { caminhoDaBolha } from './caminhoDaBolha';
import {
  CAMINHO_DA_MARCA,
  CAMINHO_DO_BLOB,
  FORMA_DA_MARCA,
  MARCA,
  TEMPO_DA_MARCA,
  VIEWBOX_DA_MARCA,
} from './caminhoDaMarca';

/**
 * A marca e o código não podem ser duas formas diferentes.
 *
 * POR QUE ISTO EXISTE. A silhueta do símbolo vivia escrita à mão em quatro SVGs
 * e mais uma vez, como polígono, dentro do `build-favicons.py`. Ninguém guardava
 * a igualdade: dava para mudar o SVG e deixar o favicon com outra forma, e o
 * modo de falha era mudo — os dois arquivos "pareciam" certos abertos sozinhos.
 *
 * Agora existe uma fonte só, este módulo, e o `gerar-marca.mjs` escreve os SVGs
 * a partir dele. Este teste é o que impede alguém de editar o `d` na mão e
 * seguir a vida.
 */

const RAIZ_DS = '../../../docs/design/design-system';

function lerSvg(caminhoRelativo: string): string {
  return readFileSync(fileURLToPath(new URL(caminhoRelativo, import.meta.url)), 'utf8');
}

/** O `d` do único `<path>` do arquivo. */
function dDoPath(svg: string): string {
  const m = /<path[^>]*\sd="([^"]+)"/s.exec(svg);
  expect(m, 'o SVG da marca perdeu o <path>').toBeTruthy();
  return m![1];
}

const ARQUIVOS = [
  `${RAIZ_DS}/assets/aue-bolha-mark.svg`,
  `${RAIZ_DS}/assets/aue-bolha-mark-inverted.svg`,
  `${RAIZ_DS}/system/assets/aue-bolha-mark.svg`,
  `${RAIZ_DS}/system/assets/aue-bolha-mark-inverted.svg`,
];

describe('o símbolo é um frame da Bolha do jogo', () => {
  it('a silhueta sai de caminhoDaBolha, não de desenho à mão', () => {
    // Não é "parecida" com a Bolha da Arena: é a mesma função, com forma e
    // instante fixos. Isto é o que torna a relação demonstrável.
    expect(CAMINHO_DO_BLOB).toBe(caminhoDaBolha(FORMA_DA_MARCA, TEMPO_DA_MARCA));
  });

  it('a amplitude fica na faixa de pressão — nem repouso, nem gravando', () => {
    // 8 (repouso) lê como círculo; 34 (gravando) a 16px vira estrela-do-mar.
    expect(FORMA_DA_MARCA.amplitude).toBeGreaterThanOrEqual(14);
    expect(FORMA_DA_MARCA.amplitude).toBeLessThanOrEqual(22);
    // Poucos lóbulos: é o que sobrevive a 16px.
    expect(FORMA_DA_MARCA.pontos).toBe(5);
  });

  it('não é um círculo, e também não é uma estrela-do-mar', () => {
    // (raio_max − raio_min) / raio_médio. Abaixo de 0,20 a 32px lê como bolinha;
    // acima de 0,34 a silhueta perde reconhecimento no maskable.
    expect(MARCA.razaoDeIrregularidade).toBeGreaterThanOrEqual(0.2);
    expect(MARCA.razaoDeIrregularidade).toBeLessThanOrEqual(0.34);
  });
});

describe('o "!"', () => {
  it('tem vão entre haste e pingo de pelo menos 5% do diâmetro', () => {
    // Este era o defeito que o `build-favicons.py` remendava com `dot_dy` só
    // nos rasters pequenos: na marca os dois se tocavam. Agora abre na origem.
    expect(MARCA.vao / MARCA.diametro).toBeGreaterThanOrEqual(0.05);
  });

  it('é recorte de negativo: haste e pingo entram no mesmo caminho do blob', () => {
    expect(CAMINHO_DA_MARCA.startsWith(CAMINHO_DO_BLOB)).toBe(true);
    // Três subcaminhos fechados: blob, haste, pingo. O `fill-rule="evenodd"`
    // é o que transforma os dois últimos em buraco.
    expect(CAMINHO_DA_MARCA.match(/Z/g)).toHaveLength(3);
  });

  it('não usa arco elíptico', () => {
    // O `build-favicons.py` parseia este mesmo `d`. Parser de arco em Python é
    // código que não paga o que custa — o pingo é círculo em quatro cúbicas.
    expect(CAMINHO_DA_MARCA).not.toMatch(/[Aa]\d/);
  });
});

describe.each(ARQUIVOS)('%s', (arquivo) => {
  const svg = lerSvg(arquivo);

  it('carrega exatamente a geometria deste módulo', () => {
    // Se este teste reprovou: rode `npm run assets:marca`. Editar o `d` na mão
    // não é o caminho — a fonte é o `caminhoDaMarca.ts`.
    expect(dDoPath(svg)).toBe(CAMINHO_DA_MARCA);
  });

  it('usa o mesmo sistema de coordenadas da Bolha componente', () => {
    expect(svg).toContain(`viewBox="${VIEWBOX_DA_MARCA}"`);
  });

  it('é recorte de negativo', () => {
    expect(svg).toContain('fill-rule="evenodd"');
  });

  it('só tem as duas cores da paleta', () => {
    // Nada de gradiente, glow, sombra ou terceira cor (DESIGN.md §1.1).
    const cores = new Set((svg.match(/#[0-9a-fA-F]{3,8}/g) ?? []).map((c) => c.toLowerCase()));
    expect([...cores].sort()).toEqual(['#0a0a08', '#c6ff00']);
    expect(svg).not.toMatch(/Gradient|filter|stroke=/);
  });
});
