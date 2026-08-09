// @vitest-environment jsdom
/**
 * A Arena, com aparelho de mentira e regra de verdade.
 *
 * O que este arquivo existe para impedir de voltar:
 *
 * 1. **pedir microfone ao abrir.** É a coisa que mais faz gente fechar um site
 *    de jogo. O microfone é pedido depois do toque, e o teste prova isso.
 * 2. **microfone vazando.** Os TRÊS gatilhos de saída — o toque em PARAR, o
 *    teto de tempo e a tela sumindo — têm teste próprio provando que não
 *    sobrou nada vivo. Um teste só no caminho feliz não vale: o caminho feliz
 *    é justamente o que todo mundo testa à mão.
 * 3. **a Arena se mexendo enquanto a caixinha de permissão está aberta.**
 * 4. **silêncio virando nota.**
 * 5. **quebrar quando o navegador bloqueia armazenamento.**
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

import { CHAVES } from '../portas/armazenamento';
import type { AudioCapturado, FalhaAoParar, PedidoDeMicrofone } from '../portas/captura';
import type { NotaDoJuiz, Veredito } from '../portas/juiz';
import type { ResultadoDoDesafio } from '../portas/desafios';
import { ALVOS_DE_ORIGEM } from '../nucleo/origem/origens';
import { COMENTARIOS_DE_VOLTA, COMENTARIOS_PRIMEIRA_VEZ } from '../nucleo/fala/idle';
import { TETO_DE_GRAVACAO_MS } from '../nucleo/gravacao/regras';
import { PISO_DO_TEATRO_MS, TETO_DA_ANALISE_MS } from '../nucleo/julgamento/tempo';
import { Arena } from './Arena';
import type { AdaptadoresDaArena } from './adaptadores';

afterEach(cleanup);

interface Opcoes {
  resposta?: PedidoDeMicrofone;
  guardado?: Record<string, string>;
  /** O que a gravação devolve ao parar. Por padrão, um arroto audível. */
  aoParar?: AudioCapturado | FalhaAoParar;
  /** `false` faz o gravador falhar ao nascer. */
  gravadorLiga?: boolean;
  /** O que o juiz devolve. Por padrão, uma nota boa. */
  veredito?: Veredito;
  /** Quanto o juiz demora, em tempo de relógio falso. */
  juizDemoraMs?: number;
  /** O que o servidor responde ao criar o desafio. */
  respostaDoDesafio?: ResultadoDoDesafio;
  /** `false` faz a cópia falhar, como num navegador que recusa. */
  copiaFunciona?: boolean;
}

const DESAFIO = {
  codigo: 'ABCDEFGHJK',
  link: 'https://aue.vercel.app/b/ABCDEFGHJK',
  /* De propósito diferente da prévia: quem manda é o servidor. */
  notaOficial: 90.7,
  expiraEm: '2026-08-16T12:00:00Z',
};

const NOTA: NotaDoJuiz = {
  nota: 91.4,
  classificacao: 'Monstro do Esgoto',
  frase: 'Isso foi nojento. Parabéns.',
  medidas: { grave: 92, estouro: 88, folego: 76, sujeira: 84 },
};

const ARROTO: AudioCapturado = {
  dados: new Blob(['arroto']),
  formato: 'audio/mp4',
  duracaoMs: 2200,
  resumo: { rms: 0.12, pico: 0.4 },
};

const MUDO: AudioCapturado = {
  dados: new Blob([]),
  formato: 'audio/mp4',
  duracaoMs: 2200,
  resumo: { rms: 0.0004, pico: 0.001 },
};

