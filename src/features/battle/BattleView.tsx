import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';

import {
  obterBatalha,
  responderBatalha,
  supabase,
  type Batalha,
  type RodadaDaBatalha,
  type ResultadoRow,
} from '../../db/supabase';
import { ReportButton } from '../../shared/components/ReportButton';
import { CompartilharEmRede } from '../../shared/components/CompartilharEmRede';
import { formatarNota } from '../../shared/formato/nota';
import { AudioRecorder } from '../audio/AudioRecorder';
import { AudioPlayback } from '../audio/AudioPlayback';
import { MolduraDeLink, Convite } from '../audio/MolduraDeLink';
import { cartaoDeLink } from '../audio/estilosDeLink';

/**
 * A batalha em sessão — a tela de `/b/:code`.
 *
 * O QUE ELA É, do ponto de vista de quem usa: eu gravo, mando o link. Você
 * abre, ouve o meu arroto com a nota, grava a sua e manda de volta. Fica em
 * loop, os arrotos ficam em sequência, e mais amigos podem entrar pelo mesmo
 * link.
 *
 * POR QUE NÃO É O `ChallengeView` EVOLUÍDO. Aquela tela serve `desafios`, que
 * aceita UMA resposta e congela o veredito em trigger. Ela continua no ar,
 * intocada, para os links `/d/CODIGO` que já circularam. Esta usa as tabelas
 * novas (20260807000030), que nasceram sem o SELECT aberto que `desafios` tem.
 *
 * "SÓ QUEM TEM O LINK" sai de graça e sem código: não existe listagem, não
 * existe busca, não existe nenhuma entrada nesta tela que não seja o código na
 * URL. As tabelas têm RLS ligada sem policy nenhuma — nem o próprio app
 * consegue listar batalhas.
 *
 * O QUE A TELA NÃO PROMETE: privacidade. A batalha é obscura, não secreta —
 * quem tiver o `audio_path` ouve o áudio com ou sem o código, porque a chave
 * anônima do app é pública (ver 20260807000028). Por isso o texto do rodapé
 * fala em "quem tiver este link", e nunca em "só vocês".
 */
