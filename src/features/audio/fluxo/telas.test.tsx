import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { TelaDeGravacao } from './TelaDeGravacao';
import { TelaDeJulgamento } from './TelaDeJulgamento';
import { TelaDeMicrofoneBloqueado } from './TelaDeMicrofoneBloqueado';
import { TelaSemSom } from './TelaSemSom';

/**
 * As quatro telas do fluxo, desenhadas isoladamente.
 *
 * `renderToStaticMarkup` e ambiente `node` de propósito: aqui só interessa o
 * que a tela DIZ e o que ela desenha a partir das props. O comportamento de
 * clique e a passagem de uma etapa para outra têm arquivo próprio
 * (`EscolhaDeOrigem.test.tsx` e `AudioRecorder.fluxo.test.tsx`), que pagam o
 * custo do DOM porque precisam.
 */

const nada = () => {};

describe('TelaDeGravacao', () => {
  it('mostra o tempo DECORRIDO com uma casa, no formato do protótipo', () => {
    // 10s de teto, 7,3s restando -> 2,7s decorridos -> "02,7".
    const html = renderToStaticMarkup(
      createElement(TelaDeGravacao, {
        msRestantes: 7300,
        segundosTotais: 10,
        frequencias: [40, 70, 100, 55, 85, 30, 60, 45, 75, 35],
        onFinalizar: nada,
        onCancelar: nada,
        saindo: false,
      }),
    );

    expect(html).toContain('02,7');
    expect(html).toContain('/ 10s');
  });

  it('no primeiro instante mostra 00,0 — e não o teto', () => {
    // O contador antigo era regressivo ("Parar (10s)"). Trocar o sentido sem
    // trocar o número mostraria 10 no começo E no fim.
    const html = renderToStaticMarkup(
      createElement(TelaDeGravacao, {
        msRestantes: 10_000,
        segundosTotais: 10,
        frequencias: [40, 70, 100, 55, 85, 30, 60, 45, 75, 35],
        onFinalizar: nada,
        onCancelar: nada,
        saindo: false,
      }),
    );

    expect(html).toContain('00,0');
  });

  it('diz que está gravando e promete a origem para depois', () => {
    const html = renderToStaticMarkup(
      createElement(TelaDeGravacao, {
        msRestantes: 5000,
        segundosTotais: 10,
        frequencias: [40, 70, 100, 55, 85, 30, 60, 45, 75, 35],
        onFinalizar: nada,
        onCancelar: nada,
        saindo: false,
      }),
    );

    expect(html).toContain('Gravando');
    expect(html).toContain('Manda.');
    expect(html).toContain('Origem depois do arroto');
    expect(html).toContain('PARAR');
    expect(html).toContain('Cancelar');
  });

  it('a onda da gravação não tem animação nenhuma', () => {
    /*
      A REGRA MAIS FÁCIL DE ALGUÉM "MELHORAR" SEM PERCEBER. Barras dançando
      durante a gravação afirmam que o app está ouvindo — e ele não está
      medindo nada até o onstop. Foi assim que um iPhone mudo tirou 54,2
      "Dá pro gasto." (ver engine.ts).

      O teste olha o estilo inline das barras: se alguém acrescentar animação
      por ali, cai aqui. Animação declarada no CSS do EstilosDoFluxo não é
      alcançável por este teste — e o comentário naquele arquivo é a outra
      metade da trava.
    */
    const html = renderToStaticMarkup(
      createElement(TelaDeGravacao, {
        msRestantes: 5000,
        segundosTotais: 10,
        frequencias: [40, 70, 100, 55, 85, 30, 60, 45, 75, 35],
        onFinalizar: nada,
        onCancelar: nada,
        saindo: false,
      }),
    );

    const onda = html.slice(html.indexOf('data-od-id="waveform"'));
    expect(onda).not.toContain('animation');
  });
});

describe('TelaDeJulgamento', () => {
  const parciais = { duration: 80, power: 60, depth: 40, texture: 20 };

  it('sem parciais, as barras varrem — não mostram número', () => {
    const html = renderToStaticMarkup(
      createElement(TelaDeJulgamento, {
        parciais: null,
        enviando: false,
        onEscolherOrigem: nada,
        onDescartar: nada,
      }),
    );

    expect(html).toContain('fx-preenchimento-indefinido');
    expect(html).toContain('Medindo o estrago');
    // Nenhuma largura fixa: o protótipo anima para 92%, 88%, 76% e 84% —
    // números escritos no CSS, sobre um áudio que ainda não foi medido.
    expect(html).not.toContain('width:92%');
    expect(html).not.toContain('width:88%');
  });

  it('com parciais, as barras mostram a medida REAL', () => {
    const html = renderToStaticMarkup(
      createElement(TelaDeJulgamento, {
        parciais,
        enviando: false,
        onEscolherOrigem: nada,
        onDescartar: nada,
      }),
    );

    expect(html).toContain('width:80%');
    expect(html).toContain('width:60%');
    expect(html).toContain('width:40%');
    expect(html).toContain('width:20%');
    expect(html).not.toContain('fx-preenchimento-indefinido');
  });

  it('NÃO oferece nem insinua veredito automático', () => {
    /*
      O §3.4 do contrato: "A origem é informada pelo usuário. O sistema não deve
      fingir detectá-la automaticamente."

      O protótipo (julgando.html:105-120) abre o resultado sozinho depois de 5 a
      10 segundos e escreve "Escolha uma opção ou deixe o Auê decidir". Este
      teste é a fronteira: a copy não pode oferecer isso, porque a copy é o
      primeiro lugar onde a regra costuma voltar.
    */
    const html = renderToStaticMarkup(
      createElement(TelaDeJulgamento, {
        parciais,
        enviando: false,
        onEscolherOrigem: nada,
        onDescartar: nada,
      }),
    );

    expect(html).not.toContain('deixe o Auê decidir');
    expect(html).not.toContain('decidir por você');
    expect(html).toContain('Escolha a origem');
    // E há saída explícita para quem não quer escolher.
    expect(html).toContain('Descartar essa');
  });

  it('durante o envio, tranca as opções e some com a saída', () => {
    const html = renderToStaticMarkup(
      createElement(TelaDeJulgamento, {
        parciais,
        enviando: true,
        onEscolherOrigem: nada,
        onDescartar: nada,
      }),
    );

    expect(html).toContain('disabled');
    expect(html).toContain('Fechando o veredito');
    // Descartar no meio do envio soltaria o blob debaixo de quem ainda vai lê-lo.
    expect(html).not.toContain('Descartar essa');
  });
});