/** Um aparelho de mentira, com os fios à mostra para o teste puxar. */
function montarDubles(opcoes: Opcoes = {}) {
  const guardado: Record<string, string> = { ...opcoes.guardado };
  const escondedores: Array<() => void> = [];
  let relogio = 1_000_000;

  const captura = {
    vivo: false,
    gravando: false,
    pedidos: 0,
    solturas: 0,
    paradas: 0,
    async pedir(): Promise<PedidoDeMicrofone> {
      captura.pedidos += 1;
      const resposta = opcoes.resposta ?? { ok: true as const };
      captura.vivo = resposta.ok;
      return resposta;
    },
    comecar() {
      if (opcoes.gravadorLiga === false) return false;
      captura.gravando = true;
      return true;
    },
    async parar(): Promise<AudioCapturado | FalhaAoParar> {
      captura.paradas += 1;
      captura.gravando = false;
      captura.vivo = false;
      return opcoes.aoParar ?? ARROTO;
    },
    nivelAtual: () => 0.5,
    soltar() {
      captura.solturas += 1;
      captura.vivo = false;
      captura.gravando = false;
    },
    estaVivo: () => captura.vivo,
    estaGravando: () => captura.gravando,
  };

  const juiz = {
    chamadas: 0,
    ultimaOrigem: '' as string,
    async julgar(_audio: AudioCapturado, origem: string): Promise<Veredito> {
      juiz.chamadas += 1;
      juiz.ultimaOrigem = origem;
      if (opcoes.juizDemoraMs) {
        await new Promise((r) => setTimeout(r, opcoes.juizDemoraMs));
      }
      return opcoes.veredito ?? { ok: true, nota: NOTA };
    },
  };

  const desafios = {
    chamadas: 0,
    ultimoPedido: null as unknown,
    async criar(pedido: unknown): Promise<ResultadoDoDesafio> {
      desafios.chamadas += 1;
      desafios.ultimoPedido = pedido;
      /* Demora de propósito: é onde o toque duplo acontece de verdade. */
      await new Promise((r) => setTimeout(r, 30));
      return opcoes.respostaDoDesafio ?? { ok: true, desafio: DESAFIO };
    },
  };

  const compartilhamento = {
    compartilhados: [] as string[],
    copiados: [] as string[],
    async compartilhar(pedido: { url?: string | null }) {
      compartilhamento.compartilhados.push(pedido.url ?? '');
      return { ok: true as const, via: 'texto' as const };
    },
    async copiar(texto: string) {
      compartilhamento.copiados.push(texto);
      return opcoes.copiaFunciona !== false;
    },
  };

  const adaptadores: AdaptadoresDaArena = {
    captura,
    juiz,
    desafios,
    compartilhamento,
    armazenamento: {
      ler: (chave) => guardado[chave] ?? null,
      gravar: (chave, valor) => {
        guardado[chave] = valor;
        return true;
      },
      apagar: (chave) => {
        delete guardado[chave];
      },
    },
    cicloDeVida: {
      aoEsconder: (ouvinte) => escondedores.push(ouvinte),
      aoVoltar: () => {},
      parar: () => {
        escondedores.length = 0;
      },
    },
  };

  return {
    adaptadores,
    captura,
    juiz,
    desafios,
    compartilhamento,
    guardado,
    esconderATela: () => escondedores.forEach((f) => f()),
    agora: () => relogio,
    avancarRelogio: (ms: number) => {
      relogio += ms;
    },
  };
}

/** Abre a Arena e vai até estar gravando. */
async function ateGravar(dubles: ReturnType<typeof montarDubles>) {
  render(<Arena adaptadores={dubles.adaptadores} agora={dubles.agora} />);
  fireEvent.click(screen.getByRole('button', { name: 'Arrotar' }));
  return screen.findByRole('button', { name: 'Parar' });
}

