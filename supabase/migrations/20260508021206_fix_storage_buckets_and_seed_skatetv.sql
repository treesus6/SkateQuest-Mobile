-- Configure production storage buckets. Do not seed fake/demo SkateTV content.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('quest-proofs', 'quest-proofs', true, 104857600, ARRAY['image/jpeg','image/jpg','image/png','image/webp','video/mp4','video/quicktime','video/mov']),
  ('skatetv-clips', 'skatetv-clips', true, 524288000, ARRAY['video/mp4','video/quicktime','video/mov','image/jpeg','image/png']),
  ('user-avatars', 'user-avatars', true, 5242880, ARRAY['image/jpeg','image/png','image/webp']),
  ('spot-photos', 'spot-photos', true, 52428800, ARRAY['image/jpeg','image/png','image/webp'])
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'quest_proofs_upload' AND tablename = 'objects') THEN
    CREATE POLICY "quest_proofs_upload" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'quest-proofs');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'quest_proofs_view' AND tablename = 'objects') THEN
    CREATE POLICY "quest_proofs_view" ON storage.objects FOR SELECT TO public USING (bucket_id = 'quest-proofs');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'skatetv_upload' AND tablename = 'objects') THEN
    CREATE POLICY "skatetv_upload" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'skatetv-clips');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'skatetv_view' AND tablename = 'objects') THEN
    CREATE POLICY "skatetv_view" ON storage.objects FOR SELECT TO public USING (bucket_id = 'skatetv-clips');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'skatetv_delete_own' AND tablename = 'objects') THEN
    CREATE POLICY "skatetv_delete_own" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'skatetv-clips' AND auth.uid()::text = (storage.foldername(name))[1]);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'avatars_upload' AND tablename = 'objects') THEN
    CREATE POLICY "avatars_upload" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'user-avatars');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'avatars_view' AND tablename = 'objects') THEN
    CREATE POLICY "avatars_view" ON storage.objects FOR SELECT TO public USING (bucket_id = 'user-avatars');
  END IF;
END $$;
