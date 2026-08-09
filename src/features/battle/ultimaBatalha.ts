/**
 * A última batalha que ESTE aparelho criou, guardada localmente.
 *
 * O PROBLEMA QUE ISTO RESOLVE: o link da batalha só existia em `useState` do
 * `AudioRecorder` e era zerado ao gravar de novo. Quem criava a batalha e
 * fechava a aba antes de compartilhar perdia o endereço para sempre — e "para
 * sempre" aqui é literal, porque `batalhas` não tem policy de SELECT nenhuma
 * (20260807000030) e portanto NÃO PODE existir uma lista de "minhas batalhas".
 * A obscuridade que protege a sessão é a mesma que impede recuperá-la.
 *
 * É o mesmo bilhetinho com o número da mesa de [disputaGuardada.ts]: o banco
 * continua sendo a fonte, aqui fica só o código de dez caracteres.
 *
 * O QUE ESTE MÓDULO NÃO FAZ: afirmar que a batalha está viva. `criar_batalha`
 * devolve só o código, sem `expira_em`, então o prazo real mora no servidor.
 * Guardamos o instante da criação e paramos de oferecer o atalho depois de 7
 * dias — o mesmo prazo do `DEFAULT` da coluna. Se o servidor tiver encerrado
 * antes, abrir o link mostra a tela de sessão vencida, que é a verdade. Nunca
 * o contrário: o atalho não sobrevive ao prazo prometendo o que não há.
 *
 * TODO ACESSO É PROTEGIDO. `localStorage` lança — não devolve `null`, lança —
 * no Safari em navegação privada e quando o usuário bloqueia armazenamento por
 * site. Perder o atalho é ruim; não abrir o app é pior.
 */

const CHAVE = 'aue.ultima-batalha.v1';

/** O mesmo prazo do `DEFAULT now() + interval '7 days'` da 20260807000030. */
const VALIDADE_MS = 7 * 24 * 60 * 60 * 1000;

export interface UltimaBatalha {
  /** O `codigo_de_acesso` de dez caracteres. É por ele que o banco é lido. */
  codigo: string;
  /** Quando este aparelho criou a batalha, em epoch ms. */
  criadaEm: number;
}

export function guardarUltimaBatalha(codigo: string, agora = Date.now()): void {
  try {
    const bilhete: UltimaBatalha = { codigo, criadaEm: agora };
    localStorage.setItem(CHAVE, JSON.stringify(bilhete));
  } catch {
    // Armazenamento bloqueado. O link continua na tela desta sessão.
  }
}

/**
 * Devolve a última batalha criada por este aparelho, ou `null` quando não há,
 * quando o prazo já passou, ou quando o que estava guardado não é legível.
 */
export function lerUltimaBatalha(agora = Date.now()): UltimaBatalha | null {
  let cru: string | null = null;
  try {
    cru = localStorage.getItem(CHAVE);
  } catch {
    return null;
  }
  if (!cru) return null;

  try {
    const bilhete = JSON.parse(cru) as Partial<UltimaBatalha>;
    if (typeof bilhete?.codigo !== 'string' || !bilhete.codigo) return null;
    if (typeof bilhete?.criadaEm !== 'number' || !Number.isFinite(bilhete.criadaEm)) return null;
    if (agora - bilhete.criadaEm >= VALIDADE_MS) {
      esquecerUltimaBatalha();
      return null;
    }
    return { codigo: bilhete.codigo, criadaEm: bilhete.criadaEm };
  } catch {
    // Guardado por uma versão anterior, ou corrompido. Não é erro do usuário.
    esquecerUltimaBatalha();
    return null;
  }
}

export function esquecerUltimaBatalha(): void {
  try {
    localStorage.removeItem(CHAVE);
  } catch {
    // Mesmo motivo do `guardar`.
  }
}
