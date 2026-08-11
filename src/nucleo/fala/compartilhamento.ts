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

/*
  NÃO EXISTE MAIS "copia o link na mão".

  Quando nem a folha nem a cópia funcionam, nada saiu do aparelho — e isso
  virou caso de `ERROR` (`falhaAoCompartilhar`), com a nota preservada e duas
  saídas. Como aviso inline era um beco: o resultado não tem botão de copiar
  avulso, então a frase mandava a pessoa copiar uma coisa que não estava na
  tela.
*/

/** Deu ruim de verdade. */
export const NAO_DEU_PRA_COMPARTILHAR = 'Não rolou compartilhar. Tenta de novo.';

/** A provocação que fecha o texto. Curta — é a última linha antes do link. */
export const PROVOCACAO = 'Duvido bater.';

/** O rótulo da linha que mostra o que vai sair na imagem. */
export const VAI_COM = 'Vai com:';

/** O botão que roda a lista. Rótulo fixo — nunca "Trocado", nunca "Próxima". */
export const TROCAR = 'Trocar';

/**
 * As provocações prontas, na ordem em que a lista roda.
 *
 * Quatro, curtas, e nenhuma promete batalha: quem recebe uma imagem não tem X1
 * nenhum esperando do outro lado. "Te espero na revanche" seria capacidade
 * inventada.
 */
export const PROVOCACOES_PRONTAS: readonly string[] = [
  'Duvido bater.',
  'Cadê o teu?',
  'Vai amarelar?',
  'Peita essa.',
];

/**
 * A lista inteira, começando pela reação que está na tela.
 *
 * O item 0 é a frase do juiz porque é ela que a pessoa acabou de ler — a
 * imagem já nasce dizendo o que a tela disse. Do 1 em diante são as prontas, e
 * do fim volta para o começo.
 */
export function provocacoesDaImagem(fraseDoJuiz: string): readonly string[] {
  const primeira = fraseDoJuiz.trim();
  return primeira ? [primeira, ...PROVOCACOES_PRONTAS] : PROVOCACOES_PRONTAS;
}

/**
 * O próximo índice da lista. Roda em círculo.
 *
 * Índice, e não a string escolhida: guardar o texto faria a lista e a escolha
 * poderem discordar quando a frase do juiz mudasse.
 */
export function proximaProvocacao(indice: number, quantas: number): number {
  if (quantas <= 0) return 0;
  return (indice + 1) % quantas;
}

/** O que o compartilhamento precisa saber sobre o arroto. */
export interface ArrotoParaCompartilhar {
  /** A nota **já escrita**, com vírgula. Ver o porquê em `juntar`. */
  readonly notaEscrita: string;
  readonly classificacao: string;
  readonly frase: string;
  /**
   * A provocação escolhida na tela. Sem ela, a de sempre.
   *
   * Opcional porque as telas antigas chamam sem passar nada, e o texto delas
   * não pode mudar por causa desta fatia.
   */
  readonly provocacao?: string;
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
    /*
      SEM REPETIR A MESMA FRASE DUAS VEZES SEGUIDAS.

      A provocação pode ser a própria frase do juiz — é o item 0 da lista, e é
      o padrão. Sem isto, o texto sairia "Tá maluco. Tá maluco." no grupo do
      zap, e o defeito só apareceria depois de mandado.
    */
    .filter((parte, i, todas) => parte !== todas[i - 1])
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
  provocacao = PROVOCACAO,
}: ArrotoParaCompartilhar): TextoCompartilhado {
  return {
    titulo: `Fiz ${notaEscrita} no Auê`,
    texto: juntar(classificacao, frase, provocacao),
  };
}
