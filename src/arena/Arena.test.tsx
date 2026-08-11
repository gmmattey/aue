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
import type { Nota, ResultadoDaPontuacao } from '../portas/pontuacao';
import type {
  PedidoDeCompartilhamento,
  ResultadoDoCompartilhamento,
} from '../portas/compartilhamento';
import type {
  AberturaDoDesafio,
  DesafioAberto,
  ResultadoDaRevanche,
  ResultadoDoDesafio,
} from '../portas/desafios';
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
  veredito?: ResultadoDaPontuacao;
  /** Quanto a conta da nota demora, em tempo de relógio falso. */
  juizDemoraMs?: number;
  /** `false` faz o detector recusar: veio som, mas não era arroto. */
  ehArroto?: boolean;
  /** O que o servidor responde ao criar o desafio. */
  respostaDoDesafio?: ResultadoDoDesafio;
  /** `false` faz a cópia falhar, como num navegador que recusa. */
  copiaFunciona?: boolean;
  /** O que a folha de compartilhamento devolve. Por padrão, mandou. */
  resultadoDoCompartilhar?: ResultadoDoCompartilhamento;
  /** O que o servidor responde ao abrir um link. */
  abertura?: AberturaDoDesafio;
  /** O que o servidor responde ao mandar a resposta. */
  respostaEnviada?: AberturaDoDesafio;
  /** `null` simula endereço de áudio que não dá para assinar. */
  enderecoDoAudio?: string | null;
  /** O que o servidor responde ao apagar. */
  aoApagar?: 'apagado' | 'naoDeu';
  /** O que o servidor responde à revanche. */
  aoRevanchar?: ResultadoDaRevanche;
}

/*
  OS IDS DE RODADA E DE RESULTADO SÃO DIFERENTES DE PROPÓSITO.

  Enquanto eles eram iguais nos dublês, um defeito real ficou escondido: o
  código comparava o líder com o id da RODADA e o servidor manda o id do
  RESULTADO. Com ids iguais, o teste passava e o jogo nunca pintaria ninguém de
  ouro.
*/
const DISPUTA: DesafioAberto = {
  codigo: 'ABCDEFGHJK',
  link: 'https://aue.vercel.app/b/ABCDEFGHJK',
  expiraEm: '2099-01-01T00:00:00Z',
  rodadas: [{ id: 'r1', nome: 'Giam', nota: 80.5, audioId: 'audio-do-giam', motivoSemAudio: null, ehMeu: false, resultadoId: 'res-giam' }],
  lider: { nome: 'Giam', nota: 80.5, resultadoId: 'res-giam' },
};

const DISPUTA_FECHADA: DesafioAberto = {
  ...DISPUTA,
  rodadas: [
    { id: 'r1', nome: 'Giam', nota: 80.5, audioId: 'audio-do-giam', motivoSemAudio: null, ehMeu: false, resultadoId: 'res-giam' },
    { id: 'r2', nome: 'Guinho', nota: 91.4, audioId: 'audio-do-guinho', motivoSemAudio: null, ehMeu: true, resultadoId: 'res-guinho' },
  ],
  lider: { nome: 'Guinho', nota: 91.4, resultadoId: 'res-guinho' },
};

const EMPATE: DesafioAberto = {
  ...DISPUTA_FECHADA,
  rodadas: [
    { id: 'r1', nome: 'Giam', nota: 80.5, audioId: 'audio-do-giam', motivoSemAudio: null, ehMeu: false, resultadoId: 'res-giam' },
    { id: 'r2', nome: 'Guinho', nota: 80.5, audioId: 'audio-do-guinho', motivoSemAudio: null, ehMeu: true, resultadoId: 'res-guinho' },
  ],
  lider: null,
};

const DESAFIO = {
  codigo: 'ABCDEFGHJK',
  resultadoId: 'meu-resultado',
  link: 'https://aue.vercel.app/b/ABCDEFGHJK',
  /* De propósito diferente da prévia: quem manda é o servidor. */
  notaOficial: 90.7,
  expiraEm: '2026-08-16T12:00:00Z',
};

