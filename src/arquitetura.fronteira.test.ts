/**
 * A FRONTEIRA DO ADR 0001, TRAVADA EM TESTE.
 *
 * A regra: API de navegador e o cliente do Supabase só vivem em
 * `src/plataforma/`. O resto do jogo conversa por porta. É isso que faz a
 * casca nativa ser troca de adaptador em vez de reescrita — e fronteira que
 * ninguém checa é decoração, então aqui está o cão de guarda.
 *
 * O QUE ELE COBRE, E POR QUE AINDA NÃO É O `src/` INTEIRO:
 *
 * A #109 tirou feed, ranking, XP, conquistas, perfil, ajustes, grupos, ligas,
 * push e assinatura. O que sobrou de `features/` e `shared/` NÃO é legado
 * esperando remoção: é o jogo que está no ar. O que continua fora da guarita
 * são as pastas que falam com o aparelho na cara dura, e cada uma tem motivo
 * escrito:
 *
 * - `features/audio/` — `getUserMedia`, `MediaRecorder`, `AudioContext`. É a
 *   captura do arroto. Migra para `plataforma/` junto com a Arena assumindo a
 *   gravação;
 * - `features/battle/` — `localStorage` da disputa presencial e da última
 *   batalha, `window.confirm`. Migra junto com o estado da disputa;
 * - `features/desktop/` e `shared/desktop/` — leem `navigator.userAgent` e o
 *   `beforeinstallprompt`. São a ponte para o celular, e a ponte É sobre o
 *   aparelho;
 * - `shared/components/` — `AdBanner` injeta script no `document`,
 *   `AvisoDeOffline` escuta `window`, `CompartilharEmRede` usa `navigator.share`;
 * - `src/db/` — é o cliente do Supabase em pessoa, e ele deve morar em
 *   `plataforma/`. Não entra na lista limpa justamente por isso.
 *
 * Quando a Arena cobrir o loop e essas quatro migrarem, `PASTAS_LIMPAS` passa
 * a ser `src/` menos `plataforma/`.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

/**
 * As pastas que já nascem do lado certo.
 *
 * Cresceu com a #109: as telas legais, a home, o "como jogar", a sessão
 * anônima, o formato da nota, a tela de resultado e o juiz de origem passaram
 * a ser vigiados por máquina em vez de por gente.
 */
const PASTAS_LIMPAS = [
  'src/nucleo',
  'src/portas',
  'src/arena',
  'src/features/home',
  'src/features/legal',
  'src/features/publico',
  'src/features/audio/resultado',
  'src/shared/auth',
  'src/shared/formato',
] as const;

/**
 * O que não pode aparecer nelas.
 *
 * `requestAnimationFrame` NÃO está aqui de propósito: não pede permissão, não
 * sobrevive à tela e a própria animação cancela. Tratá-lo como recurso
 * sensível colocaria uma porta no caminho de desenhar um `<path>`.
 */
