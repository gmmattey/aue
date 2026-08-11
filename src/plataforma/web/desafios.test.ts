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
const responderBatalha = vi.fn(async () => ({ expira_em: '2026-08-16T12:00:00Z' }));
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
  responderBatalha: (...args: unknown[]) => responderBatalha(...(args as [])),
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
  responderBatalha.mockResolvedValue({ expira_em: '2026-08-16T12:00:00Z' });
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

/**
 * O PLACAR DA BRIGA, TRADUZIDO.
 *
 * Quem conta vitória é o banco. Aqui se prova só que o adaptador **lê** o que
 * veio — e que ele não soma, não compara nota e não inventa round.
 */
const BATALHA_COM_ROUNDS = {
  codigo_de_acesso: 'ABCDEFGHJK',
  tipo_de_batalha: 'remota',
  tipo_de_local: null,
  total_de_rodadas: null,
  criado_em: '2026-08-08T12:00:00.000Z',
  expira_em: '2099-01-01T00:00:00.000Z',
  finalizada_em: null,
  participantes: [],
  lider: null,
  rodadas: [
    {
      rodada_id: 'rb-1',
      posicao: 1,
      numero_da_rodada: 1,
      participante_id: null,
      resultado_id: 'res-giam',
      nota: 80.5,
      classificacao: 'Aceitável',
      tipo_de_origem: 'Bebida',
      subtipo_de_origem: null,
      e_artificial: false,
      esta_escondido: false,
      caminho_do_audio: 'audio/giam',
      apelido: 'Giam',
      usuario_id: 'usuario-2',
      criado_em: '2026-08-08T12:00:00.000Z',
    },
    {
      rodada_id: 'rb-2',
      posicao: 2,
      numero_da_rodada: 1,
      participante_id: null,
      resultado_id: 'res-guinho',
      nota: 91.4,
      classificacao: 'Tá maluco.',
      tipo_de_origem: 'Bebida',
      subtipo_de_origem: null,
      e_artificial: false,
      esta_escondido: false,
      caminho_do_audio: 'audio/guinho',
      apelido: 'Guinho',
      usuario_id: 'usuario-1',
      criado_em: '2026-08-08T12:01:00.000Z',
    },
    {
      rodada_id: 'rb-3',
      posicao: 3,
      numero_da_rodada: 2,
      participante_id: null,
      resultado_id: 'res-giam-2',
      nota: 70.2,
      classificacao: 'Fraco',
      tipo_de_origem: 'Bebida',
      subtipo_de_origem: null,
      e_artificial: false,
      esta_escondido: false,
      caminho_do_audio: 'audio/giam-2',
      apelido: 'Giam',
      usuario_id: 'usuario-2',
      criado_em: '2026-08-08T12:02:00.000Z',
    },
  ],
  placar: {
    rounds: 2,
    lados: [
      { usuario_id: 'usuario-2', apelido: 'Giam', vitorias: 0 },
      { usuario_id: 'usuario-1', apelido: 'Guinho', vitorias: 1 },
    ],
    ultimo_round: 2,
    vencedor_do_ultimo_round: null,
    round_aberto: { numero: 2, usuario_id: 'usuario-2', resultado_id: 'res-giam-2' },
  },
};

describe('o placar da briga', () => {
  it('lê as vitórias que o servidor contou, e diz qual lado é meu', async () => {
    obterBatalha.mockResolvedValueOnce(BATALHA_COM_ROUNDS as never);

    const resposta = await criarDesafiosWeb().abrir('ABCDEFGHJK');

    expect(resposta.ok).toBe(true);
    if (!resposta.ok) return;
    expect(resposta.desafio.placar.lados).toEqual([
      { nome: 'Giam', vitorias: 0, ehMeu: false },
      { nome: 'Guinho', vitorias: 1, ehMeu: true },
    ]);
    expect(resposta.desafio.placar.rounds).toBe(2);
  });

  it('só o último round vai para a tela', async () => {
    // A briga tem três linhas; o round 2 tem uma. Mandar as três seria o
    // histórico rolável que o ARENA.md proíbe, nascendo por acidente.
    obterBatalha.mockResolvedValueOnce(BATALHA_COM_ROUNDS as never);

    const resposta = await criarDesafiosWeb().abrir('ABCDEFGHJK');

    expect(resposta.ok).toBe(true);
    if (!resposta.ok) return;
    expect(resposta.desafio.placar.ultimoRound.rodadas.map((r) => r.resultadoId)).toEqual([
      'res-giam-2',
    ]);
    expect(resposta.desafio.rodadas).toHaveLength(3);
  });

  it('o round aberto sabe de quem é, e carrega o arroto daquele round', async () => {
    obterBatalha.mockResolvedValueOnce(BATALHA_COM_ROUNDS as never);

    const resposta = await criarDesafiosWeb().abrir('ABCDEFGHJK');

    expect(resposta.ok).toBe(true);
    if (!resposta.ok) return;
    expect(resposta.desafio.placar.roundAberto?.deQuem).toBe('dele');
    // O arroto do round 2, não o do round 1.
    expect(resposta.desafio.placar.roundAberto?.rodada.audioId).toBe('audio/giam-2');
  });

  it('batalha sem placar não vira briga — é disputa presencial', async () => {
    obterBatalha.mockResolvedValueOnce({ ...BATALHA_COM_ROUNDS, placar: null } as never);

    const resposta = await criarDesafiosWeb().abrir('ABCDEFGHJK');

    expect(resposta).toEqual({ ok: false, motivo: 'naoExiste' });
  });
});