describe('a Arena no IDLE', () => {
  it('abre chamando pra arrotar, com uma ação só', () => {
    const { adaptadores } = montarDubles();
    render(<Arena adaptadores={adaptadores} />);

    expect(screen.getByRole('button', { name: 'Arrotar' })).toBeDefined();
    expect(screen.getByRole('img', { name: 'Bolha Auê' })).toBeDefined();
    // Uma ação por estado. Botão sobrando é a Arena virando tela de menu.
    expect(screen.getAllByRole('button')).toHaveLength(1);
  });

  it('não pede o microfone ao abrir', () => {
    const { adaptadores, captura } = montarDubles();
    render(<Arena adaptadores={adaptadores} />);
    expect(captura.pedidos).toBe(0);
  });

  it('quem nunca jogou e quem já jogou ouvem coisas diferentes', () => {
    const primeiraVez = montarDubles();
    const { unmount } = render(<Arena adaptadores={primeiraVez.adaptadores} />);
    expect(
      screen.getByText((texto) => (COMENTARIOS_PRIMEIRA_VEZ as readonly string[]).includes(texto)),
    ).toBeDefined();
    unmount();

    const veterano = montarDubles({ guardado: { [CHAVES.jaJogou]: '1' } });
    render(<Arena adaptadores={veterano.adaptadores} />);
    expect(
      screen.getByText((texto) => (COMENTARIOS_DE_VOLTA as readonly string[]).includes(texto)),
    ).toBeDefined();
  });

  it('o toque pede o microfone e a Arena não se mexe enquanto isso', async () => {
    let liberar: (resposta: PedidoDeMicrofone) => void = () => {};
    const dubles = montarDubles();
    dubles.captura.pedir = () =>
      new Promise<PedidoDeMicrofone>((resolve) => {
        dubles.captura.pedidos += 1;
        liberar = resolve;
      });

    render(<Arena adaptadores={dubles.adaptadores} />);
    fireEvent.click(screen.getByRole('button', { name: 'Arrotar' }));

    // A caixinha do sistema está aberta: a chamada continua no lugar e o
    // gatilho também. Nada de montar a cena de gravação antes de ter microfone.
    expect(dubles.captura.pedidos).toBe(1);
    expect(screen.getByRole('button', { name: 'Arrotar' })).toBeDefined();

    await act(async () => liberar({ ok: true }));
    expect(screen.getByRole('button', { name: 'Parar' })).toBeDefined();
  });

  it('negou o microfone: erro honesto, com saída', async () => {
    const { adaptadores } = montarDubles({ resposta: { ok: false, motivo: 'negado' } });
    render(<Arena adaptadores={adaptadores} />);

    fireEvent.click(screen.getByRole('button', { name: 'Arrotar' }));

    const voltar = await screen.findByRole('button', { name: 'Tentar de novo' });
    expect(screen.getByText('Sem microfone não tem jogo.')).toBeDefined();

    fireEvent.click(voltar);
    expect(screen.getByRole('button', { name: 'Arrotar' })).toBeDefined();
  });

  it('gravador que não liga vira erro que não culpa a pessoa', async () => {
    const dubles = montarDubles({ gravadorLiga: false });
    render(<Arena adaptadores={dubles.adaptadores} />);

    fireEvent.click(screen.getByRole('button', { name: 'Arrotar' }));

    expect(await screen.findByText('Deu ruim aqui dentro.')).toBeDefined();
    // E o microfone que já tinha sido liberado não fica vivo por causa disso.
    expect(dubles.captura.estaVivo()).toBe(false);
  });

  it('navegador bloqueando armazenamento não derruba a Arena', () => {
    const { adaptadores } = montarDubles();
    const bloqueado: AdaptadoresDaArena = {
      ...adaptadores,
      armazenamento: { ler: () => null, gravar: () => false, apagar: () => {} },
    };

    expect(() => render(<Arena adaptadores={bloqueado} />)).not.toThrow();
    expect(screen.getByRole('button', { name: 'Arrotar' })).toBeDefined();
  });
});

