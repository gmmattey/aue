import type { TipoDeOrigem } from '../nucleo/origem/origens';
import type { AudioCapturado } from './captura';
import type { Nota } from './pontuacao';

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
  /** O identificador do resultado, para quem criou poder apagar o próprio áudio. */
  readonly resultadoId: string;
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
  readonly nota: Nota;
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
   * Apaga o áudio de um arroto meu.
   *
   * SÃO DUAS COISAS, E AS DUAS PRECISAM DAR CERTO: limpar o ponteiro no banco
   * e remover o arquivo do bucket. Se a segunda falhar, isto devolve `naoDeu`
   * — **nunca `apagado`**. A pessoa acreditar que apagou enquanto o arquivo
   * continua lá é o pior desfecho possível desta função, e é o caso que separa
   * ela de ser honesta ou decorativa.
   */
  apagarMeuArroto(resultadoId: string): Promise<'apagado' | 'naoDeu'>;

  /**
   * Manda a resposta e devolve a disputa atualizada.
   *
   * Toda-ou-nada, igual a criar: falhar no meio deixaria o placar com uma
   * linha muda — e é a linha que serve de prova.
   */
  responder(pedido: PedidoDeResposta): Promise<AberturaDoDesafio>;

  /**
   * Revancha: a mesma disputa continuando, um round de cada vez.
   *
   * **Não cria disputa nova.** Cada revanche abre um round novo na mesma briga
   * — ou fecha o round que o outro deixou aberto. **Quem escolhe entre abrir e
   * fechar é o servidor**, olhando o que já foi gravado: a Arena manda o arroto
   * e lê o que aconteceu (`ARENA.md`, `REMATCH`).
   */
  revanchar(pedido: PedidoDeResposta): Promise<ResultadoDaRevanche>;
}

/* ═══════════════ O outro lado: abrir, ouvir e responder ═══════════════ */

/**
 * Por que não há o que tocar numa rodada.
 *
 * A DIFERENÇA IMPORTA, e ela decide o que a tela pode dizer:
 *
 * - **`apagado`** — quem gravou apagou. Isso se conta, porque é a pessoa
 *   exercendo um direito e o silêncio ficaria parecendo defeito;
 * - **`escondido`** — a moderação escondeu. Isso **não** se conta a terceiros:
 *   seria contar da denúncia para quem não tem nada a ver com ela.
 */
export type MotivoSemAudio = 'apagado' | 'escondido';

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
   * `null` quando não há o que tocar — e aí `motivoSemAudio` diz por quê.
   */
  readonly audioId: string | null;
  readonly motivoSemAudio: MotivoSemAudio | null;
  /**
   * Este arroto é de quem está olhando?
   *
   * **Quem decide é o servidor**, comparando o dono da rodada com a sessão de
   * quem pediu. A Arena só usa isto para mostrar ou esconder o botão de
   * apagar — e mesmo se alguém forçar a tela, o servidor recusa apagar o que
   * não é dela.
   */
  readonly ehMeu: boolean;
  /** O identificador do resultado, para pedir a exclusão. Opaco. */
  readonly resultadoId: string;
}

/** Um lado da briga, com quantos rounds ele já ganhou. */
export interface LadoDaBriga {
  readonly nome: string;
  /** Rounds vencidos. **Contados pelo servidor**, nunca pela tela. */
  readonly vitorias: number;
  readonly ehMeu: boolean;
}

/**
 * O placar da briga — vitórias e o último round.
 *
 * **A Arena não conta vitória nenhuma.** Ela lê. A regra de quem venceu um
 * round mora no banco (`vencedor_do_round`, que compara só a nota), e uma tela
 * somando pontos do próprio jeito seria a segunda regra esperando divergir da
 * primeira.
 *
 * O que NÃO existe aqui, de propósito: histórico dos rounds anteriores. O
 * `ARENA.md` (SCOREBOARD) só mostra o placar e o último round.
 */
export interface PlacarDaBriga {
  /**
   * Os dois lados, na ordem em que entraram.
   *
   * **No máximo dois, e isso é garantia do servidor.** Quem não é dono da briga
   * é recusado na hora de gravar, e o placar não conta linha de terceiro nem de
   * dado velho sem dono — senão a tela leria os dois primeiros e jogaria o resto
   * fora em silêncio, mostrando um placar plausível e errado.
   */
  readonly lados: readonly LadoDaBriga[];
  /** Quantos rounds a briga já teve, contando o aberto. */
  readonly rounds: number;
  readonly ultimoRound: {
    /** Uma ou duas rodadas: duas quando o round fechou, uma quando está aberto. */
    readonly rodadas: readonly RodadaDoDesafio[];
    /**
     * Quem venceu ESTE round, pelo id do resultado.
     *
     * `null` no empate e no round aberto. Compare sempre com
     * `RodadaDoDesafio.resultadoId` — o id da rodada é outro, e comparar com
     * ele nunca casa: ninguém fica em ouro e todo placar vira empate.
     */
    readonly vencedorResultadoId: string | null;
  };
  /**
   * O round que ainda espera o outro lado arrotar.
   *
   * `null` quando os dois já mandaram. **Round aberto não é estado da Arena** —
   * é um momento do `SCOREBOARD`, como o empate.
   */
  readonly roundAberto: {
    readonly deQuem: 'meu' | 'dele';
    readonly rodada: RodadaDoDesafio;
  } | null;
}

export interface DesafioAberto {
  readonly codigo: string;
  readonly link: string;
  readonly expiraEm: string;
  /**
   * A briga inteira, na ordem em que entraram.
   *
   * O placar desenha só o último round, mas esta lista continua completa por um
   * motivo de privacidade: é dela que sai **o que eu ainda posso apagar**. Se a
   * tela só conhecesse o último round, o arroto que a pessoa mandou no round 1
   * ficaria no servidor sem nenhum lugar no jogo onde ela pudesse tirá-lo.
   */
  readonly rodadas: readonly RodadaDoDesafio[];
  /** O placar de vitórias e o último round, **segundo o servidor**. */
  readonly placar: PlacarDaBriga;
}

/**
 * O que aconteceu com a revanche.
 *
 * `oQueAconteceu` é o servidor contando o que ele fez, não a Arena adivinhando:
 * quem decide entre abrir e fechar round é a regra que mora no banco.
 *
 * - **`abriuRound`** — mandei primeiro. Agora é esperar o outro;
 * - **`fechouRound`** — o outro tinha mandado, eu respondi, o round fechou e o
 *   placar de vitórias já conta este round;
 * - **`jaEraMeu`** — eu já tinha mandado este round (toque duplo, duas abas). O
 *   servidor recusou a linha nova e **nada foi duplicado**; o arroto que acabou
 *   de subir fica de fora da briga. Não é erro: é o estado real da briga.
 */
export type ResultadoDaRevanche =
  | {
      readonly ok: true;
      readonly desafio: DesafioAberto;
      readonly oQueAconteceu: 'abriuRound' | 'fechouRound' | 'jaEraMeu';
    }
  | { readonly ok: false; readonly motivo: 'expirado' }
  | { readonly ok: false; readonly motivo: 'naoExiste' }
  /** A briga bateu no teto de rounds. Não é erro de rede nem de servidor. */
  | { readonly ok: false; readonly motivo: 'limiteDeRounds' }
  | { readonly ok: false; readonly motivo: 'semRede' }
  | { readonly ok: false; readonly motivo: 'falhou'; readonly detalhe: string };

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
  readonly nota: Nota;
  readonly origem: TipoDeOrigem;
  readonly audio: AudioCapturado;
  readonly nome: string;
}
