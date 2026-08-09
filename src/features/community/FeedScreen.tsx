import React, { lazy, Suspense, useCallback, useEffect, useState } from 'react';
import { createSocialPost, getCommunityFeed, toggleReacaoPost } from '../../db/supabase';
import type { TipoReacao } from '../../db/supabase';
import { AdBanner } from '../../shared/components/AdBanner';
import { AudioPlayback } from '../audio/AudioPlayback';
import { ReportButton } from '../../shared/components/ReportButton';
import { FLAGS } from '../../shared/flags';
import { formatarNota } from '../../shared/formato/nota';
/**
 * Carregado sob demanda: a folha de comentários só existe depois que alguém
 * toca em "Comentar". Estática, ela empurrava o chunk inicial acima de 500 kB —
 * peso pago por todo mundo que abre o app, inclusive quem nunca comenta.
 */
const CommentsModal = lazy(() =>
  import('./CommentsModal').then((modulo) => ({ default: modulo.CommentsModal })),
);

/** Id do bloco in-feed no painel do AdSense. Vazio até a conta ser aprovada. */
const SLOT_ANUNCIO_FEED = import.meta.env.VITE_ADSENSE_SLOT_FEED as string | undefined;

/**
 * Modo de demonstração — posts fictícios para trabalhar a interface sem
 * backend. Precisa ser ligado DE PROPÓSITO em `.env`.
 *
 * Antes, esses mesmos posts fictícios eram exibidos como CONTEÚDO REAL sempre
 * que a busca do feed falhasse por qualquer motivo — rede ruim, Supabase fora,
 * RLS negando. O usuário via "Carol" e "Bruno" com scores 98,1 e 95,6 e
 * contadores inventados, sem nenhum aviso, e não tinha como saber que aquilo
 * não existia. Agora falha é falha: aparece erro com opção de tentar de novo.
 */
const MODO_DEMONSTRACAO = import.meta.env.VITE_FEED_DEMO === '1';

/**
 * Posição do anúncio no feed: depois do 3º post. Colocação in-feed padrão —
 * o usuário já viu conteúdo antes de encontrar publicidade. Se o feed tiver
 * menos que isso, nenhum anúncio é inserido.
 */
const POSTS_ANTES_DO_ANUNCIO = 3;

export interface FeedPost {
  id: string;
  post_type: 'audio_result' | 'social_link' | 'text_announcement';
  topic: string;
  social_network?: string | null;
  social_url?: string | null;
  content?: string | null;
  created_at: string;
  profile?: {
    id: string;
    apelido?: string | null;
    url_do_avatar?: string | null;
  } | null;
  result?: {
    id: string;
    score: number;
    classification: string;
    /**
     * Vem de `resultados(*)` no select do feed. `null` é legítimo — post antigo,
     * envio de áudio que falhou — e nesse caso NÃO se desenha player.
     */
    caminho_do_audio?: string | null;
    /** `resultados.esta_escondido` — escondido por denúncia ou por moderação. */
    esta_escondido?: boolean | null;
  } | null;
  comentarios?: { count: number }[];
  reacoes?: { user_id?: string | null; reaction_type: TipoReacao }[];
}

/**
 * Rótulo do tipo, no cabeçalho do post.
 *
 * Era `post_type === 'social_link' ? 'link social' : 'arroto'`, o que chamava
 * um `text_announcement` de arroto.
 */
const ROTULO_DO_TIPO: Record<FeedPost['post_type'], string> = {
  audio_result: 'arroto',
  social_link: 'link social',
  text_announcement: 'aviso',
};

/** Contagem de curtidas do post e qual é a reação do usuário atual. */
interface EstadoReacao {
  curtidas: number;
  minha: TipoReacao | null;
}

const SEM_REACAO: EstadoReacao = { curtidas: 0, minha: null };

/**
 * Resume o array bruto de `reacoes` que vem do feed em contagem + reação
 * própria, por post. O select traz todas as linhas de reação; a contagem é
 * derivada aqui em vez de num campo agregado.
 */