describe('a Arena gravando', () => {
  it('mostra o cronômetro, esconde o topo e deixa uma ação só', async () => {
    const dubles = montarDubles();
    await ateGravar(dubles);

    expect(screen.getByText('0,0s')).toBeDefined();
    expect(document.querySelector('.arena')?.getAttribute('data-hud')).toBe('off');
    expect(screen.getAllByRole('button')).toHaveLength(1);
    // A Bolha muda de modo — é ela que diz que o jogo está ouvindo.
    expect(document.querySelector('.bolha-wrap')?.getAttribute('data-modo')).toBe('gravando');
  });

  it('o cronômetro anda pelo relógio', async () => {
    const dubles = montarDubles();
    await ateGravar(dubles);

    await act(async () => {
      dubles.avancarRelogio(3400);
      await new Promise((r) => setTimeout(r, 120));
    });

    expect(screen.getByText('3,4s')).toBeDefined();
  });

  it('avisa quando o tempo está acabando', async () => {
    const dubles = montarDubles();
    await ateGravar(dubles);

    await act(async () => {
      dubles.avancarRelogio(8200);
      await new Promise((r) => setTimeout(r, 120));
    });

    expect(screen.getByText('Tá acabando.')).toBeDefined();
  });

  it('marca que a pessoa já jogou', async () => {
    const dubles = montarDubles();
    await ateGravar(dubles);
    expect(dubles.guardado[CHAVES.jaJogou]).toBe('1');
  });
});

describe('os três gatilhos de saída', () => {
  it('1 — o toque em PARAR encerra e não deixa nada vivo', async () => {
    const dubles = montarDubles();
    const parar = await ateGravar(dubles);

    fireEvent.click(parar);

    await waitFor(() => expect(dubles.captura.paradas).toBe(1));
    expect(dubles.captura.estaVivo()).toBe(false);
    expect(dubles.captura.estaGravando()).toBe(false);
  });

  it('2 — o teto para sozinho e não deixa nada vivo', async () => {
    const dubles = montarDubles();
    await ateGravar(dubles);

    await act(async () => {
      dubles.avancarRelogio(TETO_DE_GRAVACAO_MS);
      await new Promise((r) => setTimeout(r, 150));
    });

    expect(dubles.captura.paradas).toBe(1);
    expect(dubles.captura.estaVivo()).toBe(false);
    expect(dubles.captura.estaGravando()).toBe(false);
  });

  it('3 — a tela sumindo encerra, solta tudo e volta pro IDLE', async () => {
    const dubles = montarDubles();
    await ateGravar(dubles);

    await act(async () => dubles.esconderATela());

    // Não é ERROR: nada quebrou, a pessoa só saiu (ARENA.md, RECORDING).
    expect(screen.getByRole('button', { name: 'Arrotar' })).toBeDefined();
    expect(dubles.captura.estaVivo()).toBe(false);
    expect(dubles.captura.estaGravando()).toBe(false);
  });

  it('PARAR duas vezes seguidas só encerra uma vez', async () => {
    // Acontece de verdade: a pessoa toca em PARAR no décimo segundo exato e o
    // teto dispara junto. Sem trava, a segunda parada viraria um erro que não
    // aconteceu.
    const dubles = montarDubles();
    const parar = await ateGravar(dubles);

    fireEvent.click(parar);
    fireEvent.click(parar);

    await waitFor(() => expect(dubles.captura.paradas).toBe(1));
  });

  it('desmontar no meio da gravação solta o microfone', async () => {
    const dubles = montarDubles();
    render(<Arena adaptadores={dubles.adaptadores} agora={dubles.agora} />);
    fireEvent.click(screen.getByRole('button', { name: 'Arrotar' }));
    await screen.findByRole('button', { name: 'Parar' });

    cleanup();

    expect(dubles.captura.estaVivo()).toBe(false);
  });
});

describe('a conferida da saída', () => {
  it('com som, o jogo pergunta de onde veio', async () => {
    const dubles = montarDubles({ aoParar: ARROTO });
    const parar = await ateGravar(dubles);

    fireEvent.click(parar);

    expect(await screen.findByRole('button', { name: /Cerveja/ })).toBeDefined();
  });

  it('sem som, o jogo fala na lata em vez de dar nota', async () => {
    const dubles = montarDubles({ aoParar: MUDO });
    const parar = await ateGravar(dubles);

    fireEvent.click(parar);

    expect(await screen.findByText('Não veio nada.')).toBeDefined();
    expect(screen.getByRole('button', { name: 'Tentar de novo' })).toBeDefined();
  });

  it('gravador que quebra ao parar não vira "sem som"', async () => {
    // Culpar o microfone da pessoa por um defeito do jogo é mentira, e mentira
    // barata: ela vai tentar de novo achando que arrotou errado.
    const dubles = montarDubles({ aoParar: { motivo: 'quebrou', detalhe: 'morreu' } });
    const parar = await ateGravar(dubles);

    fireEvent.click(parar);

    expect(await screen.findByText('Deu ruim aqui dentro.')).toBeDefined();
  });
});

