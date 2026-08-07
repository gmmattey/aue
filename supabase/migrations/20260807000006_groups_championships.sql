-- Groups and Championships Tables

-- Create Groups Table
CREATE TABLE public.grupos (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  nome varchar(50) NOT NULL UNIQUE,
  descricao text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create Group Members Table
CREATE TABLE public.membros_grupo (
  group_id uuid REFERENCES public.grupos(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  role text DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  joined_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  PRIMARY KEY (group_id, user_id)
);

-- Create Championships Table
CREATE TABLE public.campeonatos (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id uuid REFERENCES public.grupos(id) ON DELETE CASCADE,
  nome varchar(100) NOT NULL,
  start_date timestamp with time zone NOT NULL,
  end_date timestamp with time zone NOT NULL,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  CONSTRAINT end_after_start CHECK (end_date > start_date)
);

-- Create Championship Participants Table
CREATE TABLE public.participantes_campeonato (
  championship_id uuid REFERENCES public.campeonatos(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  joined_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  PRIMARY KEY (championship_id, user_id)
);

-- Enable RLS
ALTER TABLE public.grupos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.membros_grupo ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campeonatos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.participantes_campeonato ENABLE ROW LEVEL SECURITY;

-- RLS for Grupos
CREATE POLICY "Groups are viewable by everyone" ON public.grupos FOR SELECT TO public USING (true);
CREATE POLICY "Authenticated users can create groups" ON public.grupos FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Group creators can update their groups" ON public.grupos FOR UPDATE TO authenticated USING (auth.uid() = created_by);

-- RLS for Membros_Grupo
CREATE POLICY "Group members are viewable by everyone" ON public.membros_grupo FOR SELECT TO public USING (true);
-- To join, a user just inserts a record for themselves
CREATE POLICY "Authenticated users can join groups" ON public.membros_grupo FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can leave groups" ON public.membros_grupo FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- RLS for Campeonatos
CREATE POLICY "Championships are viewable by everyone" ON public.campeonatos FOR SELECT TO public USING (true);
-- Only group admins/creators can create championships. For simplicity here: anyone authenticated can create, 
-- but ideally should check if the user is 'admin' in membros_grupo.
CREATE POLICY "Authenticated users can create championships" ON public.campeonatos FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);

-- RLS for Participantes Campeonato
CREATE POLICY "Championship participants viewable by everyone" ON public.participantes_campeonato FOR SELECT TO public USING (true);
CREATE POLICY "Authenticated users can join championships" ON public.participantes_campeonato FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can leave championships" ON public.participantes_campeonato FOR DELETE TO authenticated USING (auth.uid() = user_id);
