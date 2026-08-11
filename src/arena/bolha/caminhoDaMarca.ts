/**
 * A geometria do símbolo do Auê! — a marca estática.
 *
 * O blob NÃO é desenhado à mão: é um frame congelado da mesma Bolha do jogo,
 * saído de `caminhoDaBolha()` com forma e tempo fixos. É por isso que a relação
 * entre a marca e a Bolha da Arena é demonstrável por teste em vez de "parece".
 *
 * O `!` é desenho, não ruído — ele é constante aqui.
 *
 * Fica em `arena/bolha/` junto do que ele deriva, pela mesma razão escrita no
 * topo do `caminhoDaBolha.ts`: isto é forma, não regra de jogo. A marca continua
 * sendo asset estático e a Bolha continua sendo componente animado — o que os
 * dois passam a dividir é a conta, não o artefato (DESIGN.md §1.3).
 *
 * Quem consome esta geometria:
 *  - `docs/design/design-system/system/scripts/gerar-marca.mjs` escreve os SVGs;
 *  - `build-favicons.py` lê o `d` do SVG e rasteriza o conjunto de ícones;
 *  - `CartaoDaNota.tsx` desenha o símbolo dentro da peça compartilhável;
 *  - `caminhoDaMarca.test.ts` prova que os três falam da mesma forma.
 */

// A extensão `.ts` é explícita de propósito: além do bundle, este módulo é
// carregado direto pelo Node (`gerar-marca.mjs`, que escreve os SVGs), e o
// resolvedor do Node não adivinha extensão. `allowImportingTsExtensions` já
// está ligado no `tsconfig.app.json`.
import { caminhoDaBolha, type FormaDaBolha } from './caminhoDaBolha.ts';

/**
 * A forma da marca.
 *
 * `pontos: 5` e `raio: 118` são os mesmos do `REPOUSO` — poucos lóbulos
 * sobrevivem a 16px. O que muda é a `amplitude`: o `REPOUSO` usa 8 e por isso a
 * Bolha parada lê como círculo; o `GRAVANDO` usa 34 e a 16px vira estrela-do-mar.
 * A pressão que a marca precisa mora no meio.
 *
 * `semente` e `tempo` saíram da varredura de candidatas registrada no handoff
 * (`docs/design/design-system/favicon-set.html`). Não são números bonitos: são o
 * frame escolhido.
 */
export const FORMA_DA_MARCA: FormaDaBolha = {
  raio: 118,
  amplitude: 18,
  pontos: 5,
  semente: 5.6,
};

/** O instante congelado. Segundos, como em qualquer chamada de `caminhoDaBolha`. */
export const TEMPO_DA_MARCA = 6.4;

/** O `viewBox` do símbolo. O mesmo da Bolha componente — não existe segundo sistema. */
export const VIEWBOX_DA_MARCA = '-160 -160 320 320';

// ── O "!" ────────────────────────────────────────────────────────────────────
//
// A haste afunila (mais larga no topo, mais estreita na base) — é o que tira o
// ar de sinal de trânsito sem inventar detalhe. O vão entre a base da haste e o
// topo do pingo abre AQUI, na origem, e não no raster: era ele que obrigava o
// `build-favicons.py` a empurrar o pingo para baixo nos tamanhos pequenos.

const HASTE_TOPO_Y = -72;
const HASTE_TOPO_MEIA_LARGURA = 16;
const HASTE_BASE_Y = 6;
const HASTE_BASE_MEIA_LARGURA = 11;
/** O quanto as tampas arredondadas da haste avançam além da linha reta. */
const HASTE_TAMPA = 6;
const PINGO_CENTRO_Y = 48;
const PINGO_RAIO = 17;

/** Constante do arco de Bézier que aproxima um quarto de círculo. */
const KAPPA = 0.5522847498;

