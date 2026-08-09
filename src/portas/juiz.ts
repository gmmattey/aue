import type { TipoDeOrigem } from '../nucleo/origem/origens';
import type { AudioCapturado } from './captura';

/**
 * A porta do juiz.
 *
 * A Arena manda o áudio e a origem, e recebe a nota pronta. Ela **não abre o
 * blob**, não sabe o que é decodificação e não conhece a matemática — é o que
 * permite a mesma Arena rodar dentro de uma casca nativa depois (ADR §2).
 *
 * A implementação web chama o motor de extração e a fórmula que já existem no
 * jogo de hoje, sem reescrever nem um coeficiente: a nota é espelhada em SQL e
 * tem teste de paridade travando os dois lados.
 */

/**
 * As quatro medidas, com os nomes que a pessoa lê.
 *
 * São **apelido de rua para número**, não laudo. O motor não mede pressão nem
 * decibel calibrado, e nenhuma tela pode sugerir precisão que ele não tem
 * (`ARENA.md`, `RESULT`).
 */
export interface MedidasDoArroto {
  /** Profundidade — o quanto veio de baixo. */
  readonly grave: number;
  /** Potência. */
  readonly estouro: number;
  /** Duração. */
  readonly folego: number;
  /** Textura. */
  readonly sujeira: number;
}

export interface NotaDoJuiz {
  /** O Auê Score, de 0 a 100. */
  readonly nota: number;
  /** A faixa em que a nota caiu. */
  readonly classificacao: string;
  /**
   * A zoeira do juiz.
   *
   * VIAJA JUNTO COM A NOTA de propósito: o compartilhamento tem que repetir
   * **exatamente** esta frase. Sorteando de novo depois, o jogo diria duas
   * coisas diferentes sobre o mesmo arroto.
   */
  readonly frase: string;
  readonly medidas: MedidasDoArroto;
}

export type Veredito =
  | { readonly ok: true; readonly nota: NotaDoJuiz }
  /** O motor recusou o áudio: vazio, curto demais ou mudo. */
  | { readonly ok: false; readonly motivo: 'semAudio' }
  /** Quebrou de verdade. */
  | { readonly ok: false; readonly motivo: 'falhou'; readonly detalhe: string };

export interface Juiz {
  julgar(audio: AudioCapturado, origem: TipoDeOrigem): Promise<Veredito>;
}
