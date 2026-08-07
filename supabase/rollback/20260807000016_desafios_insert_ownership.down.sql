-- =============================================================================
-- ROLLBACK MANUAL de 20260807000016_desafios_insert_ownership.sql
--
-- NÃO É MIGRAÇÃO. Ver supabase/rollback/README.md.
-- Rodar como owner (postgres). Primeiro da ordem inversa.
--
-- AVISO: isto REABRE o R3. Depois de rodar, qualquer pessoa volta a poder
-- criar um desafio apontando para o resultado de outra.
--
-- Não devolve dados: desafios criados sob a regra nova permanecem.
-- =============================================================================

BEGIN;

-- 1. Voltar a policy de INSERT ao estado deixado por 20260807000010.
DROP POLICY IF EXISTS "Enable insert for owner of challenger result" ON public.desafios;
DROP POLICY IF EXISTS "Enable insert for everyone" ON public.desafios;

CREATE POLICY "Enable insert for everyone"
ON public.desafios FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- 2. Remover o predicado de posse.
--    Feito DEPOIS da policy: enquanto a policy referenciar a função, o
--    DROP FUNCTION falha por dependência.
DROP FUNCTION IF EXISTS public.can_use_as_challenger(uuid);

COMMIT;