export interface Marca {
  /** A silhueta, sozinha. */
  readonly blob: string;
  /** O `!`, sozinho — haste e pingo, dois subcaminhos fechados. */
  readonly exclamacao: string;
  /** Os dois no mesmo `d`. O recorte de negativo depende de `fill-rule="evenodd"`. */
  readonly marca: string;
  /** O centro óptico da silhueta: o meio do bbox real, não a origem. */
  readonly centro: Ponto;
  /** A maior dimensão do bbox da silhueta. */
  readonly diametro: number;
  /** `(raio_max − raio_min) / raio_médio` da silhueta. */
  readonly razaoDeIrregularidade: number;
  /** O vão entre a base da haste e o topo do pingo, em unidades do `viewBox`. */
  readonly vao: number;
}

/**
 * Monta a marca para uma forma e um instante quaisquer.
 *
 * Existe como função, e não só como constante, porque a varredura de candidatas
 * usa exatamente este caminho — a forma escolhida não é gerada por um código
 * diferente do que gerou as descartadas.
 */
export function montarMarca(forma: FormaDaBolha, tempo: number): Marca {
  const blob = caminhoDaBolha(forma, tempo);
  const centro = centroDoCaminho(blob);
  // O `!` fica sobre o centro ÓPTICO, não sobre a origem: como o blob está
  // empurrado para um lado, o `!` herda o deslocamento. `!` cravado no meio
  // geométrico de uma forma torta é o que devolve a leitura de "ícone de aviso".
  const exclamacao = desenharExclamacao(centro.x);
  return {
    blob,
    exclamacao,
    marca: `${blob} ${exclamacao}`,
    centro,
    diametro: diametroDoCaminho(blob),
    razaoDeIrregularidade: razaoDeIrregularidade(blob),
    vao: vaoDaExclamacao(),
  };
}

/** A marca oficial. */
export const MARCA = montarMarca(FORMA_DA_MARCA, TEMPO_DA_MARCA);

/** Atalhos para quem só quer a string. */
export const CAMINHO_DO_BLOB = MARCA.blob;
export const CAMINHO_DA_EXCLAMACAO = MARCA.exclamacao;
export const CAMINHO_DA_MARCA = MARCA.marca;

/**
 * O `!` como dois caminhos fechados: haste e pingo.
 *
 * Só `M`, `C`, `L` e `Z` — nada de arco (`A`). O pingo é um círculo aproximado
 * por quatro cúbicas de propósito: o `build-favicons.py` precisa parsear este
 * mesmo `d`, e parser de arco elíptico em Python é código que não paga o que
 * custa.
 */
function desenharExclamacao(cx: number): string {
  const tl = cx - HASTE_TOPO_MEIA_LARGURA;
  const tr = cx + HASTE_TOPO_MEIA_LARGURA;
  const bl = cx - HASTE_BASE_MEIA_LARGURA;
  const br = cx + HASTE_BASE_MEIA_LARGURA;
  const topoCtrl = HASTE_TOPO_Y - HASTE_TAMPA;
  const baseCtrl = HASTE_BASE_Y + HASTE_TAMPA;

  const haste =
    `M${n(tl)},${n(HASTE_TOPO_Y)}` +
    `C${n(tl)},${n(topoCtrl)} ${n(tr)},${n(topoCtrl)} ${n(tr)},${n(HASTE_TOPO_Y)}` +
    `L${n(br)},${n(HASTE_BASE_Y)}` +
    `C${n(br)},${n(baseCtrl)} ${n(bl)},${n(baseCtrl)} ${n(bl)},${n(HASTE_BASE_Y)}` +
    'Z';

  const r = PINGO_RAIO;
  const k = r * KAPPA;
  const cy = PINGO_CENTRO_Y;
  const pingo =
    `M${n(cx)},${n(cy - r)}` +
    `C${n(cx + k)},${n(cy - r)} ${n(cx + r)},${n(cy - k)} ${n(cx + r)},${n(cy)}` +
    `C${n(cx + r)},${n(cy + k)} ${n(cx + k)},${n(cy + r)} ${n(cx)},${n(cy + r)}` +
    `C${n(cx - k)},${n(cy + r)} ${n(cx - r)},${n(cy + k)} ${n(cx - r)},${n(cy)}` +
    `C${n(cx - r)},${n(cy - k)} ${n(cx - k)},${n(cy - r)} ${n(cx)},${n(cy - r)}` +
    'Z';

  return `${haste} ${pingo}`;
}