const NOTA: Nota = {
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

  const pontuador = {
    chamadas: 0,
    ultimaOrigem: '' as string,
    async pontuar(_audio: AudioCapturado, origem: string): Promise<ResultadoDaPontuacao> {
      pontuador.chamadas += 1;
      pontuador.ultimaOrigem = origem;
      if (opcoes.juizDemoraMs) {
        await new Promise((r) => setTimeout(r, opcoes.juizDemoraMs));
      }
      return opcoes.veredito ?? { ok: true, nota: NOTA };
    },
  };

  /*
    O DETECTOR DUBLADO LIBERA POR PADRÃO. O de verdade baixa 16 MB e roda uma
    rede neural — num teste ele só atrasaria tudo e não provaria nada sobre a
    Arena. Quem prova o detector são os testes dele.
  */
  const detector = {
    preparos: 0,
    conferidas: 0,
    preparar() {
      detector.preparos += 1;
    },
    async podePontuar() {
      detector.conferidas += 1;
      return opcoes.ehArroto ?? true;
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
    aberturas: 0,
    respostas: 0,
    ultimaResposta: null as unknown,
    enderecosPedidos: [] as string[],
    async abrir(): Promise<AberturaDoDesafio> {
      desafios.aberturas += 1;
      return opcoes.abertura ?? { ok: true, desafio: DISPUTA };
    },
    async enderecoDoAudio(audioId: string) {
      desafios.enderecosPedidos.push(audioId);
      return opcoes.enderecoDoAudio === undefined
        ? `https://exemplo/assinado/${audioId}`
        : opcoes.enderecoDoAudio;
    },
    apagados: [] as string[],
    async apagarMeuArroto(resultadoId: string): Promise<'apagado' | 'naoDeu'> {
      desafios.apagados.push(resultadoId);
      return opcoes.aoApagar ?? 'apagado';
    },
    revanches: 0,
    ultimaRevanche: null as unknown,
    async revanchar(pedido: unknown): Promise<ResultadoDaRevanche> {
      desafios.revanches += 1;
      desafios.ultimaRevanche = pedido;
      await new Promise((r) => setTimeout(r, 30));
      return opcoes.aoRevanchar ?? { ok: true, desafio: DISPUTA_FECHADA, superou: true };
    },
    async responder(pedido: unknown): Promise<AberturaDoDesafio> {
      desafios.respostas += 1;
      desafios.ultimaResposta = pedido;
      await new Promise((r) => setTimeout(r, 30));
      return opcoes.respostaEnviada ?? { ok: true, desafio: DISPUTA_FECHADA };
    },
  };

  const compartilhamento = {
    compartilhados: [] as string[],
    pedidos: [] as PedidoDeCompartilhamento[],
    copiados: [] as string[],
    async compartilhar(pedido: PedidoDeCompartilhamento) {
      compartilhamento.compartilhados.push(pedido.url ?? '');
      compartilhamento.pedidos.push(pedido);
      return opcoes.resultadoDoCompartilhar ?? { ok: true as const, via: 'texto' as const };
    },
    async copiar(texto: string) {
      compartilhamento.copiados.push(texto);
      return opcoes.copiaFunciona !== false;
    },
  };

  const adaptadores: AdaptadoresDaArena = {
    captura,
    pontuador,
    detector,
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
    pontuador,
    detector,
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
    /*
      Uma ação por estado — contada DENTRO da faixa de ação. O topo tem o
      menu, que é fixo e não é ação de estado nenhum; contar o documento
      inteiro faria este teste reprovar a existência do menu.
    */
    expect(document.querySelectorAll('.acao button')).toHaveLength(1);
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
    expect(document.querySelectorAll('.acao button')).toHaveLength(1);
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
    // A escolha É a ação: seis alvos, e nenhum botão na faixa de ação.
    expect(document.querySelectorAll('.origens button')).toHaveLength(ALVOS_DE_ORIGEM.length);
    expect(document.querySelectorAll('.acao button')).toHaveLength(0);
  });

  it('um toque resolve, sem confirmação', async () => {
    const dubles = montarDubles({ aoParar: ARROTO });
    await ateAOrigem(dubles);

    fireEvent.click(screen.getByRole('button', { name: /Comida/ }));

    await waitFor(() => expect(dubles.pontuador.chamadas).toBe(1));
    expect(dubles.pontuador.ultimaOrigem).toBe('Comida');
  });

  it('cerveja e refri viram a mesma origem na conta', async () => {
    const dubles = montarDubles({ aoParar: ARROTO });
    await ateAOrigem(dubles);
    fireEvent.click(screen.getByRole('button', { name: /Refri/ }));
    await waitFor(() => expect(dubles.pontuador.ultimaOrigem).toBe('Bebida'));
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
    expect(document.querySelectorAll('.acao button')).toHaveLength(0);
    // E o menu do topo, escondido, não pode ser alcançável pelo teclado.
    expect(document.querySelector('.hud')?.hasAttribute('inert')).toBe(true);
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
    // O player nasce depois de o endereço local ficar pronto, num efeito.
    await waitFor(() => expect(document.querySelector('.player-audio')).not.toBeNull());
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

    /* Com prévia: o que sai é o /x/. O /b/ continua na tela, para copiar. */
    await waitFor(() =>
      expect(dubles.compartilhamento.compartilhados).toEqual([DESAFIO.link.replace('/b/', '/x/')]),
    );
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
    // A frase serve quem criou E quem abriu um link — nada de "o desafio não
    // foi criado" para quem nem tentou criar.
    expect(screen.getByText('Não deu para falar com o servidor. Confere a internet e tenta de novo.')).toBeDefined();
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

/** Abre a Arena por um link de desafio e espera o confronto montar. */
async function abrirPorLink(dubles: ReturnType<typeof montarDubles>) {
  render(<Arena codigoDoDesafio="ABCDEFGHJK" adaptadores={dubles.adaptadores} agora={dubles.agora} />);
  return screen.findByRole('button', { name: 'Aguenta essa' });
}

/** Vai do link até o placar, respondendo. */
async function ateOPlacar(dubles: ReturnType<typeof montarDubles>) {
  const botao = await abrirPorLink(dubles);
  fireEvent.click(botao);
  await screen.findByRole('button', { name: 'Parar' });
  fireEvent.click(screen.getByRole('button', { name: 'Parar' }));
  await screen.findByRole('button', { name: /Cerveja/ });

  vi.useFakeTimers();
  fireEvent.click(screen.getByRole('button', { name: /Cerveja/ }));
  await act(async () => {
    await vi.advanceTimersByTimeAsync(TETO_DA_ANALISE_MS + PISO_DO_TEATRO_MS + 200);
  });
  await act(async () => {
    await vi.advanceTimersByTimeAsync(2000);
  });
  vi.useRealTimers();

  fireEvent.click(screen.getByRole('button', { name: 'Ver o estrago' }));
  fireEvent.change(screen.getByLabelText('Teu apelido'), { target: { value: 'Guinho' } });
  fireEvent.click(screen.getByRole('button', { name: 'Tá bom, manda' }));
}

describe('quem foi chamado', () => {
  it('abre pelo link, sem cadastro, e diz quem chamou', async () => {
    const dubles = montarDubles();
    await abrirPorLink(dubles);

    expect(screen.getByText('Giam te chamou.')).toBeDefined();
    expect(document.querySelector('.arena')?.getAttribute('data-estado')).toBe('VERSUS');
    // Zero atrito: nada de campo de nome para quem chegou pelo link.
    expect(screen.queryByLabelText('Teu apelido')).toBeNull();
  });

  it('o arroto do desafiante está lá para ouvir', async () => {
    const dubles = montarDubles();
    await abrirPorLink(dubles);

    const play = screen.getByRole('button', { name: /O arroto dele/ });
    fireEvent.click(play);

    // O endereço é pedido NA HORA DO PLAY: buscado na montagem já estaria
    // vencido quando o dedo chegasse.
    await waitFor(() => expect(dubles.desafios.enderecosPedidos).toEqual(['audio-do-giam']));
  });

  it('áudio que não dá para assinar diz que não está disponível', async () => {
    const dubles = montarDubles({ enderecoDoAudio: null });
    await abrirPorLink(dubles);

    fireEvent.click(screen.getByRole('button', { name: /O arroto dele/ }));

    // Falhar calado aqui é o mesmo que dizer que o adversário não arrotou.
    expect(await screen.findByText('Esse arroto não está disponível.')).toBeDefined();
  });

  it('link vencido cai no erro certo, com saída', async () => {
    const dubles = montarDubles({ abertura: { ok: false, motivo: 'expirado' } });
    render(<Arena codigoDoDesafio="VENCIDOAAA" adaptadores={dubles.adaptadores} />);

    expect(await screen.findByText('Essa disputa já era.')).toBeDefined();
    expect(screen.getByRole('button', { name: 'Arrotar' })).toBeDefined();
  });

  it('link que não existe cai no mesmo caso honesto', async () => {
    const dubles = montarDubles({ abertura: { ok: false, motivo: 'naoExiste' } });
    render(<Arena codigoDoDesafio="TORTOAAAAA" adaptadores={dubles.adaptadores} />);

    expect(await screen.findByText('Essa disputa já era.')).toBeDefined();
  });

  it('"aguenta essa" cai na gravação de sempre', async () => {
    const dubles = montarDubles();
    const botao = await abrirPorLink(dubles);

    fireEvent.click(botao);

    expect(await screen.findByRole('button', { name: 'Parar' })).toBeDefined();
    expect(dubles.captura.pedidos).toBe(1);
  });
});

describe('a resposta e o placar', () => {
  it('quem responde vê "ver o estrago", não "chamar pro X1"', async () => {
    const dubles = montarDubles();
    const botao = await abrirPorLink(dubles);
    fireEvent.click(botao);
    await screen.findByRole('button', { name: 'Parar' });
    fireEvent.click(screen.getByRole('button', { name: 'Parar' }));
    await screen.findByRole('button', { name: /Cerveja/ });

    vi.useFakeTimers();
    fireEvent.click(screen.getByRole('button', { name: /Cerveja/ }));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(TETO_DA_ANALISE_MS + PISO_DO_TEATRO_MS + 200);
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2000);
    });
    vi.useRealTimers();

    expect(screen.getByRole('button', { name: 'Ver o estrago' })).toBeDefined();
    expect(screen.queryByRole('button', { name: 'Chamar pro X1' })).toBeNull();
  });

  it('a resposta vai com o código da disputa', async () => {
    const dubles = montarDubles();
    await ateOPlacar(dubles);

    await waitFor(() => expect(dubles.desafios.respostas).toBe(1));
    expect(dubles.desafios.ultimaResposta).toMatchObject({ codigo: 'ABCDEFGHJK', nome: 'Guinho' });
    // Criar um desafio novo seria o erro: quem responde entra numa briga que já existe.
    expect(dubles.desafios.chamadas).toBe(0);
  });

  it('o placar mostra os dois lados e o vencedor que o SERVIDOR apontou', async () => {
    const dubles = montarDubles();
    await ateOPlacar(dubles);

    await waitFor(() => {
      expect(document.querySelector('.arena')?.getAttribute('data-estado')).toBe('SCOREBOARD');
    });
    // Os nomes aparecem duas vezes de propósito: no bloco VS e na linha do
    // placar. Por isso a busca é dentro do placar.
    const placar = document.querySelector('.placar');
    expect(placar?.textContent).toContain('Giam');
    expect(placar?.textContent).toContain('Guinho');
    // O líder veio do servidor: a tela não comparou 91,4 com 80,5 por conta própria.
    expect(document.querySelector('.versus-lider')?.textContent).toContain('Guinho');
    expect(document.querySelector('.versus-marca')?.textContent).toBe('VS');
  });

  it('empate não tem ouro nem vencedor', async () => {
    const dubles = montarDubles({ respostaEnviada: { ok: true, desafio: EMPATE } });
    await ateOPlacar(dubles);

    await waitFor(() => expect(screen.getByText('Deu igual. Que sacanagem.')).toBeDefined());
    // Empate não é vitória dupla: se o ouro aparece quando ninguém ganhou, ele
    // para de significar vitória.
    expect(document.querySelector('.versus-lider')).toBeNull();
    expect(document.querySelector('.versus-marca')?.textContent).toBe('=');
  });

  it('cada linha do placar toca o arroto de quem fez', async () => {
    const dubles = montarDubles();
    await ateOPlacar(dubles);

    await waitFor(() => expect(document.querySelectorAll('.placar-linha')).toHaveLength(2));
    fireEvent.click(screen.getByRole('button', { name: /Guinho/ }));
    await waitFor(() => expect(dubles.desafios.enderecosPedidos).toContain('audio-do-guinho'));
  });

  it('agora o placar empurra para a revanche', async () => {
    /*
      Este teste era o oposto: enquanto a revanche não existia, ele cobrava que
      NENHUMA frase a prometesse. Agora ela existe, e o `ARENA.md` sempre pediu
      que as falas do placar terminassem empurrando para cá.
    */
    const dubles = montarDubles();
    await ateOPlacar(dubles);

    await waitFor(() => expect(screen.getByRole('button', { name: 'Revanche' })).toBeDefined());
    expect(screen.getByRole('button', { name: 'Mandar o link' })).toBeDefined();
    // Perdi (o servidor apontou o outro como líder), e a fala cutuca.
    // Eu venci (o servidor apontou o meu resultado como líder).
    expect(screen.getByText('Ele vai querer revanche. Deixa.')).toBeDefined();
  });

  it('resposta que não sobe não vira placar', async () => {
    const dubles = montarDubles({ respostaEnviada: { ok: false, motivo: 'semRede' } });
    await ateOPlacar(dubles);

    expect(await screen.findByText('Sem sinal, sem briga.')).toBeDefined();
    expect(document.querySelector('.placar')).toBeNull();
  });
});

