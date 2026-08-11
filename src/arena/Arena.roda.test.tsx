// @vitest-environment jsdom
/**
 * A RODA DENTRO DA ARENA, com aparelho de mentira e servidor de mentira.
 *
 * O que este arquivo existe para impedir de voltar:
 *
 * 1. **a vez indo para a pessoa errada.** Ela é derivada do que está gravado, e
 *    o teste percorre a mesa inteira conferindo o nome de quem está com o
 *    telefone;
 * 2. **arroto fantasma no pódio.** Falha ao registrar o turno vira `ERROR`, e a
 *    vez volta para a MESMA pessoa;
 * 3. **estado novo nascendo.** A roda mora em `IDLE`, `RESULT` e `SCOREBOARD`,
 *    e a única aresta nova é `SCOREBOARD → IDLE`;
 * 4. **mesa morta ressuscitando** na reabertura do jogo.
 *
 * A flag é ligada aqui na mão: em produção ela nasce desligada, e é a disputa
 * de 5 pessoas × 3 rounds num telefone real que libera ligar.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

vi.mock('../shared/flags', () => ({
  FLAGS: {
    ligas: false,
    assinatura: false,
    push: false,
    gruposAvancados: false,
    feed: false,
    ranking: false,
    perfil: false,
    xp: false,
    loginSocial: false,
    disputaLocal: false,
    disputaNaArena: true,
    arena: true,
  },
}));

import { CHAVES } from '../portas/armazenamento';
import type { AudioCapturado } from '../portas/captura';
import type { Nota, ResultadoDaPontuacao } from '../portas/pontuacao';
import type { PedidoDeCompartilhamento } from '../portas/compartilhamento';
import type {
  AberturaDoDesafio,
  ResultadoDaRevanche,
  ResultadoDoDesafio,
} from '../portas/desafios';
import type {
  PedidoDeRoda,
  PedidoDeTurno,
  RespostaDaRoda,
  Roda,
} from '../portas/disputaLocal';
import { PISO_DO_TEATRO_MS, TETO_DA_ANALISE_MS } from '../nucleo/julgamento/tempo';
import { Arena } from './Arena';
import type { AdaptadoresDaArena } from './adaptadores';

afterEach(cleanup);

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

interface Opcoes {
  guardado?: Record<string, string>;
  /** A roda já montada, para os testes que não precisam abrir. */
  mesa?: Roda;
  /** Faz `abrir` falhar. */
  naoAbre?: RespostaDaRoda;
  /** Faz `gravarTurno` falhar. */
  turnoFalha?: RespostaDaRoda;
  /**
   * Segura `gravarTurno` no ar até o teste soltar.
   *
   * É a janela do defeito: a nota já está na tela e o arroto ainda não chegou
   * no servidor. Sem isso não dá para provar que as saídas ficam travadas.
   */
  turnoTrava?: boolean;
  /** Faz `ler` responder outra coisa na retomada. */
  aoLer?: RespostaDaRoda;
  /** Notas em sequência, para os turnos saírem diferentes. */
  notas?: number[];
  sabeMandarImagem?: boolean;
}

/**
 * O SERVIDOR DE MENTIRA GUARDA ESTADO DE VERDADE.
 *
 * Ele monta a mesa a partir dos nomes e vai empilhando os arrotos, como a RPC
 * faz. Um dublê que devolvesse sempre a mesma roda não provaria nada sobre a
 * vez — que é justamente a regra mais fácil de errar aqui.
 */
