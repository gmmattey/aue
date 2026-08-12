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
import type { RespostaDaRoda } from '../portas/disputaLocal';
import { ALVOS_DE_ORIGEM } from '../nucleo/origem/origens';
import { COMENTARIOS_DE_VOLTA, COMENTARIOS_PRIMEIRA_VEZ } from '../nucleo/fala/idle';
import { DICA_DO_MICROFONE } from '../nucleo/fala/erros';
import { TETO_DE_GRAVACAO_MS } from '../nucleo/gravacao/regras';
import {
  LIMIAR_DA_ESPERA_LONGA_MS,
  PISO_DO_TEATRO_MS,
  TETO_DA_ANALISE_MS,
} from '../nucleo/julgamento/tempo';
import { ATRASOS_DA_REVELACAO_MS } from '../nucleo/arena/revelacao';
import { CHAMAR_PRO_X1 } from '../nucleo/fala/desafio';
import { JULGANDO, JULGANDO_DEMORANDO } from '../nucleo/fala/julgamento';
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
  /**
   * O aparelho sabe mandar arquivo? Por padrão **não** — é o caso do
   * navegador de desktop onde os testes rodam, e é o caminho que precisa
   * continuar funcionando igual ao de hoje.
   */
  sabeMandarImagem?: boolean;
  /** O que o servidor responde ao abrir um link. */
  abertura?: AberturaDoDesafio;
  /**
   * O que o servidor responde nas aberturas SEGUINTES.
   *
   * A Arena relê a briga quando a revanche bate no teto de rounds. Reler é o
   * mesmo `abrir`, então sem isto a segunda leitura devolveria o mesmo estado
   * da primeira — e a briga nunca mudaria de mão dentro de um teste.
   */
  aberturaDepois?: AberturaDoDesafio;
  /** O que o servidor responde ao mandar a resposta. */
  respostaEnviada?: AberturaDoDesafio;
  /** `null` simula endereço de áudio que não dá para assinar. */
  enderecoDoAudio?: string | null;
  /** O que o servidor responde ao apagar. */
  aoApagar?: 'apagado' | 'naoDeu';
  /**
   * O que o servidor responde ao apagar CADA resultado.
   *
   * Existe para o lote: apagar os arrotos dos rounds anteriores são várias
   * chamadas, e o caso que interessa é uma delas falhar no meio.
   */
  aoApagarCada?: (resultadoId: string) => 'apagado' | 'naoDeu';
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
const ARROTO_DO_GIAM = {
  id: 'r1',
  nome: 'Giam',
  nota: 80.5,
  audioId: 'audio-do-giam',
  motivoSemAudio: null,
  ehMeu: false,
  resultadoId: 'res-giam',
} as const;

const ARROTO_DO_GUINHO = {
  id: 'r2',
  nome: 'Guinho',
  nota: 91.4,
  audioId: 'audio-do-guinho',
  motivoSemAudio: null,
  ehMeu: true,
  resultadoId: 'res-guinho',
} as const;

/** Round 1 aberto: o Giam mandou, e a bola está comigo. */
const DISPUTA: DesafioAberto = {
  codigo: 'ABCDEFGHJK',
  link: 'https://aue.vercel.app/b/ABCDEFGHJK',
  expiraEm: '2099-01-01T00:00:00Z',
  rodadas: [ARROTO_DO_GIAM],
  placar: {
    lados: [{ nome: 'Giam', vitorias: 0, ehMeu: false }],
    rounds: 1,
    ultimoRound: { rodadas: [ARROTO_DO_GIAM], vencedorResultadoId: null },
    roundAberto: { deQuem: 'dele', rodada: ARROTO_DO_GIAM },
  },
};

/** Round 1 fechado: eu respondi e venci. Placar 1 × 0 para mim. */
const DISPUTA_FECHADA: DesafioAberto = {
  ...DISPUTA,
  rodadas: [ARROTO_DO_GIAM, ARROTO_DO_GUINHO],
  placar: {
    lados: [
      { nome: 'Giam', vitorias: 0, ehMeu: false },
      { nome: 'Guinho', vitorias: 1, ehMeu: true },
    ],
    rounds: 1,
    ultimoRound: {
      rodadas: [ARROTO_DO_GIAM, ARROTO_DO_GUINHO],
      vencedorResultadoId: 'res-guinho',
    },
    roundAberto: null,
  },
};

/** As duas notas iguais: round fechado sem vitória para ninguém. */
const EMPATE_DO_GUINHO = { ...ARROTO_DO_GUINHO, nota: 80.5 } as const;

const EMPATE: DesafioAberto = {
  ...DISPUTA_FECHADA,
  rodadas: [ARROTO_DO_GIAM, EMPATE_DO_GUINHO],
  placar: {
    lados: [
      { nome: 'Giam', vitorias: 0, ehMeu: false },
      { nome: 'Guinho', vitorias: 0, ehMeu: true },
    ],
    rounds: 1,
    ultimoRound: {
      rodadas: [ARROTO_DO_GIAM, EMPATE_DO_GUINHO],
      vencedorResultadoId: null,
    },
    roundAberto: null,
  },
};

/** Round 2 aberto por mim: mandei, e agora é ele. */
const ROUND_ABERTO_MEU: DesafioAberto = {
  ...DISPUTA_FECHADA,
  placar: {
    ...DISPUTA_FECHADA.placar,
    rounds: 2,
    ultimoRound: { rodadas: [ARROTO_DO_GUINHO], vencedorResultadoId: null },
    roundAberto: { deQuem: 'meu', rodada: ARROTO_DO_GUINHO },
  },
};

/** Round 2 aberto pelo outro: ele mandou 80,5 e falta eu. */
const ROUND_ABERTO_DELE: DesafioAberto = {
  ...DISPUTA_FECHADA,
  placar: {
    ...DISPUTA_FECHADA.placar,
    rounds: 2,
    ultimoRound: { rodadas: [ARROTO_DO_GIAM], vencedorResultadoId: null },
    roundAberto: { deQuem: 'dele', rodada: ARROTO_DO_GIAM },
  },
};

/*
  Round 2 aberto pelo outro, com o ROUND 1 INTEIRO atrás.

  As duas listas divergem de propósito: `rodadas` é a briga inteira (os quatro
  arrotos) e `ultimoRound.rodadas` é só o que a tela desenha. É esse buraco que
  deixava o arroto do round 1 sem botão de apagar em lugar nenhum.
*/
const MEU_ARROTO_VELHO = { ...ARROTO_DO_GUINHO, id: 'r0-guinho', resultadoId: 'res-guinho-1' };
const ARROTO_VELHO_DO_GIAM = { ...ARROTO_DO_GIAM, id: 'r0-giam', resultadoId: 'res-giam-1' };

const COM_ROUND_ANTERIOR: DesafioAberto = {
  ...ROUND_ABERTO_DELE,
  rodadas: [ARROTO_VELHO_DO_GIAM, MEU_ARROTO_VELHO, ARROTO_DO_GIAM],
};

