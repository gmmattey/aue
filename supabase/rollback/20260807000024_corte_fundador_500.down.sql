-- =============================================================================
-- ROLLBACK MANUAL de 20260807000024_corte_fundador_500.sql
--
-- USO DE EMERGÊNCIA. Leia `supabase/rollback/README.md` antes.
--
-- O QUE ESTE ROLLBACK FAZ: devolve `handle_new_user()` ao comportamento sem
-- corte — todo usuário novo volta a nascer com `is_founder = true`, para
-- sempre. É o estado que a migração 000024 corrigiu; o selo volta a perder o
-- sentido conforme a base cresce.
--
-- NÃO MEXE EM DADO. Perfis que já receberam (ou deixaram de receber) o selo
-- ficam como estão. Quem entrou depois da vaga 500 e nasceu sem coroa NÃO
-- ganha coroa retroativamente — para isso seria preciso um UPDATE manual.
--
-- NÃO VALIDADO: escrito e revisado por leitura, sem Postgres neste ambiente.
-- Rode dentro de BEGIN / ROLLBACK e confira antes de confirmar.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  INSERT INTO public.profiles (id, apelido, avatar_url, is_founder)
  VALUES (
    NEW.id,
    COALESCE(
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'name',
      'Arrotador ' || substr(NEW.id::text, 1, 6)
    ),
    NEW.raw_user_meta_data->>'avatar_url',
    true
  );
  RETURN NEW;
END;
$$;

DROP FUNCTION IF EXISTS public.aue_vaga_de_fundador_disponivel();

DROP INDEX IF EXISTS public.profiles_fundadores;