function resumirReacoes(posts: FeedPost[], userId?: string): Record<string, EstadoReacao> {
  const resumo: Record<string, EstadoReacao> = {};

  for (const post of posts) {
    const linhas = post.reacoes ?? [];
    resumo[post.id] = {
      curtidas: linhas.filter((r) => r.reaction_type === 'like').length,
      minha: userId
        ? linhas.find((r) => r.user_id === userId)?.reaction_type ?? null
        : null,
    };
  }

  return resumo;
}

/**
 * Tira do feed os arrotos escondidos.
 *
 * O feed NUNCA filtrou `esta_escondido`. Só a view `global_ranking` filtrava
 * (20260807000014, linha 59), então um resultado escondido por denúncia sumia
 * do ranking e continuava no feed — que é a primeira tela do app.
 *
 * LIMITE HONESTO, E ELE IMPORTA: isto é filtro de CLIENTE. `public.resultados`
 * tem SELECT público (20260807000010), então a linha escondida ainda viaja até
 * o navegador e um cliente modificado a exibiria. O que impede de verdade o
 * dano é a policy de `storage.objects` da 20260807000028: o ÁUDIO não assina, e
 * é o áudio que é o conteúdo. Aqui o que se resolve é o card não aparecer.
 *
 * Filtrar no servidor exigiria `resultados!inner` com `.eq('result.esta_escondido',
 * false)` — e o join interno excluiria todo post `social_link` e
 * `text_announcement`, que têm `result_id` nulo. Ou seja: esvaziaria o feed
 * para consertar um card.
 */
function semArrotosEscondidos(posts: FeedPost[]): FeedPost[] {
  return posts.filter(
    (post) => !(post.post_type === 'audio_result' && post.result?.esta_escondido),
  );
}

/** Contagem de comentários por post, vinda do agregado `comentarios(count)`. */
function resumirComentarios(posts: FeedPost[]): Record<string, number> {
  const resumo: Record<string, number> = {};
  for (const post of posts) resumo[post.id] = post.comentarios?.[0]?.count ?? 0;
  return resumo;
}

interface FeedScreenProps {
  groupId?: string;
  /**
   * Assinante não vê anúncio. Vem do perfil carregado em App.tsx — sem isto o
   * `AdBanner` cai no default `false` e o premium continuaria vendo anúncio,
   * contradizendo o que a tela de perfil vende.
   */
  isPremium?: boolean;
  /** Id do usuário logado. Sem ele não há como reagir — a RLS exige sessão. */
  userId?: string;
}

