import { createClient } from '@supabase/supabase-js';
import type { Provider } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export async function signInWithGoogle() {
  return supabase.auth.signInWithOAuth({
    provider: 'google',
  });
}

export async function signInWithTikTok() {
  return supabase.auth.signInWithOAuth({
    provider: 'tiktok' as Provider,
  });
}

export async function signInWithTwitter() {
  return supabase.auth.signInWithOAuth({
    provider: 'twitter' as Provider,
  });
}

export async function signInWithEmail(email: string) {
  return supabase.auth.signInWithOtp({ email });
}

export async function signOut() {
  return supabase.auth.signOut();
}

/** Linha de `public.resultados` como devolvida pela RPC `submit_resultado`. */
export interface ResultadoRow {
  id: string;
  created_at: string;
  score: number;
  classification: string;
  is_artificial: boolean;
  duration: number;
  power: number;
  depth: number;
  texture: number;
  origin_score: number;
  origin_type: string;
  origin_subtype: string | null;
  player_name: string | null;
  user_id: string | null;
  group_id: string | null;
  xp_earned: number;
  is_xp_eligible: boolean;
  is_hidden: boolean;
}

export interface SubmitResultInput {
  /** Parciais normalizadas 0-100 produzidas pelo Judgement Engine local. */
  duration: number;
  power: number;
  depth: number;
  texture: number;
  originType: string;
  /** Só é gravado quando `originType` é 'Comida' ou 'Bebida'. */
  originSubtype?: string | null;
  /**
   * Ignorado pelo servidor quando há sessão: o ranking usa o apelido do perfil.
   * Só vale para gravação anônima.
   */
  playerName?: string | null;
  /**
   * Exige que o usuário seja membro do grupo; o servidor recusa se não for.
   *
   * SEM PRODUTOR HOJE: nenhuma tela envia este campo, porque não existe
   * seleção de grupo no fluxo de gravação. O caminho no servidor está pronto e
   * validado — falta a interface.
   */
  groupId?: string | null;
}

/**
 * Grava um resultado através da RPC `submit_resultado` — único caminho de
 * escrita em `resultados` (o INSERT direto foi revogado em 20260807000011).
 *
 * `score`, `classification`, `origin_score`, `is_artificial` e `user_id` são
 * derivados no servidor; nada disso trafega no payload.
 */
export async function submitResult(input: SubmitResultInput): Promise<ResultadoRow> {
  const { data, error } = await supabase.rpc('submit_resultado', {
    p_duration: input.duration,
    p_power: input.power,
    p_depth: input.depth,
    p_texture: input.texture,
    p_origin_type: input.originType,
    p_player_name: input.playerName ?? null,
    p_origin_subtype: input.originSubtype ?? null,
    p_group_id: input.groupId ?? null,
  });

  if (error) throw error;
  return data as ResultadoRow;
}

const ALFABETO_DESAFIO = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // sem I/O/0/1
const TENTATIVAS_DESAFIO = 5;

/**
 * Gera o id de 6 caracteres do desafio.
 *
 * Usa `crypto.getRandomValues` em vez de `Math.random()`: o id é a chave
 * primária e vira a URL pública do duelo, então precisa ser imprevisível, não
 * apenas variado. O alfabeto omite I, O, 0 e 1 porque o link é lido e digitado
 * por pessoas.
 */
function gerarIdDesafio(): string {
  const bytes = new Uint8Array(6);
  crypto.getRandomValues(bytes);
  let id = '';
  for (const b of bytes) id += ALFABETO_DESAFIO[b % ALFABETO_DESAFIO.length];
  return id;
}

export interface DesafioRow {
  id: string;
  created_at: string;
  challenger_result_id: string;
  challenged_result_id: string | null;
  winner: 'challenger' | 'challenged' | 'tie' | null;
  resolved_at: string | null;
}

export async function createChallenge(challengerResultId: string): Promise<DesafioRow> {
  // O id é escolhido no cliente, então a colisão é possível e chega como
  // violação de chave primária (23505). Antes, o erro cru subia para a
  // interface como "Erro ao criar desafio"; agora tenta outro id.
  let ultimoErro: unknown = null;

  for (let tentativa = 0; tentativa < TENTATIVAS_DESAFIO; tentativa++) {
    const { data, error } = await supabase
      .from('desafios')
      .insert([{ id: gerarIdDesafio(), challenger_result_id: challengerResultId }])
      .select()
      .single();

    if (!error) return data as DesafioRow;

    ultimoErro = error;
    if ((error as { code?: string }).code !== '23505') break; // não é colisão
  }

  throw ultimoErro;
}