/** Cinquenta rounds fechados. Chega. */
const NO_TETO: DesafioAberto = {
  ...DISPUTA_FECHADA,
  placar: { ...DISPUTA_FECHADA.placar, rounds: 50 },
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
  classificacao: 'Tá maluco.',
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
      if (desafios.aberturas > 1 && opcoes.aberturaDepois) return opcoes.aberturaDepois;
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
      if (opcoes.aoApagarCada) return opcoes.aoApagarCada(resultadoId);
      return opcoes.aoApagar ?? 'apagado';
    },
    revanches: 0,
    ultimaRevanche: null as unknown,
    async revanchar(pedido: unknown): Promise<ResultadoDaRevanche> {
      desafios.revanches += 1;
      desafios.ultimaRevanche = pedido;
      await new Promise((r) => setTimeout(r, 30));
      return opcoes.aoRevanchar ?? { ok: true, desafio: DISPUTA_FECHADA, oQueAconteceu: 'fechouRound' };
    },
    async responder(pedido: unknown): Promise<AberturaDoDesafio> {
      desafios.respostas += 1;
      desafios.ultimaResposta = pedido;
      await new Promise((r) => setTimeout(r, 30));
      return opcoes.respostaEnviada ?? { ok: true, desafio: DISPUTA_FECHADA };
    },
  };

  /*
    A RODA NÃO EXISTE NESTE ARQUIVO. Ele testa o loop solo e o X1, e a flag
    `VITE_FEATURE_DISPUTA_NA_ARENA` está desligada no ambiente de teste — que é
    o padrão e o que a produção publica hoje. O dublê existe só para a Arena
    conseguir montar; quem exercita a roda é `Arena.roda.test.tsx`.
  */
  const disputaLocal = {
    async abrir(): Promise<RespostaDaRoda> {
      return { ok: false, motivo: 'falhou', detalhe: 'a roda não entra neste teste' };
    },
    async ler(): Promise<RespostaDaRoda> {
      return { ok: false, motivo: 'naoExiste' };
    },
    async gravarTurno(): Promise<RespostaDaRoda> {
      return { ok: false, motivo: 'falhou', detalhe: 'a roda não entra neste teste' };
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
    sabeMandarImagem() {
      return opcoes.sabeMandarImagem ?? false;
    },
  };

  const adaptadores: AdaptadoresDaArena = {
    captura,
    pontuador,
    detector,
    desafios,
    disputaLocal,
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
  return screen.findByRole('button', { name: 'Já foi' });
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
    expect(screen.getByRole('button', { name: 'Já foi' })).toBeDefined();
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
    await screen.findByRole('button', { name: 'Já foi' });

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
  /*
    Terceiro avanço: a cascata da revelação. Os relógios dela só nascem quando
    a contagem TERMINA — o React só solta o efeito no fim do bloco anterior —,
    então eles ficam pendurados até alguém andar com o relógio mais uma vez.
    Sem isto, `useRealTimers` os joga fora e a nota fica sozinha na tela.
  */
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ATRASOS_DA_REVELACAO_MS.x1 + 200);
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
  it('mostra o número, a zoeira do juiz e as três medidas', async () => {
    const dubles = montarDubles({ aoParar: ARROTO });
    await ateANota(dubles);

    expect(document.querySelector('.nota')?.textContent).toContain('91,4');
    // A classificação em cima, a zoeira embaixo — como no protótipo.
    expect(screen.getByText(NOTA.classificacao)).toBeDefined();
    expect(screen.getByText(NOTA.frase)).toBeDefined();

    /*
      As medidas GANHAM PRESENÇA quando a contagem termina, e a contagem roda no
      laço de animação — daí a espera de verdade em vez de leitura seca. Elas
      estão no DOM desde o primeiro quadro (senão a região `aria-live` anuncia
      um segundo recado); quem diz se apareceram é o `data-visivel`.
    */
    for (const nome of ['Força', 'Fôlego', 'Grave']) {
      expect(screen.getByText(nome)).toBeDefined();
    }
    await waitFor(() => {
      expect(
        screen.getByText('Força').closest('.cascata')?.getAttribute('data-visivel'),
      ).toBe('1');
    });

    /*
      SUJEIRA E ESTOURO NÃO EXISTEM MAIS NA TELA. O motor v2 zerou o peso da
      textura, e "Estouro" virou "Força" porque é o que a pessoa entende.
    */
    expect(screen.queryByText('Sujeira')).toBeNull();
    expect(screen.queryByText('Estouro')).toBeNull();
  });

  it('as medidas só aparecem depois do número', async () => {
    const dubles = montarDubles({ aoParar: ARROTO, juizDemoraMs: 10 });
    await ateAOrigem(dubles);

    vi.useFakeTimers();
    fireEvent.click(screen.getByRole('button', { name: /Cerveja/ }));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(PISO_DO_TEATRO_MS + 50);
    });

    /*
      Acabou de entrar no RESULT: a contagem ainda não terminou, porque o laço
      de animação não roda sob timers falsos. Medida antes do número é entregar
      o detalhe antes do resultado.

      As medidas ESTÃO no DOM desde o primeiro quadro — precisam estar, senão a
      região `aria-live` anuncia a inserção delas como um segundo recado. Quem
      diz se apareceram é o `data-visivel` da cascata.
    */
    expect(document.querySelector('.nota')).toBeDefined();
    expect(screen.getByText('Força').closest('.cascata')?.getAttribute('data-visivel')).toBe('0');
    vi.useRealTimers();
  });

  it('o pop do número sai junto com a contagem, não no fim dela', async () => {
    const dubles = montarDubles({ aoParar: ARROTO, juizDemoraMs: 10 });
    await ateAOrigem(dubles);

    vi.useFakeTimers();
    fireEvent.click(screen.getByRole('button', { name: /Cerveja/ }));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(PISO_DO_TEATRO_MS + 50);
    });

    /*
      Mesmo instante do teste de cima: o RESULT acabou de entrar e a contagem
      ainda não terminou (o laço de animação não roda sob timer falso). O `pop`
      TEM que estar valendo aqui.

      jsdom não executa keyframe, então o que dá para cobrar é o único sinal
      que existe: a classe no `.palco-nota`. Se alguém devolver o `pop` para o
      fim da contagem, ela não está aqui — e o número volta a piscar no último
      quadro, que é o defeito que isto veio matar.
    */
    expect(document.querySelector('.palco-nota')?.classList.contains('pop')).toBe(true);

    /* E some sozinho quando os 560ms passam — nada de classe presa no nó. */
    await act(async () => {
      await vi.advanceTimersByTimeAsync(560);
    });
    expect(document.querySelector('.palco-nota')?.classList.contains('pop')).toBe(false);
    vi.useRealTimers();
  });

  it('"vou mandar outro" volta direto a gravar', async () => {
    const dubles = montarDubles({ aoParar: ARROTO });
    await ateANota(dubles);

    fireEvent.click(screen.getByRole('button', { name: 'Vou mandar outro!' }));

    expect(await screen.findByRole('button', { name: 'Já foi' })).toBeDefined();
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
    // A frase serve quem criou E quem abriu um link — nada de "o desafio não
    // foi criado" para quem nem tentou criar.
    expect(screen.getByText('Não deu para falar com o servidor. Confere a internet e tenta de novo.')).toBeDefined();
    /*
      A NOTA NÃO MORRE JUNTO COM O DESAFIO. O X1 falhou; o arroto não. Por isso
      a saída principal devolve o resultado, e a discreta encerra a partida.
    */
    expect(screen.getByRole('button', { name: 'Ver minha nota' })).toBeDefined();
    expect(screen.getByRole('button', { name: 'Deixa quieto' })).toBeDefined();
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
  await screen.findByRole('button', { name: 'Já foi' });
  fireEvent.click(screen.getByRole('button', { name: 'Já foi' }));
  await screen.findByRole('button', { name: /Cerveja/ });

  vi.useFakeTimers();
  fireEvent.click(screen.getByRole('button', { name: /Cerveja/ }));
  await act(async () => {
    await vi.advanceTimersByTimeAsync(TETO_DA_ANALISE_MS + PISO_DO_TEATRO_MS + 200);
  });
  await act(async () => {
    await vi.advanceTimersByTimeAsync(2000);
  });
  /*
    A cascata da revelação: enquanto ela corre, a faixa de ação está VAZIA —
    nenhum botão montado. Sem este terceiro avanço o "Ver o estrago" não
    existe ainda.
  */
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ATRASOS_DA_REVELACAO_MS.x1 + 200);
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

  /*
    O LINK É O MESMO PARA OS DOIS LADOS DA BRIGA.

    Quem mandou também abre: conferindo se foi, voltando pelo histórico do
    navegador, tocando no próprio zap. Enquanto todo link caía no `VERSUS`, o
    jogo dizia "fulano te chamou" tocando o arroto DA PRÓPRIA PESSOA e a
    convidava a responder a si mesma.
  */
  it('abrir o próprio link não vira "te chamaram": cai no placar', async () => {
    const dubles = montarDubles({ abertura: { ok: true, desafio: ROUND_ABERTO_MEU } });
    render(<Arena codigoDoDesafio="ABCDEFGHJK" adaptadores={dubles.adaptadores} agora={dubles.agora} />);

    expect(await screen.findByText('Mandou. Agora é ele.')).toBeDefined();
    expect(document.querySelector('.arena')?.getAttribute('data-estado')).toBe('SCOREBOARD');
    expect(screen.queryByRole('button', { name: 'Aguenta essa' })).toBeNull();
    expect(screen.queryByText(/te chamou/)).toBeNull();
  });

  it('link de briga sem round aberto abre no placar, com a revanche na mão', async () => {
    const dubles = montarDubles({ abertura: { ok: true, desafio: DISPUTA_FECHADA } });
    render(<Arena codigoDoDesafio="ABCDEFGHJK" adaptadores={dubles.adaptadores} agora={dubles.agora} />);

    expect(await screen.findByRole('button', { name: 'Revanche' })).toBeDefined();
    expect(document.querySelector('.arena')?.getAttribute('data-estado')).toBe('SCOREBOARD');
  });

  it('"aguenta essa" cai na gravação de sempre', async () => {
    const dubles = montarDubles();
    const botao = await abrirPorLink(dubles);

    fireEvent.click(botao);

    expect(await screen.findByRole('button', { name: 'Já foi' })).toBeDefined();
    expect(dubles.captura.pedidos).toBe(1);
  });
});

