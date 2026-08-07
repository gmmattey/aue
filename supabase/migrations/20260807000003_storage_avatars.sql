-- Set up Storage for Avatars
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 2097152, ARRAY['image/png', 'image/jpeg', 'image/webp']);

-- Enable RLS for the avatars bucket
create policy "Avatar images are publicly accessible."
  on storage.objects for select
  using ( bucket_id = 'avatars' );

create policy "Anyone can upload an avatar."
  on storage.objects for insert
  with check ( 
    bucket_id = 'avatars' 
    and auth.role() = 'authenticated'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Anyone can update their own avatar."
  on storage.objects for update
  with check ( 
    bucket_id = 'avatars' 
    and auth.role() = 'authenticated'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Function to prevent changing sensitive profile fields via UPDATE
-- (In a previous migration, we already created protect_profile_stats() for xp and nivel.
-- Let's ensure id and created_at also remain intact if they try).
CREATE OR REPLACE FUNCTION public.protect_profile_stats() 
RETURNS trigger AS $$
BEGIN
  -- Revert any attempts to change sensitive fields
  NEW.id = OLD.id;
  NEW.xp_total = OLD.xp_total;
  NEW.nivel = OLD.nivel;
  NEW.created_at = OLD.created_at;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
