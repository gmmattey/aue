import { describe, expect, it } from 'vitest';

import { ESTADOS, type SituacaoDaArena } from './estados';
import type { Nota } from '../../portas/pontuacao';
import type { DesafioAberto, DesafioCriado } from '../../portas/desafios';
import { SAIDAS, SITUACAO_INICIAL, transicao } from './maquina';

/**
 * A máquina, testada sem renderizar nada.
 *
 * É este arquivo que prova o argumento do ADR: a regra do jogo roda em Node,
 * sem DOM, sem React e sem navegador. Se um dia precisar de `jsdom` para
 * passar, alguma coisa vazou para dentro do núcleo.
 */
/** Uma nota qualquer — o conteúdo dela não importa para a máquina. */
const NOTA_QUALQUER: Nota = {
  nota: 72.5,
  classificacao: 'Dá pro gasto.',
  frase: 'Passou no teste.',
  medidas: { grave: 60, estouro: 70, folego: 80, sujeira: 50 },
};

const DESAFIO_QUALQUER: DesafioCriado = {
  codigo: 'ABCDEFGHJK',
  resultadoId: 'resultado-1',
  link: 'https://exemplo/b/ABCDEFGHJK',
  notaOficial: 73.1,
  expiraEm: '2026-08-16T12:00:00Z',
};

const DISPUTA_QUALQUER: DesafioAberto = {
  codigo: 'ABCDEFGHJK',
  link: 'https://exemplo/b/ABCDEFGHJK',
  expiraEm: '2026-08-16T12:00:00Z',
  rodadas: [
    { id: 'r1', nome: 'Giam', nota: 80, audioId: 'a1', motivoSemAudio: null, ehMeu: false, resultadoId: 'res-1' },
    { id: 'r2', nome: 'Guinho', nota: 60, audioId: 'a2', motivoSemAudio: null, ehMeu: true, resultadoId: 'res-2' },
  ],
  placar: {
    lados: [
      { nome: 'Giam', vitorias: 1, ehMeu: false },
      { nome: 'Guinho', vitorias: 0, ehMeu: true },
    ],
    rounds: 1,
    ultimoRound: {
      rodadas: [
        { id: 'r1', nome: 'Giam', nota: 80, audioId: 'a1', motivoSemAudio: null, ehMeu: false, resultadoId: 'res-1' },
        { id: 'r2', nome: 'Guinho', nota: 60, audioId: 'a2', motivoSemAudio: null, ehMeu: true, resultadoId: 'res-2' },
      ],
      vencedorResultadoId: 'res-1',
    },
    roundAberto: null,
  },
};

/** A mesma briga, mas com um round aberto do rival — a nota que precisa ser batida. */
const RODADA_DO_RIVAL = {
  id: 'r3',
  nome: 'Giam',
  nota: 91,
  audioId: 'a3',
  motivoSemAudio: null,
  ehMeu: false,
  resultadoId: 'res-3',
} as const;

const DISPUTA_COM_ROUND_ABERTO_DO_RIVAL: DesafioAberto = {
  ...DISPUTA_QUALQUER,
  placar: {
    ...DISPUTA_QUALQUER.placar,
    roundAberto: { deQuem: 'dele', rodada: RODADA_DO_RIVAL },
  },
};

/** A mesma briga, mas com um round aberto meu — ninguém tem nota pra bater ainda. */
const DISPUTA_COM_ROUND_ABERTO_MEU: DesafioAberto = {
  ...DISPUTA_QUALQUER,
  placar: {
    ...DISPUTA_QUALQUER.placar,
    roundAberto: {
      deQuem: 'meu',
      rodada: { ...RODADA_DO_RIVAL, id: 'r4', nome: 'Guinho', ehMeu: true, resultadoId: 'res-4' },
    },
  },
};

