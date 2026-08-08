import React, { useCallback, useEffect, useRef, useState } from 'react';
import { analyzeAudio, AudioVazioError, type AudioMetrics } from './engine';
import { calculateScore, type Origin, type ScoreResult } from './rules';
import { submitResult, createChallenge, supabase, type ResultadoRow } from '../../db/supabase';
import { useShareResult } from './useShareResult';
import { OriginSheet } from './OriginSheet';

const SEGUNDOS_DE_GRAVACAO = 10;

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

  const [temSessao, setTemSessao] = useState(false);
  const [nomeExibicao, setNomeExibicao] = useState('');

  const { shareResult } = useShareResult();

  const gravadorRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const pedacosRef = useRef<Blob[]>([]);
  const intervaloRef = useRef<number | null>(null);

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
    pedacosRef.current = [];

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

        onRecordingComplete?.(salva);
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
      {!temSessao && !resultado && (
        <label style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
          <span style={{ fontSize: 13, color: 'var(--muted)' }}>Seu nome no ranking (opcional)</span>
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

      {!gravando ? (
        <button
          type="button"
          className="btn btn-primary"
          onClick={iniciarGravacao}
          disabled={ocupado}
        >
          {ocupado ? 'Julgando...' : resultado ? 'Gravar de novo' : 'Gravar o Auê'}
        </button>
      ) : (
        <button type="button" className="btn btn-primary" onClick={pararGravacao}>
          Parar ({segundosRestantes}s)
        </button>
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

          <button type="button" className="btn btn-secondary" onClick={() => shareResult('score-card', linkDesafio)}>
            Compartilhar
          </button>

          {!hideChallengeButton && !linkDesafio && (
            <button type="button" className="btn btn-secondary" onClick={gerarDesafio}>
              Gerar link de desafio
            </button>
          )}

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

      <OriginSheet
        isOpen={mostrarOrigem}
        onClose={() => setMostrarOrigem(false)}
        onSelectOrigin={(tipo, subtipo) => enviarComOrigem(tipo as Origin, subtipo)}
      />
    </div>
  );
};
