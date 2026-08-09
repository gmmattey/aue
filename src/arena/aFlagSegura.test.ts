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

  it('a Arena só é montada atrás dela', () => {
    const app = readFileSync('src/App.tsx', 'utf8');

    const montagens = [...app.matchAll(/<Arena\b/g)];
    expect(montagens.length, 'a Arena sumiu do App').toBe(1);

    /*
      A montagem tem que estar na mesma expressão da flag. Um `<Arena />` solto
      em qualquer outro ponto do roteador publicaria a Arena incompleta sem
      ninguém ligar chave nenhuma.
    */
    expect(app).toMatch(/FLAGS\.arena\s*\?\s*<Arena\s*\/>/);
  });
});
