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

/* O bucket e a RPC de apagar, dublados. Ver o `describe` do fim do arquivo. */
const listarNoBucket = vi.fn(async () => ({ data: [{ name: 'resultado-1.m4a' }], error: null }));
const removerDoBucket = vi.fn(async (alvos: string[]) => ({
  data: alvos.map((name) => ({ name })),
  error: null,
}));
const chamarRpc = vi.fn(async () => ({ data: null, error: null }));

vi.mock('../../db/supabase', () => ({
  configuracaoAusente: null,
  BUCKET_AUDIO: 'audio_records',
  enviarResultado: (...args: unknown[]) => enviarResultado(...(args as [])),
  enviarAudioDoResultado: (...args: unknown[]) => enviarAudioDoResultado(...(args as [])),
  criarBatalha: (...args: unknown[]) => criarBatalha(...(args as [])),
  obterBatalha: (...args: unknown[]) => obterBatalha(...(args as [])),
  updateProfile: (...args: unknown[]) => updateProfile(...(args as [])),
  supabase: {
    rpc: (...args: unknown[]) => chamarRpc(...(args as [])),
    storage: {
      from: () => ({
        list: (...args: unknown[]) => listarNoBucket(...(args as [])),
        remove: (...args: unknown[]) => removerDoBucket(...(args as [never])),
      }),
    },
  },
}));

vi.mock('../../shared/auth/sessaoAnonima', () => ({
  garantirSessao: () => garantirSessao(),
}));

const { criarDesafiosWeb } = await import('./desafios');

const PEDIDO = {
  nota: {
    nota: 88.0,
    classificacao: 'Tá maluco.',
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
  listarNoBucket.mockResolvedValue({ data: [{ name: 'resultado-1.m4a' }], error: null });
  removerDoBucket.mockImplementation(async (alvos: string[]) => ({
    data: alvos.map((name) => ({ name })),
    error: null,
  }));
  chamarRpc.mockResolvedValue({ data: null, error: null });
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

/**
 * APAGAR O PRÓPRIO ARROTO — o caso que já falhou em produção.
 *
 * O defeito de origem: a função lia `caminho_do_audio` da tabela `resultados`
 * para achar o arquivo. A leitura de `resultados` está FECHADA por RLS, e
 * consulta bloqueada não devolve erro — devolve vazio. Sem caminho, o código
 * concluía "não havia arquivo", pulava o bucket e dizia `apagado`. O ponteiro
 * saía, o arquivo ficava, e o dono do produto viu isso no telefone dele.
 *
 * O que estes testes seguram: o arquivo sai ANTES do ponteiro, e nada devolve
 * `apagado` sem o servidor ter confirmado a remoção.
 */
describe('apagar o meu arroto', () => {
  it('não pergunta o caminho para a tabela — ela é fechada por RLS', async () => {
    await criarDesafiosWeb().apagarMeuArroto('resultado-1');

    // A busca é na PASTA do dono, que é o que ele consegue enxergar.
    expect(listarNoBucket).toHaveBeenCalledWith('usuario-1', { search: 'resultado-1' });
  });

  it('remove o arquivo ANTES de limpar o ponteiro', async () => {
    const ordem: string[] = [];
    removerDoBucket.mockImplementationOnce(async (alvos: string[]) => {
      ordem.push('bucket');
      return { data: alvos.map((name) => ({ name })), error: null };
    });
    chamarRpc.mockImplementationOnce(async () => {
      ordem.push('rpc');
      return { data: null, error: null };
    });

    const resposta = await criarDesafiosWeb().apagarMeuArroto('resultado-1');

    expect(resposta).toBe('apagado');
    expect(ordem).toEqual(['bucket', 'rpc']);
    expect(removerDoBucket).toHaveBeenCalledWith(['usuario-1/resultado-1.m4a']);
  });

  it('lista vazia do bucket é FALHA, não sucesso', async () => {
    // O Storage responde 200 sem remover nada quando a policy recusa. Este é
    // o buraco por onde o defeito de origem voltaria.
    vi.spyOn(console, 'error').mockImplementation(() => {});
    removerDoBucket.mockResolvedValueOnce({ data: [], error: null });

    const resposta = await criarDesafiosWeb().apagarMeuArroto('resultado-1');

    expect(resposta).toBe('naoDeu');
  });

  it('quando o arquivo não sai, o ponteiro NÃO é limpo', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    removerDoBucket.mockResolvedValueOnce({ data: [], error: null });

    await criarDesafiosWeb().apagarMeuArroto('resultado-1');

    // Ponteiro de pé = a próxima tentativa ainda encontra o arquivo.
    expect(chamarRpc).not.toHaveBeenCalled();
  });

  it('arquivo já removido antes: limpa o ponteiro e confirma', async () => {
    listarNoBucket.mockResolvedValueOnce({ data: [], error: null });

    const resposta = await criarDesafiosWeb().apagarMeuArroto('resultado-1');

    expect(resposta).toBe('apagado');
    expect(removerDoBucket).not.toHaveBeenCalled();
    expect(chamarRpc).toHaveBeenCalledWith('remover_audio_do_resultado', {
      p_resultado_id: 'resultado-1',
    });
  });
});
