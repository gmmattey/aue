import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * A REGRA MAIS IMPORTANTE DESTE DIRETÓRIO: o juiz não pode derrubar o jogo.
 *
 * O detector é uma trava contra dar nota para conversa. Ele NÃO é uma
 * dependência nova da qual gravar um arroto passa a depender. Um arquivo de
 * 16 MB que não baixou, um WebGL que morreu ou um Safari sem Web Audio não
 * podem impedir alguém de arrotar — o produto viveu até aqui sem detector
 * nenhum.
 *
 * Cada `it` abaixo é um jeito diferente de o juiz quebrar, e a asserção é
 * sempre a mesma: `indisponivel`, nunca uma recusa.
 */

const onda = vi.fn<(blob: Blob) => Promise<Float32Array>>();
const pontuar = vi.fn<(onda: Float32Array) => Promise<number[]>>();

vi.mock('./ondaDe16k', () => ({
  TAXA_DO_YAMNET: 16000,
  ondaDe16k: (blob: Blob) => onda(blob),
}));

vi.mock('./yamnet', () => ({
  pontuarClasseDeArroto: (amostras: Float32Array) => pontuar(amostras),
  ModeloIndisponivelError: class extends Error {},
}));

const BLOB = new Blob(['arroto'], { type: 'audio/webm' });
const ONDA = new Float32Array([0.1, 0.2]);

beforeEach(() => {
  onda.mockReset().mockResolvedValue(ONDA);
  pontuar.mockReset().mockResolvedValue([0.98]);
  // O caminho de falha loga de propósito — é a única pista em produção.
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

async function julgar() {
  const { julgarSeEhArroto } = await import('./julgarSeEhArroto');
  return julgarSeEhArroto(BLOB);
}

describe('julgarSeEhArroto', () => {
  it('entrega ao modelo a onda convertida, não o blob cru', async () => {
    await julgar();

    expect(onda).toHaveBeenCalledWith(BLOB);
    expect(pontuar).toHaveBeenCalledWith(ONDA);
  });

  it('arroto de verdade passa', async () => {
    const veredito = await julgar();

    expect(veredito).toMatchObject({ status: 'arroto', confianca: 0.98 });
  });

  it('conversa é recusada', async () => {
    pontuar.mockResolvedValue([0.004, 0.0224]);

    expect((await julgar()).status).toBe('nao-e-arroto');
  });

  it('modelo que não carrega NÃO recusa a gravação', async () => {
    pontuar.mockRejectedValue(new Error('404 no model.json'));

    expect((await julgar()).status).toBe('indisponivel');
  });

  it('navegador sem Web Audio NÃO recusa a gravação', async () => {
    onda.mockRejectedValue(new Error('Este navegador não tem Web Audio'));

    const veredito = await julgar();

    expect(veredito.status).toBe('indisponivel');
    // E o modelo nem chegou a ser baixado: não há o que inferir.
    expect(pontuar).not.toHaveBeenCalled();
  });

  it('nunca lança — quem chama está no meio do fluxo de gravação', async () => {
    /*
      `aoTerminarGravacao` tem um `catch` que trata falha de ANÁLISE e escolhe a
      mensagem por `mensagemDeFalhaNaAnalise`. Se o juiz lançasse, cairia lá — e
      uma pane do detector viraria "Deu ruim na gravação", culpando a gravação
      de quem arrotou direito.
    */
    onda.mockRejectedValue('nem Error isso aqui é');

    await expect(julgar()).resolves.toMatchObject({ status: 'indisponivel' });
  });
});
