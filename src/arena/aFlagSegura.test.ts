/**
 * A CHAVE DESLIGADA É O QUE PROTEGE QUEM ESTÁ JOGANDO.
 *
 * A Arena de hoje abre no `IDLE` e pede o microfone — e para por aí. Ligada em
 * produção, ela entregaria um jogo que não dá nota. O padrão desligado não é
 * detalhe de configuração: é o que garante que a raiz continue servindo o
 * fluxo de sempre enquanto a Arena não cobre o loop.
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
