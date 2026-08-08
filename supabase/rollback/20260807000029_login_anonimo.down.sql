-- =============================================================================
-- ROLLBACK MANUAL de 20260807000029_login_anonimo.sql
--
-- USO DE EMERGÊNCIA. Leia `supabase/rollback/README.md` antes.
--
-- O QUE ESTE ROLLBACK FAZ: devolve `handle_new_user()` ao corpo da
-- 20260807000024 — o selo de fundador volta a ser concedido pela regra das 500
-- vagas SEM distinguir visitante anônimo de usuário cadastrado.
--
-- LEIA ISTO ANTES DE RODAR. Se o app publicado ainda estiver chamando
-- `signInAnonymously()` no boot (é o comportamento do MVP), este rollback faz
-- as 500 vagas serem consumidas por VISITANTES — em horas, e sem aviso. O selo
-- se torna irrecuperável sem um UPDATE manual, porque não há como distinguir
-- depois quem era visita e quem era cadastro de verdade... exceto por
-- `auth.users.is_anonymous`, que é justamente a informação que esta função
-- deixa de ler.
--
-- Ou seja: reverter esta migração no banco SEM reverter o cliente é a pior das
-- combinações. Se o objetivo é só desligar o login anônimo, faça isso no
-- painel (Authentication > Providers > Anonymous sign-ins) — o app já degrada
-- para o modo sem sessão e NADA aqui precisa ser revertido.
--
-- Se ainda assim for necessário rodar, o conserto posterior é:
--
--   UPDATE public.profiles p SET is_founder = false
--    FROM auth.users u
--    WHERE u.id = p.id AND p.is_founder AND u.is_anonymous;
--
-- NÃO MEXE EM DADO. Perfis já criados ficam como estão.
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
    public.aue_vaga_de_fundador_disponivel()
  );
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.handle_new_user() IS
  'Cria public.profiles para todo usuário de auth.users, com o selo de fundador '
  'decidido por aue_vaga_de_fundador_disponivel(). Revertido da 20260807000029: '
  'NÃO distingue visitante anônimo.';
