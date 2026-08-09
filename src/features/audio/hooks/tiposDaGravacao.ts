import type { RefObject } from 'react';

/**
 * Contratos da captura de áudio. Arquivo sem NADA em runtime — mesmo padrão de
 * `tiposDoEnvio.ts` e de `resultado/tipos.ts`: só `type`/`interface`, nenhum
 * valor, nenhum import que sobreviva ao build.
 *
 * Por isso `SEGUNDOS_DE_GRAVACAO` NÃO mora aqui: ele é valor, e mora no
 * `useGravacao.ts`, junto do cronômetro que o usa.
 */

export interface ParametrosDaGravacao {
  /**
   * Chamado no `onstop`, DEPOIS de o blob estar em `blobRef` e DEPOIS de o
   * microfone já ter sido solto. Recebe o blob POR VALOR porque o consumidor o
   * usa imediatamente e de forma síncrona — quem precisa dele mais tarde (o
   * envio) lê o ref.
   *
   * PRECISA SER ESTÁVEL (`useCallback` com deps vazias no componente). Ele entra
   * no array de deps de `iniciar`, e uma função nova a cada render faria
   * `iniciar` trocar de identidade sempre. Hoje `iniciar` não entra em deps de
   * efeito nenhum — só em `onClick` —, então instabilidade aqui não causaria
   * loop; a exigência é para que isso continue sendo verdade de graça no dia em
   * que alguém precisar depender de `iniciar`.
   */
  aoTerminar: (blob: Blob) => void;
}

export interface Gravacao {
  /* leitura — nenhum setter sai daqui, mesmo princípio de `EnvioDoResultado` */
  gravando: boolean;
  /**
   * Quanto falta, em milissegundos. É o estado de verdade do cronômetro — a
   * tela de gravação mostra uma casa decimal (`02,7 / 10s`), e o intervalo já
   * roda a cada 200 ms.
   */
  msRestantes: number;
  /** `msRestantes` arredondado para cima, em segundos. Derivado, não estado. */
  segundosRestantes: number;
  permissaoNegada: boolean;
  /**
   * SÓ o erro do microfone (permissão negada, gravador que não sobe).
   * Análise acústica e link da batalha continuam sendo erro do componente.
   */
  erro: string | null;
  /**
   * O Blob gravado, guardado até a origem ser escolhida.
   *
   * Vive em ref, e não em estado, porque nada na tela é desenhado a partir dele
   * — ele só é consumido dentro do envio. Em estado, cada gravação disparava um
   * render extra sem nada de novo para mostrar.
   *
   * Sai daqui como o MESMO objeto render após render, que é exatamente o que o
   * `ParametrosDoEnvio` pede: as três razões escritas lá continuam valendo
   * palavra por palavra, e nada em `tiposDoEnvio.ts` precisou mudar.
   *
   * HONESTIDADE SOBRE A GARANTIA: `RefObject<Blob | null>` não bloqueia escrita
   * no tipo — o React 19 tipa `useRef` assim mesmo. Diferente de
   * `SetadoresDoAudio`, onde o tipo torna o erro IMPOSSÍVEL, aqui ele fica
   * apenas EVIDENTE: `descartar()` é a única escrita externa prevista, e isso é
   * convenção documentada, não compilador.
   */
  blobRef: RefObject<Blob | null>;
  /** As alturas em % (0 a 100) das 10 barras do visualizer de áudio */
  frequencias: number[];
  /* ações — todas estáveis */
  iniciar: () => Promise<void>;
  parar: () => void;
  /** Esquece a gravação atual e solta tudo. É o que `tentarDeNovo` chama. */
  descartar: () => void;
}
