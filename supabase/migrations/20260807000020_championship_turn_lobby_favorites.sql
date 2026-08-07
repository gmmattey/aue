-- =============================================================================
-- Championship Turn-Based Lobby, Roast Lines & User Favorites
-- =============================================================================

-- 1. Create favoritos table
CREATE TABLE IF NOT EXISTS public.favoritos (
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  result_id uuid REFERENCES public.resultados(id) ON DELETE CASCADE NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  PRIMARY KEY (user_id, result_id)
);

ALTER TABLE public.favoritos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own favorites"
ON public.favoritos FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own favorites"
ON public.favoritos FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own favorites"
ON public.favoritos FOR DELETE TO authenticated
USING (auth.uid() = user_id);

GRANT SELECT, INSERT, DELETE ON public.favoritos TO authenticated;

-- RPC to toggle favorite status
CREATE OR REPLACE FUNCTION public.toggle_favorite(p_result_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_exists boolean;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuário precisa estar autenticado' USING ERRCODE = '28000';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.favoritos
    WHERE user_id = v_user_id AND result_id = p_result_id
  ) INTO v_exists;

  IF v_exists THEN
    DELETE FROM public.favoritos WHERE user_id = v_user_id AND result_id = p_result_id;
    RETURN false;
  ELSE
    INSERT INTO public.favoritos (user_id, result_id) VALUES (v_user_id, p_result_id);
    RETURN true;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.toggle_favorite(uuid) TO authenticated;

-- 2. Turn-based Championship Lobby Extensions
ALTER TABLE public.campeonatos
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'active' CHECK (status IN ('draft', 'active', 'completed')),
  ADD COLUMN IF NOT EXISTS current_turn_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS roast_line text;

ALTER TABLE public.participantes_campeonato
  ADD COLUMN IF NOT EXISTS turn_order integer DEFAULT 1 NOT NULL,
  ADD COLUMN IF NOT EXISTS status_jogada text DEFAULT 'waiting' CHECK (status_jogada IN ('waiting', 'current_turn', 'played')),
  ADD COLUMN IF NOT EXISTS result_id uuid REFERENCES public.resultados(id) ON DELETE SET NULL;
