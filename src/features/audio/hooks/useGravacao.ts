import { useCallback, useEffect, useRef, useState } from 'react';
import type { Gravacao, ParametrosDaGravacao } from './tiposDaGravacao';

export const SEGUNDOS_DE_GRAVACAO = 10;

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
      const nome = err instanceof DOMException ? err.name : '';
      if (nome === 'NotAllowedError' || nome === 'SecurityError') {
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

    setPermissaoNegada(false);
    streamRef.current = stream;

    /*
      Construção e `start()` dentro do try, com `encerrarStream()` no catch.

      VAZAMENTO REAL QUE ISTO FECHA: se `new MediaRecorder(stream)` ou
      `gravador.start()` lançarem (contêiner não suportado, aparelho estranho), a
      stream JÁ foi obtida e JÁ está em `streamRef`. A exceção subia de uma
      função async chamada direto no `onClick`, virava unhandled rejection,
      ninguém soltava as tracks — e a luz do microfone ficava acesa com
      `gravando` falso e a tela sem dizer nada.
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

        Segue `docs/produto/VOZ_E_PERSONALIDADE.md`: §1 (fala de amigo, não de
        marca — "Não foi possível" é de circular corporativo) e §7 (o humor não
        come a informação: diz que foi o navegador, e o console guarda o resto).
      */
      setErro('Seu navegador não deixou a gravação começar. Tenta de novo aí.');
      return;
    }

    setGravando(true);
    setMsRestantes(SEGUNDOS_DE_GRAVACAO * 1000);

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
  }, [encerrarStream, limparIntervalo, parar, aoTerminar]);

  return {
    gravando,
    msRestantes,
    /*
      Derivado, e não estado próprio: dois estados para o mesmo relógio
      dessincronizam no dia em que alguém esquecer de atualizar um deles.
      `ceil` preserva o comportamento anterior — o contador só mostra 0 quando
      o tempo de fato acabou.
    */
    segundosRestantes: Math.ceil(msRestantes / 1000),
    permissaoNegada,
    erro,
    blobRef,
    iniciar,
    parar,
    descartar,
  };
}
