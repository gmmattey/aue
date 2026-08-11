/**
 * A colocação do anúncio na tela de resultado, travada em teste.
 *
 * Existe por causa de uma regra que é fácil de violar sem perceber e cara de
 * violar: `docs/jogo/VOZ.md` §8 — anúncio NUNCA encosta em
 * botão de ação. Acima do anúncio ficam "Desafiar um amigo", "Compartilhar" e
 * "Tentar de novo", que são exatamente onde a pessoa vai tocar. Anúncio junto de
 * botão gera clique acidental, e clique acidental é violação de política do
 * AdSense que derruba a conta.
 *
 * O ponto: mover o `<AdBanner>` algumas linhas para cima na composição parece
 * uma melhoria de viewability, não deixa nenhum rastro na tela em
 * desenvolvimento (sem as variáveis do AdSense ele é invisível em produção) e
 * só se manifesta como conta suspensa semanas depois. Este teste é o que
 * transforma essa decisão em algo que quebra na hora.
 *
 * `renderToStaticMarkup` como no `BotaoDeDesafiar.test.tsx`.
 */
import { describe, expect, it } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import { ResultadoScreen } from './ResultadoScreen';
import type { ResultadoScreenProps } from './ResultadoScreen';
import type { ScoreResult } from '../rules';

const RESULTADO: ScoreResult = {
  score: 91.4,
  classification: 'Tá maluco.',
  isArtificial: false,
  partialScores: { duration: 76, power: 88, depth: 92, texture: 84, origin: 60 },
};

function montar(extra: Partial<ResultadoScreenProps> = {}): string {
  const props: ResultadoScreenProps = {
    resultado: RESULTADO,
    linhaSalva: null,
    estadoAudio: 'enviado',
    motivoFalhaAudio: null,
    postadoNoFeed: false,
    apagandoAudio: false,
    erroAoApagar: null,
    onApagarAudio: () => {},
    linkDesafio: null,
    onDesafiar: () => {},
    onCompartilhar: () => {},
    onTentarDeNovo: () => {},
    erroAoCompartilhar: null,
    mostrarXp: false,
    ...extra,
  };

  return renderToStaticMarkup(createElement(ResultadoScreen, props));
}

/**
 * Onde o anúncio está na marcação.
 *
 * Sem `VITE_ADSENSE_CLIENT`/`VITE_ADSENSE_SLOT_RESULT` o `AdBanner` renderiza o
 * marcador `ad-slot` em desenvolvimento e NADA em produção. O teste roda sem as
 * variáveis, então é o marcador que ele procura — e é justamente ele que prova
 * que o componente está montado na posição certa.
 */
function posicaoDoAnuncio(html: string): number {
  return html.indexOf('ad-slot');
}

describe('anúncio na tela de resultado', () => {
  it('fica DEPOIS das ações — nunca encostado nos botões', () => {
    const html = montar();
    const acoes = html.indexOf('data-od-id="result-actions"');
    const anuncio = posicaoDoAnuncio(html);

    expect(acoes, 'a seção de ações sumiu da tela').toBeGreaterThan(-1);
    expect(anuncio, 'o AdBanner não está montado na tela de resultado').toBeGreaterThan(-1);
    expect(anuncio).toBeGreaterThan(acoes);
  });

  it('fica depois do link da batalha quando ele existe', () => {
    // O link é o último bloco de conteúdo. Com ele na tela o anúncio continua
    // sendo o fim — senão ele se enfia entre o link e o botão de compartilhar
    // em rede, que também é toque.
    const html = montar({ linkDesafio: 'https://aue.vercel.app/b/ABCDEFGHIJ' });
    expect(posicaoDoAnuncio(html)).toBeGreaterThan(html.indexOf('/b/ABCDEFGHIJ'));
  });

  it('assinante não vê anúncio nenhum', () => {
    // É o que a tela de perfil promete: "Sem anúncios, arrotos ilimitados e
    // favoritos". O default do AdBanner é `false` (o caso comum, não o seguro),
    // então quem paga depende desta prop chegar.
    expect(posicaoDoAnuncio(montar({ isPremium: true }))).toBe(-1);
  });

  it('sem as variáveis do AdSense nada do Google é referenciado', () => {
    // A prova de que a colocação é inerte até alguém ligar. O marcador de
    // desenvolvimento aparece; script e id de publisher, não.
    const html = montar();
    expect(html).not.toContain('pagead2.googlesyndication.com');
    expect(html).not.toContain('ca-pub-');
    expect(html).not.toContain('adsbygoogle');
  });
});
