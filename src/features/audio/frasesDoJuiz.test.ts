import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import { FRASES_DO_JUIZ, fraseDoJuiz } from './frasesDoJuiz';

/**
 * Toda classificação que `rules.ts` sabe produzir precisa ter frase.
 *
 * Sem isto, acrescentar uma faixa nova ao score deixa a seção do juiz vazia
 * naquela faixa — e ninguém percebe, porque a tela continua renderizando: só
 * fica sem o veredito, que é justamente a parte com voz.
 *
 * Lê `rules.ts` como TEXTO em vez de exercitar `calculateScore`, pelo mesmo
 * motivo de `rules.formula.test.ts`: o que interessa é a LISTA declarada, e
 * alcançar as oito faixas por áudio sintético exigiria fabricar métricas para
 * cada uma — muito trabalho para uma pergunta que é sobre o texto-fonte.
 */

const RULES = readFileSync(fileURLToPath(new URL('./rules.ts', import.meta.url)), 'utf8');

/** As classificações declaradas em `rules.ts`, na ordem em que aparecem. */
function classificacoesDeclaradas(): string[] {
  return [...RULES.matchAll(/classification\s*=\s*'([^']+)'/g)]
    .map((m) => m[1])
    .filter((c) => c !== 'Desconhecido');
}

describe('frases do juiz — cobrem todas as classificações de rules.ts', () => {
  it('rules.ts declara as oito faixas conhecidas', () => {
    // Âncora: se este número mudar, é porque o score ganhou ou perdeu faixa, e
    // a falha aponta para a causa em vez de para o efeito.
    expect(classificacoesDeclaradas()).toHaveLength(8);
  });

  it('nenhuma classificação fica sem frase', () => {
    for (const c of classificacoesDeclaradas()) {
      expect(fraseDoJuiz(c), `sem frase para "${c}"`).toBeTruthy();
    }
  });

  it('não há frase órfã, apontando para classificação que não existe mais', () => {
    // O outro lado do mesmo defeito: copy sobrevivendo a uma faixa removida dá
    // a impressão de cobertura que não existe.
    const declaradas = new Set(classificacoesDeclaradas());
    for (const c of Object.keys(FRASES_DO_JUIZ)) {
      expect(declaradas.has(c), `frase órfã para "${c}"`).toBe(true);
    }
  });

  it('a frase do protótipo está intacta', () => {
    // `resultado.html`, data-od-id="judge-quote". É a única que veio do
    // Open Design; as outras sete foram escritas para acompanhá-la.
    expect(fraseDoJuiz('Monstro do Esgoto')).toBe(
      'Tecnicamente excelente. Socialmente indefensável.',
    );
  });

  it('classificação desconhecida não inventa veredito', () => {
    expect(fraseDoJuiz('Desconhecido')).toBeNull();
  });
});
