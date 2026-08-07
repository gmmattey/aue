-- Add XP columns to resultados
ALTER TABLE public.resultados 
ADD COLUMN xp_earned integer DEFAULT 0 NOT NULL,
ADD COLUMN is_xp_eligible boolean DEFAULT false NOT NULL;

-- Function to calculate and grant XP
CREATE OR REPLACE FUNCTION public.process_result_xp()
RETURNS trigger AS $$
DECLARE
  recent_count integer;
  gained_xp integer := 0;
  new_nivel integer := 1;
BEGIN
  -- Only process XP for authenticated users
  IF NEW.user_id IS NOT NULL THEN
    -- Count recordings in the last 24 hours
    SELECT count(*) INTO recent_count
    FROM public.resultados
    WHERE user_id = NEW.user_id 
      AND created_at >= NOW() - INTERVAL '24 hours';

    -- Anti-farming: only first 5 get XP
    IF recent_count < 5 THEN
      NEW.is_xp_eligible := true;
      
      -- Base XP
      gained_xp := 5;
      
      -- Score bonus
      IF NEW.score >= 95 THEN
        gained_xp := gained_xp + 40;
      ELSIF NEW.score >= 90 THEN
        gained_xp := gained_xp + 30;
      ELSIF NEW.score >= 70 THEN
        gained_xp := gained_xp + 20;
      ELSIF NEW.score >= 40 THEN
        gained_xp := gained_xp + 10;
      END IF;

      NEW.xp_earned := gained_xp;
    ELSE
      NEW.is_xp_eligible := false;
      NEW.xp_earned := 0;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_process_result_xp
  BEFORE INSERT ON public.resultados
  FOR EACH ROW EXECUTE PROCEDURE public.process_result_xp();

-- Function to update profile level AFTER result is inserted
CREATE OR REPLACE FUNCTION public.update_profile_xp()
RETURNS trigger AS $$
DECLARE
  current_xp integer;
  new_nivel integer;
BEGIN
  IF NEW.user_id IS NOT NULL AND NEW.xp_earned > 0 THEN
    -- Get updated XP
    UPDATE public.profiles
    SET xp_total = xp_total + NEW.xp_earned
    WHERE id = NEW.user_id
    RETURNING xp_total INTO current_xp;

    -- Calculate Nivel (1 level per 100 XP for simplicity)
    new_nivel := floor(current_xp / 100) + 1;

    -- Update Nivel if changed
    UPDATE public.profiles
    SET nivel = new_nivel
    WHERE id = NEW.user_id AND nivel != new_nivel;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_update_profile_xp
  AFTER INSERT ON public.resultados
  FOR EACH ROW EXECUTE PROCEDURE public.update_profile_xp();