describe('apagar o meu arroto', () => {
  it('o botão existe na minha linha do placar e não na do outro', async () => {
    const dubles = montarDubles();
    await ateOPlacar(dubles);

    await waitFor(() => expect(document.querySelectorAll('.placar-linha')).toHaveLength(2));

    // Uma linha é minha (ehMeu), a outra não. Um botão só.
    const botoes = screen.getAllByRole('button', { name: 'Apagar o meu arroto' });
    expect(botoes).toHaveLength(1);
  });

  it('pede confirmação dizendo o que some e o que fica', async () => {
    const dubles = montarDubles();
    await ateOPlacar(dubles);

    fireEvent.click(await screen.findByRole('button', { name: 'Apagar o meu arroto' }));

    expect(screen.getByText('Apagar de vez?')).toBeDefined();
    // "Tem certeza?" transferiria a dúvida sem informar nada.
    expect(
      screen.getByText('O som some do servidor e não volta. A nota da disputa fica.'),
    ).toBeDefined();
  });

  it('desistir da confirmação não apaga nada', async () => {
    const dubles = montarDubles();
    await ateOPlacar(dubles);

    fireEvent.click(await screen.findByRole('button', { name: 'Apagar o meu arroto' }));
    fireEvent.click(screen.getByRole('button', { name: 'Deixa quieto' }));

    expect(dubles.desafios.apagados).toEqual([]);
    expect(screen.getByRole('button', { name: 'Apagar o meu arroto' })).toBeDefined();
  });

  it('apagou: diz apagado, e apaga o resultado certo', async () => {
    const dubles = montarDubles();
    await ateOPlacar(dubles);

    fireEvent.click(await screen.findByRole('button', { name: 'Apagar o meu arroto' }));
    fireEvent.click(screen.getByRole('button', { name: 'Apagar' }));

    expect(await screen.findByText('Apagado.')).toBeDefined();
    expect(dubles.desafios.apagados).toEqual(['res-guinho']);
  });

  it('NÃO diz apagado quando o arquivo não saiu', async () => {
    /*
      O caso que decide se esta função é honesta: o ponteiro sai, o arquivo
      fica, e a pessoa segue a vida achando que apagou.
    */
    const dubles = montarDubles({ aoApagar: 'naoDeu' });
    await ateOPlacar(dubles);

    fireEvent.click(await screen.findByRole('button', { name: 'Apagar o meu arroto' }));
    fireEvent.click(screen.getByRole('button', { name: 'Apagar' }));

    expect(await screen.findByText('Não consegui apagar agora. Tenta de novo.')).toBeDefined();
    expect(screen.queryByText('Apagado.')).toBeNull();
  });

  it('quem criou o desafio também consegue apagar', async () => {
    const dubles = montarDubles({ aoParar: ARROTO });
    await ateODesafio(dubles);

    fireEvent.click(await screen.findByRole('button', { name: 'Apagar o meu arroto' }));
    fireEvent.click(screen.getByRole('button', { name: 'Apagar' }));

    await waitFor(() => expect(dubles.desafios.apagados).toEqual(['meu-resultado']));
  });
});

