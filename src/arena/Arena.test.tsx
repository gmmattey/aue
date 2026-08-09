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
import { afterEach, describe, expect, it } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

import { CHAVES } from '../portas/armazenamento';
import type { AudioCapturado, FalhaAoParar, PedidoDeMicrofone } from '../portas/captura';
import { COMENTARIOS_DE_VOLTA, COMENTARIOS_PRIMEIRA_VEZ } from '../nucleo/fala/idle';
import { TETO_DE_GRAVACAO_MS } from '../nucleo/gravacao/regras';
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
}

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

  const adaptadores: AdaptadoresDaArena = {
    captura,
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
  it('com som, segue para a origem', async () => {
    const dubles = montarDubles({ aoParar: ARROTO });
    const parar = await ateGravar(dubles);

    fireEvent.click(parar);

    // ORIGIN ainda é andaime — o que importa aqui é que o caminho é esse.
    const aviso = await screen.findByRole('status');
    expect(aviso.textContent).toContain('ORIGIN');
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