describe('a máquina da Arena', () => {
  it('começa no IDLE', () => {
    expect(SITUACAO_INICIAL).toEqual({ estado: 'IDLE' });
  });

  it('tocar em ARROTAR não mexe a Arena', () => {
    // ARENA.md, IDLE: enquanto a caixinha de permissão está aberta, a Bolha
    // segue respirando e a chamada continua no lugar.
    const depois = transicao({ estado: 'IDLE' }, { tipo: 'TOCOU_ARROTAR' });
    expect(depois).toEqual({ estado: 'IDLE' });
  });

  it('microfone liberado leva a RECORDING sem alvo — ARROTAR normal não tem nota pra bater', () => {
    expect(transicao({ estado: 'IDLE' }, { tipo: 'MICROFONE_LIBERADO' })).toEqual({
      estado: 'RECORDING',
      alvo: null,
    });
  });

  it('microfone negado leva a ERROR dizendo qual é o caso', () => {
    expect(transicao({ estado: 'IDLE' }, { tipo: 'MICROFONE_NEGADO' })).toEqual({
      estado: 'ERROR',
      caso: 'microfoneNegado',
    });
  });

  it('todo ERROR tem saída', () => {
    // Regra do ARENA.md: o estado honesto SEMPRE oferece um caminho de volta.
    const erro: SituacaoDaArena = { estado: 'ERROR', caso: 'microfoneNegado' };
    expect(transicao(erro, { tipo: 'TENTAR_DE_NOVO' })).toEqual({ estado: 'IDLE' });
    expect(SAIDAS.ERROR.length).toBeGreaterThan(0);
  });

  /*
    A NOTA NÃO MORRE NO ERRO.

    Era o buraco mais grave do estado: quem tirou a nota, tocou em CHAMAR NO X1
    e viu o servidor cair voltava para o IDLE sem nota nenhuma. O jogo punia
    quem não tinha errado.
  */
  it('erro que nasce do RESULT carrega a nota junto', () => {
    const resultado: SituacaoDaArena = { estado: 'RESULT', nota: NOTA_QUALQUER };

    expect(transicao(resultado, { tipo: 'DESAFIO_FALHOU', caso: 'semRede' })).toEqual({
      estado: 'ERROR',
      caso: 'semRede',
      nota: NOTA_QUALQUER,
    });
  });

  it('a nota volta do erro sendo a MESMA, e não uma parecida', () => {
    const resultado: SituacaoDaArena = { estado: 'RESULT', nota: NOTA_QUALQUER };
    const erro = transicao(resultado, { tipo: 'DESAFIO_FALHOU', caso: 'falhaAoCompartilhar' });
    const volta = transicao(erro!, { tipo: 'VOLTAR_PRA_NOTA' });

    expect(volta).toEqual({ estado: 'RESULT', nota: NOTA_QUALQUER });
    /* Identidade, não igualdade: recalcular abriria caminho para o número mudar. */
    expect(volta?.estado === 'RESULT' && volta.nota).toBe(NOTA_QUALQUER);
  });

  it('erro sem nota não inventa nota, e não tem para onde voltar', () => {
    const erro = transicao({ estado: 'RECORDING', alvo: null }, { tipo: 'PAROU_SEM_SOM' });

    expect(erro).toEqual({ estado: 'ERROR', caso: 'semSom' });
    expect(erro && 'nota' in erro && erro.nota).toBeFalsy();
    /*
      A volta para a nota nem existe aqui. O `ARENA.md` é explícito: o erro
      nunca mostra nota quando não houve nota.
    */
    expect(() => transicao(erro!, { tipo: 'VOLTAR_PRA_NOTA' })).toThrow();
  });

  it('gravação com som vai para ORIGIN', () => {
    expect(transicao({ estado: 'RECORDING', alvo: null }, { tipo: 'PAROU_COM_SOM' })).toEqual({
      estado: 'ORIGIN',
    });
  });

  it('gravação sem som vira ERROR dizendo que não veio nada', () => {
    expect(transicao({ estado: 'RECORDING', alvo: null }, { tipo: 'PAROU_SEM_SOM' })).toEqual({
      estado: 'ERROR',
      caso: 'semSom',
    });
  });

  it('gravador quebrado não culpa a pessoa', () => {
    expect(
      transicao({ estado: 'RECORDING', alvo: null }, { tipo: 'DEU_RUIM_NA_GRAVACAO' }),
    ).toEqual({
      estado: 'ERROR',
      caso: 'falhaNaAnalise',
    });
  });

  it('sumir da tela no meio da gravação volta para o IDLE, e não para ERROR', () => {
    // Nada quebrou: a pessoa saiu. Culpar o microfone ou o jogo por isso seria
    // mentira, e o IDLE é o estado honesto de "não aconteceu nada".
    expect(transicao({ estado: 'RECORDING', alvo: null }, { tipo: 'SUMIU_DA_TELA' })).toEqual({
      estado: 'IDLE',
    });
  });

  it('a origem escolhida leva ao julgamento', () => {
    expect(transicao({ estado: 'ORIGIN' }, { tipo: 'ESCOLHEU_ORIGEM' })).toEqual({
      estado: 'JUDGING',
    });
  });

  it('o juiz fechando traz a nota junto', () => {
    // RESULT sem nota é tela de resultado em branco. O tipo obriga, e este
    // teste garante que a carga chega inteira.
    expect(transicao({ estado: 'JUDGING' }, { tipo: 'JUIZ_FECHOU', nota: NOTA_QUALQUER })).toEqual({
      estado: 'RESULT',
      nota: NOTA_QUALQUER,
    });
  });

  it('análise que falha não culpa a pessoa', () => {
    expect(transicao({ estado: 'JUDGING' }, { tipo: 'ANALISE_FALHOU' })).toEqual({
      estado: 'ERROR',
      caso: 'falhaNaAnalise',
    });
  });

  it('"vou mandar outro" volta direto a gravar, sem alvo — não tem desafio nesse caminho', () => {
    expect(transicao({ estado: 'RESULT', nota: NOTA_QUALQUER }, { tipo: 'MANDAR_OUTRO' })).toEqual({
      estado: 'RECORDING',
      alvo: null,
    });
  });

  it('microfone revogado entre um arroto e outro tem saída honesta', () => {
    // "Já deixei antes" não é garantia: a permissão é do aparelho.
    expect(
      transicao({ estado: 'RESULT', nota: NOTA_QUALQUER }, { tipo: 'MICROFONE_NEGADO' }),
    ).toEqual({ estado: 'ERROR', caso: 'microfoneNegado', nota: NOTA_QUALQUER });
  });

  it('o desafio criado leva a nota que já estava na tela', () => {
    // Recalcular ou pedir de novo abriria caminho para o número mudar no meio.
    const antes = { estado: 'RESULT', nota: NOTA_QUALQUER } as const;
    expect(transicao(antes, { tipo: 'DESAFIO_CRIADO', desafio: DESAFIO_QUALQUER })).toEqual({
      estado: 'CHALLENGE',
      nota: NOTA_QUALQUER,
      desafio: DESAFIO_QUALQUER,
    });
  });

  it('desafio que não sai vira ERROR com o caso que veio do servidor', () => {
    expect(
      transicao({ estado: 'RESULT', nota: NOTA_QUALQUER }, { tipo: 'DESAFIO_FALHOU', caso: 'semRede' }),
    ).toEqual({ estado: 'ERROR', caso: 'semRede', nota: NOTA_QUALQUER });
  });

  it('"deixa pra lá" volta pro começo', () => {
    const partida = { estado: 'CHALLENGE', nota: NOTA_QUALQUER, desafio: DESAFIO_QUALQUER } as const;
    expect(transicao(partida, { tipo: 'DEIXA_PRA_LA' })).toEqual({ estado: 'IDLE' });
  });

  it('o link de desafio abre direto no confronto', () => {
    // A segunda porta de entrada do jogo (ARENA.md §3).
    expect(transicao({ estado: 'IDLE' }, { tipo: 'DESAFIO_ABERTO', desafio: DISPUTA_QUALQUER })).toEqual({
      estado: 'VERSUS',
      desafio: DISPUTA_QUALQUER,
    });
  });

  it('"aguenta essa" cai na gravação carregando a nota do round aberto — a que precisa ser batida', () => {
    // issue #188: o VERSUS nunca guardava esse número, e a gravação herdava o
    // buraco.
    const partida = { estado: 'VERSUS', desafio: DISPUTA_COM_ROUND_ABERTO_DO_RIVAL } as const;
    expect(transicao(partida, { tipo: 'AGUENTA_ESSA' })).toEqual({
      estado: 'RECORDING',
      alvo: { nome: 'Giam', nota: 91 },
    });
  });

  it('sem round aberto, "aguenta essa" pega a primeira rodada da briga', () => {
    // Mesma conta que o VERSUS já faz para escolher qual arroto tocar.
    // `DISPUTA_QUALQUER` não tem round aberto.
    const partida = { estado: 'VERSUS', desafio: DISPUTA_QUALQUER } as const;
    expect(transicao(partida, { tipo: 'AGUENTA_ESSA' })).toEqual({
      estado: 'RECORDING',
      alvo: { nome: 'Giam', nota: 80 },
    });
  });

  it('dá para ver o placar sem responder', () => {
    const partida = { estado: 'VERSUS', desafio: DISPUTA_QUALQUER } as const;
    expect(transicao(partida, { tipo: 'VER_O_PLACAR' })).toEqual({
      estado: 'SCOREBOARD',
      desafio: DISPUTA_QUALQUER,
    });
  });

  it('a resposta enviada traz a disputa que o servidor devolveu', () => {
    // Nunca a versão que a tela tinha na mão: quem sabe quem está ganhando
    // depois da resposta é o servidor.
    const antes = { estado: 'RESULT', nota: NOTA_QUALQUER } as const;
    expect(transicao(antes, { tipo: 'RESPOSTA_ENVIADA', desafio: DISPUTA_QUALQUER })).toEqual({
      estado: 'SCOREBOARD',
      desafio: DISPUTA_QUALQUER,
    });
  });

  it('arroto que falha depois do placar na tela vira ERROR, não silêncio', () => {
    // A janela é o tempo de um upload: a tela já andou para o placar e a
    // resposta do servidor chega dizendo que não entrou. Sem esta seta a Arena
    // ficava parada mostrando placar de um arroto que nunca existiu.
    const partida = { estado: 'SCOREBOARD', desafio: DISPUTA_QUALQUER } as const;
    expect(transicao(partida, { tipo: 'DESAFIO_FALHOU', caso: 'semRede' })).toEqual({
      estado: 'ERROR',
      caso: 'semRede',
    });
  });

  it('evento que não faz sentido devolve null, e a Arena não se mexe', () => {
    // O caso real: toque duplo, ou uma promessa de permissão que voltou depois
    // de a pessoa já ter saído do IDLE. Empurrar a partida por causa disso é
    // como deixar o jogo andar sozinho.
    expect(transicao({ estado: 'RECORDING', alvo: null }, { tipo: 'TOCOU_ARROTAR' })).toBeNull();
    expect(transicao({ estado: 'IDLE' }, { tipo: 'TENTAR_DE_NOVO' })).toBeNull();
  });

  /*
    A REVANCHE SÓ HERDA NOTA QUANDO É RESPOSTA (issue #188).

    Round aberto do rival é nota pra bater; round aberto meu, ou nenhum round
    aberto (eu vou primeiro), não tem nota nenhuma esperando.
  */
  it('revanche a partir de um round aberto do rival carrega a nota dele', () => {
    const partida = { estado: 'SCOREBOARD', desafio: DISPUTA_COM_ROUND_ABERTO_DO_RIVAL } as const;
    expect(transicao(partida, { tipo: 'REVANCHE' })).toEqual({
      estado: 'REMATCH',
      alvo: { nome: 'Giam', nota: 91 },
    });
  });

  it('revanche a partir de um round aberto MEU não tem alvo', () => {
    const partida = { estado: 'SCOREBOARD', desafio: DISPUTA_COM_ROUND_ABERTO_MEU } as const;
    expect(transicao(partida, { tipo: 'REVANCHE' })).toEqual({ estado: 'REMATCH', alvo: null });
  });

  it('revanche sem round aberto — eu vou primeiro — não tem alvo', () => {
    const partida = { estado: 'SCOREBOARD', desafio: DISPUTA_QUALQUER } as const;
    expect(transicao(partida, { tipo: 'REVANCHE' })).toEqual({ estado: 'REMATCH', alvo: null });
  });

  it('o que está ligado é subconjunto do grafo declarado', () => {
    // Nenhuma fatia pode inventar destino que o SAIDAS não autorize. O teste
    // varre todos os eventos contra todos os estados.
    const eventos = [
      { tipo: 'TOCOU_ARROTAR' },
      { tipo: 'MICROFONE_LIBERADO' },
      { tipo: 'MICROFONE_NEGADO' },
      { tipo: 'PAROU_COM_SOM' },
      { tipo: 'PAROU_SEM_SOM' },
      { tipo: 'DEU_RUIM_NA_GRAVACAO' },
      { tipo: 'SUMIU_DA_TELA' },
      { tipo: 'ESCOLHEU_ORIGEM' },
      { tipo: 'JUIZ_FECHOU', nota: NOTA_QUALQUER },
      { tipo: 'ANALISE_FALHOU' },
      { tipo: 'MANDAR_OUTRO' },
      { tipo: 'DESAFIO_CRIADO', desafio: DESAFIO_QUALQUER },
      { tipo: 'DESAFIO_FALHOU', caso: 'semRede' },
      { tipo: 'DEIXA_PRA_LA' },
      { tipo: 'DESAFIO_ABERTO', desafio: DISPUTA_QUALQUER },
      { tipo: 'AGUENTA_ESSA' },
      { tipo: 'RESPOSTA_ENVIADA', desafio: DISPUTA_QUALQUER },
      { tipo: 'VER_O_PLACAR' },
      { tipo: 'TENTAR_DE_NOVO' },
      { tipo: 'VOLTAR_PRA_NOTA' },
    ] as const;

    for (const estado of ESTADOS) {
      const partida: SituacaoDaArena =
        estado === 'ERROR'
          ? /* Com nota: é o erro que tem as DUAS saídas, e é ele que precisa ser varrido. */
            { estado, caso: 'microfoneNegado', nota: NOTA_QUALQUER }
          : estado === 'RESULT'
            ? { estado, nota: NOTA_QUALQUER }
            : estado === 'CHALLENGE'
              ? { estado, nota: NOTA_QUALQUER, desafio: DESAFIO_QUALQUER }
              : estado === 'VERSUS'
                ? { estado, desafio: DISPUTA_QUALQUER }
                : estado === 'SCOREBOARD'
                  ? { estado, desafio: DISPUTA_QUALQUER }
                  : estado === 'RECORDING' || estado === 'REMATCH'
                    ? { estado, alvo: null }
                    : { estado };

      for (const evento of eventos) {
        const destino = transicao(partida, evento);
        if (!destino || destino.estado === estado) continue;
        expect(
          SAIDAS[estado],
          `${estado} → ${destino.estado} não está declarado em SAIDAS`,
        ).toContain(destino.estado);
      }
    }
  });

  it('todo destino declarado é um estado que existe', () => {
    for (const estado of ESTADOS) {
      for (const destino of SAIDAS[estado]) {
        expect(ESTADOS).toContain(destino);
      }
    }
  });
});