describe('a linha depois do áudio sumir', () => {
  it('quando o dono apagou, a tela conta', async () => {
    const apagada = {
      ...DISPUTA_FECHADA,
      rodadas: DISPUTA_FECHADA.rodadas.map((r, i) =>
        i === 0 ? { ...r, audioId: null, motivoSemAudio: 'apagado' as const } : r,
      ),
    };
    const dubles = montarDubles({ respostaEnviada: { ok: true, desafio: apagada } });
    await ateOPlacar(dubles);

    expect(await screen.findByText('Quem gravou apagou.')).toBeDefined();
  });

  it('quando a moderação escondeu, a tela NÃO conta', async () => {
    // Contar da denúncia para terceiros seria expor coisa que não é da conta
    // deles.
    const escondida = {
      ...DISPUTA_FECHADA,
      rodadas: DISPUTA_FECHADA.rodadas.map((r, i) =>
        i === 0 ? { ...r, audioId: null, motivoSemAudio: 'escondido' as const } : r,
      ),
    };
    const dubles = montarDubles({ respostaEnviada: { ok: true, desafio: escondida } });
    await ateOPlacar(dubles);

    expect(await screen.findByText('Esse arroto não está disponível.')).toBeDefined();
    expect(screen.queryByText('Quem gravou apagou.')).toBeNull();
  });
});

