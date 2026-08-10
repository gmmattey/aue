import {
  type CasoDeErro,
  type EstadoDaArena,
  type EventoDaArena,
  type SituacaoDaArena,
} from './estados';

/**
 * A máquina da Arena. TypeScript puro: sem React, sem DOM, sem `navigator`,
 * sem Supabase. Roda em teste sem renderizar nada.
 *
 * POR QUE UMA FUNÇÃO PURA E NÃO `setState` ESPALHADO: enquanto o loop era uma
 * sequência de telas, cada componente decidia para onde ir. Ninguém conseguia
 * responder "de `RESULT`, para onde dá para sair?" sem ler cinco arquivos, e
 * dava para inventar transição sem querer. Aqui a resposta é uma tabela.
 */

/**
 * O GRAFO CANÔNICO — toda transição que a Arena pode ter, algum dia.
 *
 * Sai direto das linhas `**Sai para:**` de `docs/jogo/ARENA.md`, e existe
 * teste (`arena-md.paridade.test.ts`) provando que nenhuma seta do documento
 * ficou de fora daqui.
 *
 * Duas setas estão aqui e **não** estão na linha `Sai para` do documento.
 * Ambas vêm do texto do próprio ARENA.md, e é por isso que o teste de paridade
 * confere "documento ⊆ código" em vez de igualdade:
 *
 * - `IDLE → ERROR`, `VERSUS → ERROR` e `SCOREBOARD → ERROR`: a seção do
 *   `ERROR` diz que **todo estado que pede o microfone pode sair para lá**, e
 *   os três pedem — o `SCOREBOARD` pede na revanche;
 * - `ERROR → IDLE`: as regras do `ERROR` mandam **sempre oferecer a saída**;
 * - `IDLE → VERSUS`: a Arena montando por link, que o §3 descreve como a
 *   segunda porta de entrada do jogo;
 * - `REMATCH → IDLE`: o `REMATCH` é gravação, e o `RECORDING` já declara que
 *   sumir da tela no meio volta para o começo. A mesma regra vale para as
 *   duas — o documento descreve o caso uma vez, na gravação.
 */
export const SAIDAS: Readonly<Record<EstadoDaArena, readonly EstadoDaArena[]>> = {
  IDLE: ['RECORDING', 'ERROR', 'VERSUS'],
  RECORDING: ['ORIGIN', 'ERROR', 'IDLE'],
  ORIGIN: ['JUDGING'],
  JUDGING: ['RESULT', 'ERROR'],
  RESULT: ['CHALLENGE', 'SCOREBOARD', 'RECORDING', 'ERROR'],
  CHALLENGE: ['SCOREBOARD', 'IDLE'],
  VERSUS: ['RECORDING', 'SCOREBOARD', 'ERROR'],
  SCOREBOARD: ['REMATCH', 'ERROR'],
  REMATCH: ['ORIGIN', 'ERROR', 'IDLE'],
  ERROR: ['IDLE'],
};

/**
 * O que está LIGADO hoje.
 *
 * Subconjunto do grafo lá de cima — e o teste prova que é subconjunto. Cada
 * fatia nova liga mais uma linha aqui; nenhuma inventa destino que o
 * `SAIDAS` não autorize.
 */
