begin;

drop policy if exists "Users can upload media" on public.media;
create policy "Users can upload own media with zero engagement"
on public.media for insert to authenticated
with check (
  user_id = (select auth.uid())
  and coalesce(likes_count,0)=0
  and url is not null
  and btrim(url)<>''
);

commit;