describe('o menu', () => {
  it('abre por cima e leva à privacidade e aos termos', async () => {
    const { adaptadores } = montarDubles();
    render(<Arena adaptadores={adaptadores} />);

    fireEvent.click(screen.getByRole('button', { name: 'Menu' }));

    expect(screen.getByRole('dialog')).toBeDefined();
    // Links de verdade: alguém precisa conseguir mandar o link da política.
    expect(screen.getByRole('link', { name: 'Privacidade' }).getAttribute('href')).toBe(
      '/privacidade',
    );
    expect(screen.getByRole('link', { name: 'Termos' }).getAttribute('href')).toBe('/termos');
  });

  it('fechar devolve exatamente onde estava', async () => {
    const { adaptadores } = montarDubles();
    render(<Arena adaptadores={adaptadores} />);

    fireEvent.click(screen.getByRole('button', { name: 'Menu' }));
    fireEvent.click(screen.getByRole('button', { name: 'Fechar' }));

    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.getByRole('button', { name: 'Arrotar' })).toBeDefined();
  });
});

describe('a revanche', () => {
  /** Do placar até mandar a revanche. */
  async function revanchar(dubles: ReturnType<typeof montarDubles>) {
    await ateOPlacar(dubles);
    await waitFor(() => expect(screen.getByRole('button', { name: 'Revanche' })).toBeDefined());

    fireEvent.click(screen.getByRole('button', { name: 'Revanche' }));
    await screen.findByRole('button', { name: 'Parar' });
    fireEvent.click(screen.getByRole('button', { name: 'Parar' }));
    await screen.findByRole('button', { name: /Cerveja/ });

    vi.useFakeTimers();
    fireEvent.click(screen.getByRole('button', { name: /Cerveja/ }));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(TETO_DA_ANALISE_MS + PISO_DO_TEATRO_MS + 200);
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2000);
    });
    vi.useRealTimers();

    fireEvent.click(screen.getByRole('button', { name: 'Ver o estrago' }));
    fireEvent.change(screen.getByLabelText('Teu apelido'), { target: { value: 'Guinho' } });
    fireEvent.click(screen.getByRole('button', { name: 'Tá bom, manda' }));
  }

  it('é a ação principal do placar, com "mandar o link" em segundo plano', async () => {
    const dubles = montarDubles();
    await ateOPlacar(dubles);

    const revanche = await screen.findByRole('button', { name: 'Revanche' });
    expect(revanche.className).toContain('botao-principal');
    expect(screen.getByRole('button', { name: 'Mandar o link' }).className).toContain(
      'botao-discreto',
    );
  });

  it('grava mantendo a disputa, e vai pelo caminho da revanche', async () => {
    const dubles = montarDubles();
    await revanchar(dubles);

    await waitFor(() => expect(dubles.desafios.revanches).toBe(1));
    // O código da disputa viaja: revanche não cria briga nova.
    expect(dubles.desafios.ultimaRevanche).toMatchObject({ codigo: 'ABCDEFGHJK' });
    // E não passou pelo caminho da primeira resposta.
    expect(dubles.desafios.respostas).toBe(1);
  });

  it('superou: diz que melhorou', async () => {
    const dubles = montarDubles();
    await revanchar(dubles);

    expect(await screen.findByText('Melhorou.')).toBeDefined();
  });

  it('não superou: diz na lata, e a melhor continua valendo', async () => {
    const dubles = montarDubles({
      aoRevanchar: { ok: true, desafio: DISPUTA_FECHADA, superou: false },
    });
    await revanchar(dubles);

    expect(await screen.findByText('Não superou.')).toBeDefined();
    expect(screen.getByText('Fica valendo a tua melhor. Tenta de novo.')).toBeDefined();
    // O placar continua de pé, com as duas linhas.
    expect(document.querySelectorAll('.placar-linha')).toHaveLength(2);
  });

  it('disputa vencida no meio da revanche cai no erro certo', async () => {
    const dubles = montarDubles({ aoRevanchar: { ok: false, motivo: 'expirado' } });
    await revanchar(dubles);

    expect(await screen.findByText('Essa disputa já era.')).toBeDefined();
  });
});