const PROIBIDOS: ReadonlyArray<{ nome: string; padrao: RegExp }> = [
  { nome: 'navigator', padrao: /\bnavigator\s*[.[]/ },
  { nome: 'window.', padrao: /\bwindow\s*[.[]/ },
  { nome: 'document.', padrao: /\bdocument\s*[.[]/ },
  { nome: 'localStorage', padrao: /\blocalStorage\b/ },
  { nome: 'sessionStorage', padrao: /\bsessionStorage\b/ },
  { nome: 'indexedDB', padrao: /\bindexedDB\b/ },
  { nome: 'MediaRecorder', padrao: /\bMediaRecorder\b/ },
  { nome: 'MediaStream', padrao: /\bMediaStream\b/ },
  { nome: 'AudioContext', padrao: /\b(?:Offline)?AudioContext\b/ },
  { nome: 'getUserMedia', padrao: /\bgetUserMedia\b/ },
];

/** Núcleo e portas são mais duros ainda: nem React, nem plataforma. */
const PROIBIDOS_NO_NUCLEO: ReadonlyArray<{ nome: string; padrao: RegExp }> = [
  { nome: "import de 'react'", padrao: /from\s+['"]react['"]/ },
  { nome: 'import de plataforma/', padrao: /from\s+['"][^'"]*plataforma\// },
  { nome: 'import do cliente Supabase', padrao: /from\s+['"][^'"]*db\/supabase['"]/ },
];

function arquivosDe(pasta: string): string[] {
  let entradas: string[];
  try {
    entradas = readdirSync(pasta);
  } catch {
    return [];
  }

  return entradas.flatMap((entrada) => {
    const caminho = join(pasta, entrada);
    if (statSync(caminho).isDirectory()) return arquivosDe(caminho);
    /*
      Arquivo de teste fica de fora: é ele quem monta o aparelho falso, dubla
      `navigator` e dispara evento de `window` para provar que o código de
      produção se comporta. Proibir ali seria proibir o próprio teste que
      segura a regra.
    */
    if (/\.(test|spec)\.tsx?$/.test(entrada)) return [];
    return /\.tsx?$/.test(entrada) ? [caminho] : [];
  });
}

/**
 * Comentário não é código.
 *
 * Sem isto, a frase "não use `navigator` aqui" dentro de um comentário
 * reprovaria o arquivo que está justamente explicando a regra — e a saída
 * fácil seria afrouxar o teste.
 */
function semComentarios(fonte: string): string {
  return fonte.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/\/\/[^\n]*/g, ' ');
}

/**
 * A Arena pode falar com `plataforma/`, mas **não** com o código legado.
 *
 * A lista está VAZIA desde a #109: `fraseDoPrazo` era a única exceção, e ela
 * mudou de casa para `nucleo/prazo/`, que é onde regra pura mora. Lista vazia
 * é o estado certo — se alguém precisar acrescentar nome aqui, que seja com a
 * dívida escrita, não com regra genérica.
 */
const IMPORTS_LEGADOS_TOLERADOS: readonly string[] = [];

describe('a fronteira do ADR 0001', () => {
  /**
   * A FRONTEIRA DA CASCA — [ADR 0002](../docs/technical/adr/0002-o-aue-nas-lojas.md) §2.
   *
   * Esta é mais dura que as outras de propósito: ela vale para **todo o `src/`**
   * menos `plataforma/`, inclusive o legado em quarentena. As outras toleram o
   * `features/` porque ele já nasceu errado e está na fila para sair; aqui não
   * há nada para tolerar — hoje existem ZERO imports de Capacitor no projeto, e
   * a hora de travar isso é agora, antes do primeiro plugin.
   *
   * O dia em que uma tela importar um plugin direto, a casca deixa de ser
   * casca: aquele arquivo passa a só funcionar dentro do app, e a web — que é o
   * produto (ADR 0001 §3) — quebra sem ninguém perceber até alguém abrir o
   * link no navegador.
   */
  it('nada fora de plataforma/ conhece o Capacitor', () => {
    const infracoes: string[] = [];

    const vistoriados = arquivosDe('src').filter(
      (arquivo) => !arquivo.startsWith(join('src', 'plataforma')),
    );

    for (const arquivo of vistoriados) {
      const codigo = semComentarios(readFileSync(arquivo, 'utf8'));
      if (/@capacitor\//.test(codigo) || /\bCapacitor\b/.test(codigo)) {
        infracoes.push(arquivo);
      }
    }

    expect(infracoes).toEqual([]);
    /* O teste não pode passar por não ter olhado nada. */
    expect(vistoriados.length).toBeGreaterThan(50);
  });

  it('a Arena não importa do legado, fora a exceção com nome', () => {
    const infracoes: string[] = [];

    for (const arquivo of arquivosDe('src/arena')) {
      const codigo = semComentarios(readFileSync(arquivo, 'utf8'));
      for (const [, alvo] of codigo.matchAll(/from\s+['"]([^'"]*features\/[^'"]+)['"]/g)) {
        if (IMPORTS_LEGADOS_TOLERADOS.some((tolerado) => alvo.includes(tolerado))) continue;
        infracoes.push(`${arquivo} → ${alvo}`);
      }
    }

    expect(infracoes).toEqual([]);
  });

  it('nenhuma pasta limpa toca API de navegador', () => {
    const infracoes: string[] = [];

    for (const pasta of PASTAS_LIMPAS) {
      for (const arquivo of arquivosDe(pasta)) {
        const codigo = semComentarios(readFileSync(arquivo, 'utf8'));
        for (const { nome, padrao } of PROIBIDOS) {
          if (padrao.test(codigo)) {
            infracoes.push(`${arquivo} → ${nome}`);
          }
        }
      }
    }

    expect(infracoes).toEqual([]);
  });

  it('núcleo e portas não conhecem React, plataforma nem Supabase', () => {
    const infracoes: string[] = [];

    for (const pasta of ['src/nucleo', 'src/portas']) {
      for (const arquivo of arquivosDe(pasta)) {
        const codigo = semComentarios(readFileSync(arquivo, 'utf8'));
        for (const { nome, padrao } of PROIBIDOS_NO_NUCLEO) {
          if (padrao.test(codigo)) {
            infracoes.push(`${arquivo} → ${nome}`);
          }
        }
      }
    }

    expect(infracoes).toEqual([]);
  });

  it('as pastas limpas existem — o teste não pode passar por não ter olhado nada', () => {
    for (const pasta of PASTAS_LIMPAS) {
      expect(arquivosDe(pasta).length, `${pasta} está vazia`).toBeGreaterThan(0);
    }
  });
});