const LIGADO: ReadonlyArray<{
  readonly de: EstadoDaArena;
  readonly evento: EventoDaArena['tipo'];
  readonly para: EstadoDaArena;
}> = [
  { de: 'IDLE', evento: 'TOCOU_ARROTAR', para: 'IDLE' },
  { de: 'IDLE', evento: 'MICROFONE_LIBERADO', para: 'RECORDING' },
  { de: 'IDLE', evento: 'MICROFONE_NEGADO', para: 'ERROR' },
  /*
    O gravador pode quebrar ANTES de a gravação existir: microfone liberado, e
    o `MediaRecorder` ou o contexto de áudio recusando nascer. A partida ainda
    está no `IDLE` nessa hora, e sem esta linha o toque simplesmente não faria
    nada — a pessoa tocaria em ARROTAR e olharia para uma tela parada.
  */
  { de: 'IDLE', evento: 'DEU_RUIM_NA_GRAVACAO', para: 'ERROR' },
  { de: 'RECORDING', evento: 'PAROU_COM_SOM', para: 'ORIGIN' },
  { de: 'RECORDING', evento: 'PAROU_SEM_SOM', para: 'ERROR' },
  { de: 'RECORDING', evento: 'NAO_EH_ARROTO', para: 'ERROR' },
  { de: 'RECORDING', evento: 'DEU_RUIM_NA_GRAVACAO', para: 'ERROR' },
  { de: 'RECORDING', evento: 'SUMIU_DA_TELA', para: 'IDLE' },
  { de: 'ORIGIN', evento: 'ESCOLHEU_ORIGEM', para: 'JUDGING' },
  { de: 'JUDGING', evento: 'JUIZ_FECHOU', para: 'RESULT' },
  { de: 'JUDGING', evento: 'ANALISE_FALHOU', para: 'ERROR' },
  { de: 'RESULT', evento: 'MANDAR_OUTRO', para: 'RECORDING' },
  /*
    "Já deixei antes" não é garantia: a permissão é do aparelho e pode ter sido
    revogada entre um arroto e o próximo. O `ARENA.md` diz isso na seção do
    `ERROR` — todo estado que pede microfone tem esta saída.
  */
  { de: 'RESULT', evento: 'MICROFONE_NEGADO', para: 'ERROR' },
  { de: 'RESULT', evento: 'DESAFIO_CRIADO', para: 'CHALLENGE' },
  { de: 'RESULT', evento: 'DESAFIO_FALHOU', para: 'ERROR' },
  { de: 'CHALLENGE', evento: 'DEIXA_PRA_LA', para: 'IDLE' },
  { de: 'IDLE', evento: 'DESAFIO_ABERTO', para: 'VERSUS' },
  { de: 'VERSUS', evento: 'AGUENTA_ESSA', para: 'RECORDING' },
  { de: 'VERSUS', evento: 'VER_O_PLACAR', para: 'SCOREBOARD' },
  { de: 'VERSUS', evento: 'MICROFONE_NEGADO', para: 'ERROR' },
  { de: 'IDLE', evento: 'DESAFIO_FALHOU', para: 'ERROR' },
  { de: 'RESULT', evento: 'RESPOSTA_ENVIADA', para: 'SCOREBOARD' },
  { de: 'SCOREBOARD', evento: 'REVANCHE', para: 'REMATCH' },
  { de: 'SCOREBOARD', evento: 'MICROFONE_NEGADO', para: 'ERROR' },
  { de: 'REMATCH', evento: 'PAROU_COM_SOM', para: 'ORIGIN' },
  { de: 'REMATCH', evento: 'PAROU_SEM_SOM', para: 'ERROR' },
  { de: 'REMATCH', evento: 'NAO_EH_ARROTO', para: 'ERROR' },
  { de: 'REMATCH', evento: 'DEU_RUIM_NA_GRAVACAO', para: 'ERROR' },
  { de: 'REMATCH', evento: 'SUMIU_DA_TELA', para: 'IDLE' },
  { de: 'RESULT', evento: 'REVANCHE_ENVIADA', para: 'SCOREBOARD' },
  { de: 'ERROR', evento: 'TENTAR_DE_NOVO', para: 'IDLE' },
];

/**
 * `TOCOU_ARROTAR` deixa a Arena onde está, e isso é decisão de produto, não
 * esquecimento.
 *
 * O microfone é pedido depois do toque e **a Arena não se mexe enquanto a
 * caixinha do sistema está aberta**: a Bolha continua respirando, a chamada
 * continua no lugar (ARENA.md, `IDLE`). Quem já liberou antes nem vê caixinha
 * — um estado visual próprio apareceria e sumiria em menos de um segundo na
 * maioria das partidas, e piscar à toa é pior que ficar parado.
 */

/** Onde a partida começa quando alguém abre o jogo pela primeira vez. */
export const SITUACAO_INICIAL: SituacaoDaArena = { estado: 'IDLE' };

/**
 * Aplica um evento.
 *
 * Devolve `null` quando o evento não faz sentido naquele estado — e aí a Arena
 * **não se mexe**. Engolir em silêncio é proposital: toque repetido, evento
 * atrasado de um `Promise` que voltou depois da hora e clique duplo não podem
 * empurrar a partida para lugar nenhum.
 */
