/**
 * FLAG APAGADA NÃO VOLTA POR COPIAR-E-COLAR.
 *
 * A #109 tirou oito features do repositório junto com as flags delas. O jeito
 * de aquilo voltar não é alguém decidir refazer o feed — é alguém copiar um
 * bloco de código antigo, colar num arquivo novo e trazer `FLAGS.feed` junto.
 * `FLAGS.feed` não existe mais no tipo, então o `typecheck` pega — mas
 * `import.meta.env.VITE_FEATURE_FEED` não é tipado e passa batido, e uma
 * variável de ambiente lida direto é exatamente o que o `flags.ts` existe para
 * impedir.
 *
 * Este teste lê o texto do `src/` e falha se qualquer um dos dois nomes
 * reaparecer. Mesma ideia do `arena/aFlagSegura.test.ts`: a regra é sobre o que
 * está escrito no arquivo, então quem confere é quem lê o arquivo.
 *
 * SE UMA DESSAS FEATURES VOLTAR DE VERDADE, o caminho é tirar o nome desta
 * lista NA MESMA PR que a traz de volta, com a decisão escrita. Apagar a linha
 * "porque o teste quebrou" é a única forma de errar aqui.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { FLAGS } from './flags';

/** Cada par: a chave que existia em `FLAGS` e a variável que a ligava. */
const FLAGS_ENTERRADAS: ReadonlyArray<{ chave: string; variavel: string }> = [
  { chave: 'feed', variavel: 'VITE_FEATURE_FEED' },
  { chave: 'ranking', variavel: 'VITE_FEATURE_RANKING' },
  { chave: 'perfil', variavel: 'VITE_FEATURE_PERFIL' },
  { chave: 'xp', variavel: 'VITE_FEATURE_XP' },
  { chave: 'ligas', variavel: 'VITE_FEATURE_LIGAS' },
  { chave: 'push', variavel: 'VITE_FEATURE_PUSH' },
  { chave: 'assinatura', variavel: 'VITE_FEATURE_ASSINATURA' },
  { chave: 'gruposAvancados', variavel: 'VITE_FEATURE_GRUPOS_AVANCADOS' },
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
    return /\.(tsx?|css)$/.test(entrada) ? [caminho] : [];
  });
}

/**
 * Este arquivo cita os nomes proibidos por dever de ofício. Ele fica de fora
 * da varredura, senão o cão de guarda morde a si mesmo.
 */
const ESTE_ARQUIVO = join('src', 'shared', 'aFlagMorta.test.ts');

describe('as flags que a #109 enterrou', () => {
  it('nenhuma delas está de volta no catálogo', () => {
    for (const { chave } of FLAGS_ENTERRADAS) {
      expect(
        Object.prototype.hasOwnProperty.call(FLAGS, chave),
        `FLAGS.${chave} voltou ao catálogo`,
      ).toBe(false);
    }
  });

  it('ninguém lê a variável de ambiente delas direto', () => {
    const infracoes: string[] = [];
    const vistoriados = arquivosDe('src').filter((arquivo) => arquivo !== ESTE_ARQUIVO);

    for (const arquivo of vistoriados) {
      const codigo = readFileSync(arquivo, 'utf8');
      for (const { chave, variavel } of FLAGS_ENTERRADAS) {
        if (codigo.includes(variavel)) infracoes.push(`${arquivo} → ${variavel}`);
        if (new RegExp(`\\bFLAGS\\.${chave}\\b`).test(codigo)) {
          infracoes.push(`${arquivo} → FLAGS.${chave}`);
        }
      }
    }

    expect(infracoes).toEqual([]);
    /* O teste não pode passar por não ter olhado nada. */
    expect(vistoriados.length).toBeGreaterThan(50);
  });

  it('o .env.example também não oferece nenhuma delas', () => {
    // O `.env.example` é o que a pessoa copia na hora de configurar. Uma
    // variável morta ali é convite para preencher algo que não liga nada.
    const exemplo = readFileSync('.env.example', 'utf8');
    for (const { variavel } of FLAGS_ENTERRADAS) {
      expect(exemplo, `${variavel} voltou ao .env.example`).not.toContain(variavel);
    }
  });
});
