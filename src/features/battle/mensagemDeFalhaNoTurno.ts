/**
 * O que a tela DIZ quando `responder_batalha` recusa um turno da disputa.
 *
 * POR QUE EXISTE: havia uma frase só para todos os casos —
 *
 *   "A nota saiu, mas não entrou na disputa. Tenta gravar de novo."
 *
 * — e ela é MENTIRA no caso mais provável de acontecer num churrasco. Dois
 * toques no botão, ou o dedo de alguém no meio do upload, batem no índice
 * único `rodadas_uma_por_participante_por_round` (20260807000031): a nota
 * ENTROU, e a tela mandava gravar de novo algo que vai falhar de novo pelo
 * mesmo motivo — com o telefone na mão da pessoa errada e a mesa esperando.
 *
 * O mesmo vale para `54000` ("já cumpriu todos os rounds"), que só acontece
 * quando a tela está atrasada em relação ao banco. Mandar gravar de novo ali é
 * pedir para a pessoa bater na mesma parede.
 *
 * POR QUE É UMA FUNÇÃO PURA, num arquivo sem React e sem rede: é a mesma forma
 * de `mensagemDeFalhaAoCompartilhar.ts` e pelo mesmo motivo — o jeito de um
 * caso voltar a ser engolido é ele nascer dentro de um `catch` de componente,
 * onde ninguém consegue testá-lo.
 *
 * Os códigos são SQLSTATE, levantados explicitamente pelas migrações 30 e 31.
 * Não dependemos do TEXTO da exceção do Postgres: ele é do banco, está em
 * português por acidente e muda sem aviso.
 */

/** O que a tela faz com a falha. */
export interface FalhaNoTurno {
  /** A frase mostrada em `role="alert"`. */
  mensagem: string;
  /**
   * Se vale recarregar a batalha antes de desistir.
   *
   * Verdadeiro exatamente quando o banco sabe mais que a tela — nota duplicada
   * ou round já fechado. Recarregar é o que faz o turno andar para a pessoa
   * certa em vez de travar na anterior.
   */
  resincronizar: boolean;
}

/** O pedaço de `PostgrestError` que interessa aqui. */
function codigoDoErro(err: unknown): string | null {
  if (typeof err !== 'object' || err === null) return null;
  const codigo = (err as { code?: unknown }).code;
  return typeof codigo === 'string' ? codigo : null;
}

export function mensagemDeFalhaNoTurno(err: unknown): FalhaNoTurno {
  switch (codigoDoErro(err)) {
    /*
      23505 — violação de unicidade. Neste caminho só existe um índice único
      possível: uma gravação por participante por round. A nota está lá.
    */
    case '23505':
      return {
        mensagem: 'Essa nota já tinha entrado. Ninguém precisa arrotar de novo — segue o jogo.',
        resincronizar: true,
      };

    /*
      54000 — "já cumpriu todos os rounds" ou "limite de rodadas". Nos dois a
      disputa não aceita mais esta gravação, e a tela é que está atrasada.
    */
    case '54000':
      return {
        mensagem: 'Esse round já fechou. Atualizamos o placar — confere de quem é a vez.',
        resincronizar: true,
      };

    /*
      P0002 — batalha inexistente ou vencida. Os 7 dias do §3.7 acabaram, ou o
      código guardado no aparelho aponta para uma disputa que não existe mais.
    */
    case 'P0002':
      return {
        mensagem: 'Esta disputa não está mais no ar. Comece outra para continuar a zoeira.',
        resincronizar: false,
      };

    /*
      42501 — o resultado não é desta sessão, ou o participante não é desta
      disputa. Gravar de novo NÃO resolve: é identidade, não rede.
    */
    case '42501':
      return {
        mensagem: 'O Auê não conseguiu ligar essa nota a esta disputa. Comece outra disputa.',
        resincronizar: false,
      };

    /*
      O resto é rede, timeout, servidor fora. Aqui — e só aqui — gravar de novo
      é o conselho certo.
    */
    default:
      return {
        mensagem: 'A nota saiu, mas não entrou na disputa. Tenta gravar de novo.',
        resincronizar: false,
      };
  }
}