describe('TelaDeMicrofoneBloqueado', () => {
  it('ensina os três passos, em vez de só constatar o bloqueio', () => {
    // Era uma linha em cinza. Quem nega a permissão não é perguntado de novo
    // pelo navegador: sem os passos, o produto acabava ali.
    const html = renderToStaticMarkup(
      createElement(TelaDeMicrofoneBloqueado, { onTentarNovamente: nada }),
    );

    expect(html).toContain('Preciso ouvir essa porra.');
    expect(html).toContain('<b>1.</b>');
    expect(html).toContain('<b>2.</b>');
    expect(html).toContain('<b>3.</b>');
    expect(html).toContain('Microfone');
    expect(html).toContain('TENTAR DE NOVO');
  });
});

describe('TelaSemSom', () => {
  it('repete a mensagem da análise, sem reescrevê-la', () => {
    // A copy de silêncio e a de gravação vazia já são travadas em
    // `mensagemDeFalhaNaAnalise.test.ts`. A tela não pode ter uma terceira
    // versão do mesmo diagnóstico.
    const html = renderToStaticMarkup(
      createElement(TelaSemSom, {
        mensagem: 'Não saiu som nenhum nessa gravação.',
        onTentarDeNovo: nada,
        onCancelar: nada,
      }),
    );

    expect(html).toContain('Coé, não peguei nada aí.');
    expect(html).toContain('Não saiu som nenhum nessa gravação.');
    expect(html).toContain('role="alert"');
    expect(html).toContain('TENTAR DE NOVO');
  });
});

/**
 * A SAÍDA DA GRAVAÇÃO (#56) — os 150 ms depois que o microfone fecha.
 *
 * A issue exige que `PARAR`, timeout e fim automático usem o MESMO caminho:
 * "nada de cada saída inventar uma vida diferente". Esta tela não sabe qual das
 * três foi, e é justamente isso que garante a exigência — ela recebe um
 * booleano, não um motivo.
 */
describe('#56 — a saída da gravação', () => {
  const nadaFaz = () => {};

  function montarGravacao(saindo: boolean): string {
    return renderToStaticMarkup(
      createElement(TelaDeGravacao, {
        msRestantes: 5000,
        segundosTotais: 10,
        // Nível alto: em repouso a bolha estaria GRANDE. É o que torna a prova
        // da compressão significativa.
        frequencias: [100, 100, 100, 100, 100, 100, 100, 100, 100, 100],
        onFinalizar: nadaFaz,
        onCancelar: nadaFaz,
        saindo,
      }),
    );
  }

  it('saindo, a bolha comprime abaixo de qualquer nível de áudio possível', () => {
    /*
      O teto do áudio é 1.15 e o piso 1.005. A compressão da saída é 0.88 —
      fora da faixa inteira, de propósito: a bolha não pode parecer que está
      reagindo a um som baixo, ela está encerrando.
    */
    expect(montarGravacao(true)).toContain('scale(0.88)');
    expect(montarGravacao(false)).toContain('scale(1.15)');
  });

  it('a compressão dura os 150 ms que a tela fica montada — um número só', () => {
    // Se o CSS e o `setTimeout` do AudioRecorder divergirem, ou a tela troca
    // antes de a bolha terminar, ou sobra uma bolha parada esperando.
    expect(montarGravacao(true)).toContain('150ms');
  });

  it('deixa de dizer "Gravando" quando o microfone já fechou', () => {
    // Mentira curta continua sendo mentira. O selo passa a "Fechando".
    expect(montarGravacao(true)).toContain('Fechando');
    expect(montarGravacao(true)).not.toContain('Gravando');
    expect(montarGravacao(false)).toContain('Gravando');
  });

  it('não some com a tela: cronômetro e bolha continuam lá durante a saída', () => {
    // "sem tela branca" é texto da issue. A saída é uma transição da MESMA
    // tela, não uma tela intermediária.
    const html = montarGravacao(true);
    expect(html).toContain('data-od-id="recording-hero"');
    expect(html).toContain('data-od-id="bolha-recording"');
    expect(html).toContain('data-od-id="rec-timer"');
  });
});
