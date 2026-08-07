-- 1. Add audio_path to resultados table
ALTER TABLE public.resultados
ADD COLUMN audio_path text;

-- 2. Create the audio_records bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'audio_records',
  'audio_records',
  true, -- Public bucket for easy playback
  5242880, -- 5MB limit
  ARRAY['audio/mpeg', 'audio/ogg', 'audio/wav', 'audio/webm', 'video/mp4', 'video/webm']
) ON CONFLICT (id) DO UPDATE SET 
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- 3. Set RLS Policies for the bucket objects
-- Allow public access for reading audio files
CREATE POLICY "Public Read Access for Audio"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'audio_records');

-- Allow authenticated users to upload their own audio
CREATE POLICY "Authenticated Users can upload audio"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'audio_records' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow authenticated users to delete their own audio
CREATE POLICY "Authenticated Users can delete audio"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'audio_records' AND
  (storage.foldername(name))[1] = auth.uid()::text
);
