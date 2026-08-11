/**
 * OS DOIS HELPERS DE MOVIMENTO DO PROTÓTIPO, TRAZIDOS PARA O JOGO.
 *
 * São cópia do `anim()` e do `flag()` de `docs/design/prototipo-arena/arena.html`
 * (l.1133 e l.1137), que é onde o vocabulário de motion da Arena já estava
 * escrito e funcionando.
 *
 * FRONTEIRA (ADR 0001): aqui não tem `document`, `window` nem `navigator`.
 * `classList`, `offsetWidth` e `setAttribute` são propriedades do próprio nó
 * que a Arena já tem na mão — quem pergunta pela preferência de movimento é a
 * plataforma, pela porta de sempre.
 */
import { prefereMovimentoReduzido } from '../../plataforma/web/preferencias';

/** Desfaz o que foi agendado. Chamar duas vezes não faz mal. */
export type Desfazer = () => void;

const NADA_A_DESFAZER: Desfazer = () => {};

/**
 * Dispara uma animação de CSS por classe e tira a classe quando ela acaba.
 *
 * O `void el.offsetWidth` no meio é o detalhe que faz a coisa REANIMAR: sem
 * forçar o recálculo de layout entre tirar e pôr a classe, o navegador junta
 * as duas mudanças no mesmo quadro e a animação simplesmente não roda de novo.
 * É o mesmo truque do protótipo, e é por isso que ele está comentado aqui em
 * vez de parecer linha morta que alguém apaga na próxima limpeza.
 *
 * Com movimento reduzido não dispara nada — e não precisa: nenhuma informação
 * do jogo depende de uma dessas animações para existir na tela.
 */
export function anim(el: HTMLElement | null, classe: string, duracaoMs: number): Desfazer {
  if (!el || prefereMovimentoReduzido()) return NADA_A_DESFAZER;

  el.classList.remove(classe);
  void el.offsetWidth;
  el.classList.add(classe);

  const id = setTimeout(() => el.classList.remove(classe), duracaoMs);

  return () => {
    clearTimeout(id);
    el.classList.remove(classe);
  };
}

/**
 * Liga um `data-*` no nó por um tempo e desliga sozinho.
 *
 * É como o `ring`, o `dim` e o `shake` chegam ao CSS: o estado do movimento
 * mora no atributo, e a folha de estilo decide o que fazer com ele. Assim o
 * componente não precisa saber duração de keyframe nenhum.
 */
export function bandeira(el: HTMLElement | null, nome: string, duracaoMs: number): Desfazer {
  if (!el || prefereMovimentoReduzido()) return NADA_A_DESFAZER;

  el.setAttribute(`data-${nome}`, '1');
  const id = setTimeout(() => el.setAttribute(`data-${nome}`, '0'), duracaoMs);

  return () => {
    clearTimeout(id);
    el.setAttribute(`data-${nome}`, '0');
  };
}