describe('a resposta e o placar', () => {
  it('quem responde vê "ver o estrago", não "chamar pro X1"', async () => {
    const dubles = montarDubles();
    const botao = await abrirPorLink(dubles);
    fireEvent.click(botao);
    await screen.findByRole('button', { name: 'Já foi' });
    fireEvent.click(screen.getByRole('button', { name: 'Já foi' }));
    await screen.findByRole('button', { name: /Cerveja/ });

    vi.useFakeTimers();
    fireEvent.click(screen.getByRole('button', { name: /Cerveja/ }));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(TETO_DA_ANALISE_MS + PISO_DO_TEATRO_MS + 200);
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2000);
    });
    /* A cascata precisa terminar: antes dela a faixa de ação está vazia. */
    await act(async () => {
      await vi.advanceTimersByTimeAsync(ATRASOS_DA_REVELACAO_MS.x1 + 200);
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

  it('round aberto do outro: o grito nomeia, o arroto dele toca e o CTA é aguenta essa', async () => {
    const dubles = montarDubles({ respostaEnviada: { ok: true, desafio: ROUND_ABERTO_DELE } });
    await ateOPlacar(dubles);

    expect(await screen.findByText('Giam mandou 80,5. Falta tu.')).toBeDefined();
    expect(screen.getByText('Vai deixar barato?')).toBeDefined();
    expect(screen.getByRole('button', { name: 'Aguenta essa' })).toBeDefined();
    expect(screen.queryByRole('button', { name: 'Revanche' })).toBeNull();

    // O arroto daquele round toca ali mesmo, com o rótulo do VERSUS.
    fireEvent.click(screen.getByRole('button', { name: /O arroto dele/ }));
    await waitFor(() => expect(dubles.desafios.enderecosPedidos).toContain('audio-do-giam'));
  });

  it('só o último round aparece — nada de histórico', async () => {
    const dubles = montarDubles({ respostaEnviada: { ok: true, desafio: ROUND_ABERTO_DELE } });
    await ateOPlacar(dubles);

    // O round anterior tem duas linhas em `rodadas`, e nenhuma delas entra aqui.
    await waitFor(() => expect(document.querySelectorAll('.placar-linha')).toHaveLength(1));
    expect(document.querySelector('.placar')?.textContent).not.toContain('Guinho');
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

  it('o arroto que ficou no round anterior continua tendo como apagar', async () => {
    /*
      O placar mostra só o último round. Sem este botão o arroto do round 1
      continuaria no servidor sem NENHUMA tela onde a pessoa pudesse tirá-lo —
      "o botão sumiu" não é melhor que "o botão não apagava".
    */
    const dubles = montarDubles({ respostaEnviada: { ok: true, desafio: COM_ROUND_ANTERIOR } });
    await ateOPlacar(dubles);

    fireEvent.click(await screen.findByRole('button', { name: 'Apagar os meus arrotos antigos' }));
    expect(
      screen.getByText(
        'O som do arroto que você mandou no round anterior some do servidor e não volta. As notas ficam.',
      ),
    ).toBeDefined();

    fireEvent.click(screen.getByRole('button', { name: 'Apagar' }));

    expect(await screen.findByText('Apagado.')).toBeDefined();
    // Só o MEU, e só o que não está no último round.
    expect(dubles.desafios.apagados).toEqual(['res-guinho-1']);
  });

  it('sem round anterior meu, o botão dos antigos não aparece', async () => {
    const dubles = montarDubles();
    await ateOPlacar(dubles);

    await waitFor(() => expect(document.querySelectorAll('.placar-linha')).toHaveLength(2));
    expect(screen.queryByRole('button', { name: 'Apagar os meus arrotos antigos' })).toBeNull();
  });

  it('falhou no lote: não diz apagado, e o tenta de novo não repete o que já saiu', async () => {
    const dois = {
      ...COM_ROUND_ANTERIOR,
      rodadas: [
        ARROTO_VELHO_DO_GIAM,
        MEU_ARROTO_VELHO,
        { ...MEU_ARROTO_VELHO, id: 'r0b-guinho', resultadoId: 'res-guinho-1b' },
        ARROTO_DO_GIAM,
      ],
    };
    let travado = true;
    const dubles = montarDubles({
      respostaEnviada: { ok: true, desafio: dois },
      aoApagarCada: (id) => (id === 'res-guinho-1b' && travado ? 'naoDeu' : 'apagado'),
    });
    await ateOPlacar(dubles);

    fireEvent.click(await screen.findByRole('button', { name: 'Apagar os meus arrotos antigos' }));
    fireEvent.click(screen.getByRole('button', { name: 'Apagar' }));

    expect(await screen.findByText('Não consegui apagar agora. Tenta de novo.')).toBeDefined();
    expect(screen.queryByText('Apagado.')).toBeNull();
    expect(dubles.desafios.apagados).toEqual(['res-guinho-1', 'res-guinho-1b']);

    travado = false;
    fireEvent.click(screen.getByRole('button', { name: 'Apagar' }));

    expect(await screen.findByText('Apagado.')).toBeDefined();
    // O que já tinha saído não é pedido de novo.
    expect(dubles.desafios.apagados).toEqual(['res-guinho-1', 'res-guinho-1b', 'res-guinho-1b']);
  });

  it('quem criou o desafio também consegue apagar', async () => {
    const dubles = montarDubles({ aoParar: ARROTO });
    await ateODesafio(dubles);

    fireEvent.click(await screen.findByRole('button', { name: 'Apagar o meu arroto' }));
    fireEvent.click(screen.getByRole('button', { name: 'Apagar' }));

    await waitFor(() => expect(dubles.desafios.apagados).toEqual(['meu-resultado']));
  });
});

/**
 * O round fechado, com o arroto do Giam sem áudio.
 *
 * A troca precisa valer nas DUAS listas: `rodadas` é a briga inteira e
 * `ultimoRound.rodadas` é o que a tela desenha. Trocar só a primeira deixaria o
 * teste passando por engano contra um placar que continua tocando.
 */
function semAudio(motivo: 'apagado' | 'escondido'): DesafioAberto {
  const mudo = { ...ARROTO_DO_GIAM, audioId: null, motivoSemAudio: motivo };
  return {
    ...DISPUTA_FECHADA,
    rodadas: [mudo, ARROTO_DO_GUINHO],
    placar: {
      ...DISPUTA_FECHADA.placar,
      ultimoRound: {
        ...DISPUTA_FECHADA.placar.ultimoRound,
        rodadas: [mudo, ARROTO_DO_GUINHO],
      },
    },
  };
}

describe('a linha depois do áudio sumir', () => {
  it('quando o dono apagou, a tela conta', async () => {
    const apagada = semAudio('apagado');
    const dubles = montarDubles({ respostaEnviada: { ok: true, desafio: apagada } });
    await ateOPlacar(dubles);

    expect(await screen.findByText('Quem gravou apagou.')).toBeDefined();
  });

  it('quando a moderação escondeu, a tela NÃO conta', async () => {
    // Contar da denúncia para terceiros seria expor coisa que não é da conta
    // deles.
    const escondida = semAudio('escondido');
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
    await screen.findByRole('button', { name: 'Já foi' });
    fireEvent.click(screen.getByRole('button', { name: 'Já foi' }));
    await screen.findByRole('button', { name: /Cerveja/ });

    vi.useFakeTimers();
    fireEvent.click(screen.getByRole('button', { name: /Cerveja/ }));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(TETO_DA_ANALISE_MS + PISO_DO_TEATRO_MS + 200);
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2000);
    });
    /* A cascata, de novo: sem ela a faixa de ação da revanche está vazia. */
    await act(async () => {
      await vi.advanceTimersByTimeAsync(ATRASOS_DA_REVELACAO_MS.x1 + 200);
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

  it('fechou o round: o placar de vitórias já conta ele', async () => {
    const dubles = montarDubles();
    await revanchar(dubles);

    // 1 × 0 para mim, contado pelo SERVIDOR. A tela não somou nada.
    const placar = await screen.findByRole('img', { name: 'Giam 0 a 1 Guinho' });
    expect(placar).toBeDefined();
    expect(document.querySelectorAll('.placar-linha')).toHaveLength(2);
  });

  it('abriu o round: mandei, e agora é ele — sem botão de arrotar', async () => {
    const dubles = montarDubles({
      aoRevanchar: { ok: true, desafio: ROUND_ABERTO_MEU, oQueAconteceu: 'abriuRound' },
    });
    await revanchar(dubles);

    expect(await screen.findByText('Mandou. Agora é ele.')).toBeDefined();
    expect(screen.getByText('Sem link ele não fica sabendo.')).toBeDefined();
    // A única saída honesta é cutucar o outro.
    expect(screen.getByRole('button', { name: 'Mandar o link' })).toBeDefined();
    expect(screen.queryByRole('button', { name: 'Revanche' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Aguenta essa' })).toBeNull();
  });

  it('mandei duas vezes o mesmo round: nada duplica e a tela diz o estado real', async () => {
    const dubles = montarDubles({
      aoRevanchar: { ok: true, desafio: ROUND_ABERTO_MEU, oQueAconteceu: 'jaEraMeu' },
    });
    await revanchar(dubles);

    expect(await screen.findByText('Mandou. Agora é ele.')).toBeDefined();
    // Uma linha só no round aberto — a segunda tentativa não entrou.
    expect(document.querySelectorAll('.placar-linha')).toHaveLength(1);
  });

  it('teto de rounds não vira erro: volta pro placar dizendo chega', async () => {
    const dubles = montarDubles({
      aoRevanchar: { ok: false, motivo: 'limiteDeRounds' },
      /*
        O link abre normal — round aberto do outro — e é a RELEITURA, depois do
        teto, que traz a briga estourada. Deixar a primeira abertura já no teto
        faria o teste entrar no placar por um caminho que não existe no jogo.
      */
      aberturaDepois: { ok: true, desafio: NO_TETO },
    });
    await revanchar(dubles);

    expect(await screen.findByText('Cinquenta rounds. Chega, porra.')).toBeDefined();
    expect(screen.getByText('Vocês dois precisam de ajuda.')).toBeDefined();
    // O botão de arrotar some. Nunca ERROR.
    expect(screen.queryByRole('button', { name: 'Revanche' })).toBeNull();
    expect(document.querySelector('.arena')?.getAttribute('data-estado')).toBe('SCOREBOARD');
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
    expect(pedido.texto).toBe('Tá maluco. Isso foi nojento. Parabéns. Duvido bater.');
    /* A frase do juiz está na tela E no texto — é a mesma. */
    expect(screen.getByText('Isso foi nojento. Parabéns.')).toBeDefined();
  });

  it('aparelho que não manda arquivo vai sem cartão, e nada na tela fala em imagem', async () => {
    const dubles = montarDubles({ aoParar: ARROTO });
    await ateANota(dubles);

    /* Sem linha de provocação, sem `Trocar`, sem cartão montado. */
    expect(screen.queryByRole('button', { name: 'Trocar' })).toBeNull();
    expect(screen.queryByText('Vai com:')).toBeNull();
    expect(document.getElementById('cartao-do-aue')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Compartilhar' }));

    await waitFor(() => expect(dubles.compartilhamento.pedidos).toHaveLength(1));
    expect(dubles.compartilhamento.pedidos[0].elementId).toBeUndefined();
    expect(dubles.compartilhamento.pedidos[0].exigirImagem).toBeFalsy();
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

  it('quando nem copiar dá, vira erro de verdade e a nota fica', async () => {
    /*
      NADA SAIU DO APARELHO. Como aviso inline isso era um beco: a tela mandava
      copiar o link na mão e não tinha link nenhum na tela para copiar. Como
      estado, tem as duas saídas — e a nota continua no palco.
    */
    const dubles = montarDubles({
      aoParar: ARROTO,
      copiaFunciona: false,
      resultadoDoCompartilhar: { ok: false, motivo: 'indisponivel' },
    });
    await ateANota(dubles);

    fireEvent.click(screen.getByRole('button', { name: 'Compartilhar' }));

    expect(await screen.findByText('Não saiu daqui.')).toBeDefined();
    expect(screen.getByText('A nota não se perdeu. Foi o envio que falhou.')).toBeDefined();
    expect(document.querySelector('.arena')?.getAttribute('data-estado')).toBe('ERROR');
    expect(document.querySelector('.arena')?.getAttribute('data-com-nota')).toBe('sim');

    /* E a volta devolve o resultado inteiro, com o mesmo número. */
    fireEvent.click(screen.getByRole('button', { name: 'Ver minha nota' }));
    expect(await screen.findByText('Tá maluco.')).toBeDefined();
    expect(document.querySelector('.arena')?.getAttribute('data-estado')).toBe('RESULT');
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
    expect(screen.getByText('Tá maluco.')).toBeDefined();
  });

  it('falha de verdade é dita como falha', async () => {
    const dubles = montarDubles({
      aoParar: ARROTO,
      resultadoDoCompartilhar: { ok: false, motivo: 'falhou', detalhe: 'deu ruim' },
    });
    await ateANota(dubles);

    fireEvent.click(screen.getByRole('button', { name: 'Compartilhar' }));

    expect(await screen.findByText('Não saiu daqui.')).toBeDefined();
    /* Falha técnica de verdade: é aqui que o vermelho pode aparecer. */
    expect(document.querySelector('.comentario.aviso-de-erro')).not.toBeNull();
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
    expect(dubles.compartilhamento.pedidos[0].url).toBe(DESAFIO.link);
  });
});

/*
  ═════════════ O GAME FEEL DA RODADA SOLO ═════════════

  O que estes testes existem para impedir de voltar: a rodada parecendo quatro
  composições trocando de lugar. Cada um trava um pedaço da mesma coisa — a
  cena muda de estado, ela não é substituída.
*/

/** A raiz da Arena, que é onde o estado do movimento mora. */
function arena(): HTMLElement | null {
  return document.querySelector('.arena');
}

function grito(): string {
  return document.querySelector('.grito')?.textContent ?? '';
}

describe('o movimento da rodada', () => {
  it('ARROTAR vira JÁ FOI no mesmo botão, sem nada sumir', async () => {
    const dubles = montarDubles();
    render(<Arena adaptadores={dubles.adaptadores} agora={dubles.agora} />);

    const gatilho = screen.getByRole('button', { name: 'Arrotar' });
    fireEvent.click(gatilho);

    /*
      O MESMO nó. Se o botão fosse desmontado e outro nascesse no lugar, isto
      seria um elemento diferente — e a rodada voltaria a parecer duas telas
      trocando.
    */
    expect(await screen.findByRole('button', { name: 'Já foi' })).toBe(gatilho);
    expect(document.querySelectorAll('.acao button')).toHaveLength(1);
  });

  it('entrar na gravação dispara o anel, e ele não fica em laço', async () => {
    const dubles = montarDubles();
    await ateGravar(dubles);

    expect(arena()?.getAttribute('data-ring')).toBe('1');
    await waitFor(() => expect(arena()?.getAttribute('data-ring')).toBe('0'), { timeout: 2000 });
  });

  it('a conferida bate na Bolha antes de dizer qualquer coisa', async () => {
    const dubles = montarDubles({ aoParar: ARROTO });
    let liberar: (audio: AudioCapturado) => void = () => {};
    dubles.captura.parar = () =>
      new Promise<AudioCapturado>((resolve) => {
        liberar = resolve;
      });

    const jaFoi = await ateGravar(dubles);
    fireEvent.click(jaFoi);

    // O baque primeiro…
    await waitFor(() => expect(arena()?.getAttribute('data-snap')).toBe('1'));
    // …e as três batidas de quem confere logo atrás.
    await waitFor(() => expect(arena()?.getAttribute('data-tick')).toBe('1'));
    // Sem nenhum botão na tela enquanto isso.
    expect(document.querySelectorAll('.acao button')).toHaveLength(0);

    await act(async () => liberar(ARROTO));
  });

  it('arroto que não veio faz a Bolha negar com a cabeça', async () => {
    const dubles = montarDubles({ aoParar: MUDO });
    const jaFoi = await ateGravar(dubles);

    fireEvent.click(jaFoi);

    await waitFor(() => expect(arena()?.getAttribute('data-estado')).toBe('ERROR'));
    expect(arena()?.getAttribute('data-shake')).toBe('1');
  });

  /*
    O nome deste teste dizia "a espera escurece o palco". Não dizia a verdade:
    jsdom não pinta nada, e o que a regra de CSS faz no `--bg` de hoje é menos
    de 2% de claridade (conta no `arena.css`). O que dá para cobrar aqui é o
    CICLO DE VIDA do atributo — ele entra com o estado e sai com o estado,
    inclusive quando a saída é erro. É isso que o teste cobra, e só isso.
  */
  it('a marca da espera entra com o JUDGING e sai junto com ele', async () => {
    const dubles = montarDubles({ aoParar: ARROTO, juizDemoraMs: 50 });
    await ateAOrigem(dubles);

    fireEvent.click(screen.getByRole('button', { name: /Cerveja/ }));

    await waitFor(() => expect(arena()?.getAttribute('data-estado')).toBe('JUDGING'));
    expect(arena()?.getAttribute('data-dim')).toBe('1');

    await waitFor(() => expect(arena()?.getAttribute('data-estado')).toBe('RESULT'), {
      timeout: 4000,
    });
    expect(arena()?.getAttribute('data-dim')).toBe('0');
  });

  it('a marca da espera não fica pendurada quando o JUDGING vira erro', async () => {
    const dubles = montarDubles({ aoParar: ARROTO, juizDemoraMs: 60_000 });
    await ateANota(dubles);

    expect(arena()?.getAttribute('data-estado')).toBe('ERROR');
    expect(arena()?.getAttribute('data-dim')).toBe('0');
  });
});

describe('a espera que estica', () => {
  it('espera curta não ganha segunda fala', async () => {
    const dubles = montarDubles({ aoParar: ARROTO, juizDemoraMs: 30_000 });
    await ateAOrigem(dubles);

    vi.useFakeTimers();
    fireEvent.click(screen.getByRole('button', { name: /Cerveja/ }));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(LIMIAR_DA_ESPERA_LONGA_MS - 100);
    });

    expect((JULGANDO as readonly string[]).includes(grito())).toBe(true);
    vi.useRealTimers();
  });

  it('passou do limiar de verdade, o jogo diz outra coisa', async () => {
    const dubles = montarDubles({ aoParar: ARROTO, juizDemoraMs: 30_000 });
    await ateAOrigem(dubles);

    vi.useFakeTimers();
    fireEvent.click(screen.getByRole('button', { name: /Cerveja/ }));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(LIMIAR_DA_ESPERA_LONGA_MS + 100);
    });

    expect((JULGANDO_DEMORANDO as readonly string[]).includes(grito())).toBe(true);
    // E nada de progresso inventado junto: nenhuma barra na tela.
    expect(document.querySelector('.trilho')).toBeNull();
    vi.useRealTimers();
  });
});

describe('a revelação em cascata', () => {
  /*
    A cascata é opacidade, não montagem: os três blocos nascem juntos dentro da
    região `aria-live` (senão o leitor de tela anuncia em três pedaços) e o que
    entra em cascata é o `data-visivel`. Então o teste pergunta o atributo, não
    se o texto está no DOM.
  */
  const visivel = (texto: string) =>
    screen.getByText(texto).closest('.cascata')?.getAttribute('data-visivel');

  it('a nota entra sozinha, e o X1 é o último a ganhar presença', async () => {
    const dubles = montarDubles({ aoParar: ARROTO, juizDemoraMs: 10 });
    await ateAOrigem(dubles);

    vi.useFakeTimers();
    fireEvent.click(screen.getByRole('button', { name: /Cerveja/ }));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(PISO_DO_TEATRO_MS + 50);
    });

    // Primeiro quadro do RESULT: só o número, e a faixa de ação sem presença.
    expect(arena()?.getAttribute('data-estado')).toBe('RESULT');
    expect(visivel(NOTA.classificacao)).toBe('0');
    expect(visivel(NOTA.frase)).toBe('0');
    expect(visivel('Força')).toBe('0');
    expect(document.querySelector('.acao')?.getAttribute('data-pronta')).toBe('0');

    /*
      Anda de vinte em vinte até a reação entrar. Marcar o relógio exato em que
      a contagem termina daria um teste que quebra quando alguém mexe na
      duração dela — o que importa aqui é a ORDEM, não o cronômetro.
    */
    for (let passo = 0; passo < 200 && visivel(NOTA.classificacao) === '0'; passo += 1) {
      await act(async () => {
        await vi.advanceTimersByTimeAsync(20);
      });
    }
    expect(visivel(NOTA.classificacao)).toBe('1');
    // A zoeira e as medidas ainda não: a ordem é requisito, não estilo.
    expect(visivel(NOTA.frase)).toBe('0');
    expect(visivel('Força')).toBe('0');
    expect(document.querySelector('.acao')?.getAttribute('data-pronta')).toBe('0');

    const passoDoComentario =
      ATRASOS_DA_REVELACAO_MS.comentario - ATRASOS_DA_REVELACAO_MS.reacao;
    await act(async () => {
      await vi.advanceTimersByTimeAsync(passoDoComentario);
    });
    expect(visivel(NOTA.frase)).toBe('1');
    expect(visivel('Força')).toBe('0');

    await act(async () => {
      await vi.advanceTimersByTimeAsync(ATRASOS_DA_REVELACAO_MS.medidas);
    });
    expect(visivel('Força')).toBe('1');

    await act(async () => {
      await vi.advanceTimersByTimeAsync(ATRASOS_DA_REVELACAO_MS.x1);
    });
    expect(document.querySelector('.acao')?.getAttribute('data-pronta')).toBe('1');
    vi.useRealTimers();
  });

  it('durante a cascata não existe botão nenhum na faixa de ação', async () => {
    const dubles = montarDubles({ aoParar: ARROTO, juizDemoraMs: 10 });
    await ateAOrigem(dubles);

    vi.useFakeTimers();
    fireEvent.click(screen.getByRole('button', { name: /Cerveja/ }));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(PISO_DO_TEATRO_MS + 50);
    });

    /*
      Alvo invisível que dispara ação sem volta é pior que toque engolido:
      "Vou mandar outro!" reabre o microfone e joga fora a nota que a pessoa
      ainda não viu, e o compartilhar abre a folha do sistema por cima de um
      resultado invisível. Enquanto a revelação corre, os três não existem —
      igual ao protótipo.
    */
    expect(document.querySelector('.acao')?.getAttribute('data-pronta')).toBe('0');
    expect(document.querySelectorAll('.acao button')).toHaveLength(0);
    expect(screen.queryByRole('button', { name: CHAMAR_PRO_X1 })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Vou mandar outro!' })).toBeNull();

    /*
      E no fim da cascata os três nascem juntos. Anda de vinte em vinte em vez
      de marcar o relógio exato: a cascata só é agendada quando a CONTAGEM
      termina, e cravar o número faria o teste quebrar quando alguém mexer na
      duração dela.
    */
    for (
      let passo = 0;
      passo < 400 && document.querySelector('.acao')?.getAttribute('data-pronta') === '0';
      passo += 1
    ) {
      await act(async () => {
        await vi.advanceTimersByTimeAsync(20);
      });
    }
    expect(document.querySelector('.acao')?.getAttribute('data-pronta')).toBe('1');
    expect(screen.getByRole('button', { name: CHAMAR_PRO_X1 })).toBeDefined();

    fireEvent.click(screen.getByRole('button', { name: CHAMAR_PRO_X1 }));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(screen.getByRole('dialog')).toBeDefined();
    vi.useRealTimers();
  });

  it('a segunda revelação da sessão entra inteira, sem teatro', { timeout: 20_000 }, async () => {
    const dubles = montarDubles({ aoParar: ARROTO });
    await ateANota(dubles);

    fireEvent.click(await screen.findByRole('button', { name: 'Vou mandar outro!' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Já foi' }));
    fireEvent.click(await screen.findByRole('button', { name: /Cerveja/ }));

    // Piada boa não se conta duas vezes: o X1 já está de pé junto com a nota.
    expect(await screen.findByText(NOTA.frase, {}, { timeout: 4000 })).toBeDefined();
    expect(document.querySelector('.acao')?.getAttribute('data-pronta')).toBe('1');
  });
});

/*
  O ERRO REAGE NO TAMANHO DO ESTRAGO.

  O `ARENA.md` §2 pede duas coisas que o estado não entregava: "erros de peso
  diferente reagem com peso diferente" e "nunca mostra nota quando não houve
  nota" — que só vira promessa de verdade agora que existe erro COM nota.
*/
describe('o peso do erro na tela', () => {
  it('peso leve: uma saída, Bolha murcha e nenhum vermelho', async () => {
    const dubles = montarDubles({ aoParar: MUDO });
    const parar = await ateGravar(dubles);

    fireEvent.click(parar);
    await screen.findByText('Não veio nada.');

    const arena = document.querySelector('.arena');
    expect(arena?.getAttribute('data-peso')).toBe('leve');
    expect(document.querySelector('.bolha-wrap')?.getAttribute('data-modo')).toBe('chata');
    expect(document.querySelectorAll('.acao button')).toHaveLength(1);
    /* `--danger` é de falha técnica. Não veio som não é falha técnica. */
    expect(document.querySelector('.aviso-de-erro')).toBeNull();
  });

  it('peso parede: a dica de como liberar o microfone', async () => {
    const { adaptadores } = montarDubles({ resposta: { ok: false, motivo: 'negado' } });
    render(<Arena adaptadores={adaptadores} />);

    fireEvent.click(screen.getByRole('button', { name: 'Arrotar' }));
    await screen.findByText('Sem microfone não tem jogo.');

    expect(document.querySelector('.arena')?.getAttribute('data-peso')).toBe('parede');
    expect(screen.getByText(DICA_DO_MICROFONE)).toBeDefined();
    expect(document.querySelector('.bolha-wrap')?.getAttribute('data-modo')).toBe('morta');
  });

  it('peso já era: uma saída, e ela chama pra arrotar', async () => {
    const dubles = montarDubles({ abertura: { ok: false, motivo: 'expirado' } });
    render(<Arena codigoDoDesafio="VENCIDOAAA" adaptadores={dubles.adaptadores} />);

    await screen.findByText('Essa disputa já era.');

    expect(document.querySelector('.arena')?.getAttribute('data-peso')).toBe('jaEra');
    expect(document.querySelectorAll('.acao button')).toHaveLength(1);
    expect(screen.getByRole('button', { name: 'Arrotar' })).toBeDefined();
    /* A dica é do microfone. Aqui não há permissão nenhuma para liberar. */
    expect(document.querySelector('.dica')).toBeNull();
  });

  it('já era COM nota na mão continua com uma saída, e ela arrota', async () => {
    /*
      REGRESSÃO, e das feias. A disputa vence enquanto a pessoa está gravando a
      resposta: o erro nasce do `RESULT` e herda a nota. Enquanto o ramo com
      nota não olhava o peso, a tela mandava "manda um novo" e oferecia "Ver
      minha nota" — que devolve para o botão que manda de novo para a disputa
      morta. A pessoa dava a volta e caía no mesmo erro, sem nada na tela
      dizendo por quê.
    */
    const dubles = montarDubles({ respostaEnviada: { ok: false, motivo: 'expirado' } });
    await ateOPlacar(dubles);

    expect(await screen.findByText('Essa disputa já era.')).toBeDefined();
    expect(document.querySelector('.arena')?.getAttribute('data-peso')).toBe('jaEra');
    /* A nota herdada continua no palco: ela não morreu com a disputa. */
    expect(document.querySelector('.arena')?.getAttribute('data-com-nota')).toBe('sim');
    expect(document.querySelectorAll('.acao button')).toHaveLength(1);
    expect(screen.getByRole('button', { name: 'Arrotar' })).toBeDefined();
    expect(screen.queryByRole('button', { name: 'Ver minha nota' })).toBeNull();

    /* E o botão faz o que diz: volta pro começo, com a Arena pronta pra arrotar. */
    fireEvent.click(screen.getByRole('button', { name: 'Arrotar' }));
    await waitFor(() =>
      expect(document.querySelector('.arena')?.getAttribute('data-estado')).toBe('IDLE'),
    );
  });

  it('erro sem nota não mostra número nenhum no palco', async () => {
    const dubles = montarDubles({ aoParar: MUDO });
    const parar = await ateGravar(dubles);

    fireEvent.click(parar);
    await screen.findByText('Não veio nada.');

    expect(document.querySelector('.palco-nota')).toBeNull();
    expect(document.querySelector('.arena')?.getAttribute('data-com-nota')).toBe('nao');
  });

  it('peso quebrou com nota: o número fica, marcado como salvo, e tem volta', async () => {
    const dubles = montarDubles({
      aoParar: ARROTO,
      respostaDoDesafio: { ok: false, motivo: 'semRede' },
    });
    await ateODesafio(dubles);

    await screen.findByText('Sem sinal, sem briga.');

    expect(document.querySelector('.arena')?.getAttribute('data-peso')).toBe('quebrou');
    expect(screen.getByText('Tá aqui')).toBeDefined();
    expect(document.querySelector('.palco-nota')).not.toBeNull();
    /* A Bolha segura a nota: viva, sem cara de estrago. */
    expect(document.querySelector('.bolha-wrap')?.getAttribute('data-modo')).toBe('esperando');
    expect(document.querySelectorAll('.acao button')).toHaveLength(2);
  });

  it('"deixa quieto" encerra a partida, e aí a nota some mesmo', async () => {
    const dubles = montarDubles({
      aoParar: ARROTO,
      respostaDoDesafio: { ok: false, motivo: 'semRede' },
    });
    await ateODesafio(dubles);
    await screen.findByText('Sem sinal, sem briga.');

    fireEvent.click(screen.getByRole('button', { name: 'Deixa quieto' }));

    expect(await screen.findByRole('button', { name: 'Arrotar' })).toBeDefined();
    expect(document.querySelector('.palco-nota')).toBeNull();
  });

  /*
    REGRESSÃO. O "vou mandar outro" apagava o arroto no toque, antes de saber
    se a gravação nova ia começar. Microfone negado ali dentro deixava a pessoa
    voltando para uma nota sem áudio nenhum por trás — o X1 falharia sem dizer
    por quê.
  */
  it('microfone negado no "vou mandar outro" devolve a nota E o arroto', async () => {
    const dubles = montarDubles({ aoParar: ARROTO });
    await ateANota(dubles);

    dubles.captura.pedir = async () => ({ ok: false, motivo: 'negado' });
    fireEvent.click(screen.getByRole('button', { name: 'Vou mandar outro!' }));

    await screen.findByText('Sem microfone não tem jogo.');
    fireEvent.click(screen.getByRole('button', { name: 'Ver minha nota' }));

    expect(await screen.findByText('Tá maluco.')).toBeDefined();

    /* E o X1 continua funcionando: o arroto está lá para subir. */
    fireEvent.click(screen.getByRole('button', { name: 'Chamar pro X1' }));
    fireEvent.change(screen.getByLabelText('Teu apelido'), { target: { value: 'Guinho' } });
    fireEvent.click(screen.getByRole('button', { name: 'Tá bom, manda' }));

    await waitFor(() => expect(dubles.desafios.chamadas).toBe(1));
  });
});

/*
  A NOTA VIRANDO IMAGEM (#151).

  O que estes testes seguram:

  1. o botão nunca promete imagem em aparelho que não manda arquivo — lá ele
     continua sendo o texto e link de sempre;
  2. o que está escrito na linha é EXATAMENTE o que sai na imagem e no texto.
     Se divergirem, o `Trocar` vira enfeite;
  3. `exigirImagem` viaja junto — é ele que impede o texto escondido de sair
     no lugar da nota;
  4. compartilhar, cancelar e falhar não mexem na nota que está na tela.
*/
describe('a nota vira imagem', () => {
  it('onde o aparelho manda arquivo, o cartão existe fora da vista', async () => {
    const dubles = montarDubles({ aoParar: ARROTO, sabeMandarImagem: true });
    await ateANota(dubles);

    const cartao = document.getElementById('cartao-do-aue');
    expect(cartao).not.toBeNull();
    /* Fora do leitor de tela e fora da ordem de tabulação. */
    expect(cartao?.getAttribute('aria-hidden')).toBe('true');
    /* E a nota aparece lá dentro, escrita igual à da tela. */
    expect(cartao?.textContent).toContain('91,4');
  });

  it('a linha já vem preenchida com a reação que está na tela', async () => {
    const dubles = montarDubles({ aoParar: ARROTO, sabeMandarImagem: true });
    await ateANota(dubles);

    expect(screen.getByText('Vai com:')).toBeDefined();
    const cartao = document.getElementById('cartao-do-aue');
    expect(cartao?.textContent).toContain('Isso foi nojento. Parabéns.');
  });

  it('o Trocar roda a lista e volta ao começo', async () => {
    const dubles = montarDubles({ aoParar: ARROTO, sabeMandarImagem: true });
    await ateANota(dubles);

    const trocar = screen.getByRole('button', { name: 'Trocar' });
    const impresso = () => document.getElementById('cartao-do-aue')?.textContent ?? '';

    const passeio: string[] = [];
    for (let i = 0; i < 5; i++) {
      fireEvent.click(trocar);
      passeio.push(impresso());
    }

    expect(passeio[0]).toContain('Duvido bater.');
    expect(passeio[1]).toContain('Cadê o teu?');
    expect(passeio[2]).toContain('Vai amarelar?');
    expect(passeio[3]).toContain('Peita essa.');
    /* Chegou no fim e voltou pra reação do juiz. */
    expect(passeio[4]).toContain('Isso foi nojento. Parabéns.');
  });

  it('o que está na linha é o que sai na imagem e no texto', async () => {
    const dubles = montarDubles({ aoParar: ARROTO, sabeMandarImagem: true });
    await ateANota(dubles);

    fireEvent.click(screen.getByRole('button', { name: 'Trocar' }));
    fireEvent.click(screen.getByRole('button', { name: 'Compartilhar' }));

    await waitFor(() => expect(dubles.compartilhamento.pedidos).toHaveLength(1));
    const pedido = dubles.compartilhamento.pedidos[0];

    expect(pedido.elementId).toBe('cartao-do-aue');
    expect(pedido.exigirImagem).toBe(true);
    expect(pedido.texto).toContain('Duvido bater.');
    expect(document.getElementById('cartao-do-aue')?.textContent).toContain('Duvido bater.');
  });

  /*
    ESTE TESTE MUDOU NO MERGE COM A #102, e a mudança é de propósito.

    Ele nasceu exigindo que a falha ficasse inline e a pessoa continuasse no
    `RESULT`. A #102 decidiu diferente e decidiu melhor: falha ao compartilhar
    vira `ERROR` de verdade, **com a nota junto**. O aviso inline dava a notícia
    e deixava a pessoa num beco — o `RESULT` não tem botão de copiar avulso,
    então "copia o link na mão" mandava fazer uma coisa que não estava na tela.

    O que este teste segura continua sendo o mesmo e é o que importa: **nada de
    texto escondido saindo no lugar da imagem**, e **a nota não se perde**. Só o
    lugar onde ela aparece mudou.
  */
  it('falhar não manda texto escondido, e a nota vai junto pro erro', async () => {
    const dubles = montarDubles({
      aoParar: ARROTO,
      sabeMandarImagem: true,
      resultadoDoCompartilhar: { ok: false, motivo: 'falhou', detalhe: 'canvas morreu' },
    });
    await ateANota(dubles);

    fireEvent.click(screen.getByRole('button', { name: 'Compartilhar' }));

    /* Um pedido só: nada de tentar de novo por baixo mandando só o link. */
    await waitFor(() => expect(dubles.compartilhamento.pedidos).toHaveLength(1));
    expect(dubles.compartilhamento.copiados).toHaveLength(0);

    /* A nota não se perdeu — ela está no palco do erro, com o rótulo do agora. */
    expect(await screen.findByText('Tá aqui')).toBeDefined();
    expect(document.querySelector('.palco-nota')).not.toBeNull();
  });

  it('cancelar volta pro resultado sem aviso nenhum', async () => {
    const dubles = montarDubles({
      aoParar: ARROTO,
      sabeMandarImagem: true,
      resultadoDoCompartilhar: { ok: false, motivo: 'cancelado' },
    });
    await ateANota(dubles);

    fireEvent.click(screen.getByRole('button', { name: 'Trocar' }));
    fireEvent.click(screen.getByRole('button', { name: 'Compartilhar' }));

    await waitFor(() => expect(dubles.compartilhamento.pedidos).toHaveLength(1));
    expect(screen.queryByText('Não rolou compartilhar. Tenta de novo.')).toBeNull();
    /* A escolha continua de pé: ela pode querer mandar de novo pra outro grupo. */
    expect(document.getElementById('cartao-do-aue')?.textContent).toContain('Duvido bater.');
  });

  it('o botão não muda de rótulo e não promete imagem', async () => {
    const dubles = montarDubles({ aoParar: ARROTO, sabeMandarImagem: true });
    await ateANota(dubles);

    const botao = screen.getByRole('button', { name: 'Compartilhar' });
    expect(botao.textContent).toBe('Compartilhar');
    expect(screen.queryByText(/imagem/i)).toBeNull();
  });
});