function montarDubles(opcoes: Opcoes = {}) {
  const guardado: Record<string, string> = { ...opcoes.guardado };
  const escondedores: Array<() => void> = [];
  const relogio = 1_000_000;
  const notas = [...(opcoes.notas ?? [])];

  let mesa: Roda | null = opcoes.mesa ?? null;

  let soltarTurno: () => void = () => {};
  const travaDoTurno = opcoes.turnoTrava
    ? new Promise<void>((resolve) => {
        soltarTurno = resolve;
      })
    : null;

  const captura = {
    vivo: false,
    gravando: false,
    async pedir() {
      captura.vivo = true;
      return { ok: true as const };
    },
    comecar() {
      captura.gravando = true;
      return true;
    },
    async parar(): Promise<AudioCapturado> {
      captura.gravando = false;
      captura.vivo = false;
      return ARROTO;
    },
    nivelAtual: () => 0.5,
    soltar() {
      captura.vivo = false;
      captura.gravando = false;
    },
    estaVivo: () => captura.vivo,
    estaGravando: () => captura.gravando,
  };

  const pontuador = {
    async pontuar(): Promise<ResultadoDaPontuacao> {
      const nota = notas.shift();
      return { ok: true, nota: nota === undefined ? NOTA : { ...NOTA, nota } };
    },
  };

  const detector = {
    preparar() {},
    async podePontuar() {
      return true;
    },
  };

  const disputaLocal = {
    aberturas: 0,
    leituras: 0,
    turnos: [] as PedidoDeTurno[],
    async abrir(pedido: PedidoDeRoda): Promise<RespostaDaRoda> {
      disputaLocal.aberturas += 1;
      if (opcoes.naoAbre) return opcoes.naoAbre;
      mesa = {
        codigo: 'ABCDEFGHJK',
        participantes: pedido.nomes.map((nome, i) => ({ id: `p${i}`, nome })),
        arrotos: [],
        rounds: pedido.rounds,
        local: pedido.local,
      };
      return { ok: true, roda: mesa };
    },
    async ler(): Promise<RespostaDaRoda> {
      disputaLocal.leituras += 1;
      if (opcoes.aoLer) return opcoes.aoLer;
      return mesa ? { ok: true, roda: mesa } : { ok: false, motivo: 'naoExiste' };
    },
    async gravarTurno(pedido: PedidoDeTurno): Promise<RespostaDaRoda> {
      disputaLocal.turnos.push(pedido);
      if (travaDoTurno) await travaDoTurno;
      if (opcoes.turnoFalha) return opcoes.turnoFalha;
      if (!mesa) return { ok: false, motivo: 'naoExiste' };
      mesa = {
        ...mesa,
        arrotos: [
          ...mesa.arrotos,
          { participanteId: pedido.participanteId, nota: pedido.nota.nota },
        ],
      };
      return { ok: true, roda: mesa };
    },
  };

  const compartilhamento = {
    pedidos: [] as PedidoDeCompartilhamento[],
    async compartilhar(pedido: PedidoDeCompartilhamento) {
      compartilhamento.pedidos.push(pedido);
      return { ok: true as const, via: 'texto' as const };
    },
    async copiar() {
      return true;
    },
    sabeMandarImagem() {
      return opcoes.sabeMandarImagem ?? false;
    },
  };

  const desafios = {
    async criar(): Promise<ResultadoDoDesafio> {
      return { ok: false, motivo: 'falhou', detalhe: 'não é o assunto deste arquivo' };
    },
    async abrir(): Promise<AberturaDoDesafio> {
      return { ok: false, motivo: 'naoExiste' };
    },
    async enderecoDoAudio() {
      return null;
    },
    async apagarMeuArroto() {
      return 'naoDeu' as const;
    },
    async responder(): Promise<AberturaDoDesafio> {
      return { ok: false, motivo: 'naoExiste' };
    },
    async revanchar(): Promise<ResultadoDaRevanche> {
      return { ok: false, motivo: 'naoExiste' };
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
    disputaLocal,
    compartilhamento,
    guardado,
    agora: () => relogio,
    soltarOTurno: () => soltarTurno(),
  };
}

function estadoDaArena(): string | null | undefined {
  return document.querySelector('.arena')?.getAttribute('data-estado');
}

/** Abre a Arena, monta a mesa e volta com a roda de pé. */
async function ateARodaAberta(
  dubles: ReturnType<typeof montarDubles>,
  nomes: string[] = ['Carol', 'Bruno'],
  rounds = 1,
) {
  render(<Arena adaptadores={dubles.adaptadores} agora={dubles.agora} />);
  fireEvent.click(screen.getByRole('button', { name: 'Chamar a mesa' }));

  nomes.forEach((nome, i) => {
    if (i > 1) fireEvent.click(screen.getByRole('button', { name: '+ mais um' }));
    fireEvent.change(screen.getByLabelText(`Nome de quem entra, ${i + 1}`), {
      target: { value: nome },
    });
  });

  if (rounds !== 1) {
    fireEvent.click(screen.getByRole('button', { name: String(rounds) }));
  }

  fireEvent.click(screen.getByRole('button', { name: 'Abrir a roda' }));
  await waitFor(() => expect(screen.getByText(`Agora é você, ${nomes[0]}`)).toBeDefined());
}

/** Um turno inteiro: manda, para, escolhe a origem e espera a nota. */
async function umTurno(rotuloDoBotao: string | RegExp = 'Manda') {
  fireEvent.click(screen.getByRole('button', { name: rotuloDoBotao }));
  const parar = await screen.findByRole('button', { name: 'Parar' });
  fireEvent.click(parar);
  const alvo = await screen.findByRole('button', { name: /Cerveja/ });

  vi.useFakeTimers();
  fireEvent.click(alvo);
  await act(async () => {
    await vi.advanceTimersByTimeAsync(TETO_DA_ANALISE_MS + PISO_DO_TEATRO_MS + 200);
  });
  await act(async () => {
    await vi.advanceTimersByTimeAsync(2000);
  });
  vi.useRealTimers();
}

describe('abrir a roda', () => {
  it('a sobreposição pinta por cima e o estado não muda', () => {
    const dubles = montarDubles();
    render(<Arena adaptadores={dubles.adaptadores} agora={dubles.agora} />);

    fireEvent.click(screen.getByRole('button', { name: 'Chamar a mesa' }));

    expect(screen.getByRole('dialog')).toBeDefined();
    expect(screen.getByText('Quem tá na roda?')).toBeDefined();
    /* Sobreposição não é estado (`ARENA.md` §1). */
    expect(estadoDaArena()).toBe('IDLE');
  });

  it('o aviso de gravação fica na mesma tela onde os nomes são escritos', () => {
    const dubles = montarDubles();
    render(<Arena adaptadores={dubles.adaptadores} agora={dubles.agora} />);
    fireEvent.click(screen.getByRole('button', { name: 'Chamar a mesa' }));

    const caixa = screen.getByRole('dialog');
    expect(caixa.textContent).toContain('O celular vai gravar todo mundo aí.');
    expect(caixa.querySelector('input')).not.toBeNull();
  });

  it('com menos de dois nomes o botão nasce travado — não é mensagem depois do toque', () => {
    const dubles = montarDubles();
    render(<Arena adaptadores={dubles.adaptadores} agora={dubles.agora} />);
    fireEvent.click(screen.getByRole('button', { name: 'Chamar a mesa' }));

    const abrir = screen.getByRole('button', { name: 'Abrir a roda' });
    expect((abrir as HTMLButtonElement).disabled).toBe(true);

    fireEvent.change(screen.getByLabelText('Nome de quem entra, 1'), {
      target: { value: 'Carol' },
    });
    expect((abrir as HTMLButtonElement).disabled).toBe(true);

    fireEvent.change(screen.getByLabelText('Nome de quem entra, 2'), {
      target: { value: 'Bruno' },
    });
    expect((abrir as HTMLButtonElement).disabled).toBe(false);
  });

  it('aberta a roda, o IDLE diz de quem é a vez e em que round a mesa está', async () => {
    const dubles = montarDubles();
    await ateARodaAberta(dubles, ['Carol', 'Bruno'], 2);

    expect(screen.getByText('Agora é você, Carol')).toBeDefined();
    expect(screen.getByText('Round 1 de 2')).toBeDefined();
    expect(estadoDaArena()).toBe('IDLE');
  });

  it('guarda só o número da mesa no aparelho', async () => {
    const dubles = montarDubles();
    await ateARodaAberta(dubles);
    expect(dubles.guardado[CHAVES.roda]).toBe('ABCDEFGHJK');
  });

  it('não abriu, vira ERROR e nenhuma roda fica pela metade na tela', async () => {
    const dubles = montarDubles({ naoAbre: { ok: false, motivo: 'semRede' } });
    render(<Arena adaptadores={dubles.adaptadores} agora={dubles.agora} />);
    fireEvent.click(screen.getByRole('button', { name: 'Chamar a mesa' }));

    fireEvent.change(screen.getByLabelText('Nome de quem entra, 1'), {
      target: { value: 'Carol' },
    });
    fireEvent.change(screen.getByLabelText('Nome de quem entra, 2'), {
      target: { value: 'Bruno' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Abrir a roda' }));

    await waitFor(() => expect(estadoDaArena()).toBe('ERROR'));
    expect(screen.getByText('Não deu pra abrir a roda.')).toBeDefined();
    expect(screen.getByRole('button', { name: /Tentar de novo|Bora/ })).toBeDefined();
    expect(screen.queryByText(/Agora é você/)).toBeNull();
    expect(dubles.guardado[CHAVES.roda]).toBeUndefined();
  });
});

describe('a roda andando', () => {
  it('o turno percorre o loop de sempre e cai no RESULT com o passa-o-celular', async () => {
    const dubles = montarDubles();
    await ateARodaAberta(dubles);

    await umTurno();

    expect(estadoDaArena()).toBe('RESULT');
    expect(screen.getByRole('button', { name: 'Passa o celular' })).toBeDefined();
    expect(screen.getByText('Passa o celular pro Bruno.')).toBeDefined();
    /* Na roda não se chama ninguém pro X1: a briga já está acontecendo. */
    expect(screen.queryByRole('button', { name: 'Chamar pro X1' })).toBeNull();
  });

  it('a vez anda para o próximo da lista, e o round só vira quando todos jogaram', async () => {
    const dubles = montarDubles({ notas: [90, 70, 60, 80] });
    await ateARodaAberta(dubles, ['Carol', 'Bruno'], 2);

    await umTurno();
    fireEvent.click(screen.getByRole('button', { name: 'Passa o celular' }));
    expect(screen.getByText('Agora é você, Bruno')).toBeDefined();
    expect(screen.getByText('Round 1 de 2')).toBeDefined();

    await umTurno();
    fireEvent.click(screen.getByRole('button', { name: 'Passa o celular' }));
    expect(screen.getByText('Agora é você, Carol')).toBeDefined();
    expect(screen.getByText('Round 2 de 2')).toBeDefined();
  });

  it('o último arroto troca o CTA por VER O PÓDIO', async () => {
    const dubles = montarDubles({ notas: [90, 70] });
    await ateARodaAberta(dubles);

    await umTurno();
    fireEvent.click(screen.getByRole('button', { name: 'Passa o celular' }));
    await umTurno();

    expect(screen.getByRole('button', { name: 'Ver o pódio' })).toBeDefined();
    expect(screen.queryByRole('button', { name: 'Passa o celular' })).toBeNull();
  });

  it('o arroto entra na roda com o nome de quem gravou, e não com o do dono do aparelho', async () => {
    const dubles = montarDubles();
    await ateARodaAberta(dubles);
    await umTurno();

    expect(dubles.disputaLocal.turnos).toHaveLength(1);
    expect(dubles.disputaLocal.turnos[0]?.participanteId).toBe('p0');
    expect(dubles.disputaLocal.turnos[0]?.codigo).toBe('ABCDEFGHJK');
  });

  it('turno que não sobe vira ERROR, e a vez volta para a MESMA pessoa', async () => {
    const dubles = montarDubles({ turnoFalha: { ok: false, motivo: 'semRede' } });
    await ateARodaAberta(dubles);

    await umTurno();

    expect(estadoDaArena()).toBe('ERROR');
    expect(screen.getByText('Esse arroto não entrou. Carol manda de novo.')).toBeDefined();

    /*
      O ERRO COM NOTA NA MÃO TEM DUAS SAÍDAS, e as duas devolvem a vez para a
      Carol — ela não gravou, e a vez é derivada do que está gravado. A discreta
      encerra a partida e cai no `IDLE`, que é onde a roda espera.
    */
    fireEvent.click(screen.getByRole('button', { name: 'Deixa quieto' }));
    expect(estadoDaArena()).toBe('IDLE');
    expect(screen.getByText('Agora é você, Carol')).toBeDefined();
  });

  it('a outra saída do erro volta pra nota, e a vez continua sendo da mesma pessoa', async () => {
    const dubles = montarDubles({ turnoFalha: { ok: false, motivo: 'semRede' } });
    await ateARodaAberta(dubles);

    await umTurno();
    expect(estadoDaArena()).toBe('ERROR');

    /* A principal devolve o resultado inteiro — é o que o erro tinha tirado. */
    fireEvent.click(screen.getByRole('button', { name: 'Ver minha nota' }));
    expect(estadoDaArena()).toBe('RESULT');

    fireEvent.click(screen.getByRole('button', { name: 'Passa o celular' }));
    /*
      A mesa não andou: o arroto que não subiu não virou linha no pódio, e a vez
      derivada continua sendo dela.
    */
    expect(screen.getByText('Agora é você, Carol')).toBeDefined();
  });
});

describe('o pódio', () => {
  async function ateOPodio(dubles: ReturnType<typeof montarDubles>) {
    await ateARodaAberta(dubles, ['Carol', 'Bruno', 'Rafa']);
    await umTurno();
    fireEvent.click(screen.getByRole('button', { name: 'Passa o celular' }));
    await umTurno();
    fireEvent.click(screen.getByRole('button', { name: 'Passa o celular' }));
    await umTurno();
    fireEvent.click(screen.getByRole('button', { name: 'Ver o pódio' }));
  }

  it('fecha a mesa no SCOREBOARD, sem estado novo', async () => {
    const dubles = montarDubles({ notas: [90, 70, 50] });
    await ateOPodio(dubles);

    expect(estadoDaArena()).toBe('SCOREBOARD');
    expect(screen.getByText('Carol humilhou a mesa')).toBeDefined();
  });

  it('mostra a melhor nota de cada um, na ordem', async () => {
    const dubles = montarDubles({ notas: [40, 95, 60] });
    await ateOPodio(dubles);

    const linhas = [...document.querySelectorAll('#podio-card .placar-linha')].map(
      (linha) => linha.textContent,
    );
    expect(linhas[0]).toContain('Bruno');
    expect(linhas[1]).toContain('Rafa');
    expect(linhas[2]).toContain('Carol');
  });

  it('empate no topo não coroa ninguém', async () => {
    const dubles = montarDubles({ notas: [88, 88, 40] });
    await ateOPodio(dubles);

    expect(screen.getByText('Deu empate lá em cima')).toBeDefined();
    expect(screen.queryByText(/humilhou a mesa/)).toBeNull();
  });

  it('mandar o pódio usa o nó que a porta de compartilhamento documenta', async () => {
    const dubles = montarDubles({ notas: [90, 70, 50], sabeMandarImagem: true });
    await ateOPodio(dubles);

    fireEvent.click(screen.getByRole('button', { name: 'Mandar o pódio' }));
    await waitFor(() => expect(dubles.compartilhamento.pedidos).toHaveLength(1));
    expect(dubles.compartilhamento.pedidos[0]?.elementId).toBe('podio-card');
    expect(dubles.compartilhamento.pedidos[0]?.exigirImagem).toBe(true);
  });

  it('"acabou essa porra" fecha a roda e volta pro IDLE limpo', async () => {
    const dubles = montarDubles({ notas: [90, 70, 50] });
    await ateOPodio(dubles);

    fireEvent.click(screen.getByRole('button', { name: 'Acabou essa porra' }));
    fireEvent.click(screen.getByRole('button', { name: 'Acabou' }));

    expect(estadoDaArena()).toBe('IDLE');
    expect(screen.getByRole('button', { name: 'Arrotar' })).toBeDefined();
    expect(screen.queryByText(/Agora é você/)).toBeNull();
    expect(dubles.guardado[CHAVES.roda]).toBeUndefined();
  });
});

/**
 * ENQUANTO O ARROTO SOBE, NINGUÉM SAI DA MESA.
 *
 * O pódio é montado da roda que está na mão, e a roda só recebe o arroto
 * quando o servidor responde. Deixar o "acabou essa porra" livre nessa janela
 * manda pro grupo um retângulo sem a linha que a pessoa acabou de ver — ou
 * vazio, se foi o primeiro arroto da noite.
 */
describe('a saída fica travada enquanto o turno sobe', () => {
  it('nem o principal nem o "acabou essa porra" respondem no meio do upload', async () => {
    const dubles = montarDubles({ notas: [90], turnoTrava: true });
    await ateARodaAberta(dubles);
    await umTurno();

    await waitFor(() => expect(dubles.disputaLocal.turnos).toHaveLength(1));

    const acabou = screen.getByRole('button', { name: 'Acabou essa porra' });
    const principal = screen.getByRole('button', { name: 'Passa o celular' });
    expect((principal as HTMLButtonElement).disabled).toBe(true);
    expect((acabou as HTMLButtonElement).disabled).toBe(true);

    /* Toque teimoso não abre a confirmação nem tira a Arena do resultado. */
    fireEvent.click(acabou);
    expect(screen.queryByRole('button', { name: 'Acabou' })).toBeNull();
    expect(estadoDaArena()).toBe('RESULT');

    await act(async () => {
      dubles.soltarOTurno();
    });
    await waitFor(() =>
      expect(
        (screen.getByRole('button', { name: 'Acabou essa porra' }) as HTMLButtonElement)
          .disabled,
      ).toBe(false),
    );
  });

  it('soltou o arroto, o pódio sai com a linha dele — não vazio', async () => {
    const dubles = montarDubles({ notas: [90], turnoTrava: true });
    await ateARodaAberta(dubles);
    await umTurno();

    await waitFor(() => expect(dubles.disputaLocal.turnos).toHaveLength(1));
    await act(async () => {
      dubles.soltarOTurno();
    });
    await waitFor(() =>
      expect(
        (screen.getByRole('button', { name: 'Acabou essa porra' }) as HTMLButtonElement)
          .disabled,
      ).toBe(false),
    );

    fireEvent.click(screen.getByRole('button', { name: 'Acabou essa porra' }));
    fireEvent.click(screen.getByRole('button', { name: 'Acabou' }));

    expect(estadoDaArena()).toBe('SCOREBOARD');
    const linhas = [...document.querySelectorAll('#podio-card .placar-linha')].map(
      (linha) => linha.textContent,
    );
    expect(linhas).toHaveLength(1);
    expect(linhas[0]).toContain('Carol');
    expect(screen.queryByText('Deu empate lá em cima')).toBeNull();
  });
});

describe('reabrir o jogo com a roda em andamento', () => {
  const MESA: Roda = {
    codigo: 'ABCDEFGHJK',
    participantes: [
      { id: 'p0', nome: 'Carol' },
      { id: 'p1', nome: 'Bruno' },
    ],
    arrotos: [{ participanteId: 'p0', nota: 90 }],
    rounds: 1,
    local: 'churrasco',
  };

  it('remonta na vez de quem falta', async () => {
    const dubles = montarDubles({ mesa: MESA, guardado: { [CHAVES.roda]: MESA.codigo } });
    render(<Arena adaptadores={dubles.adaptadores} agora={dubles.agora} />);

    await waitFor(() => expect(screen.getByText('Agora é você, Bruno')).toBeDefined());
    expect(estadoDaArena()).toBe('IDLE');
  });

  it('mesa que já acabou remonta no pódio', async () => {
    const acabada: Roda = {
      ...MESA,
      arrotos: [
        { participanteId: 'p0', nota: 90 },
        { participanteId: 'p1', nota: 70 },
      ],
    };
    const dubles = montarDubles({ mesa: acabada, guardado: { [CHAVES.roda]: acabada.codigo } });
    render(<Arena adaptadores={dubles.adaptadores} agora={dubles.agora} />);

    await waitFor(() => expect(estadoDaArena()).toBe('SCOREBOARD'));
    expect(screen.getByText('Carol humilhou a mesa')).toBeDefined();
  });

  it('mesa que não existe mais rasga o bilhete e abre no IDLE limpo', async () => {
    const dubles = montarDubles({
      guardado: { [CHAVES.roda]: 'SUMIU' },
      aoLer: { ok: false, motivo: 'naoExiste' },
    });
    render(<Arena adaptadores={dubles.adaptadores} agora={dubles.agora} />);

    await waitFor(() => expect(dubles.disputaLocal.leituras).toBe(1));
    await waitFor(() => expect(dubles.guardado[CHAVES.roda]).toBeUndefined());
    expect(estadoDaArena()).toBe('IDLE');
    expect(screen.getByRole('button', { name: 'Arrotar' })).toBeDefined();
  });

  it('sem rede o bilhete FICA — o wifi do churrasco não custa a mesa de ninguém', async () => {
    const dubles = montarDubles({
      guardado: { [CHAVES.roda]: 'ABCDEFGHJK' },
      aoLer: { ok: false, motivo: 'semRede' },
    });
    render(<Arena adaptadores={dubles.adaptadores} agora={dubles.agora} />);

    await waitFor(() => expect(dubles.disputaLocal.leituras).toBe(1));
    expect(dubles.guardado[CHAVES.roda]).toBe('ABCDEFGHJK');
  });
});
