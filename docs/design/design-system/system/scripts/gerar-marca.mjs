#!/usr/bin/env node
/**
 * Escreve os SVGs do símbolo do Auê! a partir da geometria do jogo.
 *
 * A silhueta NÃO é desenhada aqui: ela vem de `src/arena/bolha/caminhoDaMarca.ts`,
 * que a monta com `caminhoDaBolha()` — a mesma função que anima a Bolha da Arena.
 * Este script é só a caneta.
 *
 * Saída:
 *   assets/aue-bolha-mark.svg              · symbol, verde sobre carvão
 *   assets/aue-bolha-mark-inverted.svg     · carvão sobre verde
 *   system/assets/…                        · as duas cópias que o kit carrega
 *   assets/candidatas/candidata-N.svg      · a varredura registrada no handoff
 *
 * Uso: node docs/design/design-system/system/scripts/gerar-marca.mjs
 *      (ou `npm run assets:marca`, que roda este e depois o build-favicons.py)
 */

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  FORMA_DA_MARCA,
  MARCA,
  TEMPO_DA_MARCA,
  VIEWBOX_DA_MARCA,
  montarMarca,
} from '../../../../../src/arena/bolha/caminhoDaMarca.ts';

const AQUI = dirname(fileURLToPath(import.meta.url));
const DS = join(AQUI, '..', '..'); // docs/design/design-system
const ASSETS = join(DS, 'assets');
const SYSTEM_ASSETS = join(DS, 'system', 'assets');
const CANDIDATAS = join(ASSETS, 'candidatas');

const BG = '#0a0a08';
const ACCENT = '#c6ff00';

/**
 * As candidatas da varredura — o registro da escolha, não enfeite.
 *
 * Saíram de rodar `caminhoDaBolha` com `pontos: 5`, `raio: 118` e amplitude
 * entre 14 e 22, variando semente e tempo, e ficando só com os frames cuja
 * razão de irregularidade cai entre 0,20 e 0,34. Estas quatro cobrem a faixa.
 * A escolhida é a que virou `FORMA_DA_MARCA`.
 */
const CANDIDATAS_DA_VARREDURA = [
  { nome: 'candidata-1', amplitude: 14, semente: 0.8, tempo: 10 },
  { nome: 'candidata-2', amplitude: 16, semente: 0.35, tempo: 9.2 },
  { nome: 'candidata-3', amplitude: 18, semente: 5.6, tempo: 6.4 },
  { nome: 'candidata-4', amplitude: 22, semente: 2.9, tempo: 7.2 },
];

function svg({ d, fundo, tinta, rotulo, titulo }) {
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="480" height="480" ` +
    `viewBox="${VIEWBOX_DA_MARCA}" role="img" aria-label="${rotulo}">\n` +
    `  <title>${titulo}</title>\n` +
    `  <rect x="-160" y="-160" width="320" height="320" fill="${fundo}"/>\n` +
    `  <path fill="${tinta}" fill-rule="evenodd" d="${d}"/>\n` +
    `</svg>\n`
  );
}

function escrever(caminho, conteudo) {
  mkdirSync(dirname(caminho), { recursive: true });
  writeFileSync(caminho, conteudo, { encoding: 'utf8' });
  return caminho;
}

const TITULO = 'Auê! — a Bolha um instante antes de se mexer';
const TITULO_INVERTIDA = `${TITULO} (invertida)`;

const normal = svg({
  d: MARCA.marca,
  fundo: BG,
  tinta: ACCENT,
  rotulo: 'Auê!',
  titulo: TITULO,
});

const invertida = svg({
  d: MARCA.marca,
  fundo: ACCENT,
  tinta: BG,
  rotulo: 'Auê!',
  titulo: TITULO_INVERTIDA,
});

const escritos = [
  escrever(join(ASSETS, 'aue-bolha-mark.svg'), normal),
  escrever(join(ASSETS, 'aue-bolha-mark-inverted.svg'), invertida),
  escrever(join(SYSTEM_ASSETS, 'aue-bolha-mark.svg'), normal),
  escrever(join(SYSTEM_ASSETS, 'aue-bolha-mark-inverted.svg'), invertida),
];

for (const c of CANDIDATAS_DA_VARREDURA) {
  const m = montarMarca({ raio: 118, amplitude: c.amplitude, pontos: 5, semente: c.semente }, c.tempo);
  escritos.push(
    escrever(
      join(CANDIDATAS, `${c.nome}.svg`),
      svg({
        d: m.marca,
        fundo: BG,
        tinta: ACCENT,
        rotulo: `Auê! — ${c.nome}`,
        titulo: `Auê! — ${c.nome} · amplitude ${c.amplitude} · irregularidade ${m.razaoDeIrregularidade.toFixed(3)}`,
      }),
    ),
  );
  console.log(
    `${c.nome}  amplitude ${String(c.amplitude).padStart(2)}  ` +
      `semente ${c.semente}  tempo ${c.tempo}  ` +
      `irregularidade ${m.razaoDeIrregularidade.toFixed(3)}`,
  );
}

console.log('');
console.log(`escolhida: amplitude ${FORMA_DA_MARCA.amplitude}, semente ${FORMA_DA_MARCA.semente}, tempo ${TEMPO_DA_MARCA}`);
console.log(`  irregularidade ${MARCA.razaoDeIrregularidade.toFixed(4)}`);
console.log(`  diâmetro ${MARCA.diametro.toFixed(1)}  centro óptico ${MARCA.centro.x.toFixed(1)},${MARCA.centro.y.toFixed(1)}`);
console.log(`  vão do "!" ${MARCA.vao.toFixed(2)} (${((MARCA.vao / MARCA.diametro) * 100).toFixed(1)}% do diâmetro)`);
console.log('');
for (const c of escritos) console.log('  ', c);