/*
  O que este arquivo NÃO prova, e por isso o pronto da #87 exige celular de
  verdade: safe area, `svh`, a barra do navegador recolhendo, a caixinha de
  permissão do sistema, o gravador de verdade escolhendo o formato e o que o
  iOS faz com a saída de som quando há captura ativa. Nada disso existe em
  jsdom.
*/

/** Vai do IDLE até a pergunta da origem. */
async function ateAOrigem(dubles: ReturnType<typeof montarDubles>) {
  const parar = await ateGravar(dubles);
  fireEvent.click(parar);
  return screen.findByRole('button', { name: /Cerveja/ });
}

/** Vai até a nota na tela, atravessando o teatro do julgamento. */
async function ateANota(dubles: ReturnType<typeof montarDubles>, alvo = /Cerveja/) {
  const primeiro = await ateAOrigem(dubles);
  void primeiro;
  vi.useFakeTimers();
  fireEvent.click(screen.getByRole('button', { name: alvo }));
  /*
    Avança além de TRÊS relógios que correm em sequência: o teto da análise, o
    piso do teatro e a contagem da nota (com a rede de segurança dela).

    Parar no meio de qualquer um deixaria a Arena esperando um tempo que o
    teste nunca deu — e trocar para timers reais no meio joga fora os timers
    pendentes, então o relógio falso tem que cobrir o caminho inteiro.
  */
  await act(async () => {
    await vi.advanceTimersByTimeAsync(TETO_DA_ANALISE_MS + PISO_DO_TEATRO_MS + 200);
  });
  /*
    Segundo avanço, depois de a nota já estar montada: a contagem e a rede de
    segurança dela só nascem quando o RESULT entra na tela, e um avanço só —
    feito antes de elas existirem — não as alcança.
  */
  await act(async () => {
    await vi.advanceTimersByTimeAsync(2000);
  });
  vi.useRealTimers();
}

describe('a origem', () => {
  it('oferece os seis alvos e nenhum botão principal', async () => {
    const dubles = montarDubles({ aoParar: ARROTO });
    await ateAOrigem(dubles);

    for (const alvo of ALVOS_DE_ORIGEM) {
      expect(screen.getByRole('button', { name: new RegExp(alvo.rotulo) })).toBeDefined();
    }
    // A escolha É a ação: seis alvos e mais nada.
    expect(screen.getAllByRole('button')).toHaveLength(ALVOS_DE_ORIGEM.length);
  });

  it('um toque resolve, sem confirmação', async () => {
    const dubles = montarDubles({ aoParar: ARROTO });
    await ateAOrigem(dubles);

    fireEvent.click(screen.getByRole('button', { name: /Comida/ }));

    await waitFor(() => expect(dubles.juiz.chamadas).toBe(1));
    expect(dubles.juiz.ultimaOrigem).toBe('Comida');
  });

  it('cerveja e refri viram a mesma origem na conta', async () => {
    const dubles = montarDubles({ aoParar: ARROTO });
    await ateAOrigem(dubles);
    fireEvent.click(screen.getByRole('button', { name: /Refri/ }));
    await waitFor(() => expect(dubles.juiz.ultimaOrigem).toBe('Bebida'));
  });
});

