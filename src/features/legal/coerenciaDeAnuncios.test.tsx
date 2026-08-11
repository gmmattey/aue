/**
 * A política de privacidade não pode mentir sobre anúncios.
 *
 * O DEFEITO QUE ESTE TESTE TRAVA
 * ------------------------------
 * A política afirmava "Não exibe anúncios nesta versão" numa lista escrita à
 * mão. A tela de resultado monta um `<AdBanner>` que liga SOZINHO quando
 * `VITE_ADSENSE_CLIENT` e `VITE_ADSENSE_SLOT_RESULT` são preenchidas e o build é
 * refeito — sem uma linha de código mudar. O `docs/_arquivo/lancamento.md` mandava fazer
 * exatamente isso na seção de AdSense.
 *
 * Ou seja: seguir o checklist de lançamento publicava um documento legal
 * mentindo, e nada quebrava. Sem erro, sem aviso, sem teste vermelho. O tipo de
 * falha que só aparece numa reclamação, numa auditoria de LGPD ou numa revisão
 * de conta do Google.
 *
 * COMO ELE PRENDE OS DOIS LADOS
 * -----------------------------
 * Renderizando a TELA DE RESULTADO DE VERDADE e a POLÍTICA DE VERDADE, na mesma
 * configuração de ambiente, e comparando. Não confere a constante contra ela
 * mesma: confere o que a pessoa vê contra o que o documento diz.
 *
 * `vi.resetModules()` + `import()` dinâmico são obrigatórios: tanto o `AdBanner`
 * quanto `anunciosAtivos.ts` leem `import.meta.env` no ESCOPO DO MÓDULO, uma vez
 * só. Sem reimportar, o `vi.stubEnv` chegaria tarde demais e o teste passaria
 * verde sem nunca ter exercitado o caso configurado — que é o caso perigoso.
 *
 * ASSIMETRIA DELIBERADA. `anunciosAtivos.ts` também considera o slot do FEED, e
 * o feed está desligado por flag no corte: com só ele preenchido, a política
 * declara anúncios que ninguém vê. Declarar a mais é chato; declarar a menos é o
 * documento mentindo. Por isso o que está travado aqui é a direção perigosa —
 * **anúncio na tela obriga a política a admitir** —, e não uma bicondicional.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';

import type { ScoreResult } from '../audio/rules';

const RESULTADO: ScoreResult = {
  score: 91.4,
  classification: 'Tá maluco.',
  isArtificial: false,
  partialScores: { duration: 76, power: 88, depth: 92, texture: 84, origin: 60 },
};

/** A frase que só pode existir quando NENHUM anúncio pode ser servido. */
const NEGA_ANUNCIO = 'Não exibe anúncios nesta versão';

/**
 * Monta a tela de resultado e a política sob um ambiente controlado.
 *
 * Devolve as duas marcações já renderizadas — é sobre elas que as asserções
 * falam, e não sobre nenhuma constante intermediária.
 */
async function renderizarSob(ambiente: Record<string, string | undefined>) {
  vi.resetModules();
  for (const [chave, valor] of Object.entries(ambiente)) {
    vi.stubEnv(chave, valor);
  }

  const { ResultadoScreen } = await import('../audio/resultado/ResultadoScreen');
  const { PoliticaDePrivacidade } = await import('./PoliticaDePrivacidade');

  const telaDeResultado = renderToStaticMarkup(
    createElement(ResultadoScreen, {
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
    }),
  );

  const politica = renderToStaticMarkup(
    createElement(MemoryRouter, null, createElement(PoliticaDePrivacidade)),
  );

  return { telaDeResultado, politica };
}

/** O que caracteriza um bloco de AdSense montado de verdade na marcação. */
function servindoAnuncio(html: string): boolean {
  return html.includes('adsbygoogle');
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe('a política e o AdBanner contam a mesma história', () => {
  it('sem configuração: a tela não serve anúncio e a política pode negar', async () => {
    const { telaDeResultado, politica } = await renderizarSob({
      VITE_ADSENSE_CLIENT: undefined,
      VITE_ADSENSE_SLOT_RESULT: undefined,
      VITE_ADSENSE_SLOT_FEED: undefined,
    });

    expect(servindoAnuncio(telaDeResultado)).toBe(false);
    expect(telaDeResultado).not.toContain('ca-pub-');
    expect(politica).toContain(NEGA_ANUNCIO);
  });

  it('com cliente e slot de resultado: a tela serve anúncio e a política ADMITE', async () => {
    // Este é o cenário do `docs/_arquivo/lancamento.md` §6 — duas variáveis preenchidas,
    // rebuild, e pronto. É onde a política virava mentira.
    const { telaDeResultado, politica } = await renderizarSob({
      VITE_ADSENSE_CLIENT: 'ca-pub-5542349230926522',
      VITE_ADSENSE_SLOT_RESULT: '1234567890',
      VITE_ADSENSE_SLOT_FEED: undefined,
    });

    expect(
      servindoAnuncio(telaDeResultado),
      'a tela de resultado deixou de montar o AdBanner — o teste perdeu o objeto dele',
    ).toBe(true);

    expect(
      politica,
      'a tela serve anúncio do Google e a política continua dizendo que não exibe anúncios',
    ).not.toContain(NEGA_ANUNCIO);
    expect(politica).toContain('Google AdSense');
    // Anúncio do Google grava identificador no aparelho. Uma política que
    // admite o anúncio e esconde o cookie continua sendo meia verdade.
    expect(politica).toContain('cookies');
  });

  it('cliente sem slot nenhum: nada é servido, e a política volta a poder negar', async () => {
    // Prova que o slot é carregador da regra, e não decoração: sem ele o
    // AdBanner não monta o bloco, então negar continua sendo verdade.
    const { telaDeResultado, politica } = await renderizarSob({
      VITE_ADSENSE_CLIENT: 'ca-pub-5542349230926522',
      VITE_ADSENSE_SLOT_RESULT: undefined,
      VITE_ADSENSE_SLOT_FEED: undefined,
    });

    expect(servindoAnuncio(telaDeResultado)).toBe(false);
    expect(politica).toContain(NEGA_ANUNCIO);
  });

  it('a lista de "o que o Auê não faz" não fala mais de publicidade', async () => {
    /*
      A afirmação sobre anúncio saiu da lista fixa e virou uma seção derivada da
      configuração. Se alguém devolver a frase para a lista, ela volta a ser
      texto escrito à mão que nada mantém verdadeiro — e este teste deixa de
      proteger o que existe para protegê-lo.
    */
    const { politica } = await renderizarSob({
      VITE_ADSENSE_CLIENT: 'ca-pub-5542349230926522',
      VITE_ADSENSE_SLOT_RESULT: '1234567890',
      VITE_ADSENSE_SLOT_FEED: undefined,
    });

    expect(politica).not.toContain('cookie de publicidade');
  });
});