export async function getChallenge(challengeId: string) {
  const { data, error } = await supabase
    .from('desafios')
    .select('*, challenger_result:resultados!desafios_challenger_result_id_fkey(*), challenged_result:resultados!desafios_challenged_result_id_fkey(*)')
    .eq('id', challengeId)
    .single();
    
  if (error) throw error;
  return data;
}

export async function completeChallenge(challengeId: string, challengedResultId: string) {
  const { data, error } = await supabase
    .from('desafios')
    .update({ challenged_result_id: challengedResultId })
    .eq('id', challengeId)
    .select()
    .single();
    
  if (error) throw error;
  return data;
}

/* =============================================================================
 * Social Links, Profiles & Followers
 * ============================================================================= */

/** Linha de `public.profiles`. */
export interface PerfilRow {
  id: string;
  apelido: string | null;
  avatar_url: string | null;
  bio: string | null;
  titulo: string | null;
  xp_total: number;
  nivel: number;
  is_founder: boolean;
  is_premium: boolean;
  instagram_handle: string | null;
  tiktok_handle: string | null;
  youtube_handle: string | null;
  twitter_handle: string | null;
  notify_challenges: boolean;
  notify_ranking: boolean;
  notify_community: boolean;
  created_at: string;
}

export interface UpdateProfileInput {
  apelido?: string;
  avatar_url?: string;
  bio?: string;
  titulo?: string;
  instagram_handle?: string;
  tiktok_handle?: string;
  youtube_handle?: string;
  twitter_handle?: string;
  notify_challenges?: boolean;
  notify_ranking?: boolean;
  notify_community?: boolean;
}

export async function getProfile(userId: string): Promise<PerfilRow> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) throw error;
  return data as PerfilRow;
}

