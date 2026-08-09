// @vitest-environment jsdom
/**
 * A Bolha reagindo ao som — a promessa central do `RECORDING`.
 *
 * "Sem isso a pessoa não sabe se o jogo está ouvindo" (`REGRAS.md` §1). É a
 * ligação mais fácil de quebrar sem ninguém perceber: se o nível parar de
 * chegar, a Bolha continua bonita, continua se mexendo pela respiração, e só
 * um olho treinado num celular notaria que ela parou de responder.
 *
 * Por isso o laço de animação é dirigido à mão aqui, quadro a quadro, em vez de
 * confiar no relógio do navegador.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render } from '@testing-library/react';

import { BolhaAue } from './BolhaAue';

/** Assume o controle do laço: cada `passar()` roda um quadro. */
function controlarOsQuadros() {
  const pendentes: FrameRequestCallback[] = [];
  let tempo = 0;

  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
    pendentes.push(cb);
    return pendentes.length;
  });
  vi.stubGlobal('cancelAnimationFrame', () => {});

  return {
    passar(quantos = 1) {
      for (let i = 0; i < quantos; i++) {
        const proximo = pendentes.shift();
        if (!proximo) return;
        tempo += 16;
        proximo(tempo);
      }
    },
    /*
      `cancelAnimationFrame` aqui é no-op, então o quadro pendente de uma Bolha
      desmontada continuaria na fila e seria consumido pela próxima. Duas
      Bolhas comparadas com contagens de quadro diferentes dariam desenhos
      diferentes por motivo nenhum — e o teste passaria por acidente, que foi
      exatamente o que aconteceu na primeira versão deste arquivo.
    */
    zerar() {
      pendentes.length = 0;
      tempo = 0;
    },
  };
}

function caminho() {
  return document.querySelector('.bolha')?.getAttribute('d') ?? '';
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('a Bolha', () => {
  it('respira sozinha em repouso', () => {
    const laco = controlarOsQuadros();
    render(<BolhaAue modo="repouso" />);

    laco.passar();
    const primeiro = caminho();
    laco.passar(20);

    expect(caminho()).not.toBe(primeiro);
  });

  it('gravando, deforma mais com som alto do que com silêncio', () => {
    /*
      Duas Bolhas, mesmos quadros, níveis diferentes. A que ouve som alto tem
      que se afastar mais do círculo — é isso, e só isso, que a pessoa lê como
      "o jogo está me ouvindo".
    */
    const laco = controlarOsQuadros();

    const quieta = render(<BolhaAue modo="gravando" nivel={() => 0} />);
    laco.passar(40);
    const dQuieta = caminho();
    quieta.unmount();

    // Fila e relógio zerados: as duas Bolhas têm que ver exatamente os mesmos
    // quadros, senão a diferença viria do tempo e não do som.
    laco.zerar();

    render(<BolhaAue modo="gravando" nivel={() => 1} />);
    laco.passar(40);
    const dAlta = caminho();

    expect(afastamentoDoCirculo(dAlta)).toBeGreaterThan(afastamentoDoCirculo(dQuieta));
  });

  it('o nível é lido a cada quadro, e não uma vez só', () => {
    // O caso que isto impede: alguém trocar a função por um valor de prop. A
    // Bolha congelaria no primeiro nível e ninguém veria diferença até gravar
    // num celular.
    const laco = controlarOsQuadros();
    const nivel = vi.fn(() => 0.5);

    render(<BolhaAue modo="gravando" nivel={nivel} />);
    laco.passar(10);

    expect(nivel.mock.calls.length).toBeGreaterThan(5);
  });

  it('com movimento reduzido ela para de deformar e continua na tela', () => {
    vi.stubGlobal('matchMedia', () => ({ matches: true, addEventListener() {}, removeEventListener() {} }));
    const laco = controlarOsQuadros();

    render(<BolhaAue modo="gravando" nivel={() => 1} />);
    const parada = caminho();
    laco.passar(30);

    expect(caminho()).toBe(parada);
    expect(parada.length).toBeGreaterThan(20);
  });
});

/**
 * O quanto o desenho se afasta de um círculo.
 *
 * Mede o ponto mais distante do centro entre as coordenadas do caminho. Não é
 * geometria fina — é o bastante para distinguir "quase círculo" de "bolha
 * agitada", que é o que o teste precisa saber.
 */
function afastamentoDoCirculo(d: string): number {
  const numeros = d.match(/-?\d+\.\d+/g)?.map(Number) ?? [];
  let maior = 0;
  for (let i = 0; i + 1 < numeros.length; i += 2) {
    const raio = Math.hypot(numeros[i], numeros[i + 1]);
    if (raio > maior) maior = raio;
  }
  return maior;
}
