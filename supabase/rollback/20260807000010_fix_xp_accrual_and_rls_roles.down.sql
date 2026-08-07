-- =============================================================================
-- ROLLBACK MANUAL de 20260807000010_fix_xp_accrual_and_rls_roles.sql
--
-- NÃO É MIGRAÇÃO. Ver supabase/rollback/README.md.
-- Rodar como owner (postgres). ÚLTIMO da ordem inversa — só depois de
-- 000016, 000015, 000012 e 000011.
--
-- ======================== LEIA ANTES DE RODAR ================================
--
-- ISTO REINTRODUZ DE PROPÓSITO DOIS BUGS CONHECIDOS:
--   * C4 — `protect_profile_stats` volta a reverter xp_total/nivel em TODA
--     atualização de `profiles`, inclusive a do próprio fluxo de gamificação.
--     Resultado: o XP para de acumular silenciosamente. Ninguém vê erro.
--   * C5 — as policies voltam a ser `TO anon` apenas. Usuário LOGADO perde
--     acesso de leitura a `resultados` e a `desafios`, e perde a capacidade de
--     criar/responder desafio. A policy de UPDATE volta a ficar sem
--     `WITH CHECK`, o que faz o Postgres reaplicar o `USING` na linha nova e
--     REJEITAR justamente o UPDATE que completa o desafio.
--
-- Ou seja: depois deste script, responder a um desafio deixa de funcionar para
-- todo mundo. Só rode se o objetivo for voltar o banco ao estado pré-correções
-- por inteiro.
--
-- Dados: nada é apagado. XP e níveis já acumulados permanecem — apenas param
-- de crescer.
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- 1. Remover o trigger/função de imutabilidade de `desafios` (criados na 000010).
-- -----------------------------------------------------------------------------

DROP TRIGGER IF EXISTS on_desafio_update ON public.desafios;
DROP FUNCTION IF EXISTS public.protect_desafio_fields();


-- -----------------------------------------------------------------------------
-- 2. Voltar as policies ao estado de 20260807000000 (MVP anônimo, `TO anon`).
-- -----------------------------------------------------------------------------

-- resultados: leitura
DROP POLICY IF EXISTS "Enable read access for all users" ON public.resultados;
CREATE POLICY "Enable read access for all users"
ON public.resultados FOR SELECT
TO anon
USING (true);

-- desafios: leitura
DROP POLICY IF EXISTS "Enable read access for all users" ON public.desafios;
CREATE POLICY "Enable read access for all users"
ON public.desafios FOR SELECT
TO anon
USING (true);

-- desafios: criação
-- Os dois nomes possíveis são removidos: "Enable insert for everyone" é o da
-- 000010 e "Enable insert for owner of challenger result" é o da 000016, caso
-- aquele rollback não tenha sido rodado antes.
DROP POLICY IF EXISTS "Enable insert for everyone" ON public.desafios;
DROP POLICY IF EXISTS "Enable insert for owner of challenger result" ON public.desafios;
DROP POLICY IF EXISTS "Enable insert for anonymous users" ON public.desafios;
CREATE POLICY "Enable insert for anonymous users"
ON public.desafios FOR INSERT
TO anon
WITH CHECK (true);

-- desafios: completar o desafio (sem WITH CHECK, como no original)
DROP POLICY IF EXISTS "Enable update for everyone" ON public.desafios;
DROP POLICY IF EXISTS "Enable update for anonymous users" ON public.desafios;
CREATE POLICY "Enable update for anonymous users"
ON public.desafios FOR UPDATE
TO anon
USING (challenged_result_id IS NULL);


-- -----------------------------------------------------------------------------
-- 3. Restaurar `update_profile_xp` ao corpo de 20260807000002
--    (sem a flag `app.allow_stat_update`, sem `SET search_path`).
--    Feito ANTES de restaurar o trigger de proteção, para não deixar uma janela
--    em que a flag é setada e ninguém a lê.
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.update_profile_xp()
RETURNS trigger AS $$
DECLARE
  current_xp integer;
  new_nivel integer;
BEGIN
  IF NEW.user_id IS NOT NULL AND NEW.xp_earned > 0 THEN
    UPDATE public.profiles
    SET xp_total = xp_total + NEW.xp_earned
    WHERE id = NEW.user_id
    RETURNING xp_total INTO current_xp;

    new_nivel := floor(current_xp / 100) + 1;

    UPDATE public.profiles
    SET nivel = new_nivel
    WHERE id = NEW.user_id AND nivel != new_nivel;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- -----------------------------------------------------------------------------
-- 4. Restaurar `protect_profile_stats` ao corpo de 20260807000001.
--    O trigger `on_profile_update` continua ligado a esta função — CREATE OR
--    REPLACE preserva a ligação, não é preciso recriar o trigger.
--
--    NOTA: a versão original NÃO congelava `id` nem `created_at`; a 000010
--    tinha acrescentado isso. Este rollback é fiel ao original, então esses
--    dois campos voltam a poder ser alterados por UPDATE.
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.protect_profile_stats()
RETURNS trigger AS $$
BEGIN
  NEW.xp_total = OLD.xp_total;
  NEW.nivel = OLD.nivel;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMIT;