describe('o julgamento', () => {
  it('esconde o topo e não deixa nada pra fazer', async () => {
    const dubles = montarDubles({ aoParar: ARROTO, juizDemoraMs: 50 });
    await ateAOrigem(dubles);

    fireEvent.click(screen.getByRole('button', { name: /Cerveja/ }));

    await waitFor(() => {
      expect(document.querySelector('.arena')?.getAttribute('data-estado')).toBe('JUDGING');
    });
    expect(document.querySelector('.arena')?.getAttribute('data-hud')).toBe('off');
    // Nenhum CTA — não há o que fazer aqui (ARENA.md, JUDGING).
    expect(screen.queryAllByRole('button')).toHaveLength(0);
  });

  it('segura a cena o tempo do piso, mesmo com análise instantânea', async () => {
    const dubles = montarDubles({ aoParar: ARROTO });
    await ateAOrigem(dubles);

    vi.useFakeTimers();
    fireEvent.click(screen.getByRole('button', { name: /Cerveja/ }));

    // Análise instantânea: sem o piso, a nota apareceria por cima da piada.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(200);
    });
    expect(document.querySelector('.arena')?.getAttribute('data-estado')).toBe('JUDGING');

    await act(async () => {
      await vi.advanceTimersByTimeAsync(PISO_DO_TEATRO_MS);
    });
    expect(document.querySelector('.arena')?.getAttribute('data-estado')).toBe('RESULT');
    vi.useRealTimers();
  });

  it('análise que nunca volta vira erro com saída, e não espera infinita', async () => {
    const dubles = montarDubles({ aoParar: ARROTO, juizDemoraMs: 60_000 });
    await ateANota(dubles);

    expect(screen.getByText('Deu ruim aqui dentro.')).toBeDefined();
    expect(screen.getByRole('button', { name: 'Tentar de novo' })).toBeDefined();
  });

  it('motor que recusa o áudio não vira nota', async () => {
    const dubles = montarDubles({ aoParar: ARROTO, veredito: { ok: false, motivo: 'semAudio' } });
    await ateANota(dubles);

    expect(document.querySelector('.arena')?.getAttribute('data-estado')).toBe('ERROR');
    expect(document.querySelector('.nota')).toBeNull();
  });
});

describe('a nota', () => {
  it('mostra o número, a zoeira do juiz e as quatro medidas', async () => {
    const dubles = montarDubles({ aoParar: ARROTO });
    await ateANota(dubles);

    expect(document.querySelector('.nota')?.textContent).toContain('91,4');
    // A classificação em cima, a zoeira embaixo — como no protótipo.
    expect(screen.getByText(NOTA.classificacao)).toBeDefined();
    expect(screen.getByText(NOTA.frase)).toBeDefined();

    // As medidas entram quando a contagem termina, e a contagem roda no laço
    // de animação — daí a espera de verdade em vez de leitura seca.
    for (const nome of ['Grave', 'Estouro', 'Fôlego', 'Sujeira']) {
      expect(await screen.findByText(nome)).toBeDefined();
    }
  });

  it('as medidas só aparecem depois do número', async () => {
    const dubles = montarDubles({ aoParar: ARROTO, juizDemoraMs: 10 });
    await ateAOrigem(dubles);

    vi.useFakeTimers();
    fireEvent.click(screen.getByRole('button', { name: /Cerveja/ }));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(PISO_DO_TEATRO_MS + 50);
    });

    // Acabou de entrar no RESULT: a contagem ainda não terminou, porque o laço
    // de animação não roda sob timers falsos. Medida antes do número é
    // entregar o detalhe antes do resultado.
    expect(document.querySelector('.nota')).toBeDefined();
    expect(screen.queryByText('Grave')).toBeNull();
    vi.useRealTimers();
  });

  it('"vou mandar outro" volta direto a gravar', async () => {
    const dubles = montarDubles({ aoParar: ARROTO });
    await ateANota(dubles);

    fireEvent.click(screen.getByRole('button', { name: 'Vou mandar outro!' }));

    expect(await screen.findByRole('button', { name: 'Parar' })).toBeDefined();
    expect(dubles.captura.pedidos).toBe(2);
  });

  it('microfone revogado entre um arroto e outro tem saída honesta', async () => {
    const dubles = montarDubles({ aoParar: ARROTO });
    await ateANota(dubles);

    // A pessoa tirou a permissão nas configurações enquanto jogava.
    dubles.captura.pedir = async () => ({ ok: false, motivo: 'negado' });

    fireEvent.click(screen.getByRole('button', { name: 'Vou mandar outro!' }));

    expect(await screen.findByText('Sem microfone não tem jogo.')).toBeDefined();
  });

  it('nada do arroto é guardado no aparelho', async () => {
    const dubles = montarDubles({ aoParar: ARROTO });
    await ateANota(dubles);

    // Só a marca de "já jogou" pode existir. Áudio e nota, nunca.
    expect(Object.keys(dubles.guardado)).toEqual([CHAVES.jaJogou]);
    expect(JSON.stringify(dubles.guardado)).not.toContain('91');
  });
});

