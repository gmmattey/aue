-- 1. Add is_hidden column to resultados
ALTER TABLE public.resultados 
ADD COLUMN is_hidden boolean DEFAULT false NOT NULL;

-- 2. Create the denuncias table
CREATE TABLE public.denuncias (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    result_id uuid REFERENCES public.resultados(id) ON DELETE CASCADE,
    reason text NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS for denuncias (Allow anyone to report in the MVP)
ALTER TABLE public.denuncias ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anyone to insert denunciation" 
ON public.denuncias FOR INSERT 
TO public 
WITH CHECK (true);

-- 3. Trigger Function to automatically hide result after 3 reports
CREATE OR REPLACE FUNCTION public.check_reports_and_hide()
RETURNS trigger AS $$
DECLARE
    report_count integer;
BEGIN
    -- Contar quantas denúncias este resultado possui
    SELECT COUNT(*) INTO report_count 
    FROM public.denuncias 
    WHERE result_id = NEW.result_id;
    
    -- Se bater o limite (3), esconda a gravação
    IF report_count >= 3 THEN
        UPDATE public.resultados 
        SET is_hidden = true 
        WHERE id = NEW.result_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_check_reports
AFTER INSERT ON public.denuncias
FOR EACH ROW EXECUTE PROCEDURE public.check_reports_and_hide();

-- 4. Update the Global Ranking View to filter out hidden results
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
      AND is_hidden = false -- <--- Nova regra de blindagem
    ORDER BY 
        COALESCE(user_id::text, player_name), 
        score DESC, 
        created_at ASC
) as best_scores
ORDER BY score DESC
LIMIT 50;

-- Ensure permissions remain applied to the updated view
GRANT SELECT ON public.global_ranking TO anon;
GRANT SELECT ON public.global_ranking TO authenticated;
