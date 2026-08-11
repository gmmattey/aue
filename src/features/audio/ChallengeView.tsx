import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getChallenge, completeChallenge, supabase } from '../../db/supabase';
import { ReportButton } from '../../shared/components/ReportButton';
import { formatarNota } from '../../shared/formato/nota';
import { AudioRecorder } from './AudioRecorder';
import { AudioPlayback } from './AudioPlayback';
import { MolduraDeLink, Convite } from './MolduraDeLink';
import { cartaoDeLink } from './estilosDeLink';
import { falaDaNota } from '../../nucleo/nota/faixas';

/*
 * A CLASSIFICAÇÃO CRUA DO BANCO NÃO ENTRA MAIS NESTA TELA.
 *
 * Um desafio vive 7 dias. Arroto gravado antes desta entrega tem
 * "Monstro do Esgoto" guardado na linha, e imprimir a coluna faria o nome de
 * criatura sair numa tela que qualquer um abre pelo link do zap — inclusive
 * gente que nunca ouviu falar do jogo. A fala é derivada de `(nota, id)`, que a
 * RPC `obter_desafio` já entrega dos dois lados. Nenhum `UPDATE` em linha
 * nenhuma: o banco fica como está, muda o que a tela lê.
 */

/**
 * Traduz o veredito persistido pelo banco (`desafios.vencedor`) para a frase
 * exibida. A decisão em si NÃO acontece mais aqui: quem compara os dois
 * resultados é o trigger `ao_definir_vencedor_do_desafio` (20260807000036).
 */
function rotuloDoVencedor(vencedor: string | null | undefined): string | null {
  if (vencedor === 'desafiante') return 'Desafiante venceu!';
  if (vencedor === 'desafiado') return 'Você venceu!';
  if (vencedor === 'empate') return 'Empate Técnico do Gás!';
  return null;
}

interface ResultadoResumo {
  id: string;
  nota: number;
  classificacao: string;
  /**
   * Vem da RPC `obter_desafio` (SECURITY DEFINER, 20260807000034), que passou a
   * ser o único caminho de leitura: `desafios` e `resultados` não têm mais
   * policy de SELECT, então o `resultados(*)` embutido pelo PostgREST saiu de
   * cena junto com os campos que ele vazava.
   *
   * A RPC entrega por lado só `{ id, nota, classificacao, esta_escondido,
   * caminho_do_audio }`, e já devolve `caminho_do_audio` como `null` quando `esta_escondido` é
   * true. `null` também é o caso legítimo de quem gravou sem conta ou de
   * desafio anterior ao áudio — a tela trata os três do mesmo jeito.
   */
  caminho_do_audio?: string | null;
}

interface DesafioCarregado {
  id: string;
  vencedor: 'desafiante' | 'desafiado' | 'empate' | null;
  resolvido_em: string | null;
  resultado_desafiante: ResultadoResumo;
  resultado_desafiado: ResultadoResumo | null;
}

/*
  A casca (`MolduraDeLink`), o `Convite` e este estilo de cartão saíram deste
  arquivo para `MolduraDeLink.tsx` quando a batalha (`/b/:code`) passou a ser a
  segunda tela aberta por link compartilhado. Duas cópias da porta de entrada
  do produto divergiriam na primeira correção feita só de um lado.
*/
const cartao = cartaoDeLink;

/**
 * O duelo de turno único — LEGADO, mantido para os links `/d/CODIGO` que já
 * circularam.
 *
 * Nada novo aponta para cá: `AudioRecorder` passou a gerar `/b/CODIGO`
 * (batalha em sessão, 20260807000030). Esta tela continua funcionando exatamente
 * como estava, e é de propósito que ela não ganhou revanche nem rodadas: a
 * tabela `desafios` tem triggers que congelam o veredito, e mexer neles é o
 * padrão que já custou duas regressões silenciosas a este projeto.
 */
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
  const vencedor = rotuloDoVencedor(challengeData?.vencedor);

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
      // O AudioRecorder já persistiu o resultado via `enviar_resultado`.
      // Antes, esta função gravava um SEGUNDO resultado — linha e XP em dobro.
      const updated = await completeChallenge(id, dbResult.id);

      setChallengeData((prev) => (prev ? {
        ...prev,
        ...updated,               // traz `vencedor` e `resolvido_em` do servidor
        resultado_desafiado: dbResult,
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
      <MolduraDeLink>
        <div className="screen">Carregando desafio...</div>
      </MolduraDeLink>
    );
  }

  if (!challengeData) {
    return (
      <MolduraDeLink>
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
      </MolduraDeLink>
    );
  }

  return (
    <MolduraDeLink subtitulo={`Desafio ${id}`}>
      <div className="screen">
        {error && (
          <p role="alert" style={{ color: 'var(--danger)', marginBottom: 'var(--space-4)' }}>
            {error}
          </p>
        )}

        <div style={cartao}>
          <div style={{ fontSize: 11, textTransform: 'uppercase', color: 'var(--muted)' }}>Desafiante</div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 40, color: 'var(--accent)', lineHeight: 1.1 }}>
            {formatarNota(challengeData.resultado_desafiante.nota)}
          </div>
          <div style={{ fontSize: 14 }}>
            {
              falaDaNota(
                challengeData.resultado_desafiante.nota,
                challengeData.resultado_desafiante.id,
              ).reacao
            }
          </div>

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
              audioPath={challengeData.resultado_desafiante.caminho_do_audio}
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
            <ReportButton resultId={challengeData.resultado_desafiante.id} userId={userId} />
          </div>
        </div>

        {!challengeData.resultado_desafiado ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 20, textTransform: 'uppercase' }}>
              Sua vez de responder
            </h2>
            {/*
              `exigeAudio`: o duelo por link só existe para o outro lado ouvir.
              Resposta sem som vira um veredito que ninguém consegue conferir —
              e aqui o trigger CONGELA o resultado, então não há conserto depois.
            */}
            <AudioRecorder
              onRecordingComplete={handleRecordingComplete}
              hideChallengeButton
              exigeAudio
            />
          </div>
        ) : (
          <div style={cartao}>
            <div style={{ fontSize: 11, textTransform: 'uppercase', color: 'var(--muted)' }}>Você</div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 40, color: 'var(--accent)', lineHeight: 1.1 }}>
              {formatarNota(challengeData.resultado_desafiado.nota)}
            </div>
            <div style={{ fontSize: 14 }}>
              {
                falaDaNota(
                  challengeData.resultado_desafiado.nota,
                  challengeData.resultado_desafiado.id,
                ).reacao
              }
            </div>

            {/*
              Sem `textoQuandoNaoHa`: aqui a ausência já foi explicada pelo
              próprio AudioRecorder logo acima, no momento do envio. Repetir a
              frase seria dizer duas vezes a mesma coisa na mesma tela.
            */}
            <div style={{ marginTop: 'var(--space-4)' }}>
              <AudioPlayback
                audioPath={challengeData.resultado_desafiado.caminho_do_audio}
                rotulo="Seu arroto"
              />
            </div>
          </div>
        )}

        {vencedor && (
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
              {vencedor}
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
        {!vencedor && <Convite />}
      </div>
    </MolduraDeLink>
  );
};

