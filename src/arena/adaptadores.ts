import type { ArmazenamentoLocal } from '../portas/armazenamento';
import type { CapturaDeAudio } from '../portas/captura';
import type { CicloDeVida } from '../portas/cicloDeVida';
import type { Pontuador } from '../portas/pontuacao';
import type { DetectorDeArroto } from '../portas/detector';
import type { Compartilhamento } from '../portas/compartilhamento';
import type { Desafios } from '../portas/desafios';
import type { DisputaLocal } from '../portas/disputaLocal';
import { criarDisputaLocalWeb } from '../plataforma/web/disputaLocal';
import { criarArmazenamentoWeb } from '../plataforma/web/armazenamento';
import { criarCapturaWeb } from '../plataforma/web/captura';
import { criarCicloDeVidaWeb } from '../plataforma/web/cicloDeVida';
import { criarPontuadorWeb } from '../plataforma/web/pontuacao';
import { criarDetectorWeb } from '../plataforma/web/detector';
import { criarCompartilhamentoWeb } from '../plataforma/web/compartilhamento';
import { criarDesafiosWeb } from '../plataforma/web/desafios';

/**
 * O que a Arena precisa do aparelho.
 *
 * A Arena recebe isto pronto e não sabe montar nada — é o que deixa o teste
 * usar dublê e o que vai deixar a casca nativa entrar sem a Arena perceber
 * (ADR 0001 §2).
 */
export interface AdaptadoresDaArena {
  readonly captura: CapturaDeAudio;
  readonly armazenamento: ArmazenamentoLocal;
  readonly cicloDeVida: CicloDeVida;
  readonly pontuador: Pontuador;
  /** O juiz de verdade: decide se aquilo foi arroto. */
  readonly detector: DetectorDeArroto;
  readonly desafios: Desafios;
  /** A roda: a disputa com um aparelho só, passando de mão em mão. */
  readonly disputaLocal: DisputaLocal;
  readonly compartilhamento: Compartilhamento;
}

/**
 * A montagem web.
 *
 * É FUNÇÃO, E NÃO CONSTANTE DE MÓDULO, de propósito: `criarCicloDeVidaWeb()`
 * registra ouvinte em `document` na hora em que roda. Como constante, isso
 * aconteceria no import — ou seja, em todo teste que importasse qualquer coisa
 * desta pasta, e num ambiente sem DOM quebraria antes de o teste começar.
 */
export function adaptadoresWeb(): AdaptadoresDaArena {
  return {
    captura: criarCapturaWeb(),
    armazenamento: criarArmazenamentoWeb(),
    cicloDeVida: criarCicloDeVidaWeb(),
    pontuador: criarPontuadorWeb(),
    detector: criarDetectorWeb(),
    desafios: criarDesafiosWeb(),
    disputaLocal: criarDisputaLocalWeb(),
    compartilhamento: criarCompartilhamentoWeb(),
  };
}
