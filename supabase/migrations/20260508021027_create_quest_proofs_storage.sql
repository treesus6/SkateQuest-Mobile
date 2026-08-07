
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'quest-proofs',
  'quest-proofs',
  true,
  52428800,
  ARRAY['image/jpeg','image/png','image/webp','image/gif','video/mp4','video/quicktime']
) ON CONFLICT DO NOTHING;

CREATE POLICY "authenticated users can upload quest proofs"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'quest-proofs' AND auth.uid()::text = (storage.foldername(name))[2]);

CREATE POLICY "anyone can view quest proofs"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'quest-proofs');


