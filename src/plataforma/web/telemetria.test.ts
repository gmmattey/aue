// @vitest-environment jsdom
/**
 * O ADAPTADOR DE TELEMETRIA, e as garantias que ele existe para segurar:
 *
 * 1. nunca lança e nunca aparece para quem está jogando, mesmo quando o
 *    Supabase recusa a linha ou a rede cai;
 * 2. o payload que sai daqui não carrega nada além do que a migração
 *    `20260826000001` declara — sem nome, sem e-mail, sem áudio, sem texto
 *    digitado;
 * 3. evento fora da lista do v1 não vai para o servidor;
 * 4. o mesmo evento disparado duas vezes seguidas (rerender) vira um só.
 *
 * O mock de `insert` grava em `inserts` DE FORMA SÍNCRONA, antes de devolver a
 * promessa — é assim que o adaptador de verdade chama (dispara e não espera),
 * então não há por que esperar nenhum `waitFor`: se o evento foi mandado, ele
 * já está em `inserts` no instante em que `registrar` volta.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const inserts: Record<string, unknown>[] = [];
let resultadoDoInsert: { error: { message: string } | null } | 'lança' = { error: null };

const from = vi.fn(() => ({
  insert: vi.fn((linha: Record<string, unknown>) => {
    inserts.push(linha);
    if (resultadoDoInsert === 'lança') {
      return Promise.reject(new Error('sem rede'));
    }
    return Promise.resolve(resultadoDoInsert);
  }),
}));

vi.mock('../../db/supabase', () => ({
  supabase: { from: (...args: unknown[]) => from(...(args as [])) },
}));

const { criarTelemetriaWeb } = await import('./telemetria');

function montarArmazenamento() {
  const guardado: Record<string, string> = {};
  return {
    ler: (chave: string) => guardado[chave] ?? null,
    gravar: (chave: string, valor: string) => {
      guardado[chave] = valor;
      return true;
    },
    apagar: (chave: string) => {
      delete guardado[chave];
    },
  };
}

function irParaURL(url: string) {
  window.history.pushState({}, '', url);
}

beforeEach(() => {
  inserts.length = 0;
  resultadoDoInsert = { error: null };
  irParaURL('/');
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-08-26T12:00:00Z'));
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('registrar', () => {
  it('grava o evento com sessao_id, origem, plataforma — e nada de PII', () => {
    irParaURL('/?src=tiktok&campaign=duvido_bater_01&content=video_03');
    const telemetria = criarTelemetriaWeb(montarArmazenamento());

    telemetria.registrar('abriu_arena');

    expect(inserts).toHaveLength(1);
    const linha = inserts[0];
    expect(Object.keys(linha).sort()).toEqual(
      [
        'batalha_codigo',
        'campanha',
        'conteudo',
        'evento',
        'origem',
        'plataforma',
        'sessao_id',
        'versao_app',
      ].sort(),
    );
    expect(linha.evento).toBe('abriu_arena');
    expect(linha.origem).toBe('tiktok');
    expect(linha.campanha).toBe('duvido_bater_01');
    expect(linha.conteudo).toBe('video_03');
    expect(linha.plataforma).toBe('web');
    expect(typeof linha.sessao_id).toBe('string');

    /* Nenhuma chave lembra nome, e-mail, IP, áudio ou texto digitado. */
    const proibidas = ['nome', 'email', 'ip', 'audio', 'texto', 'user_agent', 'localizacao'];
    for (const proibida of proibidas) {
      expect(Object.keys(linha)).not.toContain(proibida);
    }
  });

  it('inclui batalha_codigo só quando o detalhe manda', () => {
    const telemetria = criarTelemetriaWeb(montarArmazenamento());

    telemetria.registrar('criou_x1', { batalhaCodigo: 'ABCDEFGHJK' });

    expect(inserts[0].batalha_codigo).toBe('ABCDEFGHJK');
  });

  it('sem detalhe, batalha_codigo vai null', () => {
    const telemetria = criarTelemetriaWeb(montarArmazenamento());
    telemetria.registrar('abriu_arena');
    expect(inserts[0].batalha_codigo).toBeNull();
  });

  it('cria e reaproveita sessao_id entre chamadas', () => {
    const telemetria = criarTelemetriaWeb(montarArmazenamento());

    telemetria.registrar('abriu_arena');
    const primeiraSessao = inserts[0].sessao_id;

    vi.advanceTimersByTime(60_000);
    telemetria.registrar('iniciou_arroto');

    expect(inserts).toHaveLength(2);
    expect(inserts[1].sessao_id).toBe(primeiraSessao);
  });

  it('não sobrescreve a origem original por navegação dentro do jogo', () => {
    irParaURL('/?src=instagram');
    const telemetria = criarTelemetriaWeb(montarArmazenamento());
    telemetria.registrar('abriu_arena');

    /* "navegou" para outra rota do próprio Auê, sem ?src= — e sem sessão nova. */
    irParaURL('/b/ABCDEFGHJK');
    vi.advanceTimersByTime(60_000);
    telemetria.registrar('abriu_x1', { batalhaCodigo: 'ABCDEFGHJK' });

    expect(inserts).toHaveLength(2);
    expect(inserts[1].origem).toBe('instagram');
  });

  it('sem parâmetro na URL, a origem é direct', () => {
    const telemetria = criarTelemetriaWeb(montarArmazenamento());
    telemetria.registrar('abriu_arena');

    expect(inserts[0].origem).toBe('direct');
  });

  it('evento fora da lista do v1 não é enviado', () => {
    const telemetria = criarTelemetriaWeb(montarArmazenamento());

    // @ts-expect-error propositalmente fora do tipo, simulando um bug de runtime.
    telemetria.registrar('evento_que_nao_existe');

    expect(inserts).toHaveLength(0);
  });

  it('o Supabase recusando a linha não lança', () => {
    resultadoDoInsert = { error: { message: 'violates check constraint' } };
    const telemetria = criarTelemetriaWeb(montarArmazenamento());

    expect(() => telemetria.registrar('abriu_arena')).not.toThrow();
    expect(inserts).toHaveLength(1);
  });

  it('falha de rede (promessa rejeitada) não lança', () => {
    resultadoDoInsert = 'lança';
    const telemetria = criarTelemetriaWeb(montarArmazenamento());

    expect(() => telemetria.registrar('abriu_arena')).not.toThrow();
    expect(inserts).toHaveLength(1);
  });

  it('nunca devolve promessa: quem chama não tem como esperar por ela', () => {
    const telemetria = criarTelemetriaWeb(montarArmazenamento());
    const retorno = telemetria.registrar('abriu_arena');
    expect(retorno).toBeUndefined();
  });

  it('o mesmo evento disparado duas vezes seguidas (rerender) vira um só', () => {
    const telemetria = criarTelemetriaWeb(montarArmazenamento());

    telemetria.registrar('recebeu_nota');
    telemetria.registrar('recebeu_nota');
    telemetria.registrar('recebeu_nota');

    expect(inserts).toHaveLength(1);
  });

  it('o mesmo evento com detalhe diferente NÃO é deduplicado', () => {
    const telemetria = criarTelemetriaWeb(montarArmazenamento());

    telemetria.registrar('criou_x1', { batalhaCodigo: 'AAAAAAAAAA' });
    telemetria.registrar('criou_x1', { batalhaCodigo: 'BBBBBBBBBB' });

    expect(inserts).toHaveLength(2);
  });

  it('passada a janela de deduplicação, o evento repetido volta a contar', () => {
    const telemetria = criarTelemetriaWeb(montarArmazenamento());

    telemetria.registrar('recebeu_nota');
    vi.advanceTimersByTime(2000);
    telemetria.registrar('recebeu_nota');

    expect(inserts).toHaveLength(2);
  });

  describe('abriu_arena — uma vez por sessão', () => {
    it('a segunda vez na mesma sessão não é enviada', () => {
      const telemetria = criarTelemetriaWeb(montarArmazenamento());

      telemetria.registrar('abriu_arena');
      /* Fora da janela de deduplicação — mas ainda dentro da sessão de 30min. */
      vi.advanceTimersByTime(60_000);
      telemetria.registrar('abriu_arena');

      expect(inserts).toHaveLength(1);
    });

    it('numa sessão nova, abriu_arena volta a contar', () => {
      const telemetria = criarTelemetriaWeb(montarArmazenamento());

      telemetria.registrar('abriu_arena');
      vi.advanceTimersByTime(31 * 60 * 1000);
      telemetria.registrar('abriu_arena');

      expect(inserts).toHaveLength(2);
    });
  });
});
