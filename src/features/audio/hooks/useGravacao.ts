import { useCallback, useEffect, useRef, useState } from 'react';
import type { Gravacao, ParametrosDaGravacao } from './tiposDaGravacao';
import { esquecerMicrofoneLiberado, lembrarMicrofoneLiberado } from '../microfoneJaLiberado';

export const SEGUNDOS_DE_GRAVACAO = 10;

/** Quantas barras a onda tem. O protótipo (`gravacao.html`) desenha dez. */
const BARRAS_DA_ONDA = 10;

/**
 * O piso da barra, em porcentagem.
 *
 * Não é enfeite: barra de altura zero some, e uma onda com buracos parece
 * defeito de render, não silêncio. O silêncio precisa PARECER silêncio — baixo
 * e contínuo.
 */
const ALTURA_MINIMA = 5;

/** A onda parada: o que se mostra fora da gravação. */
const ondaEmRepouso = () => Array<number>(BARRAS_DA_ONDA).fill(ALTURA_MINIMA);

/**
 * O ÚNICO dono do microfone: MediaRecorder, stream, pedaços e cronômetro.
 *
 * Não sabe o que é Supabase, análise acústica, folha de origem nem nota — e é
 * essa ignorância que faz o arquivo caber na cabeça.
 *
 * NÃO segue o split `executarX` do envio, e isso é decisão, não descuido: o
 * invariante deste módulo é "TODO caminho de saída solta o stream", e ele só é
 * legível se as quatro funções de liberação e o efeito de cleanup estiverem no
 * MESMO arquivo. Espalhar o corpo em `executarGravacao.ts` recriaria exatamente
 * a doença que este módulo está curando — o cleanup espalhado por quatro
 * funções e um efeito, que é como a luz do microfone ficava acesa depois que a
 * pessoa saiu da tela.
 *
 * OS SEIS CAMINHOS DE SAÍDA, e quem solta o quê em cada um:
 *  1. Botão Parar        -> `parar`: intervalo AGORA, stream no `onstop`.
 *  2. Cronômetro zera    -> o callback do intervalo chama `parar`: idem.
 *  3. Desmontar          -> o efeito de cleanup: intervalo E stream na hora,
 *                           sem depender de o `onstop` chegar.
 *  4. Permissão negada   -> não há stream nem intervalo para soltar.
 *  5. `descartar`        -> intervalo, stream e o blob.
 *  6. `onstop` normal    -> stream, pedaços, intervalo e `gravando`.
 * Nenhum caminho fica sem dono.
 */
