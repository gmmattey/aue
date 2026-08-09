import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

/**
 * TODA CLASSE `fx-` USADA NAS TELAS PRECISA EXISTIR NO CSS.
 *
 * POR QUE ISTO EXISTE — o caso real, 2026-08-09.
 *
 * A #56 tirou a onda de dez barras da tela de gravação. Junto com o JSX, foram
 * apagadas as regras de `.fx-onda` no `EstilosDoFluxo`. Só que `TelaSemSom`
 * também usa `.fx-onda` — é com ela que a tela do "Coé, não peguei nada aí"
 * desenha as barras no chão, que são o argumento visual de "não houve sinal".
 *
 * Resultado: a tela de erro foi para produção sem estilo nenhum, e passou por
 * `typecheck`, `lint`, `build` e 351 testes. Nenhum deles olha para CSS dentro
 * de template literal — para o TypeScript aquilo é uma string.
 *
 * O modo de falha é o pior que existe: silencioso, e numa tela que só aparece
 * quando algo já deu errado para a pessoa.
 *
 * Este teste é o par que faltava: o compilador cuida do JSX, e isto cuida da
 * ponta que ele não enxerga.
 */

function ler(caminhoRelativo: string): string {
  return readFileSync(fileURLToPath(new URL(caminhoRelativo, import.meta.url)), 'utf8');
}

/**
 * O CSS **sem os comentários**, e esta linha é a diferença entre o teste
 * funcionar e ser decoração.
 *
 * A primeira versão procurava `.fx-onda` no arquivo inteiro com `includes`. Ela
 * passou verde com o bug encenado de propósito — porque o comentário que
 * explica a regra CITA `.fx-onda`. O teste encontrava a menção e dava o
 * seletor por existente.
 *
 * Um comentário não estiliza nada. Só o que sobra depois de tirá-los conta.
 */
const CSS = ler('./EstilosDoFluxo.tsx').replace(/\/\*[\s\S]*?\*\//g, '');

/**
 * A classe aparece como SELETOR de verdade?
 *
 * `.fx-onda` não pode casar com `.fx-onda-grande`, senão apagar a regra certa e
 * deixar uma parecida passaria batido. O caractere seguinte precisa ser um que
 * encerre o seletor: espaço, `{`, `,`, `:`, `.`, `>`, `~`, `+` ou fim de linha.
 */
function temSeletor(classe: string): boolean {
  return new RegExp(`\\.${classe}(?![\\w-])`).test(CSS);
}

/**
 * Os `.tsx` que consomem estas classes.
 *
 * DUAS PASTAS, e a segunda foi um buraco real: a primeira versão varria só
 * `fluxo/`, e o `AudioRecorder.tsx` — que mora um nível acima e usa
 * `fx-erro-tecnico` — passava despercebido. Era o mesmo defeito que a sentinela
 * existe para pegar, uma pasta ao lado.
 *
 * `resultado/` entra pelo mesmo motivo: é tela do fluxo e pode vir a usar
 * `fx-`. Melhor varrer de graça do que descobrir depois.
 */
function telasQueUsamOEstilo(): string[] {
  const daPasta = (url: string) => {
    const pasta = fileURLToPath(new URL(url, import.meta.url));
    return readdirSync(pasta)
      .filter((f) => f.endsWith('.tsx') && f !== 'EstilosDoFluxo.tsx' && !f.includes('.test.'))
      .map((f) => `${url}${f}`);
  };
  return [...daPasta('./'), ...daPasta('../'), ...daPasta('../resultado/')];
}

/**
 * As classes `fx-` de um arquivo.
 *
 * Cobre `className="fx-a fx-b"` e as duas formas de template
 * (`className={`fx-a ${x}`}`), que é como a seleção condicional é escrita aqui.
 */
function classesUsadas(fonte: string): Set<string> {
  const achadas = new Set<string>();
  for (const m of fonte.matchAll(/className=(?:"([^"]*)"|\{`([^`]*)`\})/g)) {
    const texto = m[1] ?? m[2] ?? '';
    for (const classe of texto.split(/\s+/)) {
      // `${...}` interpolado não é nome de classe; o resto é.
      if (classe.startsWith('fx-') && !classe.includes('$')) achadas.add(classe);
    }
  }
  return achadas;
}

describe('as classes fx- usadas nas telas existem no EstilosDoFluxo', () => {
  const telas = telasQueUsamOEstilo();

  it('achou telas para conferir — senão este teste passaria vazio', () => {
    // Sentinela do próprio teste: um `readdir` que devolve nada tornaria todo
    // o resto verde sem verificar coisa nenhuma.
    expect(telas.length).toBeGreaterThan(3);
  });

  it.each(telas)('%s', (arquivo) => {
    const usadas = classesUsadas(ler(arquivo));
    const orfas = [...usadas].filter((classe) => !temSeletor(classe));

    expect(orfas, `classes sem regra no EstilosDoFluxo: ${orfas.join(', ')}`).toEqual([]);
  });
});
