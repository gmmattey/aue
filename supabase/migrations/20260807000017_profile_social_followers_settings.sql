-- =============================================================================
-- Profile extension, Social Links, Followers & User Notification Settings
-- =============================================================================

-- 1. Extend profiles table with social handles, bio, custom title, premium status & notification settings
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS bio text,
  ADD COLUMN IF NOT EXISTS titulo text DEFAULT 'Iniciante do Gás',
  ADD COLUMN IF NOT EXISTS instagram_handle text,
  ADD COLUMN IF NOT EXISTS tiktok_handle text,
  ADD COLUMN IF NOT EXISTS youtube_handle text,
  ADD COLUMN IF NOT EXISTS twitter_handle text,
  ADD COLUMN IF NOT EXISTS is_premium boolean DEFAULT false NOT NULL,
  ADD COLUMN IF NOT EXISTS notify_challenges boolean DEFAULT true NOT NULL,
  ADD COLUMN IF NOT EXISTS notify_ranking boolean DEFAULT true NOT NULL,
  ADD COLUMN IF NOT EXISTS notify_community boolean DEFAULT true NOT NULL;

-- 2. Create seguidores table
CREATE TABLE IF NOT EXISTS public.seguidores (
  follower_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  following_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  PRIMARY KEY (follower_id, following_id),
  CONSTRAINT no_self_follow CHECK (follower_id <> following_id)
);

-- Enable RLS on seguidores
ALTER TABLE public.seguidores ENABLE ROW LEVEL SECURITY;

-- Followers Policies
CREATE POLICY "Followers relationship is viewable by everyone"
ON public.seguidores FOR SELECT
TO public
USING (true);

CREATE POLICY "Authenticated users can follow others"
ON public.seguidores FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = follower_id);

CREATE POLICY "Authenticated users can unfollow others"
ON public.seguidores FOR DELETE
TO authenticated
USING (auth.uid() = follower_id);

-- Grants
GRANT SELECT, INSERT, DELETE ON public.seguidores TO authenticated;
GRANT SELECT ON public.seguidores TO anon;

-- 3. Helper RPC to toggle follow state
CREATE OR REPLACE FUNCTION public.toggle_follow(target_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_caller_id uuid := auth.uid();
  v_is_following boolean;
BEGIN
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Usuário precisa estar autenticado' USING ERRCODE = '28000';
  END IF;

  IF v_caller_id = target_user_id THEN
    RAISE EXCEPTION 'Não é possível seguir a si mesmo' USING ERRCODE = '22023';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.seguidores
    WHERE follower_id = v_caller_id AND following_id = target_user_id
  ) INTO v_is_following;

  IF v_is_following THEN
    DELETE FROM public.seguidores
    WHERE follower_id = v_caller_id AND following_id = target_user_id;
    RETURN false;
  ELSE
    INSERT INTO public.seguidores (follower_id, following_id)
    VALUES (v_caller_id, target_user_id);
    RETURN true;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.toggle_follow(uuid) TO authenticated;