export function useGravacao(params: ParametrosDaGravacao): Gravacao {
  /*
    Desestruturado no topo pelo mesmo motivo de `useEnvioDoResultado`: o objeto
    de parâmetros é um literal novo a cada render, e usar `params` nas deps faria
    `iniciar` trocar de identidade sempre. O CAMPO é que entra no array.
  */
  const { aoTerminar } = params;

  const [gravando, setGravando] = useState(false);
  /**
   * O cronômetro em MILISSEGUNDOS, e não em segundos inteiros.
   *
   * A tela de gravação mostra `02,7 / 10s` (protótipo `gravacao.html`), e o
   * intervalo já batia de 200 em 200 ms — o arredondamento para inteiro jogava
   * fora uma precisão que já existia. `segundosRestantes` continua sendo
   * exportado, derivado daqui: um estado só, duas leituras, nenhum render extra.
   */
  const [msRestantes, setMsRestantes] = useState(SEGUNDOS_DE_GRAVACAO * 1000);
  const [permissaoNegada, setPermissaoNegada] = useState(false);
  /*
    O INTERVALO EM QUE O NAVEGADOR ESTA PERGUNTANDO — e nada mais.

    Vive entre a chamada de `getUserMedia` e a resposta dela, seja stream ou
    erro. A tela usa isso para deixar a bolha comprimida e ATENTA em vez de
    parecer que o toque nao pegou: sem este estado, o intervalo entre tocar em
    ARROTAR e o prompt nativo aparecer e um buraco visual, e em aparelho lento
    e um buraco longo.

    NAO e "carregando". Nada esta sendo carregado; alguem esta decidindo. Por
    isso a #72 pede que, com `prefers-reduced-motion`, este estado nao pulse:
    pulsacao de espera aqui sugeriria trabalho acontecendo.
  */
  const [pedindoPermissao, setPedindoPermissao] = useState(false);
  /**
   * Só o erro do microfone. O gate de permissão continua sendo ESTADO e não
   * exceção: `iniciar` nunca rejeita por permissão negada, ela vira mensagem.
   */
  const [erro, setErro] = useState<string | null>(null);

  const gravadorRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const pedacosRef = useRef<Blob[]>([]);
  const intervaloRef = useRef<number | null>(null);
  /** O Blob gravado. Ref, nunca estado — o porquê está em `Gravacao.blobRef`. */
  const blobRef = useRef<Blob | null>(null);

  /**
   * As alturas das barras da onda, em % — o áudio REAL, não uma animação solta.
   *
   * Estado, e não ref, porque a tela precisa repintar a cada quadro. É o único
   * estado do hook que muda em ritmo de `requestAnimationFrame`, e ele só vive
   * enquanto o gravador está gravando: `encerrarStream` devolve a onda ao
   * repouso em todo caminho de saída, junto com o resto do ciclo de vida.
   */
  const [frequencias, setFrequencias] = useState<number[]>(ondaEmRepouso);
  const audioContextRef = useRef<AudioContext | null>(null);
  const animacaoRef = useRef<number | null>(null);

  /* ---------------------------------------------------------------------- */
  /* Ciclo de vida do microfone                                              */
  /*                                                                         */
  /* O stream é obtido no momento da gravação e ENCERRADO logo depois. Antes  */
  /* ele era aberto na concessão da permissão e só parado no unmount — o      */
  /* indicador de microfone do navegador ficava aceso a sessão inteira, e     */
  /* cada nova tentativa vazava mais um stream.                               */
  /* ---------------------------------------------------------------------- */

  const encerrarStream = useCallback(() => {
    /*
      Os handlers são DESLIGADOS antes das tracks pararem.

      Sem isto, desmontar durante a gravação para as tracks, o MediaRecorder
      emite `stop` DEPOIS do unmount, e o `onstop` monta um Blob e chama
      `aoTerminar` — que dispara análise e setState numa árvore morta. Não quebra
      nada no React 19 e ninguém vê, mas é trabalho e memória num componente que
      não existe mais.

      Não perde o último pedaço no caminho normal: ali `encerrarStream` roda
      DENTRO do próprio `onstop`, e a especificação exige que o último
      `dataavailable` preceda o `stop`.
    */
    const gravador = gravadorRef.current;
    if (gravador) {
      gravador.ondataavailable = null;
      gravador.onstop = null;
    }
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    gravadorRef.current = null;

    /*
      O VISUALIZADOR SAI PELO MESMO CANO DO STREAM, e é por isso que ele mora
      aqui e não num efeito próprio: são dois recursos a mais (um laço de
      `requestAnimationFrame` e um `AudioContext`, que segura hardware de áudio)
      dependurados no mesmo invariante do arquivo — "todo caminho de saída solta
      o que abriu". Um cleanup à parte teria que repetir os seis caminhos.
    */
    if (animacaoRef.current !== null) {
      cancelAnimationFrame(animacaoRef.current);
      animacaoRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close().catch(() => {});
    }
    audioContextRef.current = null;
    setFrequencias(ondaEmRepouso());
  }, []);

  const limparIntervalo = useCallback(() => {
    if (intervaloRef.current !== null) {
      clearInterval(intervaloRef.current);
      intervaloRef.current = null;
    }
  }, []);

  /*
    O ÚNICO efeito do hook. Deps são as duas funções estáveis (useCallback com
    deps vazias), então ele monta uma vez e o cleanup roda uma vez, no unmount.
  */
  useEffect(() => () => {
    limparIntervalo();
    encerrarStream();
  }, [limparIntervalo, encerrarStream]);

  /* ---------------------------------------------------------------------- */
  /* Gravação                                                                */
  /* ---------------------------------------------------------------------- */

  const parar = useCallback(() => {
    limparIntervalo();
    if (gravadorRef.current?.state === 'recording') {
      gravadorRef.current.stop();
    }
    setGravando(false);
  }, [limparIntervalo]);

  /**
   * Esquece a gravação atual e solta tudo. É o que `tentarDeNovo` chama.
   *
   * Existe para que a escrita em `blobRef` fique TODA dentro do hook: antes o
   * componente fazia `blobRef.current = null` de fora, que é a mesma família do
   * "estadoAudio escrivível de qualquer lugar" que o passo anterior fechou com
   * tipo.
   *
   * `setGravando(false)` entra porque "solta tudo" não pode deixar a tela
   * dizendo "Parar (Ns)" sobre um gravador que acabou de ser desligado. Hoje é
   * inalcançável com `gravando` verdadeiro (`tentarDeNovo` só existe na tela de
   * resultado), e é justamente por isso que é barato deixar total.
   */
  const descartar = useCallback(() => {
    limparIntervalo();
    encerrarStream();
    blobRef.current = null;
    setGravando(false);
  }, [limparIntervalo, encerrarStream]);

  /**
   * Liga a onda ao microfone de verdade. Chamada DEPOIS de `gravador.start()`.
   *
   * FALHAR AQUI NÃO PODE DERRUBAR A GRAVAÇÃO. O `AudioContext` é o recurso mais
   * frágil do fluxo — navegador antigo sem o construtor, limite de contextos
   * simultâneos, aparelho recusando a fonte — e ele é DECORAÇÃO: o áudio que
   * vira nota vem do `MediaRecorder`, não daqui. Por isso cada tropeço volta em
   * silêncio, com a onda parada, e o arroto continua sendo gravado.
   *
   * O contrário — deixar a exceção subir para o `try` do gravador — cairia no
   * `catch` que diz "Seu navegador não deixou a gravação começar", que é
   * mentira: ela começou.
   */
  const iniciarVisualizador = useCallback((stream: MediaStream) => {
    /*
      `webkitAudioContext` é o Safari mais velho, que é público real do Auê. O
      cast nomeia exatamente o que se procura em vez de um `any` que apagaria a
      checagem do resto da linha.
    */
    const ContextoDeAudio =
      window.AudioContext ??
      (window as typeof window & { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (typeof ContextoDeAudio !== 'function') return;

    try {
      const contexto = new ContextoDeAudio();
      audioContextRef.current = contexto;

      /*
        O Safari entrega o contexto SUSPENSO mesmo criado dentro do gesto do
        usuário, e contexto suspenso não processa o grafo: `getByteFrequencyData`
        devolveria zero para sempre e a onda ficaria parada — o mesmo sintoma do
        bug que este trecho conserta, só que por outra causa.
      */
      void contexto.resume().catch(() => {});

      const analisador = contexto.createAnalyser();
      /*
        64 dá 32 faixas; as dez primeiras cobrem a região grave onde o arroto
        acontece. `smoothingTimeConstant` é o padrão (0.8) de propósito: é o
        smoothing que a #56 pede para tirar a tremedeira, e ele sai de graça no
        próprio nó em vez de virar média manual a cada quadro.
      */
      analisador.fftSize = 64;
      contexto.createMediaStreamSource(stream).connect(analisador);

      const faixas = new Uint8Array(analisador.frequencyBinCount);

      const quadro = () => {
        /*
          O gate que encerra o laço sozinho quando a gravação acaba por qualquer
          motivo — PARAR, cronômetro, track morta por fora. `encerrarStream`
          cancela o quadro já agendado; este `return` cobre o quadro que já
          estava em voo.
        */
        if (gravadorRef.current?.state !== 'recording') {
          animacaoRef.current = null;
          return;
        }

        analisador.getByteFrequencyData(faixas);
        setFrequencias(
          Array.from({ length: BARRAS_DA_ONDA }, (_, i) =>
            Math.max(ALTURA_MINIMA, Math.round((faixas[i] / 255) * 100)),
          ),
        );
        animacaoRef.current = requestAnimationFrame(quadro);
      };

      /*
        AGENDA o primeiro quadro em vez de CHAMAR `quadro()` direto, e é aqui
        que o bug original morre de verdade.

        Chamada direta, o gate `state !== 'recording'` roda no mesmo tique de
        `iniciar` — antes de qualquer coisa ter começado a gravar — e o laço
        sai sem nunca agendar nada. Agendado, a primeira execução acontece no
        próximo repaint, quando `start()` já rodou.
      */
      animacaoRef.current = requestAnimationFrame(quadro);
    } catch (err) {
      console.error('Visualizador de áudio indisponível — a gravação segue', err);
    }
  }, []);

  const iniciar = useCallback(async () => {
    /*
      Começa soltando o que porventura esteja aberto. É no-op em todo estado
      alcançável — `gravando` troca o botão para "Parar", e `ocupado` desabilita
      o de gravar —, e é essa impossibilidade que torna a linha barata: o
      invariante "não há stream vivo sem dono" passa a ser TOTAL em vez de
      circunstancial, e um caminho novo que permita gravar por cima já nasce
      protegido.
    */
    limparIntervalo();
    encerrarStream();

    setErro(null);
    pedacosRef.current = [];
    blobRef.current = null;

    let stream: MediaStream;
    setPedindoPermissao(true);
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (err) {
      /*
        NEM TODO `getUserMedia` QUE FALHA É PERMISSÃO NEGADA — e tratar os dois
        casos como um só fazia o produto dar a instrução ERRADA.

        `NotAllowedError`/`SecurityError` é a pessoa (ou a política do site)
        recusando: aí a `TelaDeMicrofoneBloqueado` e o roteiro de como liberar
        nas configurações são exatamente o que resolve.

        `NotReadableError` (outro app segurando o microfone), `NotFoundError`
        (não tem microfone) e companhia NÃO se resolvem em configuração
        nenhuma. Mandar essa pessoa para o roteiro de permissão é mentir sobre
        a causa — a #57 dá a frase certa: "Fiquei sem o microfone."

        O `else` é o ramo do desconhecido de propósito: entre prometer que
        mexer na permissão resolve e dizer que o microfone não veio, só a
        segunda continua verdadeira quando a gente não sabe o motivo.
      */
      /*
        Desligado ANTES de qualquer ramo de erro: seja negativa, microfone
        ocupado ou aparelho sem microfone, a pergunta ja acabou. Deixar isto
        so no caminho feliz prenderia a bolha no estado "esperando resposta"
        para sempre depois de uma recusa.
      */
      setPedindoPermissao(false);
      const nome = err instanceof DOMException ? err.name : '';
      if (nome === 'NotAllowedError' || nome === 'SecurityError') {
        /*
          APAGA A LEMBRANÇA de que este aparelho já liberou o microfone. Sem
          isto, quem revogou a permissão nas configurações voltaria a cair na
          abertura automática da tela de gravação a cada visita, e a tela de
          permissão bloqueada apareceria por cima — um passo a mais, toda vez,
          exatamente para quem já está com problema.
        */
        esquecerMicrofoneLiberado();
        setPermissaoNegada(true);
        setErro('Precisamos do microfone para gravar o Auê. Libere a permissão nas configurações do navegador.');
      } else {
        console.error('Microfone indisponível', err);
        /*
          Precisa ser explícito: uma negativa ANTERIOR deixou `permissaoNegada`
          verdadeiro, e sem esta linha a tentativa seguinte cairia na tela de
          permissão mesmo tendo falhado por outro motivo.
        */
        setPermissaoNegada(false);
        setErro('Fiquei sem o microfone.');
      }
      return;
    }

    /*
      A CAPTURA DEU CERTO. É o único lugar do código que sabe disso de fato, e
      por isso é aqui que a lembrança é gravada — não no clique, que só sabe da
      intenção. Ver `microfoneJaLiberado.ts` para por que a lembrança existe
      apesar da Permissions API.
    */
    setPedindoPermissao(false);
    lembrarMicrofoneLiberado();
    setPermissaoNegada(false);
    streamRef.current = stream;

    /*
      Construção e `start()` dentro do try, com `encerrarStream()` no catch.
      VAZAMENTO REAL QUE ISTO FECHA: se `new MediaRecorder(stream)` ou
      `gravador.start()` lançarem (contêiner não suportado, aparelho estranho), a
      stream JÁ foi obtida e JÁ está em `streamRef`.
    */
    try {
      const gravador = new MediaRecorder(stream);
      gravadorRef.current = gravador;

      gravador.ondataavailable = (evento) => {
        if (evento.data.size > 0) pedacosRef.current.push(evento.data);
      };

      gravador.onstop = () => {
        const blob = new Blob(pedacosRef.current, { type: gravador.mimeType || 'audio/webm' });
        pedacosRef.current = [];
        // Guardado para o envio, que só acontece depois da origem escolhida e do
        // resultado persistido — o caminho no bucket é derivado do id da linha.
        blobRef.current = blob;
        encerrarStream();

        /*
          `limparIntervalo` e `setGravando(false)` aqui são no-op no caminho
          feliz (o `parar` já rodou os dois antes do stop chegar). Eles existem
          para o caminho anormal — track encerrada por fora, permissão revogada
          no meio, fone desconectado: ali o `onstop` dispara sozinho, e antes o
          cronômetro CONTINUAVA correndo e o botão continuava escrito
          "Parar (Ns)" sobre um gravador morto, curando só quando o contador
          zerava.
        */
        limparIntervalo();
        setGravando(false);

        /*
          O corte é AQUI, e não depois da análise. As quatro linhas acima são
          ciclo de vida do microfone; o que se faz com o produto é de quem
          pediu. Cortando neste ponto, o microfone é solto ANTES de qualquer
          análise — fica estruturalmente impossível a análise se interpor entre
          gravar e liberar, em vez de isso ser convenção.
        */
        aoTerminar(blob);
      };

      gravador.start();
    } catch (err) {
      console.error('Falha ao iniciar a gravação', err);
      encerrarStream();
      /*
        COPY NOVA, e a única deste passo. O caminho já existia na main e era
        MUDO: `new MediaRecorder(stream)` e `start()` não tinham try/catch, então
        um navegador que recusasse o formato deixava o microfone aberto e a tela
        sem uma palavra.

        Segue `docs/jogo/VOZ.md`: §1 (fala de amigo, não de
        marca — "Não foi possível" é de circular corporativo) e §7 (o humor não
        come a informação: diz que foi o navegador, e o console guarda o resto).
      */
      setErro('Seu navegador não deixou a gravação começar. Tenta de novo aí.');
      return;
    }

    setGravando(true);
    setMsRestantes(SEGUNDOS_DE_GRAVACAO * 1000);

    /*
      DEPOIS do `start()`.

      O defeito que isto fecha: o visualizador subia ANTES do
      `new MediaRecorder`, com `gravadorRef.current` ainda em `null` (o
      `encerrarStream` no topo de `iniciar` zerou). A primeira linha do laço é o
      gate `state !== 'recording'`, então ele saía na primeira passada e as dez
      barras ficavam paradas na altura de repouso a gravação inteira. Pior que
      não ter visualizador: onda parada PARECE medida, e a #56 é explícita — a
      onda é o medidor, e medidor que não mede é mentira na interface.

      Sozinha, esta ordem não seria garantia: o agendamento por
      `requestAnimationFrame` lá dentro é que torna o laço imune ao tique em que
      ele sobe. As duas coisas juntas são de propósito — a ordem declara a
      intenção, o agendamento sustenta ela.
    */
    iniciarVisualizador(stream);

    // O limite é calculado a partir de um instante fixo e o efeito colateral
    // fica no callback do intervalo. Antes, `stopRecording()` era chamado de
    // DENTRO do updater de `setTimeLeft` — updater precisa ser puro, e o React
    // pode reexecutá-lo.
    const limite = Date.now() + SEGUNDOS_DE_GRAVACAO * 1000;
    intervaloRef.current = window.setInterval(() => {
      const restante = Math.max(0, limite - Date.now());
      setMsRestantes(restante);
      if (restante === 0) parar();
    }, 200);
  }, [encerrarStream, limparIntervalo, parar, aoTerminar, iniciarVisualizador]);

  return {
    gravando,
    msRestantes,
    segundosRestantes: Math.ceil(msRestantes / 1000),
    permissaoNegada,
    pedindoPermissao,
    erro,
    blobRef,
    frequencias,
    iniciar,
    parar,
    descartar,
  };
}
