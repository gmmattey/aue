/**
 * Estado do envio do áudio, separado do estado do resultado DE PROPÓSITO.
 *
 * O score é persistido pelo servidor em `enviar_resultado` e não depende do
 * Storage. Se o upload falhar, o resultado continua válido, continua contando
 * XP e continua no ranking — some apenas o som. Misturar os dois estados faria
 * uma falha de bucket parecer perda da gravação inteira.
 *
 * MORA AQUI, e não no AudioRecorder onde foi declarado, porque o
 * `PainelDoAudio` e o `BotaoDeDesafiar` precisam dele para tipar uma prop.
 * Deixá-lo no pai obrigaria os filhos a importarem o AudioRecorder — o grafo de
 * imports passaria a ter o ciclo pai -> filho -> pai. Sendo só tipo, o runtime
 * não quebraria; o que quebra é a regra do AGENTS.md de o pai não ser
 * dependência dos filhos, e alguns bundlers/linters reclamam do ciclo.
 *
 * Arquivo sem nada em runtime: nenhum valor, nenhum import de db/supabase.
 */
export type EstadoDoAudio =
  | 'inativo'
  | 'enviando'
  | 'enviado'
  | 'falhou'
  | 'sem-conta'
  /** O próprio autor tirou o áudio do ar. A nota permanece. */
  | 'apagado';
