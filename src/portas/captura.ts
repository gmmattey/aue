import type { ResumoDoSinal } from '../nucleo/gravacao/regras';

/**
 * A porta do microfone.
 *
 * Nada aqui sabe o que é `getUserMedia`. Quem sabe é
 * `plataforma/web/captura.ts`, e no dia em que o Auê virar app de loja é só
 * essa implementação que muda — ver
 * `docs/technical/adr/0001-arquitetura-oficial-do-aue.md` §2.
 *
 * O DESENHO IMPORTANTE AQUI É O DONO. O microfone, o gravador e o medidor têm
 * um dono só, e é esta porta. Antes, cada tela pedia o stream e cada tela
 * precisava lembrar de soltar — em toda saída, inclusive nas que ninguém
 * escreve teste (timeout, erro, aba escondida, componente desmontado).
 * Vazamento de microfone é defeito de privacidade, não detalhe cosmético
 * (ADR §4).
 */

/** O que aconteceu quando o jogo pediu o microfone. */
export type PedidoDeMicrofone =
  /** Liberou. O recurso está vivo e alguém precisa soltar depois. */
  | { ok: true }
  /**
   * A pessoa negou, ou o navegador negou por ela (site sem HTTPS, política de
   * permissão). Do ponto de vista do jogo é o mesmo caso: não tem microfone e
   * a Arena precisa dizer isso na cara.
   */
  | { ok: false; motivo: 'negado' }
  /** Não existe microfone, ou o aparelho não deixa enumerar. */
  | { ok: false; motivo: 'semAparelho' }
  /** Quebrou de um jeito que não é nenhum dos acima. */
  | { ok: false; motivo: 'falhou'; detalhe: string };

/**
 * O que saiu da gravação.
 *
 * O áudio é opaco de propósito: quem consome não abre, não decodifica e não
 * assume formato. `Blob` está aqui porque é o que existe igual na web e dentro
 * de uma casca nativa — trocar por `ArrayBuffer` só empurraria a conversão
 * para o outro lado.
 */
export interface AudioCapturado {
  readonly dados: Blob;
  /** O que o gravador disse que gravou. **Nunca cravado por nós** — o iPhone grava AAC. */
  readonly formato: string;
  readonly duracaoMs: number;
  /** O que o medidor viu enquanto o microfone esteve aberto. */
  readonly resumo: ResumoDoSinal;
}

/** Por que a gravação não terminou bem. */
export type FalhaAoParar = { motivo: 'naoEstavaGravando' } | { motivo: 'quebrou'; detalhe: string };

export interface CapturaDeAudio {
  /**
   * Pede o microfone. **Só pode ser chamado a partir de um toque da pessoa** —
   * é exigência do Safari e do Chrome, e é também o desenho do jogo: o
   * microfone é pedido depois do ARROTAR, nunca ao abrir
   * (`docs/jogo/ARENA.md`, estado `IDLE`).
   *
   * Chamar duas vezes sem soltar no meio não abre dois streams: a segunda
   * chamada recebe o que já está vivo.
   */
  pedir(): Promise<PedidoDeMicrofone>;

  /**
   * Começa a gravar e a medir.
   *
   * Devolve `false` se não havia microfone vivo — quem chama trata como falha
   * em vez de achar que está gravando.
   */
  comecar(): boolean;

  /**
   * Para e entrega o que gravou.
   *
   * **Solta o microfone junto**, sempre, inclusive quando dá errado. É este o
   * caminho único por onde saem o toque em PARAR, o teto de tempo e o fim
   * automático.
   */
  parar(): Promise<AudioCapturado | FalhaAoParar>;

  /**
   * O nível do som agora, de 0 a 1. É o que move a Bolha.
   *
   * É LEITURA, e não evento, de propósito: a Bolha já roda o próprio laço de
   * animação e pergunta a cada quadro. Um evento 60 vezes por segundo
   * atravessando o React custaria a tela inteira para animar um desenho.
   *
   * Quem mede é o adaptador, no ritmo dele — se ninguém perguntar (movimento
   * reduzido, por exemplo), a medição continua acontecendo, senão a decisão de
   * "veio som?" dependeria de a tela estar animando.
   */
  nivelAtual(): number;

  /**
   * Solta tudo: microfone, gravador e medidor. **Idempotente de propósito** —
   * chamar sem ter pedido, ou chamar duas vezes, não pode explodir. Todo
   * caminho de saída chama isto, e caminho de saída não tem tempo de conferir
   * se o outro já chamou.
   */
  soltar(): void;

  /** Tem stream vivo agora? Existe para o teste conseguir provar a soltura. */
  estaVivo(): boolean;

  /** Está gravando agora? */
  estaGravando(): boolean;
}
