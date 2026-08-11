/**
 * O NÓ FOTOGRAFADO, travado em teste.
 *
 * `useShareResult` resolve o elemento por `document.getElementById('score-card')`
 * e joga só ELE no html2canvas. Nada verifica isso por tipo, e as três formas de
 * quebrar são silenciosas — a tela continua idêntica e só a imagem que sai do
 * app fica errada, que é o artefato que ninguém olha em desenvolvimento:
 *
 *   1. perder o `id`, e não haver o que fotografar;
 *   2. perder `background`/`border`/`borderRadius` inline, e a foto sair como
 *      texto solto sobre o fundo escuro, sem recorte;
 *   3. marca e chamada saírem do nó (viram bloco irmão), e a imagem voltar a
 *      circular sem dizer de onde veio nem o que fazer — contra o §3.5, que
 *      exige identidade visual e CTA DENTRO do artefato compartilhado.
 *
 * O ponto 3 é o que este arquivo acrescenta: como `renderToStaticMarkup` devolve
 * a árvore com um único nó raiz (a `<div id="score-card">`), tudo que aparece no
 * HTML abaixo está, por construção, dentro do que será fotografado.
 */
import { describe, expect, it } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import { ENDERECO_LEGIVEL } from '../../../shared/enderecoPublico';
import { CartaoDaNota } from './CartaoDaNota';
import { falaDaNota } from '../../../nucleo/nota/faixas';
import type { ScoreResult } from '../rules';

const RESULTADO: ScoreResult = {
  score: 91.4,
  classification: 'Tá maluco.',
  isArtificial: false,
  partialScores: { duration: 76, power: 88, depth: 92, texture: 84, origin: 60 },
};

/** A mesma derivação que o `ResultadoScreen` faz, com um id de resultado real. */
const FALA = falaDaNota(RESULTADO.score, 'a1b2c3d4-e5f6-4789-abcd-0123456789ab');

function desenhar(fala: typeof FALA = FALA): string {
  return renderToStaticMarkup(
    createElement(CartaoDaNota, {
      resultado: RESULTADO,
      fala,
      linhaSalva: null,
    }),
  );
}

describe('CartaoDaNota — o que entra na imagem compartilhada', () => {
  it('o nó continua sendo #score-card e continua tendo recorte próprio', () => {
    const html = desenhar();
    expect(html).toContain('id="score-card"');
    // Os três juntos: é a combinação que dá à foto um cartão em vez de texto
    // solto sobre o fundo da página.
    expect(html).toContain('background:var(--surface)');
    expect(html).toContain('border:1px solid var(--border)');
    expect(html).toContain('border-radius:var(--radius-lg)');
  });

  it('a nota e a reação da faixa estão na imagem', () => {
    const html = desenhar();
    expect(html).toContain('91,4');
    expect(html).toContain(FALA.reacao);
    expect(html).toContain(FALA.fraseDoJuiz);
  });

  it('a reação vem da faixa, e não do nome de criatura que morava aqui', () => {
    expect(desenhar()).not.toContain('Monstro do Esgoto');
  });

  it('na janela do envio a imagem sai com o rótulo, nunca muda', () => {
    /*
      O cartão já escondeu reação e veredito enquanto o id não chegava. A foto
      tirada ali saía com número e barras e mais nada — sem a única parte da
      tela que tem voz — e os botões de rede ao lado já mandavam o rótulo no
      texto. Agora é o mesmo rótulo dos dois lados.
    */
    const rotulo = falaDaNota(RESULTADO.score, '');
    const html = desenhar(rotulo);

    expect(html).toContain('score-classification');
    expect(html).toContain('judge-quote');
    expect(html).toContain(rotulo.reacao);
    expect(html).toContain(rotulo.fraseDoJuiz);
  });

  it('a marca do Auê está DENTRO do nó fotografado', () => {
    const html = desenhar();
    expect(html).toContain('data-od-id="share-card-brand"');
    expect(html).toContain('>Auê<');
  });

  it('a chamada para superar o resultado e o endereço estão na imagem', () => {
    // Sem endereço, a foto reencaminhada não tem como trazer ninguém de volta.
    const html = desenhar();
    expect(html).toContain('Bate essa');
    /* Contra a constante: o endereço muda, o teste continua valendo. */
    expect(html).toContain(ENDERECO_LEGIVEL);
  });

  it('a marca não traz color-mix nem sprite externo no estilo inline', () => {
    // O html2canvas 1.4.1 não resolve `color-mix()` nem `<use href="/icons.svg#...">`:
    // os dois viram buraco justamente na parte que existe para ser vista.
    //
    // O alcance deste teste é o estilo INLINE — é onde a marca foi escrita, e é
    // o que ele consegue enxergar. Regra vinda de classe do index.css continua
    // fora do que dá para checar por marcação.
    const html = desenhar();
    expect(html).not.toContain('color-mix');
    expect(html).not.toContain('icons.svg');
  });
});
