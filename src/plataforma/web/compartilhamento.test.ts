// @vitest-environment jsdom
/**
 * O ADAPTADOR DE COMPARTILHAR, nos cinco finais.
 *
 * Este arquivo existe por um defeito específico: quando a imagem não dava, o
 * adaptador mandava texto e link com um `console.warn` e devolvia
 * `via: 'texto'`. Ninguém lia esse retorno. A pessoa apertava para mandar a
 * nota, a folha do sistema abria, ela mandava — e o amigo recebia um link
 * cinza. **Falha virando sucesso**, que é o que o AGENTS.md §7 proíbe.
 *
 * `exigirImagem` mata isso. E `sabeMandarImagem` impede a tela de prometer o
 * que o aparelho não faz.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { criarCompartilhamentoWeb } from './compartilhamento';

/*
  O html2canvas é import dinâmico e nunca desenha em jsdom. Dublado no módulo:
  devolve um canvas de mentira cujo `toBlob` responde o que o teste mandar.
*/
let blobDoCanvas: Blob | null = new Blob(['png'], { type: 'image/png' });
let html2canvasEstoura = false;

vi.mock('html2canvas', () => ({
  default: async () => {
    if (html2canvasEstoura) throw new Error('canvas morreu');
    return {
      toBlob: (devolver: (b: Blob | null) => void) => devolver(blobDoCanvas),
    };
  },
}));

interface AparelhoFalso {
  temShare?: boolean;
  aceitaArquivo?: boolean;
  aoCompartilhar?: () => Promise<void>;
}

function montarAparelho({
  temShare = true,
  aceitaArquivo = true,
  aoCompartilhar,
}: AparelhoFalso = {}) {
  const chamadas: Array<Record<string, unknown>> = [];

  const share = temShare
    ? vi.fn(async (dados: Record<string, unknown>) => {
        chamadas.push(dados);
        if (aoCompartilhar) await aoCompartilhar();
      })
    : undefined;

  Object.defineProperty(navigator, 'share', { value: share, configurable: true });
  Object.defineProperty(navigator, 'canShare', {
    value: temShare ? vi.fn(() => aceitaArquivo) : undefined,
    configurable: true,
  });

  return { chamadas };
}

function porCartaoNaTela(id = 'cartao-do-aue') {
  const no = document.createElement('div');
  no.id = id;
  document.body.appendChild(no);
  return no;
}

