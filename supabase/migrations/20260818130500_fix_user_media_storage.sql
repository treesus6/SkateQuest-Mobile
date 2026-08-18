-- Fix production media storage used by the native app and PWA.
-- Generic feed uploads use skatetv-clips with paths folder/user_id/file.
-- Spot photos use spot-photos with the same ownership path convention.

update storage.buckets
set allowed_mime_types = array[
  'video/mp4',
  'video/quicktime',
  'video/mov',
  'video/webm',
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif'
]
where id = 'skatetv-clips';

drop policy if exists "spot_photos_upload" on storage.objects;
create policy "spot_photos_upload"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'spot-photos'
  and (storage.foldername(name))[2] = auth.uid()::text
);

drop policy if exists "spot_photos_view" on storage.objects;
create policy "spot_photos_view"
on storage.objects
for select
to public
using (bucket_id = 'spot-photos');

drop policy if exists "spot_photos_delete_own" on storage.objects;
create policy "spot_photos_delete_own"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'spot-photos'
  and (storage.foldername(name))[2] = auth.uid()::text
);
