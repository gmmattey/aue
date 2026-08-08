-- =============================================================================
-- Status de fundador.
--
-- RENUMERADA de 20260807000015 para 20260807000022 (achado C2 da auditoria).
-- Existiam DOIS arquivos com o número 20260807000015 — este e
-- `20260807000015_global_ranking_authenticated_only.sql`. Como a CLI do
-- Supabase usa a versão como chave em `supabase_migrations.schema_migrations`,
-- a ordem entre os dois era indefinida e um deles podia ser considerado
-- aplicado sem nunca ter rodado. O número 20260807000015 fica com a migração
-- do ranking, que é a citada no README e no diretório de rollback.
--
-- ATENÇÃO AO APLICAR EM AMBIENTE QUE JÁ RODOU A VERSÃO ANTIGA: verifique o que
-- de fato está registrado antes de rodar qualquer coisa.
--
--   SELECT version FROM supabase_migrations.schema_migrations
--    WHERE version IN ('20260807000015','20260807000022');
--
--   -- E confira qual dos dois conteúdos está de fato no banco:
--   SELECT EXISTS (
--     SELECT 1 FROM information_schema.columns
--      WHERE table_schema='public' AND table_name='profiles'
--        AND column_name='is_founder'
--   ) AS founder_aplicada;
--
-- Todo o DDL abaixo é idempotente justamente para que a reaplicação sob o novo
-- número não falhe se a versão antiga já tiver rodado.
--
-- MUDANÇA DE CONTEÚDO EM RELAÇÃO À VERSÃO 000015: a redefinição de
-- `protect_profile_stats()` foi REMOVIDA daqui. Aquela redefinição recopiava o
-- corpo da função e, no processo, descartava a válvula `app.allow_stat_update`
-- criada em 20260807000010 — matando o acúmulo de XP (achado C1). A função
-- agora tem definição única e consolidada em
-- 20260807000023_corrige_regressao_xp_e_endurecimento.sql, que protege
-- `is_founder` junto com os demais campos.
--
-- NÃO VALIDADO: não há Postgres neste ambiente. Revisão por leitura apenas.
-- =============================================================================

-- 1. Coluna de fundador.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_founder boolean DEFAULT false NOT NULL;

-- 2. Novo usuário nasce com o selo de fundador.
--
-- PENDENTE DE DECISÃO DE PRODUTO (achado M7 da auditoria, encaminhado a Luiz):
-- não existe corte de data nem limite de contagem. Do jeito que está, TODO
-- usuário criado — hoje ou daqui a dois anos — é fundador, e a distinção perde
-- sentido no dia seguinte ao lançamento. O comportamento foi PRESERVADO nesta
-- correção de propósito: mudar a regra é decisão de Luiz, não de engenharia.
-- Quando houver decisão, o corte entra aqui (por data de criação ou por
-- contagem de perfis existentes).
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp   -- achado M8: search_path fixo
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