/** Vai da nota até o desafio criado. */
async function ateODesafio(dubles: ReturnType<typeof montarDubles>, nome = 'Guinho') {
  await ateANota(dubles);
  fireEvent.click(screen.getByRole('button', { name: 'Chamar pro X1' }));
  fireEvent.change(screen.getByLabelText('Teu apelido'), { target: { value: nome } });
  fireEvent.click(screen.getByRole('button', { name: 'Tá bom, manda' }));
}

describe('chamar pro X1', () => {
  it('é a ação principal do resultado, com o "mandar outro" discreto', async () => {
    const dubles = montarDubles({ aoParar: ARROTO });
    await ateANota(dubles);

    expect(screen.getByRole('button', { name: 'Chamar pro X1' })).toBeDefined();
    expect(screen.getByRole('button', { name: 'Vou mandar outro!' })).toBeDefined();
  });

  it('cobra o nome numa sobreposição, com a Arena inteira atrás', async () => {
    const dubles = montarDubles({ aoParar: ARROTO });
    await ateANota(dubles);

    fireEvent.click(screen.getByRole('button', { name: 'Chamar pro X1' }));

    expect(screen.getByRole('dialog')).toBeDefined();
    // Sobreposição, não estado: a Arena continua no RESULT, com a nota no lugar.
    expect(document.querySelector('.arena')?.getAttribute('data-estado')).toBe('RESULT');
    expect(document.querySelector('.nota')).not.toBeNull();
  });

  it('fechar a sobreposição devolve o resultado intacto', async () => {
    const dubles = montarDubles({ aoParar: ARROTO });
    await ateANota(dubles);

    fireEvent.click(screen.getByRole('button', { name: 'Chamar pro X1' }));
    fireEvent.click(screen.getByRole('button', { name: 'Agora não' }));

    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.getByRole('button', { name: 'Chamar pro X1' })).toBeDefined();
  });

  it('o nome e a origem chegam no servidor', async () => {
    const dubles = montarDubles({ aoParar: ARROTO });
    await ateODesafio(dubles, 'Marcelinho');

    await waitFor(() => expect(dubles.desafios.chamadas).toBe(1));
    expect(dubles.desafios.ultimoPedido).toMatchObject({
      nome: 'Marcelinho',
      origem: 'Bebida',
    });
  });

  it('toque duplo não cria duas batalhas', async () => {
    // Duas mensagens no grupo, e a segunda ninguém responde.
    const dubles = montarDubles({ aoParar: ARROTO });
    await ateANota(dubles);

    fireEvent.click(screen.getByRole('button', { name: 'Chamar pro X1' }));
    const confirmar = screen.getByRole('button', { name: 'Tá bom, manda' });
    fireEvent.click(confirmar);
    fireEvent.click(confirmar);

    await waitFor(() => {
      expect(document.querySelector('.arena')?.getAttribute('data-estado')).toBe('CHALLENGE');
    });
    expect(dubles.desafios.chamadas).toBe(1);
  });
});