/**
 * O vão entre a base da haste e o topo do pingo, em unidades do `viewBox`.
 *
 * Medido na geometria, não no raster: é este número que o design system cobra
 * como fração do diâmetro do blob.
 */
export function vaoDaExclamacao(): number {
  // A tampa inferior da haste é uma cúbica com os dois controles em `baseCtrl`;
  // o ponto mais baixo dela fica a 3/4 do caminho até o controle.
  const baseMaisBaixa = HASTE_BASE_Y + (HASTE_TAMPA * 3) / 4;
  return PINGO_CENTRO_Y - PINGO_RAIO - baseMaisBaixa;
}

function n(v: number): string {
  const s = v.toFixed(2);
  return s.includes('.') ? s.replace(/\.?0+$/, '') : s;
}

// ── Medidas sobre um caminho de cúbicas ──────────────────────────────────────

export interface Ponto {
  readonly x: number;
  readonly y: number;
}

/**
 * Amostra um caminho de `M`/`C`/`Z` em pontos.
 *
 * Serve só para medir a silhueta (bbox, raio, irregularidade). Não desenha nada
 * e não conhece arco — o blob é só `M`, `C` e `Z`.
 */
export function amostrarCaminho(d: string, porSegmento = 24): Ponto[] {
  const pontos: Ponto[] = [];
  let atual: Ponto | null = null;

  for (const comando of d.match(/[MC][^MCLZ]*/g) ?? []) {
    const v = (comando.slice(1).match(/-?\d*\.?\d+/g) ?? []).map(Number);
    if (comando[0] === 'M') {
      atual = { x: v[0], y: v[1] };
      pontos.push(atual);
      continue;
    }
    if (!atual) continue;
    for (let i = 0; i + 5 < v.length; i += 6) {
      const p0 = atual;
      const p1 = { x: v[i], y: v[i + 1] };
      const p2 = { x: v[i + 2], y: v[i + 3] };
      const p3 = { x: v[i + 4], y: v[i + 5] };
      for (let j = 1; j <= porSegmento; j++) {
        const t = j / porSegmento;
        const u = 1 - t;
        pontos.push({
          x: u * u * u * p0.x + 3 * u * u * t * p1.x + 3 * u * t * t * p2.x + t * t * t * p3.x,
          y: u * u * u * p0.y + 3 * u * u * t * p1.y + 3 * u * t * t * p2.y + t * t * t * p3.y,
        });
      }
      atual = p3;
    }
  }

  return pontos;
}

/** O centro do bbox real do caminho. */
export function centroDoCaminho(d: string): Ponto {
  const pts = amostrarCaminho(d);
  const xs = pts.map((p) => p.x);
  const ys = pts.map((p) => p.y);
  return {
    x: (Math.min(...xs) + Math.max(...xs)) / 2,
    y: (Math.min(...ys) + Math.max(...ys)) / 2,
  };
}

/** A maior dimensão do bbox — o que o olho lê como "tamanho da bolha". */
export function diametroDoCaminho(d: string): number {
  const pts = amostrarCaminho(d);
  const xs = pts.map((p) => p.x);
  const ys = pts.map((p) => p.y);
  return Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys));
}

/**
 * O quanto a silhueta foge do círculo: `(raio_max − raio_min) / raio_médio`.
 *
 * Zero é círculo perfeito. É este número que separa "assimetria que existe no
 * papel" de "assimetria que se vê a 32px".
 */
export function razaoDeIrregularidade(d: string): number {
  const centro = centroDoCaminho(d);
  const raios = amostrarCaminho(d).map((p) => Math.hypot(p.x - centro.x, p.y - centro.y));
  const media = raios.reduce((a, b) => a + b, 0) / raios.length;
  return (Math.max(...raios) - Math.min(...raios)) / media;
}
