import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getChallenge, completeChallenge, supabase } from '../../db/supabase';
import { ReportButton } from '../../shared/components/ReportButton';
import { AudioRecorder } from './AudioRecorder';
import { AudioPlayback } from './AudioPlayback';

/**
 * Traduz o veredito persistido pelo banco (`desafios.winner`) para a frase
 * exibida. A decisão em si NÃO acontece mais aqui: quem compara os dois
 * resultados é o trigger `on_desafio_set_winner` (migração 20260807000011).
 */
function winnerLabel(winner: string | null | undefined): string | null {
  if (winner === 'challenger') return 'Desafiante venceu!';
  if (winner === 'challenged') return 'Você venceu!';
  if (winner === 'tie') return 'Empate Técnico do Gás!';
  return null;
}

interface ResultadoResumo {
  id: string;
  score: number;
  classification: string;
  /**
   * `getChallenge` já embute `resultados(*)`, então a coluna vem sem mudar a
   * consulta. `null` é comum e legítimo: desafio criado por quem gravou sem
   * conta, ou antes do áudio existir.
   */
  audio_path?: string | null;
}

interface DesafioCarregado {
  id: string;
  winner: 'challenger' | 'challenged' | 'tie' | null;
  resolved_at: string | null;
  challenger_result: ResultadoResumo;
  challenged_result: ResultadoResumo | null;
}

const cartao: React.CSSProperties = {
  padding: 'var(--space-4)',
  background: 'var(--surface)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius-lg)',
  marginBottom: 'var(--space-4)',
};

