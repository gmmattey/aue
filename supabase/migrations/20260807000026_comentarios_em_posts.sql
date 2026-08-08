-- =============================================================================
-- Comentários acessíveis: leitura e criação em post OU resultado.
--
-- CONTEXTO: `CommentsModal.tsx` existia mas nenhum componente o montava, e o
-- botão "Comentar" do feed dependia de um callback que ninguém passava. A
-- feature estava 100% inalcançável — o feed exibia a contagem de comentários
-- sem nenhum caminho para ler ou escrever.
--
-- DOIS DEFEITOS DO MODAL QUE ESTA MIGRAÇÃO HABILITA CORRIGIR:
--
--   1. Ele consultava só `result_id`. O feed roteado é de `posts_comunidade`,
--      cujos comentários usam `post_id` (coluna criada em 20260807000019).
--
--   2. Ele usava `select('*, profiles(apelido)')`. Esse embed depende de uma
--      relação que o PostgREST não tem como resolver com segurança:
--      `comentarios.user_id` referencia `auth.users(id)`, NÃO
--      `public.profiles(id)`. Acrescentar uma segunda FK na mesma coluna
--      tornaria o embed AMBÍGUO ("more than one relationship found"), então a
--      saída é uma RPC que faz o join explicitamente — o mesmo caminho já
--      usado por `get_user_conquistas_catalog` (20260807000021).
--
-- NÃO VALIDADO: não há Postgres neste ambiente. Revisão por leitura apenas.
-- =============================================================================


-- -----------------------------------------------------------------------------
-- 1. Leitura.
--
-- SECURITY INVOKER (padrão, deixado explícito): a leitura precisa continuar
-- sujeita à RLS de `comentarios` e `profiles`. As duas já têm policy de SELECT
-- pública ("Comments are viewable by everyone", 20260807000005; "Public
-- profiles are viewable by everyone", 20260807000001), então anônimo lê — o que
-- é o comportamento desejado: ver comentário não exige conta, escrever exige.
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.listar_comentarios(
  p_post_id uuid DEFAULT NULL,
  p_result_id uuid DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  content text,
  created_at timestamp with time zone,
  user_id uuid,
  apelido text,
  avatar_url text
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
  SELECT
    c.id,
    c.content,
    c.created_at,
    c.user_id,
    p.apelido,
    p.avatar_url
  FROM public.comentarios c
  LEFT JOIN public.profiles p ON p.id = c.user_id
  WHERE (p_post_id   IS NOT NULL AND c.post_id   = p_post_id)
     OR (p_result_id IS NOT NULL AND c.result_id = p_result_id)
  ORDER BY c.created_at ASC;
$$;

COMMENT ON FUNCTION public.listar_comentarios(uuid, uuid) IS
  'Comentários de um post OU de um resultado, com o apelido do autor. Existe '
  'porque comentarios.user_id referencia auth.users, e não profiles — o embed '
  'do PostgREST não resolve esse caminho.';

GRANT EXECUTE ON FUNCTION public.listar_comentarios(uuid, uuid) TO anon, authenticated;


-- -----------------------------------------------------------------------------
-- 2. Criação.
--
-- SECURITY DEFINER pelo mesmo motivo de `create_social_post` e
-- `submit_resultado`: o `user_id` vem de `auth.uid()` no servidor, nunca do
-- payload. A policy de INSERT já exigia `auth.uid() = user_id`, mas com a RPC
-- o cliente sequer envia o campo.
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.criar_comentario(
  p_conteudo text,
  p_post_id uuid DEFAULT NULL,
  p_result_id uuid DEFAULT NULL
)
RETURNS public.comentarios
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_conteudo text;
  v_linha public.comentarios;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuário precisa estar autenticado' USING ERRCODE = '28000';
  END IF;

  -- Mesmo invariante da constraint `comentarios_alvo_unico` (20260807000023),
  -- checado aqui para devolver erro legível em vez de violação de CHECK.
  IF num_nonnulls(p_post_id, p_result_id) <> 1 THEN
    RAISE EXCEPTION 'Informe exatamente um alvo: post ou resultado' USING ERRCODE = '22023';
  END IF;

  v_conteudo := btrim(coalesce(p_conteudo, ''));

  -- Espelha o CHECK de `content` criado em 20260807000005 (1 a 500 caracteres),
  -- com mensagem própria. Sem isto, comentário só de espaços passaria pelo
  -- `char_length` do CHECK original antes do btrim.
  IF char_length(v_conteudo) = 0 THEN
    RAISE EXCEPTION 'Comentário vazio' USING ERRCODE = '22023';
  END IF;

  IF char_length(v_conteudo) > 500 THEN
    RAISE EXCEPTION 'Comentário passa de 500 caracteres' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.comentarios (post_id, result_id, user_id, content)
  VALUES (p_post_id, p_result_id, v_user_id, v_conteudo)
  RETURNING * INTO v_linha;

  RETURN v_linha;
END;
$$;

COMMENT ON FUNCTION public.criar_comentario(text, uuid, uuid) IS
  'Cria comentário em post OU resultado. user_id vem de auth.uid(), nunca do cliente.';

GRANT EXECUTE ON FUNCTION public.criar_comentario(text, uuid, uuid) TO authenticated;


-- -----------------------------------------------------------------------------
-- 3. Índices de leitura.
--
-- `listar_comentarios` filtra por um dos dois alvos; sem índice, cada abertura
-- do modal faz varredura sequencial em `comentarios`.
-- -----------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS comentarios_por_post
  ON public.comentarios (post_id, created_at) WHERE post_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS comentarios_por_resultado
  ON public.comentarios (result_id, created_at) WHERE result_id IS NOT NULL;

-- Apagar o próprio comentário continua pela policy existente
-- ("Users can delete their own comments", 20260807000005) — DELETE direto na
-- tabela, sem RPC, porque a policy já expressa exatamente a regra.