export const BattleView: React.FC = () => {
  const { code } = useParams<{ code: string }>();

  const [batalha, setBatalha] = useState<Batalha | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | undefined>(undefined);

  /**
   * Âncora do fim do feed.
   *
   * A ordem é ascendente (a rodada mais nova embaixo, como conversa), então sem
   * rolar até o fim a pessoa abre o link e vê a PRIMEIRA gravação — que na
   * quarta rodada não é a que acabou de chegar.
   */
  const fimDoFeed = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let ativo = true;
    supabase.auth.getSession().then(({ data }) => {
      if (ativo) setUserId(data.session?.user.id);
    });
    return () => {
      ativo = false;
    };
  }, []);

  useEffect(() => {
    if (!code) return;
    let ativo = true;

    obterBatalha(code)
      .then((dados) => ativo && setBatalha(dados))
      .catch((err) => {
        console.error('Falha ao carregar a batalha', err);
        if (ativo) setErro('Não foi possível carregar a batalha.');
      })
      .finally(() => ativo && setCarregando(false));

    return () => {
      ativo = false;
    };
  }, [code]);

  /*
    Rola para o fim quando o número de rodadas muda — não em todo render.
    Dependência no `length` e não no array: `obter_batalha` devolve objetos
    novos a cada chamada, e a tela roubaria a rolagem de quem estivesse lendo
    as rodadas anteriores.
  */
  const quantasRodadas = batalha?.rodadas.length ?? 0;
  useEffect(() => {
    if (quantasRodadas > 1) {
      fimDoFeed.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  }, [quantasRodadas]);

  const responder = useCallback(
    async (resultado: ResultadoRow) => {
      if (!code || !resultado?.id) return;
      try {
        // A RPC devolve a batalha INTEIRA, não só a rodada criada: entre abrir
        // o link e mandar de volta pode ter entrado gente.
        setBatalha(await responderBatalha(code, resultado.id));
        setErro(null);
      } catch (err) {
        console.error('Falha ao responder a batalha', err);
        setErro(
          'Sua nota foi registrada, mas não entrou na batalha. ' +
            'Recarregue o link e tente de novo.',
        );
      }
    },
    [code],
  );

  if (carregando) {
    return (
      <MolduraDeLink>
        <div className="screen">Carregando batalha...</div>
      </MolduraDeLink>
    );
  }

  /*
    Código inexistente e batalha expirada chegam aqui do MESMO jeito: a RPC
    devolve NULL para os dois, de propósito (dizer "expirou" confirmaria a um
    curioso que ele acertou um código real). Então a tela também não distingue
    — e menciona as duas possibilidades sem afirmar qual foi.
  */
  if (!batalha) {
    return (
      <MolduraDeLink>
        <div className="screen" style={{ gap: 'var(--space-4)' }}>
          <div style={cartaoDeLink}>
            <h1
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 22,
                textTransform: 'uppercase',
                marginBottom: 'var(--space-2)',
              }}
            >
              {erro ?? 'Batalha não encontrada.'}
            </h1>
            <p style={{ fontSize: 13.5, color: 'var(--muted)' }}>
              O link pode estar errado ou já ter passado dos 7 dias.
            </p>
          </div>

          <Convite />
        </div>
      </MolduraDeLink>
    );
  }

  const url = `${window.location.origin}/b/${batalha.access_code}`;

  return (
    <MolduraDeLink subtitulo={`Batalha ${batalha.access_code}`}>
      <div className="screen">
        {erro && (
          <p role="alert" style={{ color: 'var(--danger)', marginBottom: 'var(--space-4)' }}>
            {erro}
          </p>
        )}

        {/*
          Quem está ganhando, no topo e sempre visível.

          Substitui o "veredito" do duelo antigo, que só existia depois da
          resposta e era final. Numa batalha em loop não há resultado final
          enquanto o link viver — há um líder, que muda.
        */}
        {batalha.lider && (
          <div
            style={{
              ...cartaoDeLink,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: 'var(--space-4)',
            }}
          >
            <div>
              <div style={{ fontSize: 11, textTransform: 'uppercase', color: 'var(--muted)' }}>
                Liderando agora
              </div>
              <div style={{ fontSize: 15, fontWeight: 700 }}>{batalha.lider.apelido}</div>
            </div>
            <div
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 32,
                color: 'var(--accent)',
                lineHeight: 1,
              }}
            >
              {formatarNota(batalha.lider.score)}
            </div>
          </div>
        )}

        {batalha.rodadas.map((rodada) => (
          <CartaoDeRodada key={rodada.rodada_id} rodada={rodada} userId={userId} />
        ))}

        <div ref={fimDoFeed} />

        <h2
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 20,
            textTransform: 'uppercase',
            marginTop: 'var(--space-4)',
          }}
        >
          Sua vez
        </h2>

        {/*
          `hideChallengeButton` já existia exatamente para isto: aqui a batalha
          JÁ existe, então "Desafiar um amigo" criaria uma segunda batalha e
          partiria a conversa em duas.
        */}
        {/*
          `exigeAudio`: sem som a resposta NÃO entra na batalha. Quem abriu este
          link veio para ouvir — uma rodada muda na timeline é o mesmo defeito
          que deixava o desafiante mandar um link sem arroto.
        */}
        <AudioRecorder onRecordingComplete={responder} hideChallengeButton exigeAudio />

        <div style={{ ...cartaoDeLink, marginTop: 'var(--space-4)' }}>
          <div
            style={{
              fontSize: 11,
              color: 'var(--muted)',
              textTransform: 'uppercase',
              marginBottom: 'var(--space-2)',
            }}
          >
            Chamar mais gente
          </div>

          <CompartilharEmRede
            url={url}
            texto="Entra nessa batalha de arroto no Auê. Ouve os que já estão lá e manda o teu."
          />

          <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 'var(--space-4)', lineHeight: 1.5 }}>
            Quem tiver este link entra na batalha e pode responder. Ele para de
            funcionar em 7 dias — os arrotos continuam guardados no Auê.
          </p>
        </div>

        <Convite />
      </div>
    </MolduraDeLink>
  );
};

/**
 * Uma rodada no feed da batalha.
 *
 * A posição vem antes do nome de propósito: numa batalha de cinco pessoas com
 * três rodadas cada, "quem é" importa menos que "qual dessas é".
 */
const CartaoDeRodada: React.FC<{ rodada: RodadaDaBatalha; userId?: string }> = ({
  rodada,
  userId,
}) => (
  <div style={cartaoDeLink}>
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'baseline',
        gap: 'var(--space-2)',
      }}
    >
      <div style={{ fontSize: 11, textTransform: 'uppercase', color: 'var(--muted)' }}>
        {rodada.position}º · {rodada.apelido}
      </div>
      {rodada.is_artificial && (
        <div style={{ fontSize: 11, color: 'var(--danger)' }}>puxou ar</div>
      )}
    </div>

    <div
      style={{
        fontFamily: 'var(--font-display)',
        fontSize: 40,
        color: 'var(--accent)',
        lineHeight: 1.1,
      }}
    >
      {formatarNota(rodada.score)}
    </div>
    <div style={{ fontSize: 14 }}>{rodada.classification}</div>

    {/*
      O item mais importante do cartão. `AudioPlayback` já trata `audio_path`
      nulo sem desenhar um player mudo — e a frase explica em vez de omitir,
      senão o visitante não distingue "sem som" de "site quebrado".
    */}
    <div style={{ marginTop: 'var(--space-4)' }}>
      <AudioPlayback
        audioPath={rodada.audio_path}
        rotulo={`Arroto de ${rodada.apelido}`}
        textoQuandoNaoHa="Esta rodada não tem áudio salvo — só a nota."
      />
    </div>

    <div style={{ marginTop: 'var(--space-2)' }}>
      <ReportButton resultId={rodada.result_id} userId={userId} />
    </div>
  </div>
);