export const ChallengeView: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [challengeData, setChallengeData] = useState<DesafioCarregado | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  /**
   * Quem chega pelo WhatsApp está deslogado, e é o caso comum aqui. Lemos a
   * sessão mesmo assim: denunciar exige conta, e sem isto quem TEM conta veria
   * "Entre para denunciar" estando logado.
   */
  const [userId, setUserId] = useState<string | undefined>(undefined);

  useEffect(() => {
    let ativo = true;
    supabase.auth.getSession().then(({ data }) => {
      if (ativo) setUserId(data.session?.user.id);
    });
    return () => {
      ativo = false;
    };
  }, []);

  // Derivado do estado do servidor — não há mais estado de vencedor local.
  const winner = winnerLabel(challengeData?.winner);

  useEffect(() => {
    if (!id) return;
    getChallenge(id)
      .then(data => setChallengeData(data as DesafioCarregado))
      .catch(err => {
        console.error(err);
        setError('Não foi possível carregar o desafio.');
      })
      .finally(() => setLoading(false));
  }, [id]);

  const handleRecordingComplete = async (dbResult: ResultadoResumo) => {
    if (!dbResult?.id || !id) return;
    try {
      // O AudioRecorder já persistiu o resultado via `submit_resultado`.
      // Antes, esta função gravava um SEGUNDO resultado — linha e XP em dobro.
      const updated = await completeChallenge(id, dbResult.id);

      setChallengeData((prev) => (prev ? {
        ...prev,
        ...updated,               // traz `winner` e `resolved_at` do servidor
        challenged_result: dbResult,
      } : prev));
    } catch (err) {
      console.error(err);
      setError('Não foi possível registrar sua resposta ao desafio.');
    }
  };

  /*
    Esta é a porta de entrada do produto: o link do WhatsApp cai aqui, muitas
    vezes em quem nunca ouviu falar do Auê. Antes, `loading` e "não encontrado"
    retornavam um `<div className="screen">` SOLTO, fora do `.app-shell` — sem
    o container de 440px, sem fundo escuro, sem cabeçalho e, principalmente,
    sem nenhuma saída. Desafio antigo, id errado ou leitura negada pela RLS
    caem exatamente aí, e o visitante era perdido numa frase de três palavras.
  */
  if (loading) {
    return (
      <Moldura>
        <div className="screen">Carregando desafio...</div>
      </Moldura>
    );
  }

  if (!challengeData) {
    return (
      <Moldura>
        <div className="screen" style={{ gap: 'var(--space-4)' }}>
          <div style={cartao}>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 22, textTransform: 'uppercase', marginBottom: 'var(--space-2)' }}>
              {error ?? 'Desafio não encontrado.'}
            </h1>
            <p style={{ fontSize: 13.5, color: 'var(--muted)' }}>
              O link pode ter expirado ou o desafio pode ter sido apagado.
            </p>
          </div>

          <Convite />
        </div>
      </Moldura>
    );
  }

  return (
    <Moldura codigo={id}>
      <div className="screen">
        {error && (
          <p role="alert" style={{ color: 'var(--danger)', marginBottom: 'var(--space-4)' }}>
            {error}
          </p>
        )}

        <div style={cartao}>
          <div style={{ fontSize: 11, textTransform: 'uppercase', color: 'var(--muted)' }}>Desafiante</div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 40, color: 'var(--accent)', lineHeight: 1.1 }}>
            {Number(challengeData.challenger_result.score).toFixed(1)}
          </div>
          <div style={{ fontSize: 14 }}>{challengeData.challenger_result.classification}</div>

          {/*
            O ITEM MAIS IMPORTANTE DA TELA. Quem recebe /d/CODIGO no WhatsApp
            está aqui para ouvir contra o que vai competir — até agora só via um
            número, e um número não é uma rede social de arrotos.

            Quando não há áudio, a frase explica em vez de omitir: sem isto, o
            visitante não distingue "este desafio não tem som" de "o site está
            quebrado".
          */}
          <div style={{ marginTop: 'var(--space-4)' }}>
            <AudioPlayback
              audioPath={challengeData.challenger_result.audio_path}
              rotulo="Arroto do desafiante"
              /* Sem afirmar a causa: pode ser gravação sem conta, falha de
                 envio ou desafio anterior ao áudio existir. A tela não sabe
                 qual foi, então não chuta. */
              textoQuandoNaoHa="Este desafio não tem áudio salvo — só a nota."
            />
          </div>

          {/*
            Denúncia no desafio, e não só no feed: o link do WhatsApp é a porta
            de entrada do produto e circula para gente que nunca abriu o app.
            Se o primeiro arroto que alguém recebe for abusivo, este é o único
            lugar onde ela está.
          */}
          <div style={{ marginTop: 'var(--space-2)' }}>
            <ReportButton resultId={challengeData.challenger_result.id} userId={userId} />
          </div>
        </div>

        {!challengeData.challenged_result ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 20, textTransform: 'uppercase' }}>
              Sua vez de responder
            </h2>
            <AudioRecorder onRecordingComplete={handleRecordingComplete} hideChallengeButton />
          </div>
        ) : (
          <div style={cartao}>
            <div style={{ fontSize: 11, textTransform: 'uppercase', color: 'var(--muted)' }}>Você</div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 40, color: 'var(--accent)', lineHeight: 1.1 }}>
              {Number(challengeData.challenged_result.score).toFixed(1)}
            </div>
            <div style={{ fontSize: 14 }}>{challengeData.challenged_result.classification}</div>

            {/*
              Sem `textoQuandoNaoHa`: aqui a ausência já foi explicada pelo
              próprio AudioRecorder logo acima, no momento do envio. Repetir a
              frase seria dizer duas vezes a mesma coisa na mesma tela.
            */}
            <div style={{ marginTop: 'var(--space-4)' }}>
              <AudioPlayback
                audioPath={challengeData.challenged_result.audio_path}
                rotulo="Seu arroto"
              />
            </div>
          </div>
        )}

        {winner && (
          <div style={{ ...cartao, textAlign: 'center', marginTop: 'var(--space-4)' }}>
            <div style={{ fontSize: 11, textTransform: 'uppercase', color: 'var(--muted)' }}>Resultado final</div>
            <div
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 24,
                textTransform: 'uppercase',
                margin: 'var(--space-2) 0 var(--space-4)',
              }}
            >
              {winner}
            </div>
            <Link to="/" className="btn btn-secondary">
              Voltar ao início
            </Link>
          </div>
        )}

        {/*
          Saída sempre visível. Antes, o único link para "/" aparecia depois do
          duelo resolvido: quem não quisesse responder na hora — sem microfone
          liberado, em lugar público, sem entender a brincadeira — não tinha
          para onde ir.
        */}
        {!winner && <Convite />}
      </div>
    </Moldura>
  );
};

/**
 * Casca compartilhada pelos três estados da tela (carregando, não encontrado,
 * desafio carregado). O título é sempre a marca; o código do desafio, quando
 * existe, vira subtítulo — quem chega pelo link precisa saber onde está antes
 * de saber qual é o código.
 */
const Moldura: React.FC<{ codigo?: string; children: React.ReactNode }> = ({ codigo, children }) => (
  <div className="app-shell">
    <header className="appbar">
      <Link to="/" style={{ display: 'flex', flexDirection: 'column' }}>
        <span className="appbar-title">Auê!</span>
        {codigo && (
          <span style={{ fontSize: 11, color: 'var(--muted)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
            Desafio {codigo}
          </span>
        )}
      </Link>
    </header>
    {children}
  </div>
);

/** Explica o produto em uma linha e oferece o caminho para a Home. */
const Convite: React.FC = () => (
  <div style={{ ...cartao, marginTop: 'auto', marginBottom: 0 }}>
    <p style={{ fontSize: 13.5, color: 'var(--muted)', marginBottom: 'var(--space-4)' }}>
      Auê é isto: você grava um arroto, recebe uma nota e desafia quem quiser.
    </p>
    <Link to="/" className="btn btn-secondary">
      Gravar o meu
    </Link>
  </div>
);
