import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

/**
 * "Quem é dono da briga" precisa ter UMA definição só no banco.
 *
 * POR QUE ISTO EXISTE. A regra nasceu escrita duas vezes: o placar pegava os
 * dois primeiros por `min(posicao)` e descartava linha sem dono; a
 * `round_para_entrar` chamava de dono qualquer um que já tivesse uma linha.
 * Duas definições que discordam não estouram — elas somem com o arroto. Numa
 * briga velha com um terceiro dentro, o terceiro arrotava, o áudio subia, a
 * RPC deixava passar e o placar não enxergava o round: a tela voltava e nada
 * mudava, sem um erro no caminho.
 *
 * O teste não roda SQL — não tem banco aqui. Ele lê as migrações e cobra o que
 * dá para cobrar por leitura: existe uma função `donos_da_briga`, e ninguém
 * reescreve a regra dela por fora.
 */

const DIR_MIGRACOES = fileURLToPath(new URL('../../supabase/migrations', import.meta.url));

function migracoes(): Array<{ arquivo: string; sql: string }> {
  return readdirSync(DIR_MIGRACOES)
    .filter((f) => f.endsWith('.sql'))
    .sort()
    .map((arquivo) => ({
      arquivo,
      sql: readFileSync(`${DIR_MIGRACOES}/${arquivo}`, 'utf8'),
    }));
}

/** Sem os comentários: cabeçalho deste projeto explica regra em prosa. */
function semComentarios(sql: string): string {
  return sql.replace(/--[^\n]*/g, '');
}

describe('dono da briga — uma definição só', () => {
  it('a função donos_da_briga existe', () => {
    const criam = migracoes().filter(({ sql }) =>
      /CREATE\s+OR\s+REPLACE\s+FUNCTION\s+public\.donos_da_briga/i.test(semComentarios(sql)),
    );

    expect(criam.length).toBeGreaterThan(0);
  });

  it('quem precisa do dono chama a função, em vez de reescrever a regra', () => {
    /*
      O `LIMIT 2` ordenado por `min(posicao)` é o corpo da regra. Ele pode
      aparecer UMA vez por migração — dentro da própria `donos_da_briga`. Uma
      segunda cópia é a divergência voltando pela porta dos fundos.
    */
    const copias = migracoes().flatMap(({ arquivo, sql }) => {
      const limpo = semComentarios(sql);
      const quantas = [...limpo.matchAll(/ORDER\s+BY\s+min\(\s*rb\.posicao\s*\)/gi)].length;
      return quantas > 1 ? [`${arquivo}: ${quantas}`] : [];
    });

    expect(copias).toEqual([]);
  });

  it('round_para_entrar e obter_batalha passam pela mesma função', () => {
    const daRodada = migracoes().find(({ sql }) =>
      /CREATE\s+OR\s+REPLACE\s+FUNCTION\s+public\.round_para_entrar/i.test(semComentarios(sql)),
    );

    expect(daRodada).toBeDefined();

    const limpo = semComentarios(daRodada?.sql ?? '');
    const corpoDaRodada = limpo.slice(limpo.indexOf('public.round_para_entrar'));

    // A guarda do terceiro e o round aberto derivam dos donos, não de tudo.
    expect(corpoDaRodada).toContain('public.donos_da_briga(p_batalha_id)');
    // E o placar, que é quem desenha a briga, lê da mesma fonte.
    expect(limpo).toContain('public.donos_da_briga(v_b.id)');
  });
});
