/**
 * A CHAVE DECIDE QUAL JOGO A RAIZ SERVE.
 *
 * Ligada, a Arena. Desligada, o fluxo de telas velho — que ainda existe (#109).
 * A produção roda com ela ligada, e é por isso que o corte de produção está
 * declarado no workflow e travado por `src/corte-de-producao.paridade.test.ts`.
 *
 * O que este arquivo continua guardando é outra coisa: que nenhuma montagem da
 * Arena escape da chave. Um `<Arena>` solto no roteador serviria o jogo novo
 * sem ninguém ter decidido isso.
 */
import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { FLAGS } from '../shared/flags';

describe('a flag da Arena', () => {
  it('sem variável nenhuma, vem desligada', () => {
    // O ambiente de teste não define `VITE_FEATURE_ARENA` — é o mesmo caso de
    // um deploy sem configuração extra.
    expect(FLAGS.arena).toBe(false);
  });

  it('toda montagem da Arena está atrás dela', () => {
    /*
      São DUAS portas de entrada — a raiz e o link de desafio — e as duas
      precisam do mesmo cadeado. Um `<Arena>` solto em qualquer ponto do
      roteador publicaria a Arena incompleta sem ninguém ligar chave nenhuma.

      O teste olha função por função em vez de contar ocorrências: contar
      obrigaria a mexer no teste toda vez que nascer uma entrada nova, e teste
      que se ajusta sozinho ao código para de proteger.
    */
    const app = readFileSync('src/App.tsx', 'utf8');
    const funcoes = app.split(/\nfunction /);

    const montagens = funcoes.filter((trecho) => /<Arena\b/.test(trecho));
    expect(montagens.length, 'a Arena sumiu do App').toBeGreaterThan(0);

    for (const trecho of montagens) {
      const nome = trecho.slice(0, trecho.indexOf('(')).trim();
      expect(trecho, `${nome} monta a Arena sem checar a flag`).toContain('FLAGS.arena');
    }
  });
});
