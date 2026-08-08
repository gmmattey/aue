import React, { useCallback, useEffect, useRef, useState } from 'react';
import { analyzeAudio, AudioVazioError, AudioMudoError, type AudioMetrics } from './engine';
import { calculateScore, type Origin, type ScoreResult } from './rules';
import {
  submitResult,
  criarBatalha,
  criarPostDeAudio,
  enviarAudioDoResultado,
  removerAudioDoResultado,
  getProfile,
  updateProfile,
  apelidoEhPadrao,
  supabase,
  AudioFormatoNaoAceitoError,
  AudioGrandeDemaisError,
  type ResultadoRow,
} from '../../db/supabase';
import { FLAGS } from '../../shared/flags';
import { CompartilharEmRede } from '../../shared/components/CompartilharEmRede';
import { useShareResult } from './useShareResult';
import { OriginSheet } from './OriginSheet';
import { AudioPlayback } from './AudioPlayback';

const SEGUNDOS_DE_GRAVACAO = 10;

/**
 * Estado do envio do áudio, separado do estado do resultado DE PROPÓSITO.
 *
 * O score é persistido pelo servidor em `submit_resultado` e não depende do
 * Storage. Se o upload falhar, o resultado continua válido, continua contando
 * XP e continua no ranking — some apenas o som. Misturar os dois estados faria
 * uma falha de bucket parecer perda da gravação inteira.
 */
type EstadoDoAudio =
  | 'inativo'
  | 'enviando'
  | 'enviado'
  | 'falhou'
  | 'sem-conta'
  /** O próprio autor tirou o áudio do ar. A nota permanece. */
  | 'apagado';

interface AudioRecorderProps {
  /**
   * Recebe a linha JÁ PERSISTIDA pelo servidor (com score e classificação
   * oficiais). Antes recebia apenas o `ScoreResult` local, e o consumidor
   * gravava um SEGUNDO resultado — duplicando linha e XP.
   */
  onRecordingComplete?: (dbResult: ResultadoRow) => void;
  hideChallengeButton?: boolean;
}

