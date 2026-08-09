/**
 * A disputa em andamento, guardada no aparelho.
 *
 * O PROBLEMA QUE ISTO RESOLVE é o cenário real: 5 pessoas × 3 rounds são 15
 * gravações passando o telefone de mão em mão. No meio disso a tela apaga,
 * alguém aperta "voltar", o navegador do celular descarta a aba para liberar
 * memória, chega uma ligação. Com o estado só em `useState`, qualquer um
 * desses eventos apagava a disputa inteira — participantes, rounds, notas — e
 * não havia como recuperar: o `codigo_de_acesso` só existia em memória.
 *
 * As notas SEMPRE estiveram salvas (cada turno é um `enviar_resultado` + uma
 * rodada no banco). O que se perdia era o ENDEREÇO delas. É por isso que o que
 * fica guardado aqui é um código de dez caracteres, e não o placar: o banco
 * continua sendo a fonte, e este módulo é só o bilhetinho com o número da mesa.
 *
 * `localStorage` e não `sessionStorage`: sessionStorage morre junto com a aba,
 * que é metade dos casos acima.
 *
 * TODO ACESSO É PROTEGIDO. `localStorage` lança — não devolve `null`, lança —
 * no Safari em navegação privada e quando o usuário bloqueia armazenamento por
 * site. Uma disputa que não sobrevive ao bloqueio da tela é ruim; uma tela que
 * não abre é pior.
 */

const CHAVE = 'aue.disputa.v1';

export interface DisputaGuardada {
  /** O `codigo_de_acesso` da batalha presencial. É por ele que o banco é lido. */
  codigo: string;
  /**
   * O lugar escrito à mão, quando o contexto escolhido foi "outro".
   *
   * Fica AQUI e não no banco porque `batalhas.tipo_de_local` é um CHECK com cinco
   * valores fixos (20260807000030) e o texto livre não cabe nele. É rótulo de
   * banner, não dado de domínio — e a disputa presencial acontece inteira
   * neste aparelho, que é exatamente onde este valor precisa existir.
   */
  lugar?: string;
}

export function lerDisputaGuardada(): DisputaGuardada | null {
  try {
    const cru = window.localStorage.getItem(CHAVE);
    if (!cru) return null;

    const dado = JSON.parse(cru) as unknown;
    if (typeof dado !== 'object' || dado === null) return null;

    const { codigo, lugar } = dado as { codigo?: unknown; lugar?: unknown };
    if (typeof codigo !== 'string' || codigo.length === 0) return null;

    return { codigo, lugar: typeof lugar === 'string' && lugar ? lugar : undefined };
  } catch {
    // JSON corrompido por uma versão anterior, ou armazenamento bloqueado. Nos
    // dois casos o certo é a tela abrir na configuração, não quebrar.
    return null;
  }
}

export function guardarDisputa(disputa: DisputaGuardada): void {
  try {
    window.localStorage.setItem(CHAVE, JSON.stringify(disputa));
  } catch {
    /*
      Sem armazenamento a disputa continua funcionando NESTA sessão — o estado
      vive no React e as notas no banco. O que se perde é a retomada depois de
      a aba morrer. Não há o que dizer ao usuário aqui: avisar "seu navegador
      não guarda disputas" antes de qualquer problema acontecer é ruído.
    */
  }
}

export function esquecerDisputa(): void {
  try {
    window.localStorage.removeItem(CHAVE);
  } catch {
    // Idem.
  }
}
