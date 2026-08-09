/**
 * O que o YAMNet devolve, e onde mora o arroto.
 *
 * O modelo é o `google/yamnet` oficial (ver
 * `public/modelos/yamnet/PROCEDENCIA.md`): entra uma onda mono de 16 kHz, sai
 * uma matriz `[quadros, 521]` de sigmoides — uma por classe do AudioSet, por
 * janela de 0,96 s.
 *
 * NÃO É SOFTMAX. As 521 saídas são independentes e não somam 1: um mesmo quadro
 * pode ser "Burping, eructation" 0,98 e "Inside, small room" 0,3 ao mesmo tempo,
 * porque as duas coisas são verdade. Quem ler estes números como probabilidade
 * de classe única vai concluir besteira.
 */

/** As 521 classes do AudioSet que o YAMNet pontua. */
export const TOTAL_DE_CLASSES = 521;

/**
 * O índice da classe que interessa, no `yamnet_class_map.csv` oficial.
 *
 * `53,/m/03q5_w,"Burping, eructation"` — e este número NÃO é confiança de quem
 * escreveu, é verificação: `classesDoYamnet.test.ts` lê o CSV que está em
 * `public/modelos/yamnet/` (o mesmo arquivo publicado pelo Google, byte por
 * byte) e falha se a linha 53 deixar de ser o arroto.
 *
 * Isso importa porque o índice é a ÚNICA amarra entre o nosso código e o
 * modelo. Trocar o modelo por outra versão com ontologia diferente não quebra
 * nada de forma visível: a inferência continua rodando, o número continua
 * saindo, e o app passa a julgar arroto pela pontuação de "Fireworks".
 */
export const INDICE_DO_ARROTO = 53;

/** O rótulo oficial, como está escrito no CSV do Google. */
export const NOME_DA_CLASSE_DE_ARROTO = 'Burping, eructation';

/** O MID da ontologia do AudioSet para a mesma classe. */
export const MID_DA_CLASSE_DE_ARROTO = '/m/03q5_w';