/**
 * O CAMINHO DO LINK. Quem abre o link e aperta "Aguenta essa" passa por aqui —
 * pela `responder_batalha`, não pela revanche. Foi o pedaço que ficou de fora
 * quando a revanche virou round: a RPC gravava sempre no round 1, e responder um
 * round aberto ou estourava no índice único ou enfiava uma terceira linha no
 * round 1, onde o arroto sumia do placar sem erro nenhum.
 */
describe('responder o round pelo link', () => {
  it('devolve a briga que o servidor montou, com o placar dela', async () => {
    responderBatalha.mockResolvedValueOnce(BATALHA_COM_ROUNDS as never);

    const resposta = await criarDesafiosWeb().responder({ ...PEDIDO, codigo: 'ABCDEFGHJK' });

    expect(resposta.ok).toBe(true);
    if (!resposta.ok) return;
    expect(resposta.desafio.placar.rounds).toBe(2);
    expect(resposta.desafio.placar.lados).toHaveLength(2);
  });

  it('round que já era meu não vira erro: volta o estado real da briga', async () => {
    // Duas abas abertas no VERSUS, ou toque duplo. O índice único do banco
    // segurou a linha nova — nada duplicou, e chamar isso de "falha na análise"
    // seria acusar de defeito uma proteção que funcionou.
    responderBatalha.mockRejectedValueOnce({
      code: '22023',
      message: 'Você já mandou este round. Falta o outro.',
    });
    obterBatalha.mockResolvedValueOnce(BATALHA_COM_ROUNDS as never);

    const resposta = await criarDesafiosWeb().responder({ ...PEDIDO, codigo: 'ABCDEFGHJK' });

    expect(resposta.ok).toBe(true);
  });

  it('briga que já tem dois donos recusa o terceiro, e a tela não inventa sucesso', async () => {
    responderBatalha.mockRejectedValueOnce({
      code: '42501',
      message: 'Esta briga já tem dois donos.',
    });

    const resposta = await criarDesafiosWeb().responder({ ...PEDIDO, codigo: 'ABCDEFGHJK' });

    expect(resposta.ok).toBe(false);
    if (resposta.ok) return;
    expect(resposta.motivo).toBe('falhou');
  });
});

describe('a revanche em rounds', () => {
  it('quem diz o que aconteceu é o servidor', async () => {
    chamarRpc.mockResolvedValueOnce({
      data: { ...BATALHA_COM_ROUNDS, o_que_aconteceu: 'abriuRound' },
      error: null,
    } as never);

    const resposta = await criarDesafiosWeb().revanchar({ ...PEDIDO, codigo: 'ABCDEFGHJK' });

    expect(resposta.ok).toBe(true);
    if (!resposta.ok) return;
    expect(resposta.oQueAconteceu).toBe('abriuRound');
  });

  it('round que já era meu não é erro: volta o estado real da briga', async () => {
    // Toque duplo, duas abas. O servidor recusou a linha nova — nada duplicou.
    chamarRpc.mockResolvedValueOnce({
      data: null,
      error: { code: '22023', message: 'Você já mandou este round. Falta o outro.' },
    } as never);
    obterBatalha.mockResolvedValueOnce(BATALHA_COM_ROUNDS as never);

    const resposta = await criarDesafiosWeb().revanchar({ ...PEDIDO, codigo: 'ABCDEFGHJK' });

    expect(resposta.ok).toBe(true);
    if (!resposta.ok) return;
    expect(resposta.oQueAconteceu).toBe('jaEraMeu');
  });

  it('o teto de rounds tem motivo próprio, não vira "falhou"', async () => {
    chamarRpc.mockResolvedValueOnce({
      data: null,
      error: { code: '54000', message: 'Esta briga chegou ao limite de rounds.' },
    } as never);

    const resposta = await criarDesafiosWeb().revanchar({ ...PEDIDO, codigo: 'ABCDEFGHJK' });

    expect(resposta).toEqual({ ok: false, motivo: 'limiteDeRounds' });
  });

  it('link vencido no meio da briga é reconhecido pelo código do erro', async () => {
    // O erro da RPC não é um `Error`: `String(erro)` vira "[object Object]", e
    // a busca por "expir" na mensagem nunca casava. O link vencido virava
    // "falhou" genérico.
    chamarRpc.mockResolvedValueOnce({
      data: null,
      error: { code: 'P0002', message: 'Esta batalha não está mais disponível.' },
    } as never);

    const resposta = await criarDesafiosWeb().revanchar({ ...PEDIDO, codigo: 'ABCDEFGHJK' });

    expect(resposta).toEqual({ ok: false, motivo: 'expirado' });
  });
});
