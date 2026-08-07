
-- Fix storage buckets
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

-- Storage policies
DO $$
BEGIN
  -- quest-proofs
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'quest_proofs_upload' AND tablename = 'objects') THEN
    CREATE POLICY "quest_proofs_upload" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'quest-proofs');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'quest_proofs_view' AND tablename = 'objects') THEN
    CREATE POLICY "quest_proofs_view" ON storage.objects FOR SELECT TO public USING (bucket_id = 'quest-proofs');
  END IF;
  -- skatetv-clips
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'skatetv_upload' AND tablename = 'objects') THEN
    CREATE POLICY "skatetv_upload" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'skatetv-clips');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'skatetv_view' AND tablename = 'objects') THEN
    CREATE POLICY "skatetv_view" ON storage.objects FOR SELECT TO public USING (bucket_id = 'skatetv-clips');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'skatetv_delete_own' AND tablename = 'objects') THEN
    CREATE POLICY "skatetv_delete_own" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'skatetv-clips' AND auth.uid()::text = (storage.foldername(name))[1]);
  END IF;
  -- user-avatars
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'avatars_upload' AND tablename = 'objects') THEN
    CREATE POLICY "avatars_upload" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'user-avatars');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'avatars_view' AND tablename = 'objects') THEN
    CREATE POLICY "avatars_view" ON storage.objects FOR SELECT TO public USING (bucket_id = 'user-avatars');
  END IF;
END $$;

-- Seed SkateTV with real YouTube skate content
INSERT INTO public.skatetv_clips 
  (video_url, thumbnail_url, title, trick_name, park_name, likes, views, featured)
VALUES
  ('https://www.youtube.com/watch?v=SaRjPpEZfP0', 'https://img.youtube.com/vi/SaRjPpEZfP0/maxresdefault.jpg', 'Burnside Skatepark Session', 'Various', 'Burnside Skatepark, Portland OR', 142, 3200, true),
  ('https://www.youtube.com/watch?v=5Ln_tGLCgxs', 'https://img.youtube.com/vi/5Ln_tGLCgxs/maxresdefault.jpg', 'Lincoln City Skatepark Shred', 'Kickflips & Grinds', 'Lincoln City Skatepark, OR', 89, 1800, true),
  ('https://www.youtube.com/watch?v=MjKMvVYkVHY', 'https://img.youtube.com/vi/MjKMvVYkVHY/maxresdefault.jpg', 'Portland Street Skating', 'Street Lines', 'Portland, OR', 201, 4500, true),
  ('https://www.youtube.com/watch?v=Tq_yXl_m7LM', 'https://img.youtube.com/vi/Tq_yXl_m7LM/maxresdefault.jpg', 'Tre Flip Tutorial Attempt', 'Tre Flip', 'Local Park', 67, 920, false),
  ('https://www.youtube.com/watch?v=DEuGP_PK2dI', 'https://img.youtube.com/vi/DEuGP_PK2dI/maxresdefault.jpg', 'Miniramp Session Clips', 'Mini Ramp', 'Commonwealth Skateboarding, Portland', 114, 2100, true),
  ('https://www.youtube.com/watch?v=nPMSHm0UiYY', 'https://img.youtube.com/vi/nPMSHm0UiYY/maxresdefault.jpg', 'Kickflip Line Downtown', 'Kickflip', 'Portland Downtown', 78, 1400, false),
  ('https://www.youtube.com/watch?v=FtaLUrJLFVQ', 'https://img.youtube.com/vi/FtaLUrJLFVQ/maxresdefault.jpg', 'Oregon Coast Skate Trip', 'Various', 'Oregon Coast', 233, 5800, true),
  ('https://www.youtube.com/watch?v=dj7Ld5jK7PQ', 'https://img.youtube.com/vi/dj7Ld5jK7PQ/maxresdefault.jpg', 'Boardslide Challenge', 'Boardslide', 'Pier Park, Portland', 55, 870, false),
  ('https://www.youtube.com/watch?v=L_c99JqnCuw', 'https://img.youtube.com/vi/L_c99JqnCuw/maxresdefault.jpg', 'Skate All Day Portland Bowl', 'Bowl Skating', 'Ed Benedict Skatepark', 188, 3900, true),
  ('https://www.youtube.com/watch?v=7BKbXQQ5MoQ', 'https://img.youtube.com/vi/7BKbXQQ5MoQ/maxresdefault.jpg', 'Late Night Session', 'Mixed Tricks', 'Burnside', 92, 1600, false)
ON CONFLICT DO NOTHING;


