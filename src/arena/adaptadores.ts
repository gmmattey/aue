import type { ArmazenamentoLocal } from '../portas/armazenamento';
import type { CapturaDeAudio } from '../portas/captura';
import type { CicloDeVida } from '../portas/cicloDeVida';
import { criarArmazenamentoWeb } from '../plataforma/web/armazenamento';
import { criarCapturaWeb } from '../plataforma/web/captura';
import { criarCicloDeVidaWeb } from '../plataforma/web/cicloDeVida';

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
  };
}
