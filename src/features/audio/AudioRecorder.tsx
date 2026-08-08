import React, { useCallback, useEffect, useRef, useState } from 'react';
import { analyzeAudio, AudioVazioError, type AudioMetrics } from './engine';
import { calculateScore, type Origin, type ScoreResult } from './rules';
import {
  submitResult,
  createChallenge,
  criarPostDeAudio,
  enviarAudioDoResultado,
  removerAudioDoResultado,
  supabase,
  AudioFormatoNaoAceitoError,
  AudioGrandeDemaisError,
  type ResultadoRow,
} from '../../db/supabase';
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

  const [temSessao, setTemSessao] = useState(false);
  const [nomeExibicao, setNomeExibicao] = useState('');

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
  /* Sessão — define se pedimos um nome de exibição                          */
  /* ---------------------------------------------------------------------- */

  useEffect(() => {
    let ativo = true;

    supabase.auth.getSession().then(({ data }) => {
      if (ativo) setTemSessao(Boolean(data.session));
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_evento, sessao) => {
      setTemSessao(Boolean(sessao));
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
          err instanceof AudioVazioError
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

            // Publicação no feed. Falhar aqui NÃO invalida o upload: o áudio
            // está no bucket e o desafio já consegue tocá-lo. Por isso é um
            // try/catch separado, com aviso próprio.
            try {
              await criarPostDeAudio(linhaFinal);
              setPostadoNoFeed(true);
            } catch (erroPost) {
              console.error('Falha ao publicar no feed', erroPost);
              setMotivoFalhaAudio(
                'O áudio foi enviado, mas não entrou no feed. Ele continua valendo no desafio.',
              );
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
    [metricas, nomeExibicao, onRecordingComplete, temSessao],
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

  const gerarDesafio = useCallback(async () => {
    if (!linhaSalva) return;
    try {
      const desafio = await createChallenge(linhaSalva.id);
      setLinkDesafio(`${window.location.origin}/d/${desafio.id}`);
    } catch (err) {
      console.error('Falha ao criar desafio', err);
      setErro('Não foi possível gerar o link do desafio.');
    }
  }, [linhaSalva]);

  /* ---------------------------------------------------------------------- */
  /* Interface                                                               */
  /* ---------------------------------------------------------------------- */

  const aguardandoOrigem = Boolean(metricas) && !resultado;

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

      {!temSessao && !resultado && (
        <label style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
          {/*
            Dizia "Seu nome no ranking (opcional)" — promessa que o banco não
            cumpre: a view `global_ranking` só considera linhas com `user_id`
            (migração 20260807000015), então quem grava sem conta NUNCA entra
            no ranking, com nome ou sem. O nome aparece no card do desafio.
          */}
          <span style={{ fontSize: 13, color: 'var(--muted)' }}>
            Seu nome no desafio (opcional) — o ranking só lista quem tem conta
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

            {linhaSalva?.user_id && (
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
            <p style={{ fontSize: 13, color: 'var(--muted)' }}>
              Sua nota foi registrada, mas o áudio não foi enviado: só quem está
              com a conta conectada consegue guardar a gravação. Ninguém vai
              conseguir ouvir este Auê.
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

          <button type="button" className="btn btn-secondary" onClick={() => shareResult('score-card', linkDesafio)}>
            {linkDesafio ? 'Compartilhar o desafio' : 'Compartilhar só a nota'}
          </button>

          {linkDesafio && (
            <div
              style={{
                padding: 'var(--space-4)',
                border: '1px dashed var(--border)',
                borderRadius: 'var(--radius-md)',
                background: 'var(--surface)',
              }}
            >
              <div style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', marginBottom: 4 }}>
                Link do desafio
              </div>
              <a href={linkDesafio} target="_blank" rel="noreferrer" style={{ wordBreak: 'break-all', color: 'var(--accent)' }}>
                {linkDesafio}
              </a>
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
        o áudio passou a ser REVOGÁVEL, não secreto — e é exatamente isso que a
        nota agora diz, junto com o limite de quem já baixou o arquivo.
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
        {temSessao ? (
          <>
            Ao gravar, seu áudio é enviado ao Auê e publicado no feed
            automaticamente — não existe enviar sem publicar. Qualquer pessoa
            consegue ouvir pelo app, mesmo sem conta, e quem abrir o seu desafio
            também ouve. Gravar é aceitar isso. Você pode apagar o áudio depois,
            e ele sai do ar na hora — mas quem já tiver baixado o arquivo
            continua com ele.
          </>
        ) : (
          <>
            Você está sem conta conectada, então nenhum áudio é enviado — fica só
            a nota, e ninguém consegue ouvir o seu Auê. Se entrar, cada gravação
            passa a ser enviada e publicada no feed automaticamente, e qualquer
            pessoa consegue ouvir pelo app, mesmo sem conta. Gravar conectado é
            aceitar isso.
          </>
        )}
      </p>

      <OriginSheet
        isOpen={mostrarOrigem}
        onClose={() => setMostrarOrigem(false)}
        onSelectOrigin={(tipo, subtipo) => enviarComOrigem(tipo as Origin, subtipo)}
      />
    </div>
  );
};