export const FeedScreen: React.FC<FeedScreenProps> = ({ groupId, isPremium, userId }) => {
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTopic, setActiveTopic] = useState('Todos');
  const [reacoes, setReacoes] = useState<Record<string, EstadoReacao>>({});
  const [reagindo, setReagindo] = useState<string | null>(null);
  const [erroReacao, setErroReacao] = useState<string | null>(null);
  const [comentarios, setComentarios] = useState<Record<string, number>>({});
  const [postComentando, setPostComentando] = useState<string | null>(null);
  const [erroFeed, setErroFeed] = useState<string | null>(null);
  const [demonstrando, setDemonstrando] = useState(false);

  // Form composer state
  const [socialNetwork, setSocialNetwork] = useState<'Instagram' | 'TikTok' | 'YouTube' | 'X'>('Instagram');
  const [socialUrl, setSocialUrl] = useState('');
  const [posting, setPosting] = useState(false);
  const [erroComposer, setErroComposer] = useState<string | null>(null);

  /*
    "Campeonato" só entra na lista com `FLAGS.ligas`: o feed é o conteúdo da
    Home, primeira tela do app, e um filtro com o nome de uma feature
    desligada aponta para algo que o usuário não pode alcançar.
  */
  const topics = ['Todos', 'Arrotos lendários', ...(FLAGS.ligas ? ['Campeonato'] : []), 'Pós-bebida'];

  const aplicar = useCallback(
    (carregados: FeedPost[], deDemonstracao: boolean) => {
      // O filtro fica AQUI, e não em cada consumidor, para que contadores de
      // reação e de comentário sejam calculados sobre a mesma lista exibida.
      const visiveis = semArrotosEscondidos(carregados);
      setPosts(visiveis);
      setReacoes(resumirReacoes(visiveis, userId));
      setComentarios(resumirComentarios(visiveis));
      setDemonstrando(deDemonstracao);
    },
    [userId],
  );

  const loadFeed = useCallback(async () => {
    setLoading(true);
    setErroFeed(null);
    try {
      const data = await getCommunityFeed(groupId, activeTopic);
      // `data` nulo não é erro — é feed vazio. Antes, o `if (data)` deixava a
      // lista anterior na tela nesse caso.
      aplicar((data as unknown as FeedPost[]) ?? [], false);
    } catch (err) {
      console.error('Falha ao carregar o feed', err);

      if (MODO_DEMONSTRACAO) {
        // Só com a flag ligada, e sempre anunciado na tela.
        // Import dinâmico: com o modo desligado, este chunk nunca é buscado.
        const { mockFeedPosts } = await import('./mockFeedPosts');
        aplicar(mockFeedPosts, true);
      } else {
        setPosts([]);
        setDemonstrando(false);
        setErroFeed('Não foi possível carregar o feed.');
      }
    } finally {
      setLoading(false);
    }
  }, [groupId, activeTopic, aplicar]);

  useEffect(() => {
    loadFeed();
  }, [loadFeed]);


  /**
   * Curtir/descurtir com atualização otimista: o número muda na hora e é
   * reconciliado com a resposta do servidor, que é quem decide de fato. Em caso
   * de erro, volta ao estado anterior — não fica um contador mentindo na tela.
   */
  const alternarCurtida = useCallback(
    async (postId: string) => {
      // Guarda POR POST. Antes era `if (reagindo)`, que impedia curtir qualquer
      // outro post enquanto um estava em voo — o feed inteiro travava por causa
      // de uma requisição.
      if (!userId || reagindo === postId) return;

      const anterior = reacoes[postId] ?? SEM_REACAO;
      const jaCurtiu = anterior.minha === 'like';

      setReagindo(postId);
      setErroReacao(null);
      setReacoes((atual) => ({
        ...atual,
        [postId]: {
          curtidas: anterior.curtidas + (jaCurtiu ? -1 : 1),
          minha: jaCurtiu ? null : 'like',
        },
      }));

      try {
        const vigente = await toggleReacaoPost(postId, 'like');

        // Reconciliação a partir da contagem original: tira a minha curtida
        // anterior, se havia, e soma a nova, se o servidor disse que existe.
        setReacoes((atual) => ({
          ...atual,
          [postId]: {
            curtidas: anterior.curtidas - (jaCurtiu ? 1 : 0) + (vigente === 'like' ? 1 : 0),
            minha: vigente,
          },
        }));
      } catch (err) {
        console.error('Falha ao registrar reação', err);
        setReacoes((atual) => ({ ...atual, [postId]: anterior }));
        setErroReacao('Não foi possível registrar sua curtida. Tenta de novo.');
      } finally {
        setReagindo(null);
      }
    },
    [reacoes, reagindo, userId],
  );

  async function handleSocialSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!socialUrl.trim()) return;
    setPosting(true);
    setErroComposer(null);
    try {
      await createSocialPost({
        groupId,
        socialNetwork,
        socialUrl: socialUrl.trim(),
        topic: activeTopic,
      });
      setSocialUrl('');
      loadFeed();
    } catch (err) {
      // Era um `alert()`, que interrompe a navegação e não combina com o resto
      // da tela. O erro agora fica ao lado do campo que o causou.
      console.error('Falha ao publicar link', err);
      setErroComposer('Não foi possível publicar. Confira o link e tente de novo.');
    } finally {
      setPosting(false);
    }
  }

  return (
    <div className="screen" style={{ paddingBottom: 80, gap: 16 }}>
      {/*
        Título curto: este bloco é montado logo abaixo do convite para gravar
        na Home. Sem ele, os filtros de tópico logo no topo pareciam filtrar a
        Home inteira, e quem chegou pelo link de um desafio não tinha como
        saber que dali para baixo começa o feed da comunidade.
      */}
      <h2
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: 15,
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
          color: 'var(--muted)',
        }}
      >
        No feed agora
      </h2>

      {/* Topics Filters */}
      <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
        {topics.map((topic) => (
          <button
            key={topic}
            type="button"
            onClick={() => setActiveTopic(topic)}
            style={{
              flexShrink: 0,
              border: '1px solid var(--border)',
              borderRadius: 999,
              padding: '8px 14px',
              color: activeTopic === topic ? 'var(--fg)' : 'var(--muted)',
              background: activeTopic === topic ? 'var(--surface)' : 'transparent',
              fontSize: 12,
              fontWeight: 600,
            }}
          >
            {topic}
          </button>
        ))}
      </div>

      {erroReacao && (
        <p role="alert" style={{ fontSize: 13, color: 'var(--danger)' }}>
          {erroReacao}
        </p>
      )}

      {demonstrando && (
        <div
          role="status"
          style={{
            padding: 'var(--space-3) var(--space-4)',
            border: '1px dashed var(--danger)',
            borderRadius: 'var(--radius-md)',
            color: 'var(--danger)',
            fontSize: 12.5,
            fontWeight: 600,
          }}
        >
          Modo demonstração — estes posts são fictícios e não existem no banco.
        </div>
      )}

      {/* Feed Posts */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 40, color: 'var(--muted)' }}>Carregando feed...</div>
      ) : erroFeed ? (
        <div
          role="alert"
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 'var(--space-4)',
            textAlign: 'center',
            padding: 40,
          }}
        >
          <p style={{ color: 'var(--fg)', fontSize: 14 }}>{erroFeed}</p>
          <p style={{ color: 'var(--muted)', fontSize: 12.5 }}>
            Pode ser a sua conexão. O feed volta assim que der.
          </p>
          <button type="button" className="btn btn-secondary" style={{ width: 'auto' }} onClick={loadFeed}>
            Tentar de novo
          </button>
        </div>
      ) : posts.length === 0 ? (
        /*
          O feed virou o conteúdo da Home, então este é o texto que um usuário
          novo vê logo abaixo do CTA de gravar. "Nenhum post no momento." é
          verdade, mas deixa a tela sem saída. Continua sem inventar conteúdo:
          só diz o que está vazio e o que dá para fazer. Com filtro de tópico
          ativo o vazio significa outra coisa, e o texto muda junto.
        */
        <div style={{ textAlign: 'center', padding: 40, color: 'var(--muted)', fontSize: 14 }}>
          {activeTopic === 'Todos'
            ? 'Nada por aqui ainda. Grave o seu Auê e comece o feed.'
            : `Nenhum post em "${activeTopic}" ainda.`}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {posts.map((post, indice) => (
            <React.Fragment key={post.id}>
            <article
              style={{
                padding: '16px 0',
                borderTop: '1px solid var(--border)',
                display: 'flex',
                flexDirection: 'column',
                gap: 12,
              }}
            >
              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 999,
                    background: 'var(--border)',
                    display: 'grid',
                    placeItems: 'center',
                    fontFamily: 'var(--font-display)',
                    fontSize: 15,
                  }}
                >
                  {(post.profile?.apelido || 'A').charAt(0).toUpperCase()}
                </div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{post.profile?.apelido || 'Arrotador'}</div>
                  <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                    {ROTULO_DO_TIPO[post.post_type] ?? 'post'} · {new Date(post.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>

              {/* Body */}
              {post.post_type !== 'social_link' ? (
                /*
                  ARROTO (`audio_result`) e AVISO (`text_announcement`).

                  Este ramo era `Number(post.result?.score || 85.0)` com
                  `'Mestre Arrotador'` de reserva: post sem resultado embutido
                  desenhava a nota 85,0 e uma classificação, ambas inventadas,
                  indistinguíveis de dado real. Era o mesmo defeito que o
                  `mockFeedPosts` já tinha causado, num lugar onde ninguém
                  procurou — e é exatamente onde o primeiro post `audio_result`
                  cairia, porque `result_id` é `ON DELETE SET NULL`
                  (20260807000019).

                  Agora, sem resultado não há nota. A ausência é dita.
                */
                post.post_type === 'audio_result' ? (
                  post.result ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 30, fontWeight: 700, color: 'var(--accent)' }}>
                          {formatarNota(post.result.score)}
                        </span>
                        <span style={{ fontFamily: 'var(--font-display)', fontSize: 14, textTransform: 'uppercase' }}>
                          {post.result.classification}
                        </span>
                      </div>
                      <AudioPlayback
                        audioPath={post.result.caminho_do_audio}
                        rotulo={`Arroto de ${post.profile?.apelido || 'Arrotador'}`}
                        textoQuandoNaoHa="Este post não tem áudio salvo."
                      />
                    </div>
                  ) : (
                    <p style={{ fontSize: 13, color: 'var(--muted)', margin: 0 }}>
                      O arroto deste post não está mais disponível.
                    </p>
                  )
                ) : post.content ? (
                  <p style={{ fontSize: 14, margin: 0 }}>{post.content}</p>
                ) : null
              ) : post.social_url ? (
                <a
                  href={post.social_url}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: 12,
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--surface)',
                  }}
                >
                  <div style={{ width: 32, height: 32, borderRadius: 999, background: 'var(--border)', display: 'grid', placeItems: 'center', fontSize: 14 }}>
                    ↗
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
                    <span style={{ fontSize: 12, fontWeight: 700 }}>{post.social_network} de {post.profile?.apelido || 'Usuário'}</span>
                    <span style={{ fontSize: 12, color: 'var(--muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {post.social_url}
                    </span>
                  </div>
                </a>
              ) : (
                /* `social_link` sem `social_url`. A RPC `criar_post_social`
                   valida a URL, então isto não deveria existir — mas se
                   existir, não vira card de nota inventada. */
                <p style={{ fontSize: 13, color: 'var(--muted)', margin: 0 }}>
                  Este post não tem link.
                </p>
              )}

              {/* Actions */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {(() => {
                  const estado = reacoes[post.id] ?? SEM_REACAO;
                  const curtido = estado.minha === 'like';

                  return (
                    <button
                      type="button"
                      onClick={() => alternarCurtida(post.id)}
                      disabled={!userId || reagindo === post.id}
                      aria-pressed={curtido}
                      aria-label={
                        userId
                          ? `${curtido ? 'Descurtir' : 'Curtir'} — ${estado.curtidas} ${estado.curtidas === 1 ? 'curtida' : 'curtidas'}`
                          : 'Entre para curtir'
                      }
                      title={userId ? undefined : 'Entre para curtir'}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        padding: '8px 14px',
                        borderRadius: 999,
                        border: `1px solid ${curtido ? 'var(--accent)' : 'var(--border)'}`,
                        background: curtido ? 'var(--accent-soft)' : 'transparent',
                        color: curtido ? 'var(--accent)' : 'var(--muted)',
                        fontSize: 13,
                        fontWeight: 600,
                        cursor: userId ? 'pointer' : 'not-allowed',
                        opacity: reagindo === post.id ? 0.6 : 1,
                      }}
                    >
                      👍 {estado.curtidas}
                    </button>
                  );
                })()}
                <button
                  type="button"
                  onClick={() => setPostComentando(post.id)}
                  aria-label={`Ver comentários — ${comentarios[post.id] ?? 0}`}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '8px 14px',
                    borderRadius: 999,
                    border: '1px solid var(--border)',
                    color: 'var(--muted)',
                    fontSize: 13,
                    fontWeight: 600,
                    marginLeft: 'auto',
                  }}
                >
                  Comentar ({comentarios[post.id] ?? 0})
                </button>
              </div>

              {/*
                Denúncia só onde há arroto. Post de link social já aponta para
                fora, e o alvo do gatilho de ocultação é `resultados.id` — sem
                resultado não há o que esconder.
              */}
              {post.post_type === 'audio_result' && post.result && (
                <ReportButton resultId={post.result.id} userId={userId} />
              )}
            </article>

            {indice === POSTS_ANTES_DO_ANUNCIO - 1 && (
              <AdBanner isPremium={isPremium} adSlot={SLOT_ANUNCIO_FEED} />
            )}
            </React.Fragment>
          ))}
        </div>
      )}

      {/*
        Compositor DEPOIS dos posts.
        Ele ficava logo abaixo dos filtros, ou seja, entre o convite para
        gravar da Home e qualquer conteúdo: "postar link de rede social" era a
        segunda ação mais proeminente do app, competindo com o único CTA que
        importa e sem fazer sentido para quem acabou de chegar por um desafio.
        Nada foi removido — só desceu para depois do que ele comenta.
        Só para quem tem sessão: a RPC `criar_post_social` recusa chamada
        anônima.
      */}
      {!userId ? (
        <p
          style={{
            padding: '16px 0',
            borderTop: '1px solid var(--border)',
            fontSize: 13,
            color: 'var(--muted)',
          }}
        >
          Entre para postar no feed.
        </p>
      ) : (
      <form
        onSubmit={handleSocialSubmit}
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
          padding: '16px 0',
          borderTop: '1px solid var(--border)',
        }}
      >
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--muted)' }}>
          Postar link de rede social
        </span>
        <div style={{ display: 'flex', gap: 8 }}>
          <select
            value={socialNetwork}
            onChange={(e) => setSocialNetwork(e.target.value as 'Instagram' | 'TikTok' | 'YouTube' | 'X')}
            style={{
              width: 110,
              minHeight: 44,
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-md)',
              background: 'var(--surface)',
              color: 'var(--fg)',
              padding: '0 10px',
              font: 'inherit',
              fontSize: 13,
            }}
          >
            <option>Instagram</option>
            <option>TikTok</option>
            <option>YouTube</option>
            <option>X</option>
          </select>
          <input
            type="url"
            placeholder="https://..."
            value={socialUrl}
            onChange={(e) => setSocialUrl(e.target.value)}
            required
            style={{
              flex: 1,
              minWidth: 0,
              minHeight: 44,
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-md)',
              background: 'var(--surface)',
              color: 'var(--fg)',
              padding: '0 12px',
              font: 'inherit',
              fontSize: 13,
            }}
          />
          <button
            type="submit"
            disabled={posting}
            style={{
              minHeight: 44,
              padding: '0 14px',
              border: '1px solid var(--border)',
              borderRadius: 999,
              color: 'var(--fg)',
              fontSize: 12,
              fontWeight: 700,
              textTransform: 'uppercase',
            }}
          >
            {posting ? '...' : 'Postar'}
          </button>
        </div>

        {erroComposer && (
          <p role="alert" style={{ fontSize: 12.5, color: 'var(--danger)' }}>
            {erroComposer}
          </p>
        )}
      </form>
      )}

      {postComentando && (
        <Suspense fallback={null}>
        <CommentsModal
          postId={postComentando}
          userId={userId}
          onClose={() => setPostComentando(null)}
          // Ajusta o contador na hora, sem recarregar o feed inteiro só para
          // atualizar um número.
          onComentarioCriado={() =>
            setComentarios((atual) => ({
              ...atual,
              [postComentando]: (atual[postComentando] ?? 0) + 1,
            }))
          }
          onComentarioApagado={() =>
            setComentarios((atual) => ({
              ...atual,
              [postComentando]: Math.max(0, (atual[postComentando] ?? 1) - 1),
            }))
          }
        />
        </Suspense>
      )}
    </div>
  );
};