export async function updateProfile(userId: string, input: UpdateProfileInput) {
  const { data, error } = await supabase
    .from('profiles')
    .update(input)
    .eq('id', userId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function toggleFollow(targetUserId: string) {
  const { data, error } = await supabase.rpc('toggle_follow', {
    target_user_id: targetUserId,
  });

  if (error) throw error;
  return data as boolean;
}

export async function getFollowers(userId: string) {
  const { data, error } = await supabase
    .from('seguidores')
    .select('*, follower:profiles!seguidores_follower_id_fkey(*)')
    .eq('following_id', userId);

  if (error) throw error;
  return data;
}

export async function getFollowing(userId: string) {
  const { data, error } = await supabase
    .from('seguidores')
    .select('*, following:profiles!seguidores_following_id_fkey(*)')
    .eq('follower_id', userId);

  if (error) throw error;
  return data;
}

export function formatSocialUrl(network: 'Instagram' | 'TikTok' | 'YouTube' | 'X', handle: string): string {
  const cleanHandle = handle.replace(/^@/, '').trim();
  switch (network) {
    case 'Instagram':
      return `https://instagram.com/${cleanHandle}`;
    case 'TikTok':
      return `https://tiktok.com/@${cleanHandle}`;
    case 'YouTube':
      return `https://youtube.com/@${cleanHandle}`;
    case 'X':
      return `https://x.com/${cleanHandle}`;
    default:
      return cleanHandle;
  }
}

/* =============================================================================
 * Conquistas (Achievements)
 * ============================================================================= */

export async function getConquistasCatalog() {
  const { data, error } = await supabase
    .from('conquistas')
    .select('*')
    .order('id');

  if (error) throw error;
  return data;
}

export async function getUserConquistas(userId: string) {
  const { data, error } = await supabase
    .from('user_conquistas')
    .select('*, conquista:conquistas(*)')
    .eq('user_id', userId);

  if (error) throw error;
  return data;
}

export async function getUserConquistasCatalog(userId: string) {
  const { data, error } = await supabase.rpc('get_user_conquistas_catalog', {
    p_user_id: userId,
  });

  if (error) throw error;
  return data;
}

/* =============================================================================
 * Community Feed & Social Posts
 * ============================================================================= */

export interface CreateSocialPostInput {
  groupId?: string;
  socialNetwork: 'Instagram' | 'TikTok' | 'YouTube' | 'X';
  socialUrl: string;
  topic?: string;
  content?: string;
}

export async function createSocialPost(input: CreateSocialPostInput) {
  const { data, error } = await supabase.rpc('create_social_post', {
    p_group_id: input.groupId ?? null,
    p_social_network: input.socialNetwork,
    p_social_url: input.socialUrl,
    p_topic: input.topic ?? 'Todos',
    p_content: input.content ?? null,
  });

  if (error) throw error;
  return data;
}

export async function getCommunityFeed(groupId?: string, topic?: string) {
  let query = supabase
    .from('posts_comunidade')
    .select('*, profile:profiles(*), result:resultados(*), comentarios(count), reacoes(*)');

  if (groupId) {
    query = query.eq('group_id', groupId);
  }

  if (topic && topic !== 'Todos') {
    query = query.eq('topic', topic);
  }

  const { data, error } = await query.order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}

export type TipoReacao = 'like' | 'dislike';

/**
 * Alterna a reação do usuário logado num post do feed.
 *
 * Devolve o tipo vigente depois da operação, ou `null` se a reação foi
 * removida (clicar no mesmo botão duas vezes desfaz). A decisão de
 * inserir/trocar/remover acontece no servidor, numa chamada só — resolver isso
 * no cliente exigiria ler, decidir e escrever, com corrida entre cliques
 * rápidos.
 */
export async function toggleReacaoPost(
  postId: string,
  tipo: TipoReacao = 'like',
): Promise<TipoReacao | null> {
  const { data, error } = await supabase.rpc('toggle_reacao', {
    p_post_id: postId,
    p_result_id: null,
    p_tipo: tipo,
  });

  if (error) throw error;
  return (data as TipoReacao | null) ?? null;
}

export interface ComentarioRow {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  apelido: string | null;
  avatar_url: string | null;
}

/**
 * Comentários de um post, com o apelido do autor.
 *
 * Vai por RPC e não por `select('*, profiles(apelido)')` porque
 * `comentarios.user_id` referencia `auth.users`, não `profiles` — o PostgREST
 * não tem relação para embutir, e criar uma segunda FK na mesma coluna deixaria
 * o embed ambíguo. A RPC faz o join explicitamente.
 */
export async function listarComentariosDoPost(postId: string): Promise<ComentarioRow[]> {
  const { data, error } = await supabase.rpc('listar_comentarios', {
    p_post_id: postId,
    p_result_id: null,
  });

  if (error) throw error;
  return (data as ComentarioRow[]) ?? [];
}

export async function criarComentarioNoPost(postId: string, conteudo: string) {
  const { data, error } = await supabase.rpc('criar_comentario', {
    p_conteudo: conteudo,
    p_post_id: postId,
    p_result_id: null,
  });

  if (error) throw error;
  return data;
}

/**
 * Apaga um comentário próprio. Vai direto na tabela: a policy
 * "Users can delete their own comments" já expressa exatamente a regra, então
 * uma RPC só acrescentaria indireção.
 */
export async function apagarComentario(comentarioId: string) {
  const { error } = await supabase.from('comentarios').delete().eq('id', comentarioId);
  if (error) throw error;
}

/* =============================================================================
 * Favorites & Championships
 * ============================================================================= */

export async function toggleFavorite(resultId: string) {
  const { data, error } = await supabase.rpc('toggle_favorite', {
    p_result_id: resultId,
  });

  if (error) throw error;
  return data as boolean;
}

export async function getUserFavorites(userId: string) {
  const { data, error } = await supabase
    .from('favoritos')
    .select('*, result:resultados(*)')
    .eq('user_id', userId);

  if (error) throw error;
  return data;
}

export async function getChampionshipLobby(championshipId: string) {
  const { data, error } = await supabase
    .from('campeonatos')
    .select('*, participantes:participantes_campeonato(*, profile:profiles(*), result:resultados(*))')
    .eq('id', championshipId)
    .single();

  if (error) throw error;
  return data;
}