export function transicao(
  situacao: SituacaoDaArena,
  evento: EventoDaArena,
): SituacaoDaArena | null {
  const regra = LIGADO.find((r) => r.de === situacao.estado && r.evento === evento.tipo);
  if (!regra) return null;

  if (regra.para === situacao.estado && situacao.estado !== 'ERROR') {
    // Mesmo estado, sem carga nova: devolver o mesmo objeto evita re-render à
    // toa em quem compara por identidade.
    return situacao;
  }

  if (regra.para === 'ERROR') {
    return { estado: 'ERROR', caso: casoDoEvento(evento) };
  }

  /*
    `RESULT` não existe sem nota. O tipo obriga, e o `throw` cobre o caminho
    impossível de alguém ligar outro evento para cá e esquecer a carga — cair
    aqui é melhor que um estado de resultado com a tela vazia.
  */
  /*
    O `CHALLENGE` precisa da nota que já estava na tela e do desafio que acabou
    de nascer. A nota vem do estado anterior — é a mesma, e recalcular ou pedir
    de novo abriria caminho para o número mudar no meio do caminho.
  */
  if (regra.para === 'VERSUS') {
    if (evento.tipo !== 'DESAFIO_ABERTO') {
      throw new Error(`Não dá para entrar no VERSUS por "${evento.tipo}".`);
    }
    return { estado: 'VERSUS', desafio: evento.desafio };
  }

  if (regra.para === 'SCOREBOARD') {
    /*
      Duas portas para o placar: respondendo (traz a disputa atualizada do
      servidor) ou olhando de fora, a partir do confronto (a disputa já está na
      mão).
    */
    if (evento.tipo === 'RESPOSTA_ENVIADA' || evento.tipo === 'REVANCHE_ENVIADA') {
      return { estado: 'SCOREBOARD', desafio: evento.desafio };
    }
    if (evento.tipo === 'VER_O_PLACAR' && situacao.estado === 'VERSUS') {
      return { estado: 'SCOREBOARD', desafio: situacao.desafio };
    }
    throw new Error(`Não dá para entrar no SCOREBOARD por "${evento.tipo}".`);
  }

  if (regra.para === 'CHALLENGE') {
    if (evento.tipo !== 'DESAFIO_CRIADO' || situacao.estado !== 'RESULT') {
      throw new Error(`Não dá para entrar no CHALLENGE por "${evento.tipo}".`);
    }
    return { estado: 'CHALLENGE', nota: situacao.nota, desafio: evento.desafio };
  }

  if (regra.para === 'RESULT') {
    if (evento.tipo !== 'JUIZ_FECHOU') {
      throw new Error(`Evento "${evento.tipo}" leva a RESULT sem trazer a nota.`);
    }
    return { estado: 'RESULT', nota: evento.nota };
  }

  return { estado: regra.para };
}

/**
 * De qual caso de erro estamos falando.
 *
 * Hoje só um evento leva a `ERROR`. Quando entrarem os outros seis casos, cada
 * um chega com o evento dele — e o `switch` exaustivo cobra isso aqui.
 */
function casoDoEvento(evento: EventoDaArena): CasoDeErro {
  switch (evento.tipo) {
    case 'MICROFONE_NEGADO':
      return 'microfoneNegado';
    case 'PAROU_SEM_SOM':
      return 'semSom';
    case 'NAO_EH_ARROTO':
      return 'naoEhArroto';
    case 'ANALISE_FALHOU':
      return 'falhaNaAnalise';
    case 'DESAFIO_FALHOU':
      return evento.caso;
    case 'DEU_RUIM_NA_GRAVACAO':
      /*
        O ARENA.md não tem um caso chamado "o gravador quebrou". Tem "falha na
        análise", descrito como "que deu ruim do lado do jogo, não do lado da
        pessoa" — que é exatamente o que aconteceu. Quem está jogando não
        precisa saber se quebrou antes ou depois de ouvir; precisa saber que a
        culpa não é dela e que dá para tentar de novo.
      */
      return 'falhaNaAnalise';
    default:
      /*
        Inalcançável pela tabela `LIGADO`. Se alguém ligar um evento novo para
        `ERROR` e esquecer de dizer qual é o caso, cai aqui em vez de inventar
        um erro genérico na cara do jogador.
      */
      throw new Error(`Evento "${evento.tipo}" leva a ERROR sem dizer qual caso.`);
  }
}
