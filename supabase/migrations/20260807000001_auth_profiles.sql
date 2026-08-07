-- Create Profiles Table
CREATE TABLE public.profiles (
  id uuid REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  apelido text,
  avatar_url text,
  xp_total integer DEFAULT 0 NOT NULL,
  nivel integer DEFAULT 1 NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Alter Resultados to support Authenticated Users
ALTER TABLE public.resultados ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- Enable RLS on Profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles Policies
CREATE POLICY "Public profiles are viewable by everyone" 
ON public.profiles FOR SELECT 
TO public 
USING (true);

CREATE POLICY "Users can update their own profile" 
ON public.profiles FOR UPDATE 
TO authenticated 
USING (auth.uid() = id) 
WITH CHECK (auth.uid() = id);

-- Update Resultados Policies
-- Allow authenticated users to insert their own results, keeping anon insert
DROP POLICY IF EXISTS "Enable insert for anonymous users" ON public.resultados;
CREATE POLICY "Enable insert for everyone" 
ON public.resultados FOR INSERT 
TO public
WITH CHECK (user_id IS NULL OR user_id = auth.uid());

-- (Read access for everyone is already enabled via "Enable read access for all users")

-- Function to handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, apelido, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', 'Arrotador ' || substr(NEW.id::text, 1, 6)),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger on auth.users
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Function to prevent cheating on profile XP/Level updates
CREATE OR REPLACE FUNCTION public.protect_profile_stats() 
RETURNS trigger AS $$
BEGIN
  NEW.xp_total = OLD.xp_total;
  NEW.nivel = OLD.nivel;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to protect profile stats
CREATE TRIGGER on_profile_update
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE PROCEDURE public.protect_profile_stats();

