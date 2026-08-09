/**
 * A DECISÃO: aquilo que o microfone pegou é arroto ou é conversa?
 *
 * Função pura sobre os números que o YAMNet devolveu. Não conhece tfjs, não
 * conhece Blob e não conhece tela — é o único lugar onde o limiar existe, e é
 * testável sem carregar 16 MB de modelo.
 */

/**
 * O que o juiz concluiu.
 *
 * `indisponivel` NÃO é um terceiro nível de suspeita: é "não consegui olhar".
 * Ele existe separado de `nao-e-arroto` porque as consequências são opostas —
 * ver `pontuacaoLiberada`.
 */
export type VereditoDeArroto =
  | { status: 'arroto'; confianca: number; limiar: number }
  | { status: 'nao-e-arroto'; confianca: number; limiar: number }
  | { status: 'indisponivel'; motivo: string };

/**
 * O limiar de confiança, medido — não escolhido no olho.
 *
 * O GATE da #19 é explícito sobre por que os quatro limites heurísticos de
 * `rules.ts` não podem ser mexidos hoje: "as medições já mostraram que os
 * números sozinhos NÃO separam fala de arroto: a razão de grave varia de 0,067
 * a 0,502 num degradê contínuo, sem dois grupos". Isso é verdade sobre RMS,
 * grave e ZCR. NÃO é verdade sobre a saída do YAMNet.
 *
 * MEDIÇÃO (2026-08-09, banco de arroto local, 43 clipes reais + os 2 clipes de
 * demonstração publicados pelo próprio Google). Métrica: o MAIOR score da
 * classe 53 entre os quadros do clipe. Distribuição completa em
 * `docs/technical/deteccao-de-arroto-yamnet.md`:
 *
 *   40 clipes  ->  0,7609  0,9131  0,9426  0,9485  0,9934  e 36 acima de 0,99
 *    5 clipes  ->  0,0224  0,00007  0,00004  0,00000  0,00000
 *
 * Não existe NADA entre 0,0224 e 0,7609. Não é um degradê: são dois grupos, com
 * um vão de mais de trinta vezes no meio. Foi por isso que este caminho vale a
 * pena e o outro não valia.
 *
 * (Os três clipes do banco que caíram embaixo estão nomeados "Arroto (N)" mas
 * são FALA — o YAMNet os classifica como Speech com 0,816, 0,923 e 0,970. O
 * MANIFESTO do banco reclamava justamente da falta de exemplos negativos; eles
 * estavam lá dentro, com o nome errado.)
 *
 * POR QUE 0,20 e não o meio do vão: o GATE também diz de que lado errar —
 * "recusar o arroto de quem arrotou de verdade é pior do que dar nota para uma
 * conversa". 0,20 fica ~9× acima do maior falso positivo observado e ~3,8×
 * abaixo do arroto mais fraco observado, ou seja, dentro do vão e encostado no
 * lado permissivo dele. Um arroto teria que pontuar quatro vezes menos que o
 * pior do lote inteiro para ser recusado.
 *
 * `vereditoDeArroto.test.ts` trava o número DENTRO do vão medido: mudar o
 * limiar para fora de (0,0224 – 0,7609) quebra o teste, o que obriga quem
 * mexer a trazer medição nova junto.
 */
export const LIMIAR_DE_ARROTO = 0.2;

/** O maior falso positivo medido no lote — o piso do vão. Ver o teste. */
export const MAIOR_FALSO_POSITIVO_MEDIDO = 0.0224;

/** O arroto mais fraco medido no lote — o teto do vão. Ver o teste. */
export const MENOR_ARROTO_MEDIDO = 0.7609;

/**
 * Decide a partir dos scores da classe de arroto, um por quadro de 0,96 s.
 *
 * USA O MÁXIMO, não a média, e isso é a decisão que mais importa aqui depois do
 * limiar. Um arroto dura cerca de um segundo; a gravação dura até dez. A média
 * do clipe mistura o arroto com o silêncio antes e o "caralho" depois, e afunda
 * conforme a pessoa demora para tocar em PARAR — no lote, um clipe com o arroto
 * inteiro em 1,0 tem média 0,29 só porque tem 11 segundos. Punir quem demorou
 * para parar a gravação seria medir paciência, não arroto.
 */
export function vereditoDeArroto(scoresPorQuadro: readonly number[]): VereditoDeArroto {
  /*
    Sem quadro nenhum não há o que julgar, e isso NÃO pode virar "não é arroto":
    a pessoa arrotou e a culpa seria do nosso lado. O modelo oficial preenche a
    onda curta e sempre devolve pelo menos um quadro (verificado até com entrada
    de zero amostra), então chegar aqui vazio significa que alguma coisa mudou
    embaixo de nós — que é exatamente o caso de `indisponivel`.
  */
  if (scoresPorQuadro.length === 0) {
    return { status: 'indisponivel', motivo: 'O modelo não devolveu quadro nenhum.' };
  }

  let confianca = 0;
  for (const score of scoresPorQuadro) {
    /*
      NaN não pode passar despercebido. `Math.max` com NaN devolveria NaN, e
      `NaN >= LIMIAR` é falso — ou seja, uma inferência corrompida recusaria a
      gravação de quem arrotou, silenciosamente e com cara de veredito.
    */
    if (!Number.isFinite(score)) {
      return { status: 'indisponivel', motivo: 'O modelo devolveu número inválido.' };
    }
    if (score > confianca) confianca = score;
  }

  return {
    status: confianca >= LIMIAR_DE_ARROTO ? 'arroto' : 'nao-e-arroto',
    confianca,
    limiar: LIMIAR_DE_ARROTO,
  };
}

/**
 * Pode virar nota?
 *
 * O JOGO NÃO PODE PARAR PORQUE O MODELO PAROU. Só um veredito fecha a porta: o
 * de quem OLHOU e disse que não era arroto. Modelo que não baixou, WebGL que
 * morreu, navegador sem Web Audio — tudo isso libera, porque a alternativa é
 * um app que deixa de funcionar quando um arquivo de 16 MB não chega, e porque
 * o produto viveu até aqui sem detector nenhum.
 *
 * Assimetria deliberada, e ela é a diferença entre "o juiz recusou" e "o juiz
 * não estava lá".
 */
export function pontuacaoLiberada(veredito: VereditoDeArroto): boolean {
  return veredito.status !== 'nao-e-arroto';
}
