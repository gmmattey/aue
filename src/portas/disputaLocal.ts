import type { TipoDeOrigem } from '../nucleo/origem/origens';
import type { AudioCapturado } from './captura';
import type { Nota } from './pontuacao';

/**
 * A porta da roda — a disputa que acontece com um aparelho só, passando de mão
 * em mão.
 *
 * A Arena manda os nomes e recebe a roda de volta. Ela não sabe o que é RPC,
 * participante no banco, upload nem código de acesso com dez caracteres — quem
 * conversa com o servidor é o adaptador (ADR 0001 §2 e §7).
 *
 * O QUE NÃO ESTÁ AQUI, E É DECISÃO: não existe verbo para acrescentar, tirar ou
 * renomear gente depois da roda aberta, e não existe verbo para apagar áudio de
 * dentro dela. As cinco pessoas dividem a mesma sessão do aparelho, então "meu"
 * não distingue ninguém — isso precisa de decisão própria e está no backlog.
 */

/**
 * Onde a vergonha aconteceu.
 *
 * Espelha o CHECK de `batalhas.tipo_de_local` (20260807000030). Cinco valores
 * fixos, e o rótulo de cada um mora em `nucleo/disputa/locais.ts`.
 */
export type LocalDaRoda = 'casa' | 'publico' | 'escritorio' | 'churrasco' | 'outro';

/** Alguém na roda. A ORDEM DA LISTA É A ORDEM DOS TURNOS. */
export interface ParticipanteDaRoda {
  /**
   * Quem é essa pessoa, para o servidor.
   *
   * **Opaco.** A Arena guarda e devolve; ela não sabe que isto é um id de
   * tabela, e não mostra este valor em lugar nenhum.
   */
  readonly id: string;
  readonly nome: string;
}

/** Um arroto que já entrou na roda. */
export interface ArrotoDaRoda {
  /** Quem gravou. `null` só apareceria numa rodada que não é da roda. */
  readonly participanteId: string | null;
  readonly nota: number;
}

/**
 * A roda como ela está agora, **segundo o servidor**.
 *
 * De quem é a vez e em que round a mesa está NÃO ficam aqui: são derivados
 * destes arrotos por `nucleo/disputa/turnos.ts`, com a mesma regra que o
 * servidor aplica dentro de `responder_batalha`. Um ponteiro guardado se
 * dessincronizaria no primeiro erro de rede — a tela passaria a vez de quem não
 * gravou e o servidor recusaria a gravação seguinte, com o telefone na mão de
 * alguém.
 */
export interface Roda {
  /** O código da mesa. **É a chave**: é por ele que a roda é encontrada. */
  readonly codigo: string;
  readonly participantes: readonly ParticipanteDaRoda[];
  readonly arrotos: readonly ArrotoDaRoda[];
  /** De 1 a 3, como o servidor recusa. */
  readonly rounds: number;
  readonly local: LocalDaRoda | null;
}

export interface PedidoDeRoda {
  /** De 2 a 5 nomes, na ordem em que vão arrotar. */
  readonly nomes: readonly string[];
  readonly rounds: number;
  readonly local: LocalDaRoda | null;
}

export interface PedidoDeTurno {
  readonly codigo: string;
  readonly participanteId: string;
  readonly nota: Nota;
  readonly origem: TipoDeOrigem;
  readonly audio: AudioCapturado;
}

export type RespostaDaRoda =
  | { readonly ok: true; readonly roda: Roda }
  /** Sem internet, ou o servidor não respondeu. Nada foi criado. */
  | { readonly ok: false; readonly motivo: 'semRede' }
  /** O app subiu sem as chaves do servidor. Problema de quem publicou. */
  | { readonly ok: false; readonly motivo: 'semConfiguracao' }
  /**
   * A roda não existe mais, ou o prazo venceu.
   *
   * Os dois casos são o mesmo de propósito: dizer "expirou" confirmaria a um
   * curioso que ele acertou um código real.
   */
  | { readonly ok: false; readonly motivo: 'naoExiste' }
  | { readonly ok: false; readonly motivo: 'falhou'; readonly detalhe: string };

export interface DisputaLocal {
  /**
   * Abre a roda e devolve a mesa montada.
   *
   * Falhar aqui significa que **nada existe**: ninguém acha que a roda começou.
   */
  abrir(pedido: PedidoDeRoda): Promise<RespostaDaRoda>;

  /**
   * Lê a roda pelo código.
   *
   * É o que faz a mesa voltar quando a tela apaga no meio do churrasco. As
   * notas nunca estiveram em risco — elas sempre moraram no banco.
   */
  ler(codigo: string): Promise<RespostaDaRoda>;

  /**
   * Grava o turno de uma pessoa e devolve a roda atualizada.
   *
   * **TODO-OU-NADA, e nesta ordem: o resultado, o áudio, e só então a rodada.**
   * Invertendo, uma falha no upload deixaria a linha do pódio muda — e a linha
   * é a prova de que aquele arroto existiu.
   *
   * O número do round **não viaja daqui**: quem o deriva é o servidor, de
   * quantas vezes aquela pessoa já gravou. Deixar o cliente escolher permitiria
   * refazer um round já fechado, e o ranking mudaria depois de anunciado.
   */
  gravarTurno(pedido: PedidoDeTurno): Promise<RespostaDaRoda>;
}
