/**
 * A fala de compartilhar a nota.
 *
 * COMPARTILHAR NÃO É CHAMAR PRO X1, e a fala tem que deixar isso óbvio: o X1
 * começa uma briga e cria um link de desafio; aqui a pessoa só mostra o que
 * fez. Ninguém pode apertar isto e descobrir que criou uma batalha sem querer
 * (`ARENA.md`, RESULT).
 *
 * A FRASE DO JUIZ NÃO É SORTEADA DE NOVO AQUI. Ela vem pronta na `Nota` e
 * viaja como está — a regra está escrita no `ARENA.md` ("essa frase fica
 * guardada, porque o compartilhamento tem que repetir a mesma") e repetida no
 * tipo `Nota` em `portas/pontuacao.ts`. Sortear outra faria o jogo dizer duas
 * coisas diferentes sobre o mesmo arroto: uma na tela, outra no grupo do zap.
 */

/** O botão. Alternativa do resultado — o principal continua sendo o X1. */
export const COMPARTILHAR = 'Compartilhar';

/**
 * O que a tela diz quando o navegador não tem folha de compartilhamento e o
 * link foi para a área de transferência.
 *
 * NÃO É "compartilhado com sucesso". Copiar é outra coisa, e dizer que
 * compartilhou faria a pessoa sair achando que mandou.
 */
export const COPIEI_O_LINK = 'Copiei o link. Cola lá no grupo.';

/** Copiar também não deu. Sobra a mão, e a tela fala isso. */
export const NEM_COPIAR_DEU = 'O navegador travou tudo. Copia o link na mão.';

/** Deu ruim de verdade. */
export const NAO_DEU_PRA_COMPARTILHAR = 'Não rolou compartilhar. Tenta de novo.';

/** A provocação que fecha o texto. Curta — é a última linha antes do link. */
export const PROVOCACAO = 'Duvido bater.';

/** O que o compartilhamento precisa saber sobre o arroto. */
export interface ArrotoParaCompartilhar {
  /** A nota **já escrita**, com vírgula. Ver o porquê em `juntar`. */
  readonly notaEscrita: string;
  readonly classificacao: string;
  readonly frase: string;
}

export interface TextoCompartilhado {
  readonly titulo: string;
  readonly texto: string;
}

/**
 * Emenda as partes sem deixar ponto dobrado nem espaço solto.
 *
 * A frase do juiz às vezes já vem pontuada ("Tá maluco.") e às vezes não. Sem
 * isto, saía "Tá maluco.. Duvido bater." — o tipo de detalhe que ninguém testa
 * e todo mundo lê.
 */
function juntar(...partes: readonly string[]): string {
  return partes
    .map((parte) => parte.trim())
    .filter(Boolean)
    .map((parte) => (/[.!?…]$/.test(parte) ? parte : `${parte}.`))
    .join(' ');
}

/**
 * O texto que sai no compartilhamento.
 *
 * A NOTA CHEGA PRONTA, como string. Formatar é `shared/formato/nota.ts`, e o
 * núcleo não importa de `shared` — a direção de dependência é regra da casa
 * (`AGENTS.md` §6). Quem chama já tem a nota escrita na tela, então passar a
 * mesma string também garante que o zap e o palco mostrem o número idêntico.
 */
export function textoDoCompartilhamento({
  notaEscrita,
  classificacao,
  frase,
}: ArrotoParaCompartilhar): TextoCompartilhado {
  return {
    titulo: `Fiz ${notaEscrita} no Auê`,
    texto: juntar(classificacao, frase, PROVOCACAO),
  };
}
