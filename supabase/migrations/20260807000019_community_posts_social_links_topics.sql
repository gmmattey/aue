-- =============================================================================
-- Community Feed Extension: Posts, Social Network Links & Topic Filtering
-- =============================================================================

-- 1. Add group_id and origin_subtype to resultados to link audio directly to communities/subtypes
ALTER TABLE public.resultados
  ADD COLUMN IF NOT EXISTS group_id uuid REFERENCES public.grupos(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS origin_subtype text;

-- 2. Create posts_comunidade table to unify community feed items
CREATE TABLE IF NOT EXISTS public.posts_comunidade (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id uuid REFERENCES public.grupos(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  post_type text CHECK (post_type IN ('audio_result', 'social_link', 'text_announcement')) NOT NULL,
  result_id uuid REFERENCES public.resultados(id) ON DELETE SET NULL,
  social_network text CHECK (social_network IS NULL OR social_network IN ('Instagram', 'TikTok', 'YouTube', 'X')),
  social_url text,
  topic text DEFAULT 'Todos' NOT NULL,
  content text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.posts_comunidade ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Community posts are viewable by everyone"
ON public.posts_comunidade FOR SELECT TO public USING (true);

CREATE POLICY "Authenticated users can create posts"
ON public.posts_comunidade FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own posts"
ON public.posts_comunidade FOR DELETE TO authenticated
USING (auth.uid() = user_id);

GRANT SELECT, INSERT, DELETE ON public.posts_comunidade TO authenticated;
GRANT SELECT ON public.posts_comunidade TO anon;

-- 3. Extend comentarios and reacoes to support posts_comunidade
ALTER TABLE public.comentarios
  ADD COLUMN IF NOT EXISTS post_id uuid REFERENCES public.posts_comunidade(id) ON DELETE CASCADE,
  ALTER COLUMN result_id DROP NOT NULL;

ALTER TABLE public.reacoes
  ADD COLUMN IF NOT EXISTS post_id uuid REFERENCES public.posts_comunidade(id) ON DELETE CASCADE,
  ALTER COLUMN result_id DROP NOT NULL;

-- 4. RPC to post social media links into a community feed
CREATE OR REPLACE FUNCTION public.create_social_post(
  p_group_id uuid,
  p_social_network text,
  p_social_url text,
  p_topic text DEFAULT 'Todos',
  p_content text DEFAULT NULL
)
RETURNS public.posts_comunidade
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_post public.posts_comunidade;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuário precisa estar autenticado' USING ERRCODE = '28000';
  END IF;

  IF p_social_url IS NULL OR (p_social_url !~* '^https?://') THEN
    RAISE EXCEPTION 'URL inválida' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.posts_comunidade (
    group_id, user_id, post_type, social_network, social_url, topic, content
  ) VALUES (
    p_group_id, v_user_id, 'social_link', p_social_network, p_social_url, COALESCE(p_topic, 'Todos'), p_content
  ) RETURNING * INTO v_post;

  RETURN v_post;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_social_post(uuid, text, text, text, text) TO authenticated;
