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
import { faixaDaNota, falaDaNota } from '../../../nucleo/nota/faixas';
import type { ResultadoRow } from '../../../db/supabase';
import type { ScoreResult } from '../rules';

const RESULTADO: ScoreResult = {
  score: 91.4,
  classification: 'Tá maluco.',
  isArtificial: false,
  partialScores: { duration: 76, power: 88, depth: 92, texture: 84, origin: 60 },
};

/** A fala com semente vazia é o rótulo da faixa — o mesmo caminho da tela sem id. */
const FALA = falaDaNota(RESULTADO.score, '');

const LINK_DA_BATALHA = 'https://aue.vercel.app/b/ABCDEFGHIJ';

function montarTela(extra: Partial<ResultadoScreenProps> = {}): string {
  const props: ResultadoScreenProps = {
    resultado: RESULTADO,
    linhaSalva: null,
    estadoAudio: 'enviado',
    motivoFalhaAudio: null,
    apagandoAudio: false,
    erroAoApagar: null,
    onApagarAudio: () => {},
    linkDesafio: null,
    onDesafiar: () => {},
    onCompartilhar: () => {},
    onTentarDeNovo: () => {},
    erroAoCompartilhar: null,
    ...extra,
  };

  return renderToStaticMarkup(createElement(ResultadoScreen, props));
}

function montarBloco(linkDesafio: string | null): string {
  return renderToStaticMarkup(
    createElement(CompartilharOResultado, {
      nota: RESULTADO.score,
      fala: FALA,
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

describe('a fala do arroto é a MESMA nos três lugares', () => {
  /*
    O defeito que isto impede: cada lugar escolher a sua. A tela mostra uma
    reação, a imagem fotografada sai com outra e o zap manda uma terceira — e o
    jogo se contradiz numa foto que já saiu do celular e não volta.
  */
  const ID = 'a1b2c3d4-e5f6-4789-abcd-0123456789ab';
  const LINHA = { id: ID } as ResultadoRow;
  const ESPERADA = falaDaNota(RESULTADO.score, ID);

  it('cartão fotografado e texto do zap dizem a mesma coisa', () => {
    const html = montarTela({ linhaSalva: LINHA });

    // Na tela e dentro do #score-card.
    expect(html).toContain(ESPERADA.reacao);
    expect(html).toContain(ESPERADA.fraseDoJuiz);
    // E no que vai pros quatro alvos de rede.
    expect(html).toContain(encodeURIComponent(ESPERADA.reacao));
    expect(html).toContain(encodeURIComponent(ESPERADA.fraseDoJuiz));
  });

  it('na janela do envio, cartão e zap dizem a MESMA fala', () => {
    /*
      Sem id ainda: `enviar_resultado` não voltou. O cartão escondia reação e
      veredito nessa janela enquanto os botões de rede já mandavam o rótulo —
      quem tocasse WhatsApp ali mandava um veredito que a foto ao lado não
      tinha. Uma fala só, nos dois lugares.
    */
    const rotulo = falaDaNota(RESULTADO.score, '');
    const html = montarTela({ linhaSalva: null });

    expect(html).toContain('data-od-id="score-classification"');
    expect(html).toContain('data-od-id="judge-quote"');
    expect(html).toContain(rotulo.reacao);
    expect(html).toContain(rotulo.fraseDoJuiz);
    expect(html).toContain(encodeURIComponent(rotulo.reacao));
    expect(html).toContain(encodeURIComponent(rotulo.fraseDoJuiz));
  });

  it('a fala vem do id, e id diferente dá fala da mesma faixa', () => {
    const outra = falaDaNota(RESULTADO.score, 'f0f0f0f0-e5f6-4789-abcd-0123456789ab');
    expect(faixaDaNota(RESULTADO.score).baralho).toContainEqual(outra);
    expect(faixaDaNota(RESULTADO.score).baralho).toContainEqual(ESPERADA);
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

  it('sem batalha, o convite viaja no TEXTO: nota, reação, veredito e provocação', () => {
    // É o preço da decisão (b) documentada no `CompartilharOResultado`: como o
    // link é a home, é a mensagem que precisa convidar. Se este teste cair, o
    // botão voltou a mandar um endereço pelado.
    const html = montarBloco(null);
    expect(html).toContain(encodeURIComponent('91,4'));
    expect(html).toContain(encodeURIComponent(FALA.reacao));
    expect(html).toContain(encodeURIComponent(FALA.fraseDoJuiz));
    expect(html).toContain(encodeURIComponent('Duvido bater.'));
  });

  it('o texto sai do núcleo, sem ponto dobrado e sem nome de criatura', () => {
    // A reação já vem pontuada ("Tá maluco."). Montar na mão aqui era como
    // saía "Tá maluco.. Duvido bater." — `juntar` no núcleo resolve isso, e
    // agora esta tela usa a mesma receita da Arena.
    const html = montarBloco(null);
    expect(html).not.toContain(encodeURIComponent('..'));
    expect(html).not.toContain(encodeURIComponent('Monstro do Esgoto'));
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
