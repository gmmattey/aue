-- Migration to create the Global Ranking View
-- This view aggregates the highest score per user/player and sorts them globally.

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
    ORDER BY 
        COALESCE(user_id::text, player_name), 
        score DESC, 
        created_at ASC
) as best_scores
ORDER BY score DESC
LIMIT 50;

-- Grant access to anonymous and authenticated users
GRANT SELECT ON public.global_ranking TO anon;
GRANT SELECT ON public.global_ranking TO authenticated;
