/**
 * O CÓDIGO CONTRA O ARENA.md.
 *
 * `docs/jogo/ARENA.md` manda na máquina de estados. Este teste é o que impede
 * o documento e o código de se afastarem em silêncio — que é como uma
 * "superfície de estado" volta a virar uma pilha de telas sem ninguém decidir
 * isso.
 *
 * Ele confere DOCUMENTO ⊆ CÓDIGO, e não igualdade. O motivo está na seção
 * `SAIDAS` do `maquina.ts`: duas setas nascem do texto corrido do ARENA.md e
 * não da linha `Sai para` — `IDLE → ERROR` ("Negou → ERROR") e `ERROR → IDLE`
 * ("sempre oferece a saída"). Exigir igualdade obrigaria a reescrever o
 * documento para caber no teste, e é o documento que manda.
 */
import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { ESTADOS, type EstadoDaArena } from './estados';
import { SAIDAS } from './maquina';

const ARENA_MD = readFileSync('docs/jogo/ARENA.md', 'utf8');

/**
 * As setas que o documento declara, lidas das linhas `**Sai para:**` de cada
 * seção `### \`ESTADO\``.
 */
function saidasDoDocumento(): Map<EstadoDaArena, EstadoDaArena[]> {
  const encontradas = new Map<EstadoDaArena, EstadoDaArena[]>();

  for (const estado of ESTADOS) {
    const secao = new RegExp(`### \`${estado}\`([\\s\\S]*?)(?=\\n### |$)`).exec(ARENA_MD);
    if (!secao) continue;

    const linha = /\*\*Sai para:\*\*(.*)/.exec(secao[1]);
    if (!linha) continue;

    const destinos = [...linha[1].matchAll(/`([A-Z_]+)`/g)]
      .map(([, nome]) => nome)
      .filter((nome): nome is EstadoDaArena => (ESTADOS as readonly string[]).includes(nome));

    encontradas.set(estado, destinos);
  }

  return encontradas;
}

describe('paridade com docs/jogo/ARENA.md', () => {
  it('os dez estados do documento são os dez do código', () => {
    /*
      Lê os TÍTULOS de seção, e não a tabela do §2.

      A primeira versão lia tabela, e pegava junto a do §0 — aquela que mapeia
      os nomes do material de design (`VALIDATING`, `INCOMING`, `DRAW`) para
      onde eles foram parar. Justamente os nomes que o ARENA.md diz que **não
      são estados**. Título de seção só existe para estado de verdade.
    */
    const comSecaoPropria = [...ARENA_MD.matchAll(/^### `([A-Z]+)`\s*$/gm)].map(([, nome]) => nome);
    expect(comSecaoPropria.sort()).toEqual([...ESTADOS].sort());
  });

  it('toda seta declarada no documento existe no código', () => {
    const documento = saidasDoDocumento();

    // Se o parser parar de achar as seções, o teste passaria vazio — e um teste
    // que não olha nada é pior que teste nenhum.
    expect(documento.size).toBeGreaterThanOrEqual(9);

    const faltando: string[] = [];
    for (const [estado, destinos] of documento) {
      for (const destino of destinos) {
        if (!SAIDAS[estado].includes(destino)) {
          faltando.push(`${estado} → ${destino}`);
        }
      }
    }

    expect(faltando).toEqual([]);
  });

  it('as setas que o código tem a mais são só as duas justificadas', () => {
    const documento = saidasDoDocumento();
    const aMais: string[] = [];

    for (const estado of ESTADOS) {
      const declaradas = documento.get(estado) ?? [];
      for (const destino of SAIDAS[estado]) {
        if (!declaradas.includes(destino)) {
          aMais.push(`${estado} → ${destino}`);
        }
      }
    }

    /*
      Ambas vêm do texto do ARENA.md, não de invenção:
      - `IDLE → ERROR`: "Negou → `ERROR`, no caso microfone negado";
      - `ERROR → IDLE`: as regras do ERROR mandam sempre oferecer a saída, e o
        documento não escreve linha `Sai para` para esse estado.

      Qualquer terceira seta aqui é alguém inventando transição — e cai o teste.
    */
    expect(aMais.sort()).toEqual(['ERROR → IDLE', 'IDLE → ERROR']);
  });
});
