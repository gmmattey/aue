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

  /** Abre um desafio pelo código do link. */
  abrir(codigo: string): Promise<AberturaDoDesafio>;

  /**
   * Um endereço para tocar o áudio de uma rodada.
   *
   * **VENCE EM MINUTOS.** Quem chama pede de novo quando precisar em vez de
   * guardar — e é por isso que isto é uma função, e não um campo da rodada.
   * Um endereço guardado na abertura da tela estaria morto quando a pessoa
   * voltasse de pegar uma cerveja, e o play falharia calado.
   *
   * `null` quando não há áudio para tocar.
   */
  enderecoDoAudio(audioId: string): Promise<string | null>;

  /**
   * Manda a resposta e devolve a disputa atualizada.
   *
   * Toda-ou-nada, igual a criar: falhar no meio deixaria o placar com uma
   * linha muda — e é a linha que serve de prova.
   */
  responder(pedido: PedidoDeResposta): Promise<AberturaDoDesafio>;
}

/* ═══════════════ O outro lado: abrir, ouvir e responder ═══════════════ */

/** Um arroto que já está na disputa. */
export interface RodadaDoDesafio {
  readonly id: string;
  /** O apelido de quem arrotou. */
  readonly nome: string;
  readonly nota: number;
  /**
   * Como pedir o áudio desta rodada.
   *
   * **Opaco de propósito.** A Arena não sabe se isto é caminho de arquivo,
   * chave ou id — ela guarda e devolve. Trocar o Storage por outra coisa não
   * deve mexer em nenhuma tela.
   *
   * `null` quando o áudio não subiu, ou quando a moderação escondeu.
   */
  readonly audioId: string | null;
}

export interface DesafioAberto {
  readonly codigo: string;
  readonly link: string;
  readonly expiraEm: string;
  /** Na ordem em que entraram na briga. */
  readonly rodadas: readonly RodadaDoDesafio[];
  /**
   * Quem está ganhando, **segundo o servidor**.
   *
   * A Arena NUNCA compara as duas notas por conta própria: a regra de quem
   * ganha é versionada no banco, e uma tela comparando números do seu jeito é
   * uma segunda regra esperando divergir da primeira.
   *
   * `null` quando ainda não há vencedor — inclusive no empate.
   */
  readonly lider: { readonly nome: string; readonly nota: number; readonly rodadaId: string } | null;
}

export type AberturaDoDesafio =
  | { readonly ok: true; readonly desafio: DesafioAberto }
  /** O prazo venceu. Quem manda nisso é o servidor. */
  | { readonly ok: false; readonly motivo: 'expirado' }
  /** Link torto, incompleto, ou disputa que não existe. */
  | { readonly ok: false; readonly motivo: 'naoExiste' }
  | { readonly ok: false; readonly motivo: 'semRede' }
  | { readonly ok: false; readonly motivo: 'falhou'; readonly detalhe: string };

export interface PedidoDeResposta {
  readonly codigo: string;
  readonly nota: NotaDoJuiz;
  readonly origem: TipoDeOrigem;
  readonly audio: AudioCapturado;
  readonly nome: string;
}
