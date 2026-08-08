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

-- 2. Revoke direct INSERT on conquistas_usuario from authenticated users
-- Badges should only be unlocked server-side via SECURITY DEFINER functions/triggers
--
-- Os dois nomes de policy abaixo são a MESMA policy: "System can insert user
-- conquistas" é como ela se chamava antes do rename de `user_conquistas` para
-- `conquistas_usuario` (2026-08-07). Ambiente que já rodou a 20260807000018 na
-- versão antiga tem o nome antigo registrado; ambiente novo tem o atual. Os dois
-- DROPs são `IF EXISTS`, então cada ambiente derruba o seu e ignora o outro —
-- deixar só o novo faria a policy antiga sobreviver em silêncio.
DROP POLICY IF EXISTS "System can insert unlocked conquistas" ON public.conquistas_usuario;
DROP POLICY IF EXISTS "System can insert user conquistas" ON public.conquistas_usuario;
REVOKE INSERT ON public.conquistas_usuario FROM authenticated, anon;

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
    INSERT INTO public.conquistas_usuario (user_id, conquista_id)
    VALUES (NEW.user_id, 'primeiro_aue')
    ON CONFLICT DO NOTHING;

    -- Passou de 70
    IF NEW.score >= 70 THEN
      INSERT INTO public.conquistas_usuario (user_id, conquista_id)
      VALUES (NEW.user_id, 'passou_70')
      ON CONFLICT DO NOTHING;
    END IF;

    -- Passou de 90
    IF NEW.score >= 90 THEN
      INSERT INTO public.conquistas_usuario (user_id, conquista_id)
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
  LEFT JOIN public.conquistas_usuario uc 
    ON uc.conquista_id = c.id AND uc.user_id = p_user_id
  ORDER BY c.id;
$$;

GRANT EXECUTE ON FUNCTION public.get_user_conquistas_catalog(uuid) TO anon, authenticated;