export const AudioRecorder: React.FC<AudioRecorderProps> = ({ onRecordingComplete, hideChallengeButton }) => {
  const [gravando, setGravando] = useState(false);
  const [segundosRestantes, setSegundosRestantes] = useState(SEGUNDOS_DE_GRAVACAO);
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [permissaoNegada, setPermissaoNegada] = useState(false);

  const [metricas, setMetricas] = useState<AudioMetrics | null>(null);
  const [mostrarOrigem, setMostrarOrigem] = useState(false);
  const [resultado, setResultado] = useState<ScoreResult | null>(null);
  const [linhaSalva, setLinhaSalva] = useState<ResultadoRow | null>(null);
  const [linkDesafio, setLinkDesafio] = useState<string | null>(null);

  const [estadoAudio, setEstadoAudio] = useState<EstadoDoAudio>('inativo');
  /** Motivo específico da falha de áudio. Nunca substitui o estado acima. */
  const [motivoFalhaAudio, setMotivoFalhaAudio] = useState<string | null>(null);
  const [postadoNoFeed, setPostadoNoFeed] = useState(false);
  const [apagandoAudio, setApagandoAudio] = useState(false);
  /**
   * Erro do "Apagar meu áudio", separado de `motivoFalhaAudio`.
   *
   * Reaproveitar aquele campo escondia esta mensagem: no estado 'enviado' com o
   * post publicado, o ramo exibido é o de sucesso, e a falha ao apagar não
   * apareceria em lugar nenhum — a pessoa pediria para apagar e a tela não
   * diria nada.
   */
  const [erroAoApagar, setErroAoApagar] = useState<string | null>(null);
  /** Por que o compartilhamento do sistema não rolou. Ver `compartilharNota`. */
  const [erroAoCompartilhar, setErroAoCompartilhar] = useState<string | null>(null);

  const [temSessao, setTemSessao] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [nomeExibicao, setNomeExibicao] = useState('');
  /**
   * Apelido que o perfil tem hoje, ou `null` enquanto não se sabe.
   *
   * Existe para responder "esta pessoa já escolheu como quer aparecer?" — que
   * é a pergunta que decide se o campo de nome aparece. Ver
   * `apelidoEhPadrao` em `db/supabase.ts`.
   */
  const [apelidoAtual, setApelidoAtual] = useState<string | null>(null);

  const { shareResult } = useShareResult();

  const gravadorRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const pedacosRef = useRef<Blob[]>([]);
  const intervaloRef = useRef<number | null>(null);
  /**
   * O Blob gravado, guardado até a origem ser escolhida.
   *
   * Vive em ref, e não em estado, porque nada na tela é desenhado a partir dele
   * — ele só é consumido dentro do envio. Em estado, cada gravação disparava um
   * render extra sem nada de novo para mostrar.
   */
  const blobRef = useRef<Blob | null>(null);

  /* ---------------------------------------------------------------------- */
  /* Sessão                                                                  */
  /*                                                                         */
  /* Desde o login anônimo (`shared/auth/sessaoAnonima.ts`), `temSessao` é    */
  /* praticamente sempre verdadeiro — a sessão é criada no boot, sem tela.    */
  /* Ele deixou de significar "a pessoa se cadastrou" e passou a significar   */
  /* "dá para gravar áudio no Storage", que é o que o resto do arquivo usa.   */
  /*                                                                         */
  /* Falso continua sendo possível e continua sendo tratado: é o modo         */
  /* degradado de quando o provedor anônimo está desligado no painel do       */
  /* Supabase. Nenhum ramo `!temSessao` foi apagado por isso.                 */
  /* ---------------------------------------------------------------------- */

  useEffect(() => {
    let ativo = true;

    const aplicar = (uid: string | null) => {
      if (!ativo) return;
      setTemSessao(Boolean(uid));
      setUserId(uid);
      if (!uid) {
        setApelidoAtual(null);
        return;
      }
      // Falhar aqui é inofensivo: sem apelido conhecido o campo de nome
      // aparece, que é o lado seguro do erro (pedir de novo, não sumir).
      getProfile(uid)
        .then((p) => ativo && setApelidoAtual(p.apelido ?? null))
        .catch(() => ativo && setApelidoAtual(null));
    };

    supabase.auth.getSession().then(({ data }) => aplicar(data.session?.user?.id ?? null));

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_evento, sessao) => {
      aplicar(sessao?.user?.id ?? null);
    });

    return () => {
      ativo = false;
      subscription.unsubscribe();
    };
  }, []);

  /* ---------------------------------------------------------------------- */
  /* Ciclo de vida do microfone                                              */
  /*                                                                         */
  /* O stream é obtido no momento da gravação e ENCERRADO logo depois. Antes  */
  /* ele era aberto na concessão da permissão e só parado no unmount — o      */
  /* indicador de microfone do navegador ficava aceso a sessão inteira, e     */
  /* cada nova tentativa vazava mais um stream.                               */
  /* ---------------------------------------------------------------------- */

  const encerrarStream = useCallback(() => {
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

  useEffect(() => () => {
    limparIntervalo();
    encerrarStream();
  }, [limparIntervalo, encerrarStream]);

  /* ---------------------------------------------------------------------- */
  /* Gravação                                                                */
  /* ---------------------------------------------------------------------- */

  const pararGravacao = useCallback(() => {
    limparIntervalo();
    if (gravadorRef.current?.state === 'recording') {
      gravadorRef.current.stop();
    }
    setGravando(false);
  }, [limparIntervalo]);

  const iniciarGravacao = useCallback(async () => {
    setErro(null);
    setMetricas(null);
    setResultado(null);
    setLinhaSalva(null);
    setLinkDesafio(null);
    setEstadoAudio('inativo');
    setMotivoFalhaAudio(null);
    setPostadoNoFeed(false);
    setErroAoApagar(null);
    pedacosRef.current = [];
    blobRef.current = null;

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      setPermissaoNegada(true);
      setErro('Precisamos do microfone para gravar o Auê. Libere a permissão nas configurações do navegador.');
      return;
    }

    setPermissaoNegada(false);
    streamRef.current = stream;

    const gravador = new MediaRecorder(stream);
    gravadorRef.current = gravador;

    gravador.ondataavailable = (evento) => {
      if (evento.data.size > 0) pedacosRef.current.push(evento.data);
    };

    gravador.onstop = async () => {
      const blob = new Blob(pedacosRef.current, { type: gravador.mimeType || 'audio/webm' });
      pedacosRef.current = [];
      // Guardado para o envio, que só acontece depois da origem escolhida e do
      // resultado persistido — o caminho no bucket é derivado do id da linha.
      blobRef.current = blob;
      encerrarStream();

      setOcupado(true);
      try {
        // Só a análise acústica acontece aqui. O envio espera a origem, que é
        // perguntada logo em seguida — ela pesa 10% do score e define
        // `is_artificial`, então não dá para enviar antes de saber.
        setMetricas(await analyzeAudio(blob));
        setMostrarOrigem(true);
      } catch (err) {
        console.error('Falha ao analisar o áudio', err);
        setErro(
          /*
            `AudioMudoError` é o caso de silêncio: gravou, tem duração, mas não
            tem som. Antes ele não existia e virava NOTA — um iPhone mudo tirou
            54,2 "Arroto Respeitável". A mensagem sugere o microfone porque a
            causa quase sempre é essa: telefone longe da boca, ou o navegador
            entregando um stream vazio.
          */
          err instanceof AudioMudoError
            ? 'Não saiu som nenhum nessa gravação. Chega mais perto do microfone e manda de novo.'
            : err instanceof AudioVazioError
              ? 'Não deu para ouvir nada nessa gravação. Tenta de novo, mais perto do microfone.'
              : 'Não foi possível analisar o áudio. Tenta gravar de novo.',
        );
      } finally {
        setOcupado(false);
      }
    };

    gravador.start();
    setGravando(true);
    setSegundosRestantes(SEGUNDOS_DE_GRAVACAO);

    // O limite é calculado a partir de um instante fixo e o efeito colateral
    // fica no callback do intervalo. Antes, `stopRecording()` era chamado de
    // DENTRO do updater de `setTimeLeft` — updater precisa ser puro, e o React
    // pode reexecutá-lo.
    const limite = Date.now() + SEGUNDOS_DE_GRAVACAO * 1000;
    intervaloRef.current = window.setInterval(() => {
      const restante = Math.max(0, Math.ceil((limite - Date.now()) / 1000));
      setSegundosRestantes(restante);
      if (restante === 0) pararGravacao();
    }, 200);
  }, [encerrarStream, pararGravacao]);

  /* ---------------------------------------------------------------------- */
  /* Envio — depende da origem escolhida                                     */
  /* ---------------------------------------------------------------------- */

  const enviarComOrigem = useCallback(
    async (origem: Origin, subtipo?: string) => {
      setMostrarOrigem(false);
      if (!metricas) return;

      setOcupado(true);
      setErro(null);
      try {
        // Prévia local. O valor oficial é o que o servidor recalcula.
        const previa = calculateScore(metricas, origem);
        setResultado(previa);

        /*
          O nome digitado vai para o PERFIL, e antes de gravar o resultado.

          `submit_resultado` (20260807000023) ignora `p_player_name` quando há
          `auth.uid()` e usa o apelido do perfil. Com o login anônimo isso
          passou a valer para todo mundo — o campo de nome viraria decoração e
          toda a batalha seria disputada entre "Arrotador a1b2c3" e "Arrotador
          f9e0d1". Escrever no perfil é o caminho que o servidor de fato lê.

          Falha aqui não derruba a gravação: perde-se o nome, não o arroto.
        */
        const nomeEscolhido = nomeExibicao.trim();
        if (nomeEscolhido && userId) {
          try {
            await updateProfile(userId, { apelido: nomeEscolhido });
            setApelidoAtual(nomeEscolhido);
          } catch (erroNome) {
            console.error('Falha ao salvar o apelido', erroNome);
          }
        }

        const salva = await submitResult({
          duration: previa.partialScores.duration,
          power: previa.partialScores.power,
          depth: previa.partialScores.depth,
          texture: previa.partialScores.texture,
          originType: origem,
          originSubtype: subtipo ?? null,
          // Para quem está logado o servidor ignora este campo e o ranking usa
          // o apelido do perfil. Antes daqui saía 'Anônimo' fixo para todo
          // mundo — e o ranking global exibia o mesmo nome em todas as linhas.
          playerName: temSessao ? null : nomeExibicao.trim() || null,
        });

        setLinhaSalva(salva);
        // Exibir o veredito oficial, não a prévia.
        setResultado({
          ...previa,
          score: Number(salva.score),
          classification: salva.classification,
          isArtificial: salva.is_artificial,
        });

        /*
          ÁUDIO — daqui para baixo nada pode derrubar o resultado.

          A linha já está persistida e o veredito já está na tela. Todo o bloco
          abaixo tem try/catch próprio: uma falha de Storage vira aviso, nunca
          exceção que caia no catch de fora e apague o score que o servidor
          acabou de calcular.

          Acontece ANTES de `onRecordingComplete` de propósito: quem consome
          (o ChallengeView) precisa receber a linha COM `audio_path`, senão o
          duelo é exibido sem o áudio que acabou de subir.
        */
        let linhaFinal = salva;

        if (!salva.user_id) {
          // Policy de INSERT do bucket é `TO authenticated` (20260807000013).
          // Não há contorno, e não vamos exigir conta sem avisar: o resultado
          // anônimo continua existindo, só que mudo.
          setEstadoAudio('sem-conta');
        } else if (!blobRef.current) {
          setEstadoAudio('falhou');
          setMotivoFalhaAudio('A gravação não estava mais disponível para envio.');
        } else {
          setEstadoAudio('enviando');
          setMotivoFalhaAudio(null);
          try {
            linhaFinal = await enviarAudioDoResultado(salva, blobRef.current);
            setLinhaSalva(linhaFinal);
            setEstadoAudio('enviado');

            /*
              Publicação no feed — FORA DO CORTE DO MVP, e esta é a barreira
              mais importante de todo o login anônimo.

              Este bloco existe desde antes e nunca chegou a executar: ele
              exige `salva.user_id`, e ninguém fazia login. Assim que a sessão
              anônima entrou, ele passou a valer para TODA gravação de TODO
              visitante — cada arroto viraria post público automaticamente, sem
              que ninguém tivesse escolhido isso, num feed que nem está no ar.

              Só volta junto com o feed, e só depois de decidir se publicar é
              automático ou é uma escolha. Ver `FLAGS.feed`.

              Falhar aqui NÃO invalida o upload: o áudio está no bucket e a
              batalha já consegue tocá-lo. Por isso é um try/catch separado.
            */
            if (FLAGS.feed) {
              try {
                await criarPostDeAudio(linhaFinal);
                setPostadoNoFeed(true);
              } catch (erroPost) {
                console.error('Falha ao publicar no feed', erroPost);
                setMotivoFalhaAudio(
                  'O áudio foi enviado, mas não entrou no feed. Ele continua valendo no desafio.',
                );
              }
            }
          } catch (erroAudio) {
            console.error('Falha ao enviar o áudio', erroAudio);
            setEstadoAudio('falhou');
            setMotivoFalhaAudio(
              erroAudio instanceof AudioFormatoNaoAceitoError
                ? `Seu navegador gravou em ${erroAudio.mime}, um formato que o Auê ainda não aceita.`
                : erroAudio instanceof AudioGrandeDemaisError
                  ? 'A gravação passou do limite de 5 MB.'
                  : null,
            );
          }
        }

        onRecordingComplete?.(linhaFinal);
      } catch (err) {
        console.error('Falha ao registrar o resultado', err);
        setResultado(null);
        setErro('Não foi possível registrar seu Auê. Tenta de novo.');
      } finally {
        setOcupado(false);
      }
    },
    [metricas, nomeExibicao, onRecordingComplete, temSessao, userId],
  );

  /**
   * Tira o áudio do ar a pedido de quem o gravou.
   *
   * A publicação é automática e sem consentimento explícito — decisão de
   * produto —, então o arrependimento tem que ter caminho, e no momento em que
   * ele acontece: aqui, olhando para a gravação que acabou de subir. Sem isto,
   * "exclusão a pedido" dependeria de Luiz abrir o painel do Supabase à mão.
   *
   * NÃO apaga o resultado: a nota, o XP e o ranking continuam. É o áudio que
   * sai do ar, junto com o post de áudio no feed.
   */
  const apagarAudio = useCallback(async () => {
    if (!linhaSalva?.audio_path) return;

    setApagandoAudio(true);
    setErroAoApagar(null);
    try {
      const atualizada = await removerAudioDoResultado(linhaSalva);
      setLinhaSalva(atualizada);
      setPostadoNoFeed(false);
      setEstadoAudio('apagado');
    } catch (err) {
      console.error('Falha ao apagar o áudio', err);
      setErroAoApagar('Não foi possível apagar o áudio agora. Tenta de novo.');
    } finally {
      setApagandoAudio(false);
    }
  }, [linhaSalva]);

  /**
   * Abre a batalha e devolve o link para mandar ao amigo.
   *
   * Passou a criar uma BATALHA (`/b/CODIGO`, 20260807000030) em vez de um
   * desafio (`/d/CODIGO`). A diferença para quem usa: o desafio aceitava UMA
   * resposta e travava para sempre; a batalha fica em loop — o amigo responde,
   * você responde de volta, e mais gente pode entrar pelo mesmo link.
   *
   * `createChallenge` continua existindo em `db/supabase.ts` e continua
   * servindo os links `/d/` que já circularam. Ele só não é mais chamado aqui.
   */
  const gerarDesafio = useCallback(async () => {
    if (!linhaSalva) return;
    try {
      const codigo = await criarBatalha(linhaSalva.id);
      setLinkDesafio(`${window.location.origin}/b/${codigo}`);
    } catch (err) {
      console.error('Falha ao criar a batalha', err);
      setErro('Não foi possível gerar o link da batalha.');
    }
  }, [linhaSalva]);

  /**
   * Compartilha o cartão da nota pela folha nativa do sistema.
   *
   * O retorno passou a ser tratado: antes o hook engolia todo erro num
   * `console.error`, então tocar no botão num navegador sem Web Share API não
   * fazia nada e não dizia nada. Cancelar é silêncio (a pessoa mudou de
   * ideia); os outros casos falam.
   */
  const compartilharNota = useCallback(async () => {
    const resposta = await shareResult({
      elementId: 'score-card',
      url: linkDesafio,
      titulo: 'Meu Auê',
      texto: linkDesafio ? 'Te desafiei no Auê. Tenta bater essa.' : 'Olha a nota do meu Auê!',
    });

    if (resposta.ok || resposta.motivo === 'cancelado') {
      setErroAoCompartilhar(null);
      return;
    }

    setErroAoCompartilhar(
      resposta.motivo === 'indisponivel'
        ? 'Seu navegador não abre o compartilhamento do sistema. Use os botões abaixo.'
        : 'Não foi possível compartilhar agora. Use os botões abaixo.',
    );
  }, [linkDesafio, shareResult]);

  /* ---------------------------------------------------------------------- */
  /* Interface                                                               */
  /* ---------------------------------------------------------------------- */

  const aguardandoOrigem = Boolean(metricas) && !resultado;

  /**
   * Pedimos o nome enquanto ele ainda for o que o banco inventou.
   *
   * Vale também quando `apelidoAtual` é `null` — sem sessão, ou quando o perfil
   * não pôde ser lido. É o lado seguro do erro: perguntar de novo é chato,
   * sumir com o campo faz a pessoa entrar na batalha sem nome nenhum.
   */
  const precisaEscolherNome = apelidoEhPadrao(apelidoAtual);

  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
      {/*
        A ação vem ANTES do campo de nome. O campo era o primeiro elemento da
        tela: quem tocava no convite da Home ("Gravar meu Auê") chegava aqui e
        a primeira coisa pedida era um apelido opcional, com o botão de gravar
        empurrado para baixo. O rótulo é o mesmo do convite da Home de
        propósito — antes eram dois nomes ("Gravar meu Auê" e "Gravar o Auê")
        para a mesma ação.
      */}
      {!gravando ? (
        <button
          type="button"
          className="btn btn-primary"
          onClick={iniciarGravacao}
          disabled={ocupado}
        >
          {ocupado ? 'Julgando...' : resultado ? 'Gravar de novo' : 'Gravar meu Auê'}
        </button>
      ) : (
        <button type="button" className="btn btn-primary" onClick={pararGravacao}>
          Parar ({segundosRestantes}s)
        </button>
      )}

      {precisaEscolherNome && !resultado && (
        <label style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
          {/*
            A condição era `!temSessao`, e ela deixou de funcionar: com o login
            anônimo toda visita tem sessão, então o campo simplesmente sumia da
            tela e todo mundo aparecia na batalha como "Arrotador a1b2c3".

            A pergunta certa nunca foi sobre sessão — é se a pessoa já escolheu
            como quer aparecer. Quem já escolheu não é perguntado de novo; quem
            nunca escolheu é perguntado, com ou sem cadastro.

            O texto anterior falava do ranking ("o ranking só lista quem tem
            conta"). O ranking saiu do corte do MVP, e prometer ou negar coisas
            sobre uma tela que não existe é ruído. O que o nome faz hoje é
            aparecer na batalha.
          */}
          <span style={{ fontSize: 13, color: 'var(--muted)' }}>
            Seu nome na batalha (opcional) — é assim que os amigos vão te ver
          </span>
          <input
            type="text"
            value={nomeExibicao}
            maxLength={40}
            onChange={(evento) => setNomeExibicao(evento.target.value)}
            placeholder="Como quer aparecer?"
            style={{
              padding: '14px 16px',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border)',
              background: 'var(--surface)',
              color: 'var(--fg)',
              font: 'inherit',
            }}
          />
        </label>
      )}

      {aguardandoOrigem && !mostrarOrigem && !ocupado && (
        <button type="button" className="btn btn-secondary" onClick={() => setMostrarOrigem(true)}>
          Escolher a origem
        </button>
      )}

      {permissaoNegada && (
        <p style={{ fontSize: 13, color: 'var(--muted)' }}>
          O navegador bloqueou o microfone. Libere a permissão e toque em gravar de novo.
        </p>
      )}

      {erro && (
        <p role="alert" style={{ fontSize: 13.5, color: 'var(--danger)' }}>
          {erro}
        </p>
      )}

      {resultado && (
        <>
          <div
            id="score-card"
            style={{
              padding: 'var(--space-5)',
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-lg)',
              textAlign: 'center',
            }}
          >
            <div
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 64,
                lineHeight: 1,
                color: 'var(--accent)',
              }}
            >
              {resultado.score.toFixed(1)}
            </div>
            <div
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 20,
                textTransform: 'uppercase',
                marginTop: 'var(--space-2)',
              }}
            >
              {resultado.classification}
            </div>

            {resultado.isArtificial && (
              <div style={{ fontSize: 12, color: 'var(--danger)', marginTop: 'var(--space-2)' }}>
                Categoria artificial — puxou ar
              </div>
            )}

            {/*
              XP fora do corte do MVP.

              O teto de 5 gravações com XP a cada 24h (`process_result_xp`,
              20260807000002) só se aplicava a quem tinha conta — ou seja, a
              ninguém. Com o login anônimo ele passou a valer para todos, e o
              aviso "Limite de 5 gravações em 24h" apareceria na sexta
              gravação: exatamente no meio de uma disputa presencial de 5
              pessoas × 3 rounds, que são 15 gravações no mesmo aparelho em
              minutos.

              O teto continua existindo no banco. O que sai da tela é falar de
              um jogo de XP que este lançamento não tem.
            */}
            {FLAGS.xp && linhaSalva?.user_id && (
              <div
                style={{
                  marginTop: 'var(--space-4)',
                  paddingTop: 'var(--space-4)',
                  borderTop: '1px solid var(--border)',
                  fontSize: 13,
                  color: linhaSalva.is_xp_eligible ? 'var(--accent)' : 'var(--muted)',
                }}
              >
                {linhaSalva.is_xp_eligible
                  ? `+${linhaSalva.xp_earned} XP`
                  : 'Limite de 5 gravações em 24h. Esta não vale XP.'}
              </div>
            )}

            <dl
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gap: 'var(--space-2)',
                margin: 0,
                marginTop: 'var(--space-4)',
                paddingTop: 'var(--space-4)',
                borderTop: '1px solid var(--border)',
              }}
            >
              {([
                ['Duração', resultado.partialScores.duration],
                ['Potência', resultado.partialScores.power],
                ['Profund.', resultado.partialScores.depth],
                ['Textura', resultado.partialScores.texture],
              ] as const).map(([rotulo, valor]) => (
                <div key={rotulo}>
                  <dt style={{ fontSize: 10.5, color: 'var(--muted)', textTransform: 'uppercase' }}>{rotulo}</dt>
                  <dd style={{ margin: 0, fontSize: 17, fontWeight: 700 }}>{valor.toFixed(0)}</dd>
                </div>
              ))}
            </dl>
          </div>

          {/*
            ESTADO DO ÁUDIO — a nota já está registrada; isto fala só do som.

            Cada ramo diz exatamente uma verdade. Nenhum deles renderiza player
            sem áudio, e nenhum deles chama de sucesso o que não subiu.
          */}
          {estadoAudio === 'enviando' && (
            <p role="status" style={{ fontSize: 13, color: 'var(--muted)' }}>
              Enviando o áudio...
            </p>
          )}

          {estadoAudio === 'sem-conta' && (
            /*
              Este ramo mudou de significado com o login anônimo, e o texto
              precisou mudar junto.

              Antes ele era o caso NORMAL: ninguém fazia login, então nenhum
              áudio subia. Hoje ele é o caso EXCEPCIONAL — a sessão anônima
              deveria ter sido criada no boot e não foi. A causa quase certa é
              de configuração (Anonymous sign-ins desligado no painel do
              Supabase), e falar de "conta conectada" mandaria a pessoa
              procurar um botão de login que não existe mais na tela.
            */
            <p style={{ fontSize: 13, color: 'var(--muted)' }}>
              Sua nota foi registrada, mas o áudio não subiu — o app não
              conseguiu se conectar ao Auê. A nota vale; o som não vai poder ser
              ouvido por ninguém. Recarregar a página costuma resolver.
            </p>
          )}

          {estadoAudio === 'falhou' && (
            <p role="alert" style={{ fontSize: 13, color: 'var(--danger)' }}>
              Sua nota foi registrada, mas o áudio não subiu — ninguém vai
              conseguir ouvir esta gravação.
              {motivoFalhaAudio ? ` ${motivoFalhaAudio}` : ''}
            </p>
          )}

          {estadoAudio === 'enviado' && (
            <>
              <AudioPlayback audioPath={linhaSalva?.audio_path} rotulo="Seu Auê" />
              <p style={{ fontSize: 12.5, color: 'var(--muted)' }}>
                {postadoNoFeed
                  ? 'Áudio enviado e publicado no feed. Qualquer pessoa com o link consegue ouvir.'
                  : motivoFalhaAudio ??
                    'Áudio enviado. Qualquer pessoa com o link consegue ouvir.'}
              </p>

              {/*
                Arrependimento tem caminho, e ele fica ao lado do que a pessoa
                acabou de publicar — não escondido em configurações.
              */}
              <button
                type="button"
                onClick={apagarAudio}
                disabled={apagandoAudio}
                style={{
                  border: '1px solid var(--border)',
                  borderRadius: 999,
                  padding: '8px 14px',
                  color: 'var(--muted)',
                  fontSize: 12.5,
                  fontWeight: 600,
                  alignSelf: 'flex-start',
                  opacity: apagandoAudio ? 0.6 : 1,
                }}
              >
                {apagandoAudio ? 'Apagando...' : 'Apagar meu áudio'}
              </button>

              {erroAoApagar && (
                <p role="alert" style={{ fontSize: 13, color: 'var(--danger)' }}>
                  {erroAoApagar}
                </p>
              )}
            </>
          )}

          {estadoAudio === 'apagado' && (
            <p role="status" style={{ fontSize: 13, color: 'var(--muted)' }}>
              Áudio apagado. Ele saiu do feed e ninguém mais consegue ouvir. Sua
              nota continua valendo.
            </p>
          )}

          {/*
            ORDEM IMPORTA. "Compartilhar" vinha primeiro, e sem link de desafio
            gerado ele compartilha `window.location.origin` (useShareResult) —
            ou seja, a home, e o /d/:id nunca viajava. Só quem adivinhasse a
            ordem produzia um link de desafio. O desafio agora vem primeiro, e
            enquanto o link não existir o botão de compartilhar diz o que de
            fato vai acontecer.
          */}
          {!hideChallengeButton && !linkDesafio && (
            <button type="button" className="btn btn-primary" onClick={gerarDesafio}>
              Desafiar um amigo
            </button>
          )}

          <button type="button" className="btn btn-secondary" onClick={compartilharNota}>
            {linkDesafio ? 'Compartilhar a batalha' : 'Compartilhar só a nota'}
          </button>

          {erroAoCompartilhar && (
            <p role="alert" style={{ fontSize: 13, color: 'var(--muted)', margin: 0 }}>
              {erroAoCompartilhar}
            </p>
          )}

          {linkDesafio && (
            <div
              style={{
                padding: 'var(--space-4)',
                border: '1px dashed var(--border)',
                borderRadius: 'var(--radius-md)',
                background: 'var(--surface)',
                display: 'flex',
                flexDirection: 'column',
                gap: 'var(--space-4)',
              }}
            >
              <div>
                <div style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', marginBottom: 4 }}>
                  Link da batalha
                </div>
                <a href={linkDesafio} target="_blank" rel="noreferrer" style={{ wordBreak: 'break-all', color: 'var(--accent)' }}>
                  {linkDesafio}
                </a>
              </div>

              {/*
                Os botões por rede ficam AQUI, e não ao lado do "Compartilhar"
                acima, por um motivo específico: sem link gerado eles mandariam
                a home. O botão do sistema pelo menos leva a imagem do cartão
                nesse caso; um "Mandar no WhatsApp" que envia aue.vercel.app
                pelado não convida ninguém para batalha nenhuma.
              */}
              <CompartilharEmRede
                url={linkDesafio}
                texto="Te desafiei no Auê. Abre o link, ouve o meu arroto e manda o teu."
              />

              <p style={{ fontSize: 12, color: 'var(--muted)', margin: 0, lineHeight: 1.5 }}>
                Quem tiver este link entra na batalha e pode responder. Ele para
                de funcionar em 7 dias.
              </p>
            </div>
          )}
        </>
      )}

      {/*
        NOTA DE ENVIO — decisão de produto do Luiz: não há caixa de consentimento
        nem opt-in. O áudio sobe e fica público, e o aviso é esta nota, exibida
        ANTES de qualquer gravação, sempre visível.

        Por isso o texto é literal e não usa eufemismo. "Compartilhar com a
        comunidade" descreveria a mesma coisa e esconderia o que importa.

        REESCRITO NA 20260807000028. O texto anterior dizia "fica em um endereço
        público" — verdade enquanto o bucket era público, e MENTIRA depois que
        ele passou a ser privado com URL assinada de 5 minutos. Mas trocar por
        "seu áudio fica protegido" seria a mentira oposta e pior: a chave
        anônima do app é pública, então qualquer pessoa continua conseguindo
        ouvir qualquer arroto não escondido, com ou sem conta. O que mudou é que
        o áudio passou a ser REVOGÁVEL, não secreto.

        ENCURTADO NO CORTE DO MVP, por duas razões:

        1. Os dois ramos ("com conta" / "sem conta") deixaram de fazer sentido.
           Com o login anônimo todo mundo cai no primeiro, e o segundo passou a
           descrever uma falha de configuração, não uma escolha do usuário.
        2. Quatro linhas de texto acima do botão de gravar, num produto cuja
           promessa é "toca na bolha e arrota", é onde a pessoa desiste. O
           parágrafo inteiro migrou para /privacidade — não foi apagado, mudou
           de lugar. O que fica aqui é o que precisa ser lido ANTES de gravar.

        O que NÃO pode sumir daqui, e por isso está travado no smoke test:
        "qualquer pessoa consegue ouvir", "mesmo sem conta" e a possibilidade de
        apagar. Sem esses três, isto vira eufemismo.
      */}
      <p
        style={{
          fontSize: 12,
          lineHeight: 1.5,
          color: 'var(--muted)',
          marginTop: 'var(--space-2)',
          paddingTop: 'var(--space-4)',
          borderTop: '1px solid var(--border)',
        }}
      >
        Ao gravar, seu áudio fica guardado no Auê e qualquer pessoa consegue
        ouvir pelo app, mesmo sem conta. Você pode apagar depois.{' '}
        {/*
          Link comum, não `<Link>` do react-router, por dois motivos: a página
          de privacidade é uma leitura isolada (recarregar não custa nada), e
          este componente é renderizado em teste FORA de qualquer Router — um
          `<Link>` ali lançaria.
        */}
        <a href="/privacidade" style={{ color: 'var(--muted)', textDecoration: 'underline' }}>
          Como isso funciona
        </a>
      </p>

      <OriginSheet
        isOpen={mostrarOrigem}
        onClose={() => setMostrarOrigem(false)}
        onSelectOrigin={(tipo, subtipo) => enviarComOrigem(tipo as Origin, subtipo)}
      />
    </div>
  );
};
