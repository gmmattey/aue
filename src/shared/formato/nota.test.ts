import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import { formatarNota, NOTA_AUSENTE } from './nota';

/**
 * Três perguntas diferentes, três describes — de propósito.
 *
 * O modo de falha que importa aqui é SILENCIOSO: num Node compilado com
 * `--with-intl=small-icu`, `Intl.NumberFormat('pt-BR')` não lança — ele resolve
 * para `en-US` e devolve '91.4'. Ou seja, o defeito que este utilitário existe
 * para consertar reaparece sem erro nenhum. Se comportamento e ambiente
 * estivessem no mesmo teste, um `npm test` vermelho num CI assim convidaria
 * exatamente a regressão proibida: alguém "conserta" voltando para
 * `.toFixed(1).replace('.', ',')`.
 *
 * Separados, a falha diz qual é o conserto: se só o de AMBIENTE cai, o conserto
 * é o Node (full-icu / `NODE_ICU_DATA`); se só o de COMPORTAMENTO cai, é o
 * código.
 */

describe('formatarNota — comportamento', () => {
  it('escreve a nota com VÍRGULA e uma casa decimal', () => {
    // O literal do protótipo (`resultado.html`, data-od-id="score-value").
    // Comparado como string crua, e não contra `toLocaleString`, senão o teste
    // repetiria o bug em vez de reprová-lo.
    expect(formatarNota(91.4)).toBe('91,4');
  });

  it('aceita a string que vem do banco', () => {
    // `score` é `numeric` no Postgres: o driver entrega string, e o `number`
    // declarado em `db/supabase.ts` é uma promessa que o runtime não assina.
    expect(formatarNota('91.4')).toBe('91,4');
  });

  it('zero é nota de verdade, não ausência', () => {
    // Zero é resultado possível (e engraçado) neste jogo — é o que a guarda
    // `p.score !== undefined` do LobbyDeTurnos protege. Virar travessão aqui
    // seria fazer parecer que a gravação falhou.
    expect(formatarNota(0)).toBe('0,0');
  });

  it('nota cheia mantém a casa decimal', () => {
    expect(formatarNota(100)).toBe('100,0');
  });

  it('valor ausente vira o travessão, nunca "0,0"', () => {
    // `Number(null) === 0` e `Number('') === 0`: se a coerção morasse fora do
    // utilitário, nota ausente sairia como uma nota real de zero.
    expect(formatarNota(null)).toBe(NOTA_AUSENTE);
    expect(formatarNota(undefined)).toBe(NOTA_AUSENTE);
    expect(formatarNota('')).toBe(NOTA_AUSENTE);
  });

  it('valor inválido vira o travessão, nunca "NaN" na tela', () => {
    expect(formatarNota('abc')).toBe(NOTA_AUSENTE);
    expect(formatarNota(NaN)).toBe(NOTA_AUSENTE);
    expect(formatarNota(Infinity)).toBe(NOTA_AUSENTE);
  });

  it('o travessão não é vazio — ausência se diz, não some', () => {
    // Se alguém trocar `NOTA_AUSENTE` por '', abre buraco de layout num
    // `fontSize: 40` (BattleView, ChallengeView). A constante pode mudar de
    // desenho; vazia, não.
    expect(NOTA_AUSENTE).not.toBe('');
  });
});

describe('ambiente — o Node que roda os testes tem pt-BR', () => {
  it('Intl resolve pt-BR de verdade, e não cai em en-US', () => {
    // ESTE teste falhando significa small-icu, não código quebrado. O conserto
    // é o ambiente (full-icu / NODE_ICU_DATA) — nunca voltar para toFixed.
    expect(new Intl.NumberFormat('pt-BR').resolvedOptions().locale).toBe('pt-BR');
  });
});

/** Todos os `.tsx` sob `src/`, que é onde a nota é desenhada. */
function arquivosDeComponente(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entrada) => {
    const caminho = join(dir, entrada.name);
    if (entrada.isDirectory()) return arquivosDeComponente(caminho);
    return entrada.name.endsWith('.tsx') ? [caminho] : [];
  });
}

describe('sentinela — nenhum componente volta a formatar nota à mão', () => {
  it('não existe toFixed(1) em nenhum .tsx', () => {
    /*
      Sem esta sentinela o bug volta pela porta dos fundos: o próximo componente
      que mostrar nota vai escrever `toFixed(1)` de novo, porque foi o que a
      pessoa viu no arquivo vizinho a vida inteira. Foi assim que quatro telas
      passaram a imprimir "91.4".

      Mira `toFixed(1)` e NÃO `toFixed`: `ParciaisEmBarras.tsx` usa `toFixed(0)`
      legitimamente — inteiro, sem separador decimal, sem bug. Se um dia
      aparecer um `toFixed(1)` legítimo que não seja nota, ele ganha exceção
      explícita aqui, com o motivo escrito. A sentinela não se apaga.
    */
    const src = fileURLToPath(new URL('../..', import.meta.url));
    const culpados = arquivosDeComponente(src).filter((caminho) =>
      readFileSync(caminho, 'utf8').includes('toFixed(1)'),
    );

    expect(
      culpados,
      `formate com formatarNota() de src/shared/formato/nota.ts:\n${culpados.join('\n')}`,
    ).toEqual([]);
  });

  it('a sentinela está olhando para os arquivos certos', () => {
    // Contra-prova: um filtro quebrado (diretório errado, extensão errada)
    // devolveria lista vazia e o teste acima passaria verde sem ter varrido
    // nada — que é o pior jeito de um teste falhar.
    const src = fileURLToPath(new URL('../..', import.meta.url));
    expect(arquivosDeComponente(src).length).toBeGreaterThan(20);
  });
});
