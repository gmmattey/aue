/**
 * O link do desafio tem duas formas, e a diferença é de propósito.
 *
 * `/b/<código>` — **o link direto.** Abre a batalha no jogo, sem passar por
 * lugar nenhum. É o que aparece na tela, é o que o botão "copiar" entrega, e é
 * o que continua funcionando para sempre.
 *
 * `/x/<código>` — **o link que viaja.** Passa pela prévia (ADR 0003) para o
 * cartão do WhatsApp chegar com a nota da batalha em vez do cartão genérico.
 *
 * POR QUE OS DOIS EXISTEM. O ADR 0003 §7 exige que compartilhar não dependa da
 * prévia estar de pé. Se tudo virasse `/x/`, uma prévia fora do ar levaria
 * junto o único jeito de mandar o desafio. Assim, quem copia nunca depende
 * dela — e quem usa a folha do sistema ganha o cartão bonito.
 */

/** `/b/ABC123` no fim da URL. Nada além disso vira `/x/`. */
const CAMINHO_DA_BATALHA = /\/b\/([A-Z0-9]+)$/;

/**
 * A forma do link que vai para fora, com prévia.
 *
 * **Não reconheceu o formato? Devolve o que veio.** Um link direto que abre é
 * melhor que um `/x/` inventado em cima de uma URL que ninguém previu — e é o
 * mesmo espírito do §7 do ADR: na dúvida, cai para o que não depende de nada.
 */
export function linkComPrevia(linkDaBatalha: string): string {
  return linkDaBatalha.replace(CAMINHO_DA_BATALHA, '/x/$1');
}
