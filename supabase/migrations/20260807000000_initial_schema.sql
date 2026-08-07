-- Create Results Table
CREATE TABLE public.resultados (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  score numeric NOT NULL,
  classification text NOT NULL,
  is_artificial boolean DEFAULT false NOT NULL,
  duration numeric NOT NULL,
  power numeric NOT NULL,
  depth numeric NOT NULL,
  texture numeric NOT NULL,
  origin_score numeric NOT NULL,
  origin_type text NOT NULL,
  player_name text
);

-- Create Challenges Table
CREATE TABLE public.desafios (
  id varchar(6) PRIMARY KEY, -- ex: XYZ123
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  challenger_result_id uuid REFERENCES public.resultados(id) NOT NULL,
  challenged_result_id uuid REFERENCES public.resultados(id)
);

-- Enable RLS
ALTER TABLE public.resultados ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.desafios ENABLE ROW LEVEL SECURITY;

-- RLS Policies for Resultados (Anonymous MVP)
-- Allow anyone to INSERT a result
CREATE POLICY "Enable insert for anonymous users" 
ON public.resultados FOR INSERT 
TO anon 
WITH CHECK (true);

-- Allow anyone to SELECT a result (needed for challenges)
CREATE POLICY "Enable read access for all users" 
ON public.resultados FOR SELECT 
TO anon 
USING (true);

-- RLS Policies for Desafios (Anonymous MVP)
-- Allow anyone to INSERT a challenge
CREATE POLICY "Enable insert for anonymous users" 
ON public.desafios FOR INSERT 
TO anon 
WITH CHECK (true);

-- Allow anyone to SELECT a challenge
CREATE POLICY "Enable read access for all users" 
ON public.desafios FOR SELECT 
TO anon 
USING (true);

-- Allow anyone to UPDATE a challenge (to set challenged_result_id)
CREATE POLICY "Enable update for anonymous users" 
ON public.desafios FOR UPDATE 
TO anon 
USING (challenged_result_id IS NULL);
