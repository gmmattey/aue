// @vitest-environment jsdom
/**
 * A SEQUÊNCIA DO DESAFIO, E O QUE ACONTECE QUANDO ELA QUEBRA NO MEIO.
 *
 * Guardar o resultado, subir o áudio e criar a batalha são três passos. O pior
 * caso não é falhar no primeiro — é falhar no **segundo**: o resultado fica
 * gravado, o áudio não sobe, e o desafio sairia MUDO. O amigo abre o link e não
 * tem o que ouvir, que é o produto inteiro quebrado.
 *
 * Este arquivo existe para que esse caso nunca vire "deu certo".
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const resultadoSalvo = {
  id: 'resultado-1',
  nota: 88.2,
  usuario_id: 'usuario-1',
};

const enviarResultado = vi.fn(async () => resultadoSalvo);
const enviarAudioDoResultado = vi.fn(async () => resultadoSalvo);
const criarBatalha = vi.fn(async () => 'ABCDEFGHJK');
const obterBatalha = vi.fn(async () => ({ expira_em: '2026-08-16T12:00:00Z' }));
const updateProfile = vi.fn(async () => ({}));
const garantirSessao = vi.fn(async () => ({ user: { id: 'usuario-1' } }));

vi.mock('../../db/supabase', () => ({
  configuracaoAusente: null,
  enviarResultado: (...args: unknown[]) => enviarResultado(...(args as [])),
  enviarAudioDoResultado: (...args: unknown[]) => enviarAudioDoResultado(...(args as [])),
  criarBatalha: (...args: unknown[]) => criarBatalha(...(args as [])),
  obterBatalha: (...args: unknown[]) => obterBatalha(...(args as [])),
  updateProfile: (...args: unknown[]) => updateProfile(...(args as [])),
}));

vi.mock('../../shared/auth/sessaoAnonima', () => ({
  garantirSessao: () => garantirSessao(),
}));

const { criarDesafiosWeb } = await import('./desafios');

const PEDIDO = {
  nota: {
    nota: 88.0,
    classificacao: 'Monstro do Esgoto',
    frase: 'Nojento.',
    medidas: { grave: 90, estouro: 80, folego: 70, sujeira: 60 },
  },
  origem: 'Bebida' as const,
  audio: {
    dados: new Blob(['arroto']),
    formato: 'audio/mp4',
    duracaoMs: 3000,
    resumo: { rms: 0.2, pico: 0.5 },
  },
  nome: 'Guinho',
};

beforeEach(() => {
  vi.clearAllMocks();
  enviarResultado.mockResolvedValue(resultadoSalvo);
  enviarAudioDoResultado.mockResolvedValue(resultadoSalvo);
  criarBatalha.mockResolvedValue('ABCDEFGHJK');
  obterBatalha.mockResolvedValue({ expira_em: '2026-08-16T12:00:00Z' });
  garantirSessao.mockResolvedValue({ user: { id: 'usuario-1' } });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('criar o desafio', () => {
  it('devolve link, prazo e a nota do SERVIDOR', async () => {
    const resposta = await criarDesafiosWeb().criar(PEDIDO);

    expect(resposta.ok).toBe(true);
    if (!resposta.ok) return;

    expect(resposta.desafio.codigo).toBe('ABCDEFGHJK');
    expect(resposta.desafio.link).toContain('/b/ABCDEFGHJK');
    // A prévia local dizia 88,0. Quem manda é o servidor.
    expect(resposta.desafio.notaOficial).toBe(88.2);
    expect(resposta.desafio.expiraEm).toBe('2026-08-16T12:00:00Z');
  });

  it('manda as quatro medidas como as parciais que a RPC espera', async () => {
    await criarDesafiosWeb().criar(PEDIDO);

    // Trocar duas de lugar daria nota errada sem nada acusar.
    expect(enviarResultado).toHaveBeenCalledWith({
      duracao: 70,
      potencia: 80,
      profundidade: 90,
      textura: 60,
      tipoDeOrigem: 'Bebida',
    });
  });

  it('o nome vai para o perfil, que é de onde o servidor lê', async () => {
    await criarDesafiosWeb().criar(PEDIDO);
    expect(updateProfile).toHaveBeenCalledWith('usuario-1', { apelido: 'Guinho' });
  });

  it('perder o nome não custa o desafio', async () => {
    updateProfile.mockRejectedValueOnce(new Error('perfil recusou'));
    vi.spyOn(console, 'error').mockImplementation(() => {});

    const resposta = await criarDesafiosWeb().criar(PEDIDO);

    // A pessoa arrotou e a nota existe. Ela aparece com o apelido padrão.
    expect(resposta.ok).toBe(true);
  });
});

describe('quando quebra no meio', () => {
  it('áudio que não sobe NÃO vira desafio', async () => {
    // O pior caso: resultado gravado, áudio não. O amigo abriria um link mudo.
    enviarAudioDoResultado.mockRejectedValueOnce(new Error('bucket recusou'));
    vi.spyOn(console, 'error').mockImplementation(() => {});

    const resposta = await criarDesafiosWeb().criar(PEDIDO);

    expect(resposta.ok).toBe(false);
    expect(criarBatalha).not.toHaveBeenCalled();
  });

  it('batalha que não nasce devolve erro', async () => {
    criarBatalha.mockRejectedValueOnce(new Error('rpc recusou'));
    vi.spyOn(console, 'error').mockImplementation(() => {});

    const resposta = await criarDesafiosWeb().criar(PEDIDO);
    expect(resposta.ok).toBe(false);
  });

  it('sem sessão não tenta nada — o áudio não subiria mesmo', async () => {
    garantirSessao.mockResolvedValueOnce(null as never);

    const resposta = await criarDesafiosWeb().criar(PEDIDO);

    expect(resposta).toEqual({ ok: false, motivo: 'semRede' });
    expect(enviarResultado).not.toHaveBeenCalled();
  });

  it('falta de rede é reconhecida como falta de rede', async () => {
    enviarResultado.mockRejectedValueOnce(new TypeError('Failed to fetch'));

    const resposta = await criarDesafiosWeb().criar(PEDIDO);
    expect(resposta).toEqual({ ok: false, motivo: 'semRede' });
  });

  it('o código do desafio nunca vai para o log', async () => {
    // Ele é a chave: quem tem o link, entra. Log é o lugar mais fácil de um
    // segredo vazar sem ninguém perceber.
    const erro = vi.spyOn(console, 'error').mockImplementation(() => {});
    criarBatalha.mockRejectedValueOnce(new Error('deu ruim'));

    await criarDesafiosWeb().criar(PEDIDO);

    for (const chamada of erro.mock.calls) {
      expect(JSON.stringify(chamada)).not.toContain('ABCDEFGHJK');
    }
  });
});
