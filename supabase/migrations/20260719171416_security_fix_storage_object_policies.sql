-- quest_proofs_upload was a duplicate INSERT policy with no ownership check,
-- which fully negated the correctly-scoped "authenticated users can upload quest proofs" policy
-- (Postgres RLS policies are OR'd together — the permissive one wins).
drop policy if exists "quest_proofs_upload" on storage.objects;
drop policy if exists "quest_proofs_view" on storage.objects; -- duplicate of "anyone can view quest proofs"

-- avatars_upload allowed uploading to ANY user's avatar path (impersonation/overwrite)
drop policy if exists "avatars_upload" on storage.objects;
create policy "avatars_upload" on storage.objects
  for insert
  to authenticated
  with check (bucket_id = 'user-avatars' and (storage.foldername(name))[2] = auth.uid()::text);

-- skatetv_upload allowed uploading under any other user's folder
drop policy if exists "skatetv_upload" on storage.objects;
create policy "skatetv_upload" on storage.objects
  for insert
  to authenticated
  with check (bucket_id = 'skatetv-clips' and (storage.foldername(name))[2] = auth.uid()::text);

-- skatetv_delete_own checked foldername[1] ('clips', a literal constant) instead of
-- foldername[2] (the actual user id segment) -- this meant delete-own-clip could never
-- succeed for anyone, ever.
drop policy if exists "skatetv_delete_own" on storage.objects;
create policy "skatetv_delete_own" on storage.objects
  for delete
  to authenticated
  using (bucket_id = 'skatetv-clips' and (storage.foldername(name))[2] = auth.uid()::text);

