/**
 * DE ONDE A FALA PODE NASCER — travado em teste.
 *
 * A regra do `docs/jogo/REGRAS.md` §"A faixa fala": arroto que já é linha
 * gravada tem a fala derivada de `(nota, id do resultado)`. É isso que faz a
 * tela, a imagem fotografada, o texto do zap e o X1 aberto no aparelho do amigo
 * dizerem a MESMA coisa — todos partem do mesmo par.
 *
 * A exceção tem nome e motivo: a Arena julga **antes** de gravar, então no
 * `RESULT` não existe id nenhum. Lá a semente nasce na hora
 * (`plataforma/web/pontuacao.ts`) e viaja dentro da `Nota`. Ela funciona para
 * aquela sessão e para mais nada: ninguém a reconstrói a partir do banco.
 *
 * O DEFEITO QUE ISTO IMPEDE, E ELE É SILENCIOSO. Alguém constrói a imagem do
 * resultado (#151) ou a prévia do link (#134) semeando com o que estava à mão —
 * um `Date.now()`, um `Math.random()`, um contador — e publica uma imagem que
 * diz "Tá maluco." embaixo de uma tela que diz "Tremeu a mesa.". Não quebra
 * teste, não sobe erro, não aparece em desenvolvimento: só chega torto do outro
 * lado, dentro de uma foto que já saiu do celular e não volta.
 *
 * Fica no molde do `arquitetura.fronteira.test.ts`: lê a fonte, ignora
 * comentário e não deixa passar por não ter olhado nada.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

/**
 * O ÚNICO arquivo que pode inventar semente.
 *
 * Ele é a ponte da Arena, e a Arena não tem id no momento do julgamento. Somar
 * um segundo nome aqui é decidir que mais um lugar do jogo passa a falar uma
 * coisa que o banco não consegue repetir — decisão de produto, não de PR.
 */
const PODE_INVENTAR_SEMENTE = join('src', 'plataforma', 'web', 'pontuacao.ts');

/** O que conta como "veio de uma linha gravada". */
const CHEIRA_A_ID = /(^|[.\s(])id\b|_id\b|\bid\s*\?\?|\.id\b/;

/** A janela do envio: semente vazia devolve o rótulo que o banco guardou. */
const SEMENTE_VAZIA = /^(''|"")$/;

/** O que nunca pode virar semente de fala em lugar nenhum que não seja a ponte. */
const INVENTA = /Math\s*\.\s*random|Date\s*\.\s*now|crypto\s*\.\s*randomUUID|performance\s*\.\s*now/;

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
    /* Teste monta caso de propósito — inclusive o caso errado, para provar que ele é errado. */
    if (/\.(test|spec)\.tsx?$/.test(entrada)) return [];
    return /\.tsx?$/.test(entrada) ? [caminho] : [];
  });
}

/** Comentário não é código — o docblock que explica a regra não pode reprová-la. */
function semComentarios(fonte: string): string {
  return fonte.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/\/\/[^\n]*/g, ' ');
}

/**
 * A segunda posição de cada `falaDaNota(...)`, com os parênteses balanceados.
 *
 * Regex sozinha não serve: `falaDaNota(Number(nota), resultado.id)` tem
 * parêntese dentro, e o `[^)]*` pararia no lugar errado.
 */
function sementesDe(codigo: string): string[] {
  const sementes: string[] = [];

  /* A própria declaração não é chamada: `function falaDaNota(nota, semente)`. */
  for (const encontro of codigo.matchAll(/(?<!function\s{1,4})\bfalaDaNota\s*\(/g)) {
    let profundidade = 1;
    let i = (encontro.index ?? 0) + encontro[0].length;
    let virgula = -1;

    while (i < codigo.length && profundidade > 0) {
      const c = codigo[i];
      if (c === '(') profundidade++;
      else if (c === ')') profundidade--;
      else if (c === ',' && profundidade === 1 && virgula === -1) virgula = i;
      i++;
    }

    /* Chamada sem segundo argumento não compila — o typecheck pega antes daqui. */
    if (virgula === -1) continue;
    sementes.push(codigo.slice(virgula + 1, i - 1).replace(/\s+/g, ' ').trim());
  }

  return sementes;
}

describe('a semente da fala', () => {
  it('só nasce de um id de resultado, do rótulo, ou da ponte da Arena', () => {
    const infracoes: string[] = [];
    let chamadas = 0;

    for (const arquivo of arquivosDe('src')) {
      const codigo = semComentarios(readFileSync(arquivo, 'utf8'));
      if (!codigo.includes('falaDaNota')) continue;

      for (const semente of sementesDe(codigo)) {
        chamadas++;
        if (CHEIRA_A_ID.test(semente) || SEMENTE_VAZIA.test(semente)) continue;
        if (arquivo === PODE_INVENTAR_SEMENTE) continue;
        infracoes.push(`${arquivo} → falaDaNota(..., ${semente})`);
      }
    }

    expect(infracoes).toEqual([]);
    /* Não pode passar por não ter achado chamada nenhuma. */
    expect(chamadas).toBeGreaterThanOrEqual(5);
  });

  it('ninguém inventa semente fora da ponte da Arena', () => {
    const infracoes: string[] = [];

    for (const arquivo of arquivosDe('src')) {
      if (arquivo === PODE_INVENTAR_SEMENTE) continue;
      const codigo = semComentarios(readFileSync(arquivo, 'utf8'));
      if (!codigo.includes('falaDaNota')) continue;
      if (INVENTA.test(codigo)) infracoes.push(arquivo);
    }

    expect(infracoes).toEqual([]);
  });

  it('a ponte da Arena continua sendo a exceção declarada', () => {
    /*
      Se este arquivo mudar de nome ou de casa, o teste acima vira uma regra sem
      exceção e reprova a Arena sem explicar por quê. Melhor cair aqui.
    */
    const codigo = readFileSync(PODE_INVENTAR_SEMENTE, 'utf8');
    expect(codigo).toContain('falaDaNota');
    expect(INVENTA.test(semComentarios(codigo))).toBe(true);
  });
});
