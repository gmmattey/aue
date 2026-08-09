/**
 * A porta do ciclo de vida — o navegador traduzido em evento de jogo.
 *
 * POR QUE ISTO NÃO É "SÓ UM `useEffect`": no iPhone, **desmontar componente
 * não é garantia de limpeza**. O Safari mata aba em segundo plano com fome, e
 * quando ele mata, nenhum `return` de efeito roda. Se o microfone estiver
 * vivo naquela hora, ele fica vivo.
 *
 * Por isso a Arena escuta `escondeu` e solta o microfone ali, antes de o
 * sistema decidir por ela. O `beforeunload` não entra nessa conversa: no iOS
 * ele não é confiável (ADR §6).
 */
export interface CicloDeVida {
  /**
   * A tela sumiu — trocou de aba, minimizou, atendeu ligação, ou o navegador
   * está indo embora. É o gatilho para soltar recurso sensível.
   */
  aoEsconder(ouvinte: () => void): void;

  /** A tela voltou. */
  aoVoltar(ouvinte: () => void): void;

  /** Larga os ouvintes. Chamado quando a Arena desmonta. */
  parar(): void;
}