describe('a conferida da saída', () => {
  it('o modelo começa a baixar no toque em ARROTAR, não na hora de julgar', async () => {
    /*
      São 16 MB. Baixar só na saída da gravação colocaria a espera inteira
      exatamente onde o ARENA.md proíbe ficar preso.
    */
    const dubles = montarDubles();
    render(<Arena adaptadores={dubles.adaptadores} agora={dubles.agora} />);

    expect(dubles.detector.preparos).toBe(0);
    fireEvent.click(screen.getByRole('button', { name: 'Arrotar' }));

    await waitFor(() => expect(dubles.detector.preparos).toBe(1));
    // E antes de qualquer conferida: ela só acontece quando a gravação acaba.
    expect(dubles.detector.conferidas).toBe(0);
  });

  it('veio som e era arroto: segue para a origem', async () => {
    const dubles = montarDubles({ aoParar: ARROTO, ehArroto: true });
    const parar = await ateGravar(dubles);

    fireEvent.click(parar);

    expect(await screen.findByRole('button', { name: /Cerveja/ })).toBeDefined();
    expect(dubles.detector.conferidas).toBe(1);
  });

  it('veio som mas NÃO era arroto: não vira nota', async () => {
    const dubles = montarDubles({ aoParar: ARROTO, ehArroto: false });
    const parar = await ateGravar(dubles);

    fireEvent.click(parar);

    expect(await screen.findByText('Isso não foi arroto.')).toBeDefined();
    expect(screen.getByText('Gritar não vale. Bater na mesa também não.')).toBeDefined();
    expect(screen.getByRole('button', { name: 'Tentar de novo' })).toBeDefined();
  });

  it('sem som nem chega a perguntar ao detector', async () => {
    // Silêncio é outra conversa: "não te ouvi" não é "isso não vale".
    const dubles = montarDubles({ aoParar: MUDO });
    const parar = await ateGravar(dubles);

    fireEvent.click(parar);

    expect(await screen.findByText('Não veio nada.')).toBeDefined();
    expect(dubles.detector.conferidas).toBe(0);
  });

  it('a conferida acontece ANTES da pergunta de origem', async () => {
    // Ninguém escolhe de onde veio para depois descobrir que não valeu.
    const dubles = montarDubles({ aoParar: ARROTO, ehArroto: false });
    const parar = await ateGravar(dubles);

    fireEvent.click(parar);
    await screen.findByText('Isso não foi arroto.');

    expect(screen.queryByRole('button', { name: /Cerveja/ })).toBeNull();
    expect(dubles.pontuador.chamadas).toBe(0);
  });
});

