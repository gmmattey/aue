-- Function to get the leaderboard for a specific championship
CREATE OR REPLACE FUNCTION public.get_championship_leaderboard(champ_id uuid)
RETURNS TABLE (
  user_id uuid,
  apelido text,
  avatar_url text,
  highest_score numeric,
  result_id uuid
) AS $$
BEGIN
  RETURN QUERY
  WITH RankedResults AS (
    SELECT 
      r.user_id,
      p.apelido,
      p.avatar_url,
      r.score,
      r.id as result_id,
      ROW_NUMBER() OVER(PARTITION BY r.user_id ORDER BY r.score DESC) as rn
    FROM public.resultados r
    JOIN public.profiles p ON p.id = r.user_id
    JOIN public.campeonatos c ON c.id = champ_id
    JOIN public.participantes_campeonato pc ON pc.championship_id = c.id AND pc.user_id = r.user_id
    WHERE r.created_at >= c.start_date 
      AND r.created_at <= c.end_date
  )
  SELECT 
    rr.user_id,
    rr.apelido,
    rr.avatar_url,
    rr.score as highest_score,
    rr.result_id
  FROM RankedResults rr
  WHERE rr.rn = 1
  ORDER BY rr.score DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
