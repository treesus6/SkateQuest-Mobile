-- SkateTV engagement is server verified. Clients can read their own like/view
-- rows and create their own real clip, but they cannot manufacture engagement.

alter table public.skatetv_clips
  alter column likes set default 0,
  alter column views set default 0;

update public.skatetv_clips set likes = 0 where likes is null;
update public.skatetv_clips set views = 0 where views is null;

alter table public.skatetv_clips alter column likes set not null;
alter table public.skatetv_clips alter column views set not null;

revoke insert, update, delete on public.skatetv_likes from authenticated, anon;
revoke insert, update, delete on public.skatetv_views from authenticated, anon;
grant select on public.skatetv_likes to authenticated;
grant select on public.skatetv_views to authenticated;

do $$
declare r record;
begin
  for r in
    select policyname
    from pg_policies
    where schemaname = 'public'
      and tablename in ('skatetv_likes','skatetv_views')
      and cmd in ('INSERT','UPDATE','DELETE')
  loop
    execute format('drop policy if exists %I on public.%I', r.policyname,
      case when exists(select 1 from pg_policies p where p.schemaname='public' and p.tablename='skatetv_likes' and p.policyname=r.policyname) then 'skatetv_likes' else 'skatetv_views' end);
  end loop;
end $$;

-- Replace clip insert policies so a signed-in skater can only publish a clip as
-- themselves. Counter values are forced to zero on creation.
do $$
declare r record;
begin
  for r in
    select policyname
    from pg_policies
    where schemaname = 'public'
      and tablename = 'skatetv_clips'
      and cmd = 'INSERT'
  loop
    execute format('drop policy if exists %I on public.skatetv_clips', r.policyname);
  end loop;
end $$;

revoke insert on public.skatetv_clips from anon;
grant insert on public.skatetv_clips to authenticated;

create policy "skatetv_clips_insert_own"
on public.skatetv_clips
for insert
to authenticated
with check (
  user_id = auth.uid()
  and likes = 0
  and views = 0
  and featured = false
  and video_url is not null
  and btrim(video_url) <> ''
);
