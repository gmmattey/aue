-- 1. Add is_founder column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN is_founder boolean DEFAULT false NOT NULL;

-- 2. Update new user trigger to automatically grant founder status
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, apelido, avatar_url, is_founder)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', 'Arrotador ' || substr(NEW.id::text, 1, 6)),
    NEW.raw_user_meta_data->>'avatar_url',
    true -- Automagicamente atribui status de fundador no lançamento
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Update security trigger to protect is_founder from malicious updates
CREATE OR REPLACE FUNCTION public.protect_profile_stats() 
RETURNS trigger AS $$
BEGIN
  -- Reverts any attempt by the user to change their protected stats
  NEW.xp_total = OLD.xp_total;
  NEW.nivel = OLD.nivel;
  NEW.is_founder = OLD.is_founder; -- Protege a tag de fundador
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
