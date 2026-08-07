-- =============================================================================
-- ROLLBACK MANUAL de 20260807000015_global_ranking_authenticated_only.sql
--
-- NÃO É MIGRAÇÃO. Ver supabase/rollback/README.md.
-- Rodar como owner (postgres). Segundo da ordem inversa.
--
-- Restaura a view `global_ranking` exatamente como a deixou a migração
-- 20260807000014_report_system.sql (agrupando por
-- COALESCE(user_id::text, player_name), SEM security_invoker).
--
-- AVISO DUPLO: isto reabre os DOIS problemas de uma vez.
--   * R1  — anônimos voltam a poder ocupar o top 50 com player_name inventado.
--   * M4  — a view volta a executar com privilégios do owner, contornando a
--           RLS de `resultados` e `profiles` (advisor "Security Definer View").
--
-- View não guarda dado, então nada é perdido aqui. As linhas de `resultados`
-- não são tocadas.
-- =============================================================================

BEGIN;

DROP VIEW IF EXISTS public.global_ranking;

CREATE OR REPLACE VIEW public.global_ranking AS
SELECT * FROM (
    SELECT DISTINCT ON (COALESCE(user_id::text, player_name))
        COALESCE(user_id::text, player_name) as identifier,
        user_id,
        player_name,
        score,
        id as result_id,
        created_at
    FROM public.resultados
    WHERE is_artificial = false
      AND is_hidden = false
    ORDER BY
        COALESCE(user_id::text, player_name),
        score DESC,
        created_at ASC
) as best_scores
ORDER BY score DESC
LIMIT 50;

GRANT SELECT ON public.global_ranking TO anon;
GRANT SELECT ON public.global_ranking TO authenticated;

-- Os `GRANT SELECT` que a 000015 fez em `public.resultados` e `public.profiles`
-- NÃO são revogados de propósito: eles já eram concedidos pelos default
-- privileges do Supabase antes da migração. Revogá-los aqui quebraria o feed da
-- comunidade e a leitura de perfis — seria ir além do rollback.

COMMIT;

-- Lembrete de cliente: `src/shared/hooks/useGlobalRanking.ts` passa a receber
-- linhas com `user_id` nulo de novo. O tipo `RankingEntry.user_id` está
-- declarado como `string` (não nulo) desde a 000015; se este rollback for
-- permanente, volte o tipo para `string | null`.
