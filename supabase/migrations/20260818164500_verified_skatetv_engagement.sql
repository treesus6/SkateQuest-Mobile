-- SkateTV engagement counters must be derived from real user actions, not
-- client-written numbers.

-- Remove duplicate legacy likes before enforcing one like per skater/clip.
delete from public.skatetv_likes a
using public.skatetv_likes b
where a.ctid < b.ctid
  and a.user_id = b.user_id
  and a.clip_id = b.clip_id;

create unique index if not exists idx_skatetv_likes_user_clip
  on public.skatetv_likes(user_id, clip_id);

create table if not exists public.skatetv_views (
  id uuid primary key default gen_random_uuid(),
  clip_id uuid not null references public.skatetv_clips(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  viewed_on date not null default current_date,
  created_at timestamptz not null default now(),
  unique (clip_id, user_id, viewed_on)
);

alter table public.skatetv_views enable row level security;
drop policy if exists "skatetv_views_read_own" on public.skatetv_views;
create policy "skatetv_views_read_own"
on public.skatetv_views for select to authenticated
using (user_id = auth.uid());

create or replace function public.protect_skatetv_counters()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if auth.uid() is not null
     and coalesce(current_setting('skatequest.trusted_counter_update', true), '') <> '1' then
    new.likes := old.likes;
    new.views := old.views;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_protect_skatetv_counters on public.skatetv_clips;
create trigger trg_protect_skatetv_counters
before update on public.skatetv_clips
for each row execute function public.protect_skatetv_counters();

create or replace function public.toggle_skatetv_like(p_clip_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_liked boolean;
  v_likes integer;
begin
  if v_user_id is null then raise exception 'authentication required'; end if;
  if not exists (select 1 from public.skatetv_clips where id = p_clip_id) then
    raise exception 'clip not found';
  end if;

  if exists (
    select 1 from public.skatetv_likes
    where user_id = v_user_id and clip_id = p_clip_id
  ) then
    delete from public.skatetv_likes
    where user_id = v_user_id and clip_id = p_clip_id;
    v_liked := false;
  else
    insert into public.skatetv_likes(user_id, clip_id)
    values(v_user_id, p_clip_id)
    on conflict(user_id, clip_id) do nothing;
    v_liked := true;
  end if;

  select count(*)::integer into v_likes
  from public.skatetv_likes
  where clip_id = p_clip_id;

  perform set_config('skatequest.trusted_counter_update', '1', true);
  update public.skatetv_clips set likes = v_likes where id = p_clip_id;
  perform set_config('skatequest.trusted_counter_update', '0', true);

  return jsonb_build_object('liked', v_liked, 'likes', v_likes);
end;
$$;

create or replace function public.record_skatetv_view(p_clip_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_views integer;
begin
  if v_user_id is null then raise exception 'authentication required'; end if;
  if not exists (select 1 from public.skatetv_clips where id = p_clip_id) then
    raise exception 'clip not found';
  end if;

  insert into public.skatetv_views(clip_id, user_id, viewed_on)
  values(p_clip_id, v_user_id, current_date)
  on conflict(clip_id, user_id, viewed_on) do nothing;

  select count(*)::integer into v_views
  from public.skatetv_views
  where clip_id = p_clip_id;

  perform set_config('skatequest.trusted_counter_update', '1', true);
  update public.skatetv_clips set views = v_views where id = p_clip_id;
  perform set_config('skatequest.trusted_counter_update', '0', true);

  return jsonb_build_object('views', v_views);
end;
$$;

-- Reconcile display counters to the verified backing rows.
perform set_config('skatequest.trusted_counter_update', '1', true);
update public.skatetv_clips c
set likes = (select count(*) from public.skatetv_likes l where l.clip_id = c.id),
    views = 0;
perform set_config('skatequest.trusted_counter_update', '0', true);

revoke all on function public.toggle_skatetv_like(uuid) from public, anon;
revoke all on function public.record_skatetv_view(uuid) from public, anon;
grant execute on function public.toggle_skatetv_like(uuid) to authenticated;
grant execute on function public.record_skatetv_view(uuid) to authenticated;