beforeEach(() => {
  blobDoCanvas = new Blob(['png'], { type: 'image/png' });
  html2canvasEstoura = false;
  document.body.innerHTML = '';
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('perguntar antes de prometer', () => {
  it('diz que sabe quando o aparelho aceita arquivo', () => {
    montarAparelho({ aceitaArquivo: true });
    expect(criarCompartilhamentoWeb().sabeMandarImagem()).toBe(true);
  });

  it('diz que não sabe quando o aparelho recusa arquivo', () => {
    montarAparelho({ aceitaArquivo: false });
    expect(criarCompartilhamentoWeb().sabeMandarImagem()).toBe(false);
  });

  it('diz que não sabe quando não existe folha de compartilhamento', () => {
    montarAparelho({ temShare: false });
    expect(criarCompartilhamentoWeb().sabeMandarImagem()).toBe(false);
  });

  it('pergunta uma vez só — a resposta não muda no meio da sessão', () => {
    montarAparelho({ aceitaArquivo: true });
    const adaptador = criarCompartilhamentoWeb();
    adaptador.sabeMandarImagem();
    adaptador.sabeMandarImagem();
    adaptador.sabeMandarImagem();
    expect(navigator.canShare).toHaveBeenCalledTimes(1);
  });
});

describe('quem exigiu imagem não recebe texto escondido', () => {
  it('cartão fora da tela vira falha, e a folha do sistema nem abre', async () => {
    const { chamadas } = montarAparelho();

    const resultado = await criarCompartilhamentoWeb().compartilhar({
      elementId: 'cartao-do-aue',
      exigirImagem: true,
      texto: 'Fiz 91,4',
    });

    expect(resultado).toMatchObject({ ok: false, motivo: 'falhou' });
    expect(chamadas).toHaveLength(0);
  });

  it('aparelho que recusa arquivo vira falha em vez de mandar só o link', async () => {
    const { chamadas } = montarAparelho({ aceitaArquivo: false });
    porCartaoNaTela();

    const resultado = await criarCompartilhamentoWeb().compartilhar({
      elementId: 'cartao-do-aue',
      exigirImagem: true,
    });

    expect(resultado).toMatchObject({ ok: false, motivo: 'falhou' });
    expect(chamadas).toHaveLength(0);
  });

  it('imagem que não nasce vira falha', async () => {
    html2canvasEstoura = true;
    const { chamadas } = montarAparelho();
    porCartaoNaTela();

    const resultado = await criarCompartilhamentoWeb().compartilhar({
      elementId: 'cartao-do-aue',
      exigirImagem: true,
    });

    expect(resultado).toMatchObject({ ok: false, motivo: 'falhou' });
    expect(chamadas).toHaveLength(0);
  });

  it('deu tudo certo: a imagem vai junto do texto e do link', async () => {
    const { chamadas } = montarAparelho();
    porCartaoNaTela();

    const resultado = await criarCompartilhamentoWeb().compartilhar({
      elementId: 'cartao-do-aue',
      exigirImagem: true,
      url: 'https://aue.web.app',
      texto: 'Fiz 91,4 no Auê. Duvido bater.',
    });

    expect(resultado).toEqual({ ok: true, via: 'imagem' });
    expect(chamadas[0].files).toHaveLength(1);
    expect(chamadas[0].text).toBe('Fiz 91,4 no Auê. Duvido bater.');
    expect(chamadas[0].url).toBe('https://aue.web.app');
  });

  it('fechar a folha continua sendo desistência, não erro', async () => {
    montarAparelho({
      aoCompartilhar: async () => {
        throw new DOMException('cancelou', 'AbortError');
      },
    });
    porCartaoNaTela();

    const resultado = await criarCompartilhamentoWeb().compartilhar({
      elementId: 'cartao-do-aue',
      exigirImagem: true,
    });

    expect(resultado).toEqual({ ok: false, motivo: 'cancelado' });
  });

  it('sem folha de compartilhamento nenhuma, continua sendo indisponível', async () => {
    montarAparelho({ temShare: false });

    const resultado = await criarCompartilhamentoWeb().compartilhar({
      elementId: 'cartao-do-aue',
      exigirImagem: true,
    });

    expect(resultado).toEqual({ ok: false, motivo: 'indisponivel' });
  });
});

describe('o legado não pode quebrar', () => {
  /*
    `AudioRecorder` e `DisputaLocalScreen` chamam sem `exigirImagem` e CONTAM
    com a degradação. Endurecer para todo mundo tiraria o compartilhar deles em
    aparelho que não aceita arquivo.
  */
  it('sem exigir imagem, cartão fora da tela ainda manda texto e link', async () => {
    const { chamadas } = montarAparelho();

    const resultado = await criarCompartilhamentoWeb().compartilhar({
      elementId: 'score-card',
    });

    expect(resultado).toEqual({ ok: true, via: 'texto' });
    expect(chamadas).toHaveLength(1);
  });

  it('sem exigir imagem, aparelho que recusa arquivo ainda manda texto e link', async () => {
    const { chamadas } = montarAparelho({ aceitaArquivo: false });
    porCartaoNaTela('score-card');

    const resultado = await criarCompartilhamentoWeb().compartilhar({
      elementId: 'score-card',
    });

    expect(resultado).toEqual({ ok: true, via: 'texto' });
    expect(chamadas).toHaveLength(1);
  });
});
