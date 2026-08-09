// @vitest-environment jsdom
/**
 * O DEFEITO QUE ESTE ARQUIVO IMPEDE DE VOLTAR.
 *
 * No primeiro teste de verdade do X1, o desafio foi criado num preview e o link
 * mandou o outro celular para a produção — outro build, com a Arena desligada,
 * e outro BANCO. A batalha existia no staging; a produção respondeu "batalha
 * não encontrada", que era literalmente verdade.
 *
 * Endereço cravado no código funciona em exatamente um lugar. Este teste trava
 * a regra: o link nasce de onde o jogo está rodando.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ORIGEM_CANONICA } from '../../shared/enderecoPublico';
import { origemDoJogo } from './enderecoDoJogo';

function fingirOrigem(origem: string | undefined) {
  vi.stubGlobal('window', { location: origem ? { origin: origem } : {} });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('a origem do link do desafio', () => {
  it('em produção, é o endereço canônico', () => {
    fingirOrigem(ORIGEM_CANONICA);
    expect(origemDoJogo()).toBe(ORIGEM_CANONICA);
  });

  it('num preview, o link fica DENTRO do preview', () => {
    // Senão a briga criada num banco vira link apontando para outro.
    fingirOrigem('https://aue-abc123-buildea-projects.vercel.app');
    expect(origemDoJogo()).toBe('https://aue-abc123-buildea-projects.vercel.app');
  });

  it('no desenvolvimento, aponta para a máquina de quem está desenvolvendo', () => {
    fingirOrigem('http://localhost:5173');
    expect(origemDoJogo()).toBe('http://localhost:5173');
  });

  it('origem que não serve de link cai no endereço canônico', () => {
    fingirOrigem('file://');
    expect(origemDoJogo()).toBe(ORIGEM_CANONICA);

    fingirOrigem(undefined);
    expect(origemDoJogo()).toBe(ORIGEM_CANONICA);
  });
});
