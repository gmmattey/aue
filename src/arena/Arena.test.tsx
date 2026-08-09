// @vitest-environment jsdom
/**
 * A Arena no `IDLE`, com aparelho de mentira e regra de verdade.
 *
 * O que este arquivo existe para impedir de voltar:
 *
 * 1. **pedir microfone ao abrir.** É a coisa que mais faz gente fechar um site
 *    de jogo. O microfone é pedido depois do toque, e o teste prova isso.
 * 2. **microfone vazando.** Toda saída solta o stream: entrar num estado que
 *    ninguém construiu, esconder a aba, desmontar a Arena.
 * 3. **a Arena se mexendo enquanto a caixinha de permissão está aberta.**
 * 4. **quebrar quando o navegador bloqueia armazenamento.**
 */
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

import { CHAVES } from '../portas/armazenamento';
import type { PedidoDeMicrofone } from '../portas/captura';
import { COMENTARIOS_DE_VOLTA, COMENTARIOS_PRIMEIRA_VEZ } from '../nucleo/fala/idle';
import { Arena } from './Arena';
import type { AdaptadoresDaArena } from './adaptadores';

afterEach(cleanup);

/** Um aparelho de mentira, com os fios à mostra para o teste puxar. */
function montarDubles(opcoes: { resposta?: PedidoDeMicrofone; guardado?: Record<string, string> } = {}) {
  const guardado: Record<string, string> = { ...opcoes.guardado };
  const escondedores: Array<() => void> = [];

  const captura = {
    vivo: false,
    pedidos: 0,
    solturas: 0,
    async pedir(): Promise<PedidoDeMicrofone> {
      captura.pedidos += 1;
      const resposta = opcoes.resposta ?? { ok: true as const };
      captura.vivo = resposta.ok;
      return resposta;
    },
    soltar() {
      captura.solturas += 1;
      captura.vivo = false;
    },
    estaVivo: () => captura.vivo,
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

  return { adaptadores, captura, guardado, esconderATela: () => escondedores.forEach((f) => f()) };
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
    const comentarioNovato = screen.getByText((texto) =>
      (COMENTARIOS_PRIMEIRA_VEZ as readonly string[]).includes(texto),
    );
    expect(comentarioNovato).toBeDefined();
    unmount();

    const veterano = montarDubles({ guardado: { [CHAVES.jaJogou]: '1' } });
    render(<Arena adaptadores={veterano.adaptadores} />);
    expect(
      screen.getByText((texto) => (COMENTARIOS_DE_VOLTA as readonly string[]).includes(texto)),
    ).toBeDefined();
  });

  it('o toque pede o microfone e a Arena não se mexe enquanto isso', async () => {
    let liberar: (resposta: PedidoDeMicrofone) => void = () => {};
    const { adaptadores, captura } = montarDubles();
    captura.pedir = () =>
      new Promise<PedidoDeMicrofone>((resolve) => {
        captura.pedidos += 1;
        liberar = resolve;
      });

    render(<Arena adaptadores={adaptadores} />);
    fireEvent.click(screen.getByRole('button', { name: 'Arrotar' }));

    // A caixinha do sistema está aberta: a chamada continua no lugar e o
    // gatilho também. Nada de montar a cena de gravação antes de ter microfone.
    expect(captura.pedidos).toBe(1);
    expect(screen.getByRole('button', { name: 'Arrotar' })).toBeDefined();

    liberar({ ok: true });
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Arrotar' })).toBeNull());
  });

  it('liberou o microfone: solta na hora, porque a gravação não existe ainda', async () => {
    const { adaptadores, captura, guardado } = montarDubles({ resposta: { ok: true } });
    render(<Arena adaptadores={adaptadores} />);

    fireEvent.click(screen.getByRole('button', { name: 'Arrotar' }));

    await waitFor(() => expect(captura.estaVivo()).toBe(false));
    expect(captura.solturas).toBeGreaterThan(0);
    // "já arrotou aqui" fica marcado — é o que muda a fala na próxima visita.
    expect(guardado[CHAVES.jaJogou]).toBe('1');
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

  it('esconder a tela solta o microfone', async () => {
    const { adaptadores, captura, esconderATela } = montarDubles({ resposta: { ok: true } });
    render(<Arena adaptadores={adaptadores} />);

    fireEvent.click(screen.getByRole('button', { name: 'Arrotar' }));
    await waitFor(() => expect(captura.pedidos).toBe(1));

    captura.vivo = true;
    esconderATela();

    // No iPhone o Safari mata a aba em segundo plano e nenhum `return` de
    // efeito roda. Se a limpeza dependesse da desmontagem, o microfone ficaria.
    expect(captura.estaVivo()).toBe(false);
  });

  it('desmontar solta o microfone', () => {
    const { adaptadores, captura } = montarDubles();
    const { unmount } = render(<Arena adaptadores={adaptadores} />);
    captura.vivo = true;
    unmount();
    expect(captura.estaVivo()).toBe(false);
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

describe('os estados que ainda não existem', () => {
  it('dizem que não existem, em vez de fingir', async () => {
    const { adaptadores } = montarDubles({ resposta: { ok: true } });
    render(<Arena adaptadores={adaptadores} />);

    fireEvent.click(screen.getByRole('button', { name: 'Arrotar' }));

    const aviso = await screen.findByRole('status');
    expect(aviso.textContent).toContain('RECORDING');
    expect(aviso.textContent).toContain('ainda não foi construído');
    // Nada de nota, nada de botão que promete o que não existe.
    expect(screen.queryAllByRole('button')).toHaveLength(0);
  });
});

/*
  O que este arquivo NÃO prova, e por isso o pronto da issue exige celular de
  verdade: safe area, `svh`, a barra do navegador recolhendo, a caixinha de
  permissão do sistema e o que o iOS faz com a saída de som quando há captura
  ativa. Nada disso existe em jsdom.
*/
