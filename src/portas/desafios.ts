import type { TipoDeOrigem } from '../nucleo/origem/origens';
import type { AudioCapturado } from './captura';
import type { NotaDoJuiz } from './juiz';

/**
 * A porta do desafio.
 *
 * A Arena manda a nota, o áudio e o nome, e recebe um link na mão. Ela não sabe
 * o que é sessão, tabela, upload nem link assinado — quem conversa com o
 * servidor é o adaptador (ADR §2 e §7).
 */

export interface DesafioCriado {
  /** O código do desafio. **É a chave**: quem tem o link, entra. */
  readonly codigo: string;
  /** O link inteiro, pronto para copiar e mandar. */
  readonly link: string;
  /**
   * A nota que o SERVIDOR calculou.
   *
   * A nota que a Arena mostrou até aqui é prévia local, sem autoridade
   * nenhuma. Esta é a que vale, a que vai no link e a que o adversário vê —
   * senão qualquer um mexeria no próprio número antes de mandar pro amigo
   * (ADR §7).
   */
  readonly notaOficial: number;
  /**
   * Quando o link para de funcionar, **do jeito que o banco informou**.
   *
   * Nunca escrito à mão na tela: "7 dias" em texto fixo é a mentira mais fácil
   * de contar, e no sexto dia continuaria prometendo sete.
   */
  readonly expiraEm: string;
}

export type ResultadoDoDesafio =
  | { readonly ok: true; readonly desafio: DesafioCriado }
  /** Sem internet, ou o servidor não respondeu. Nada foi criado. */
  | { readonly ok: false; readonly motivo: 'semRede' }
  /** O app subiu sem as chaves do servidor. Problema de quem publicou. */
  | { readonly ok: false; readonly motivo: 'semConfiguracao' }
  | { readonly ok: false; readonly motivo: 'falhou'; readonly detalhe: string };

export interface PedidoDeDesafio {
  readonly nota: NotaDoJuiz;
  readonly origem: TipoDeOrigem;
  readonly audio: AudioCapturado;
  /** O apelido de quem arrotou. Cobrado só aqui, no ato de humilhar. */
  readonly nome: string;
}

export interface Desafios {
  /**
   * Guarda o arroto e devolve o link.
   *
   * **OU OS TRÊS PASSOS DÃO CERTO, OU NADA EXISTE.** Guardar o resultado,
   * subir o áudio e criar a batalha são três coisas em sequência, e falhar no
   * meio deixaria um desafio MUDO — o amigo abre o link e não tem o que ouvir,
   * que é o produto inteiro quebrado.
   */
  criar(pedido: PedidoDeDesafio): Promise<ResultadoDoDesafio>;
}
