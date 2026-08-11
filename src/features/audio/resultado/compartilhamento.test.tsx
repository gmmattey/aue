/**
 * O §3.5 do contrato do MVP1, travado em teste.
 *
 * "O resultado deve ser fácil de compartilhar por: WhatsApp; X; Telegram;
 * compartilhamento nativo do dispositivo, quando disponível; cópia de link como
 * fallback."
 *
 * O DEFEITO QUE ESTE ARQUIVO IMPEDE DE VOLTAR: os quatro alvos existiam, mas
 * montados dentro do `LinkDaBatalha`, atrás de um `linkDesafio &&`. Quem gravava
 * e queria só mandar a nota via a folha nativa e mais nada — e nada no desktop,
 * onde `navigator.share` não existe. Um `&&` acidental à frente do
 * `CompartilharOResultado` recria isso sem deixar rastro na tela de quem já
 * criou uma batalha, que é justamente o estado em que o desenvolvedor testa.
 *
 * `renderToStaticMarkup` como no `BotaoDeDesafiar.test.tsx` e no
 * `anuncio.test.tsx`: sem DOM, sem efeito, sem rede.
 */
import { describe, expect, it } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import { ResultadoScreen } from './ResultadoScreen';
import type { ResultadoScreenProps } from './ResultadoScreen';
import { ORIGEM_CANONICA } from '../../../shared/enderecoPublico';
import { CompartilharOResultado } from './CompartilharOResultado';
import type { ScoreResult } from '../rules';

const RESULTADO: ScoreResult = {
  score: 91.4,
  classification: 'Monstro do Esgoto',
  isArtificial: false,
  partialScores: { duration: 76, power: 88, depth: 92, texture: 84, origin: 60 },
};

const LINK_DA_BATALHA = 'https://aue.vercel.app/b/ABCDEFGHIJ';

function montarTela(extra: Partial<ResultadoScreenProps> = {}): string {
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

function montarBloco(linkDesafio: string | null): string {
  return renderToStaticMarkup(
    createElement(CompartilharOResultado, {
      nota: RESULTADO.score,
      classificacao: RESULTADO.classification,
      linkDesafio,
    }),
  );
}

/** Os quatro alvos, pelo endpoint de cada um. */
function alvos(html: string) {
  return {
    whatsapp: html.includes('wa.me'),
    telegram: html.includes('t.me/share/url'),
    x: html.includes('x.com/intent/post'),
    copiar: html.includes('Copiar link'),
  };
}

describe('§3.5 — compartilhamento do resultado individual', () => {
  it('sem batalha criada, os quatro alvos estão na tela', () => {
    // O caso majoritário: gravou, recebeu a nota, quer mandar para o grupo.
    // Era exatamente o caso descoberto.
    expect(alvos(montarTela())).toEqual({
      whatsapp: true,
      telegram: true,
      x: true,
      copiar: true,
    });
  });

  it('com a batalha criada, os quatro continuam lá — uma vez cada', () => {
    const html = montarTela({ linkDesafio: LINK_DA_BATALHA });

    expect(alvos(html)).toEqual({ whatsapp: true, telegram: true, x: true, copiar: true });

    // Uma fileira só. Os botões saíram do `LinkDaBatalha` para o
    // `CompartilharOResultado`; deixar os dois montados daria duas fileiras
    // idênticas com URLs diferentes na mesma tela.
    expect(html.split('wa.me').length - 1).toBe(1);
    expect(html.split('Copiar link').length - 1).toBe(1);
  });

  it('a folha nativa continua sendo oferecida ao lado dos quatro', () => {
    // O quinto caminho do contrato. Ele é o botão das ações, e é o único que
    // anexa o PNG do cartão.
    expect(montarTela()).toContain('data-od-id="btn-compartilhar"');
  });
});

describe('o que viaja em cada caso', () => {
  it('sem batalha, o link é o endereço público — nunca a origem do navegador', () => {
    // `window.location.origin` mandaria `localhost:5173` no desenvolvimento e a
    // URL do preview na Vercel. Link morto do lado de quem recebe.
    const html = montarBloco(null);
    expect(html).toContain(encodeURIComponent(ORIGEM_CANONICA));
    expect(html).not.toContain('localhost');
  });

  it('sem batalha, o convite viaja no TEXTO: nota, classificação e provocação', () => {
    // É o preço da decisão (b) documentada no `CompartilharOResultado`: como o
    // link é a home, é a mensagem que precisa convidar. Se este teste cair, o
    // botão voltou a mandar um endereço pelado.
    const html = montarBloco(null);
    expect(html).toContain(encodeURIComponent('91,4'));
    expect(html).toContain(encodeURIComponent('Monstro do Esgoto'));
    expect(html).toContain(encodeURIComponent('Bate essa'));
  });

  it('sem batalha, a tela diz o que está indo e não promete batalha', () => {
    const html = montarBloco(null);
    expect(html).toContain('Vai o link do Auê com a sua nota no texto');
  });

  it('com batalha, é o link da batalha que viaja, e a nota some do texto', () => {
    const html = montarBloco(LINK_DA_BATALHA);
    expect(html).toContain(encodeURIComponent(LINK_DA_BATALHA));
    expect(html).toContain(encodeURIComponent('Te desafiei no Auê'));
    // A explicação de "sem batalha" seria mentira aqui, e o `LinkDaBatalha` já
    // conta o que o link faz e por quanto tempo.
    expect(html).not.toContain('Vai o link do Auê com a sua nota no texto');
  });
});
