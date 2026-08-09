/**
 * O que o YAMNet come: uma onda MONO, 16 kHz, float32 entre -1 e 1.
 *
 * O que o app grava: webm/opus no Chrome Android, mp4/aac no Safari iOS, em
 * 44,1 ou 48 kHz, às vezes estéreo. Entregar isso cru ao modelo não dá erro
 * nenhum — dá NÚMERO ERRADO, que é pior. O modelo interpretaria 48 kHz como se
 * fossem 16 kHz e ouviria tudo três vezes mais grave e três vezes mais lento;
 * um arroto viraria um ronco de outra classe.
 *
 * Este módulo é o único lugar que conhece essa conversão. Ele NÃO reimplementa
 * reamostragem: quem reamostra é o próprio navegador, pelo mesmo mecanismo que
 * `engine.ts` já usa para o filtro passa-baixa (renderizar num
 * `OfflineAudioContext` com a taxa de destino). Reamostrador escrito à mão aqui
 * seria uma segunda opinião sobre um assunto em que o browser já tem a dele.
 */

/** A taxa que o YAMNet exige. Não é configurável — é parte do modelo. */
export const TAXA_DO_YAMNET = 16000;

/** O `OfflineAudioContext` do navegador, ou `undefined` onde não existir. */
type FabricaDeContexto = typeof OfflineAudioContext;

function fabrica(): FabricaDeContexto {
  /*
    Safari antigo só expõe o prefixado. O `engine.ts` assume o global direto
    porque nasceu antes; aqui a checagem existe para o caminho de falha ser
    "detector indisponível, o jogo segue" em vez de um ReferenceError solto no
    meio da análise.
  */
  const global = globalThis as unknown as {
    OfflineAudioContext?: FabricaDeContexto;
    webkitOfflineAudioContext?: FabricaDeContexto;
  };
  const encontrada = global.OfflineAudioContext ?? global.webkitOfflineAudioContext;
  if (!encontrada) throw new Error('Este navegador não tem Web Audio para decodificar o áudio.');
  return encontrada;
}

/**
 * Decodifica o blob gravado e devolve a onda pronta para o modelo.
 *
 * DECODIFICA DE NOVO, em vez de aproveitar o buffer que `analyzeAudio` já
 * decodificou. É desperdício conhecido e aceito: decodificar dez segundos custa
 * dezenas de milissegundos, contra centenas ou milhares da inferência. O que se
 * compra com isso é que `engine.ts` — que calcula a nota e é espelhado em SQL —
 * não precisou ser aberto nem ter a assinatura mexida para o detector existir.
 * Se um dia o custo aparecer num aparelho real, o conserto é passar o
 * `AudioBuffer` adiante, não escrever um decodificador aqui.
 */
export async function ondaDe16k(blob: Blob): Promise<Float32Array> {
  const Contexto = fabrica();
  const bytes = await blob.arrayBuffer();

  /*
    Decodifica JÁ pedindo 16 kHz: pela especificação, `decodeAudioData`
    reamostra para a taxa do contexto. Quando o navegador cumpre isso, a
    renderização abaixo é pulada e sai mais barato.

    O comprimento 1 é só porque o construtor exige um: nada é renderizado neste
    contexto, ele serve de decodificador.
  */
  const decodificador = new Contexto(1, 1, TAXA_DO_YAMNET);
  const decodificado = await decodificador.decodeAudioData(bytes);

  const jaEstaPronto =
    decodificado.numberOfChannels === 1 && decodificado.sampleRate === TAXA_DO_YAMNET;
  if (jaEstaPronto) return decodificado.getChannelData(0);

  /*
    Caminho de conserto, e ele cobre DOIS defeitos de uma vez:

    - estéreo. O `engine.ts` resolve isso pegando `getChannelData(0)`, ou seja,
      jogando fora o canal direito. Aqui não dá: um arroto gravado com o
      telefone virado pode estar mais forte no canal descartado, e o modelo
      julgaria o canal errado. A soma de canais que o `OfflineAudioContext` faz
      ao renderizar em mono é a mistura correta;
    - navegador que ignora a taxa do contexto ao decodificar.

    `Math.max(1, ...)` porque `OfflineAudioContext` recusa comprimento zero, e
    blob truncado existe.
  */
  const quadros = Math.max(1, Math.ceil(decodificado.duration * TAXA_DO_YAMNET));
  const conversor = new Contexto(1, quadros, TAXA_DO_YAMNET);
  const fonte = conversor.createBufferSource();
  fonte.buffer = decodificado;
  fonte.connect(conversor.destination);
  fonte.start(0);

  const convertido = await conversor.startRendering();
  return convertido.getChannelData(0);
}
