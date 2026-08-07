-- Community Tables: Comments and Reactions

-- Create Comments Table
CREATE TABLE public.comentarios (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  result_id uuid REFERENCES public.resultados(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  content text NOT NULL CHECK (char_length(content) > 0 AND char_length(content) <= 500),
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create Reactions Table (Likes/Dislikes)
CREATE TABLE public.reacoes (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  result_id uuid REFERENCES public.resultados(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  reaction_type text NOT NULL CHECK (reaction_type IN ('like', 'dislike')),
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(result_id, user_id) -- A user can only have one reaction per result
);

-- Enable RLS
ALTER TABLE public.comentarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reacoes ENABLE ROW LEVEL SECURITY;

-- RLS Policies for Comentarios
CREATE POLICY "Comments are viewable by everyone" 
ON public.comentarios FOR SELECT TO public USING (true);

CREATE POLICY "Authenticated users can insert comments" 
ON public.comentarios FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own comments" 
ON public.comentarios FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- RLS Policies for Reacoes
CREATE POLICY "Reactions are viewable by everyone" 
ON public.reacoes FOR SELECT TO public USING (true);

CREATE POLICY "Authenticated users can insert reactions" 
ON public.reacoes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own reactions" 
ON public.reacoes FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own reactions" 
ON public.reacoes FOR DELETE TO authenticated USING (auth.uid() = user_id);
