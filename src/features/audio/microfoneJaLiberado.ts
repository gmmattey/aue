/**
 * "Dá para abrir o microfone agora sem interromper a pessoa?"
 *
 * Existe por causa de uma regra do jogo (docs/jogo/REGRAS.md §1: "solicitar acesso ao
 * microfone somente quando necessário") somada a uma da casa: nada pode fingir
 * que funciona. Começar a gravar sozinho é ótimo para quem já autorizou o
 * microfone — e é péssimo para quem nunca autorizou, porque a tela de gravação
 * apareceria com o cronômetro correndo enquanto o navegador mostra o pedido de
 * permissão por cima. O cronômetro estaria mentindo: não há captura nenhuma.
 *
 * Por isso a resposta é conservadora. Na dúvida, `false`: a pessoa vê o botão e
 * o toque dela é que abre o microfone, que é o comportamento de hoje.
 *
 * DUAS FONTES, e a segunda não é redundância
 * ------------------------------------------
 * 1. `navigator.permissions.query({ name: 'microphone' })` é a resposta certa
 *    quando existe. Chrome e Edge respondem.
 * 2. A lembrança local existe porque o Safari — inclusive no iPhone, que é o
 *    aparelho onde este produto vive — **não** aceita `'microphone'` nessa
 *    consulta: ele rejeita a promessa com `TypeError`. Sem o item 2, o iPhone
 *    cairia sempre no `false` e o toque a mais continuaria lá exatamente para
 *    quem mais incomoda.
 *
 * A lembrança é gravada por quem de fato conseguiu capturar áudio uma vez neste
 * aparelho (ver `useGravacao`), então ela não é um palpite: é um fato
 * observado. Pode envelhecer — a pessoa pode revogar a permissão nas
 * configurações depois. Esse caso não quebra nada: `getUserMedia` falha,
 * `permissaoNegada` fica verdadeiro e a tela de microfone bloqueado aparece,
 * que é o caminho que já existe e já diz a verdade.
 */

/** Chave única do aparelho. Sem dado pessoal: é um booleano disfarçado. */
const CHAVE_DA_LEMBRANCA = 'aue:microfone-ja-liberado';

/**
 * Nunca deixa o armazenamento derrubar o fluxo.
 *
 * `localStorage` lança em navegação privada antiga do Safari e quando o site
 * está com cookies de terceiro bloqueados dentro de um iframe. Gravar áudio não
 * pode depender disso.
 */
function lerLembranca(): boolean {
  try {
    return window.localStorage.getItem(CHAVE_DA_LEMBRANCA) === '1';
  } catch {
    return false;
  }
}

/** Chamado depois de uma captura que deu certo. Ver `useGravacao.iniciar`. */
export function lembrarMicrofoneLiberado(): void {
  try {
    window.localStorage.setItem(CHAVE_DA_LEMBRANCA, '1');
  } catch {
    /* Sem lembrança o app só fica menos esperto, não fica quebrado. */
  }
}

/** Usado pelo teste e por quem precisar reencenar o primeiro acesso. */
export function esquecerMicrofoneLiberado(): void {
  try {
    window.localStorage.removeItem(CHAVE_DA_LEMBRANCA);
  } catch {
    /* idem */
  }
}

export async function microfoneJaLiberado(): Promise<boolean> {
  /*
    A consulta vem primeiro porque ela é a única das duas que sabe de uma
    REVOGAÇÃO: quem tirou a permissão nas configurações do navegador continua
    com a lembrança gravada aqui, e responder 'denied' evita abrir a tela de
    gravação para uma captura que já sabemos que vai falhar.
  */
  try {
    const permissoes = navigator.permissions;
    if (permissoes?.query) {
      // `as PermissionName`: o lib.dom do TS não lista 'microphone' na união,
      // embora a especificação de Media Capture o defina. Não é gambiarra de
      // runtime — é o tipo que está atrás da spec.
      const estado = await permissoes.query({ name: 'microphone' as PermissionName });
      if (estado.state === 'granted') return true;
      if (estado.state === 'denied') return false;
      // 'prompt' cai adiante: o navegador AINDA VAI perguntar, e nesse caso
      // quem tem que disparar a pergunta é o toque da pessoa.
      return false;
    }
  } catch {
    /*
      Safari cai aqui, e é o caminho esperado — não um imprevisto. Segue para a
      lembrança local.
    */
  }

  return lerLembranca();
}