/*
  COMPARTILHAR — a alternativa do RESULT que o `ARENA.md` lista e que faltava
  desde que o estado nasceu.

  O que estes testes seguram, em ordem de importância:

  1. compartilhar NÃO cria batalha. É a promessa que o jogador precisa poder
     confiar — apertar "compartilhar" e descobrir que chamou alguém pro X1
     seria o jogo agindo pelas costas dele;
  2. nenhum final mente. Copiar diz "copiei", desistir não vira erro, e falha
     é falha;
  3. o texto repete a frase que está na tela. Sortear outra faria o jogo dizer
     duas coisas sobre o mesmo arroto.
*/
describe('compartilhar a nota', () => {
  it('o RESULT oferece compartilhar, e isso NÃO cria batalha', async () => {
    const dubles = montarDubles({ aoParar: ARROTO });
    await ateANota(dubles);

    fireEvent.click(screen.getByRole('button', { name: 'Compartilhar' }));

    await waitFor(() => expect(dubles.compartilhamento.pedidos).toHaveLength(1));
    /* Nenhum desafio nasceu, e nem o nome foi cobrado. */
    expect(dubles.desafios.chamadas).toBe(0);
    expect(screen.queryByText('Como é que te chamam?')).toBeNull();
  });

  it('o texto que viaja repete a MESMA frase que está na tela', async () => {
    const dubles = montarDubles({ aoParar: ARROTO });
    await ateANota(dubles);

    fireEvent.click(screen.getByRole('button', { name: 'Compartilhar' }));

    await waitFor(() => expect(dubles.compartilhamento.pedidos).toHaveLength(1));
    const pedido = dubles.compartilhamento.pedidos[0];

    expect(pedido.titulo).toBe('Fiz 91,4 no Auê');
    expect(pedido.texto).toBe('Monstro do Esgoto. Isso foi nojento. Parabéns. Duvido bater.');
    /* A frase do juiz está na tela E no texto — é a mesma. */
    expect(screen.getByText('Isso foi nojento. Parabéns.')).toBeDefined();
  });

  it('vai sem cartão: o RESULT não tem imagem pra mandar', async () => {
    const dubles = montarDubles({ aoParar: ARROTO });
    await ateANota(dubles);

    fireEvent.click(screen.getByRole('button', { name: 'Compartilhar' }));

    await waitFor(() => expect(dubles.compartilhamento.pedidos).toHaveLength(1));
    expect(dubles.compartilhamento.pedidos[0].elementId).toBeUndefined();
  });

  it('navegador sem folha de compartilhamento: copia e diz que COPIOU', async () => {
    // "Compartilhado!" seria mentira, e a pessoa iria ao grupo achando que mandou.
    const dubles = montarDubles({
      aoParar: ARROTO,
      resultadoDoCompartilhar: { ok: false, motivo: 'indisponivel' },
    });
    await ateANota(dubles);

    fireEvent.click(screen.getByRole('button', { name: 'Compartilhar' }));

    expect(await screen.findByText('Copiei o link. Cola lá no grupo.')).toBeDefined();
    await waitFor(() => expect(dubles.compartilhamento.copiados).toHaveLength(1));
    expect(dubles.compartilhamento.copiados[0]).toContain('Duvido bater.');
  });

  it('quando nem copiar dá, o jogo fala na lata', async () => {
    const dubles = montarDubles({
      aoParar: ARROTO,
      copiaFunciona: false,
      resultadoDoCompartilhar: { ok: false, motivo: 'indisponivel' },
    });
    await ateANota(dubles);

    fireEvent.click(screen.getByRole('button', { name: 'Compartilhar' }));

    expect(await screen.findByText('O navegador travou tudo. Copia o link na mão.')).toBeDefined();
  });

  it('desistir da folha NÃO vira mensagem de erro', async () => {
    // Fechar a folha é mudar de ideia. Acusar problema aí é o jogo reclamando à toa.
    const dubles = montarDubles({
      aoParar: ARROTO,
      resultadoDoCompartilhar: { ok: false, motivo: 'cancelado' },
    });
    await ateANota(dubles);

    fireEvent.click(screen.getByRole('button', { name: 'Compartilhar' }));

    await waitFor(() => expect(dubles.compartilhamento.pedidos).toHaveLength(1));
    expect(screen.queryByText('Não rolou compartilhar. Tenta de novo.')).toBeNull();
    expect(dubles.compartilhamento.copiados).toHaveLength(0);
    /* E a nota continua na tela, inteira. */
    expect(screen.getByText('Monstro do Esgoto')).toBeDefined();
  });

  it('falha de verdade é dita como falha', async () => {
    const dubles = montarDubles({
      aoParar: ARROTO,
      resultadoDoCompartilhar: { ok: false, motivo: 'falhou', detalhe: 'deu ruim' },
    });
    await ateANota(dubles);

    fireEvent.click(screen.getByRole('button', { name: 'Compartilhar' }));

    expect(await screen.findByText('Não rolou compartilhar. Tenta de novo.')).toBeDefined();
  });

  it('o X1 manda o link SEM cartão — o id falso não volta', async () => {
    /*
      REGRESSÃO. O "Mandar o desafio" passava `elementId: 'nao-existe-cartao-aqui'`
      contando que o adaptador estourasse por dentro e caísse no texto. Não
      caía: voltava `falhou`, a folha nunca abria, e o botão não fazia nada —
      sem sintoma, porque o retorno era ignorado.
    */
    const dubles = montarDubles({ aoParar: ARROTO });
    await ateODesafio(dubles);

    fireEvent.click(await screen.findByRole('button', { name: 'Mandar o desafio' }));

    await waitFor(() => expect(dubles.compartilhamento.pedidos).toHaveLength(1));
    expect(dubles.compartilhamento.pedidos[0].elementId).toBeUndefined();
    /*
      O QUE VIAJA É O /x/, não o /b/ (ADR 0003). O link direto continua sendo o
      que a tela mostra e o que o "copiar" entrega — quem copia não pode
      depender da prévia estar de pé.
    */
    expect(dubles.compartilhamento.pedidos[0].url).toBe(DESAFIO.link.replace("/b/", "/x/"));
    expect(screen.getByText(DESAFIO.link)).toBeDefined();
  });
});