describe('o desafio na mesa', () => {
  it('mostra o link, o player do próprio arroto e o aviso de espera', async () => {
    const dubles = montarDubles({ aoParar: ARROTO });
    await ateODesafio(dubles);

    expect(await screen.findByText(DESAFIO.link)).toBeDefined();
    expect(document.querySelector('.player-audio')).not.toBeNull();
    expect(screen.getByText('Teu desafio tá de pé, esperando alguém aceitar.')).toBeDefined();
  });

  it('o número na tela é o do SERVIDOR, não a prévia', async () => {
    const dubles = montarDubles({ aoParar: ARROTO });
    await ateODesafio(dubles);

    await waitFor(() => {
      // A prévia era 91,4. O que vai no link é 90,7.
      expect(document.querySelector('.nota')?.textContent).toContain('90,7');
    });
  });

  it('o prazo vem do banco, e não de um número escrito no código', async () => {
    const dubles = montarDubles({
      aoParar: ARROTO,
      respostaDoDesafio: { ok: true, desafio: { ...DESAFIO, expiraEm: '' } },
    });
    await ateODesafio(dubles);

    // Sem data legível não existe número honesto para dizer — e "7 dias" seria
    // exatamente o chute que a gente não quer.
    expect(
      await screen.findByText('Ele para de funcionar sozinho quando o prazo vencer.'),
    ).toBeDefined();
  });

  it('copiar copia o link', async () => {
    const dubles = montarDubles({ aoParar: ARROTO });
    await ateODesafio(dubles);

    fireEvent.click(await screen.findByRole('button', { name: 'Copiar' }));

    await waitFor(() => expect(dubles.compartilhamento.copiados).toEqual([DESAFIO.link]));
    expect(await screen.findByRole('button', { name: 'Copiado!' })).toBeDefined();
  });

  it('navegador que não deixa copiar não recebe um "copiado!" mentiroso', async () => {
    const dubles = montarDubles({ aoParar: ARROTO, copiaFunciona: false });
    await ateODesafio(dubles);

    fireEvent.click(await screen.findByRole('button', { name: 'Copiar' }));

    expect(
      await screen.findByText('O navegador não deixou copiar. Segura no link e copia na mão.'),
    ).toBeDefined();
  });

  it('mandar o desafio manda o link', async () => {
    const dubles = montarDubles({ aoParar: ARROTO });
    await ateODesafio(dubles);

    fireEvent.click(await screen.findByRole('button', { name: 'Mandar o desafio' }));

    await waitFor(() => expect(dubles.compartilhamento.compartilhados).toEqual([DESAFIO.link]));
  });

  it('"deixa pra lá" volta pro começo', async () => {
    const dubles = montarDubles({ aoParar: ARROTO });
    await ateODesafio(dubles);

    fireEvent.click(await screen.findByRole('button', { name: 'Deixa pra lá' }));

    expect(screen.getByRole('button', { name: 'Arrotar' })).toBeDefined();
  });

  it('o código não aparece no título da página', async () => {
    const dubles = montarDubles({ aoParar: ARROTO });
    await ateODesafio(dubles);
    expect(document.title).not.toContain(DESAFIO.codigo);
  });
});

describe('quando o desafio não sai', () => {
  it('sem rede, erro honesto e nenhum desafio', async () => {
    const dubles = montarDubles({
      aoParar: ARROTO,
      respostaDoDesafio: { ok: false, motivo: 'semRede' },
    });
    await ateODesafio(dubles);

    expect(await screen.findByText('Sem sinal, sem briga.')).toBeDefined();
    expect(screen.getByRole('button', { name: 'Tentar de novo' })).toBeDefined();
    expect(document.querySelector('.link-endereco')).toBeNull();
  });

  it('app publicado sem chave cai no mesmo caso honesto', async () => {
    const dubles = montarDubles({
      aoParar: ARROTO,
      respostaDoDesafio: { ok: false, motivo: 'semConfiguracao' },
    });
    await ateODesafio(dubles);

    expect(await screen.findByText('Sem sinal, sem briga.')).toBeDefined();
  });
});
