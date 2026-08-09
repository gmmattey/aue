/**
 * A FRONTEIRA DO ADR 0001, TRAVADA EM TESTE.
 *
 * A regra: API de navegador e o cliente do Supabase só vivem em
 * `src/plataforma/`. O resto do jogo conversa por porta. É isso que faz a
 * casca nativa ser troca de adaptador em vez de reescrita — e fronteira que
 * ninguém checa é decoração, então aqui está o cão de guarda.
 *
 * O QUE ELE COBRE, E POR QUE NÃO É O `src/` INTEIRO:
 *
 * `src/features/` e `src/shared/` são as telas da fase anterior. Elas chamam
 * `navigator` na cara dura em dezenas de lugares e estão na fila para sair
 * (#109). Ligar a regra nelas agora reprovaria o build no primeiro dia e
 * obrigaria a fazer a #109 no meio desta fatia. O quarentenado fica listado
 * abaixo, com nome e prazo, em vez de virar exceção genérica que ninguém
 * revisa.
 *
 * Quando a Arena cobrir o loop e o legado sair, `PASTAS_LIMPAS` passa a ser
 * `src/` menos `plataforma/`.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

/** As pastas que já nascem do lado certo. */
const PASTAS_LIMPAS = ['src/nucleo', 'src/portas', 'src/arena'] as const;

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

describe('a fronteira do ADR 0001', () => {
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
