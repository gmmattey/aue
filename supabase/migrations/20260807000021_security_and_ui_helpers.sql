-- =============================================================================
-- Security Hardening & UI Helper RPCs (Audit findings Rian & Marcelo)
-- =============================================================================

-- 1. Protect is_premium from direct client updates in profiles
CREATE OR REPLACE FUNCTION public.protect_profile_stats() 
RETURNS trigger AS $$
BEGIN
  NEW.xp_total = OLD.xp_total;
  NEW.nivel = OLD.nivel;
  NEW.is_founder = OLD.is_founder;
  NEW.is_premium = OLD.is_premium; -- Protege a flag is_premium contra alteração direta pelo cliente
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Revoke direct INSERT on user_conquistas from authenticated users
-- Badges should only be unlocked server-side via SECURITY DEFINER functions/triggers
DROP POLICY IF EXISTS "System can insert user conquistas" ON public.user_conquistas;
REVOKE INSERT ON public.user_conquistas FROM authenticated, anon;

-- 3. Add SET search_path to check_result_achievements
CREATE OR REPLACE FUNCTION public.check_result_achievements()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.user_id IS NOT NULL THEN
    -- Primeiro Auê
    INSERT INTO public.user_conquistas (user_id, conquista_id)
    VALUES (NEW.user_id, 'primeiro_aue')
    ON CONFLICT DO NOTHING;

    -- Passou de 70
    IF NEW.score >= 70 THEN
      INSERT INTO public.user_conquistas (user_id, conquista_id)
      VALUES (NEW.user_id, 'passou_70')
      ON CONFLICT DO NOTHING;
    END IF;

    -- Passou de 90
    IF NEW.score >= 90 THEN
      INSERT INTO public.user_conquistas (user_id, conquista_id)
      VALUES (NEW.user_id, 'passou_90')
      ON CONFLICT DO NOTHING;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- 4. Add CHECK constraint on posts_comunidade for valid URLs
ALTER TABLE public.posts_comunidade
  DROP CONSTRAINT IF EXISTS check_social_url,
  ADD CONSTRAINT check_social_url CHECK (social_url IS NULL OR social_url ~* '^https?://');

-- 5. Helper RPC to get full conquistas catalog with user unlock status (Marcelo UX requirement)
CREATE OR REPLACE FUNCTION public.get_user_conquistas_catalog(p_user_id uuid)
RETURNS TABLE (
  id text,
  nome text,
  descricao text,
  icone text,
  categoria text,
  is_rare boolean,
  is_secret boolean,
  unlocked boolean,
  unlocked_at timestamp with time zone
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT 
    c.id,
    c.nome,
    c.descricao,
    c.icone,
    c.categoria,
    c.is_rare,
    c.is_secret,
    (uc.user_id IS NOT NULL) AS unlocked,
    uc.unlocked_at
  FROM public.conquistas c
  LEFT JOIN public.user_conquistas uc 
    ON uc.conquista_id = c.id AND uc.user_id = p_user_id
  ORDER BY c.id;
$$;

GRANT EXECUTE ON FUNCTION public.get_user_conquistas_catalog(uuid) TO anon, authenticated;
