-- Add the activity feed table already used by the app and replace loose client-side
-- bounty updates with an owned-video RPC that awards XP atomically.

create table if not exists public.activity_feed (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  activity_type text not null,
  title text not null,
  description text,
  xp_earned integer not null default 0,
  media_id uuid references public.media(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.activity_feed enable row level security;

create index if not exists idx_activity_feed_created_at
  on public.activity_feed(created_at desc);
create index if not exists idx_activity_feed_user_id
  on public.activity_feed(user_id);

-- Recreate deterministic policies in case a partial/manual table exists somewhere.
drop policy if exists "activity_feed_view" on public.activity_feed;
create policy "activity_feed_view"
on public.activity_feed
for select
to authenticated
using (true);

drop policy if exists "activity_feed_insert_own" on public.activity_feed;
create policy "activity_feed_insert_own"
on public.activity_feed
for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists "activity_feed_delete_own" on public.activity_feed;
create policy "activity_feed_delete_own"
on public.activity_feed
for delete
to authenticated
using (user_id = auth.uid());

-- Remove the direct client update path. Claims now go through claim_bounty so the
-- uploaded proof is verified to belong to the caller and XP is awarded once.
drop policy if exists "users_claim_bounties" on public.bounties;

create or replace function public.claim_bounty(
  p_bounty_id uuid,
  p_media_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_video_url text;
  v_media_type text;
  v_reward integer;
  v_trick_name text;
  v_status text;
  v_claimed_by uuid;
  v_expires_at timestamptz;
begin
  if v_user_id is null then
    raise exception 'not authorized';
  end if;

  select m.url, m.type
    into v_video_url, v_media_type
  from public.media m
  where m.id = p_media_id
    and m.user_id = v_user_id;

  if not found or v_video_url is null then
    raise exception 'owned media proof not found';
  end if;

  if v_media_type is distinct from 'video' then
    raise exception 'bounty proof must be a video';
  end if;

  select b.xp_reward, b.trick_name, b.status, b.claimed_by, b.expires_at
    into v_reward, v_trick_name, v_status, v_claimed_by, v_expires_at
  from public.bounties b
  where b.id = p_bounty_id
  for update;

  if not found then
    raise exception 'bounty not found';
  end if;

  if v_status <> 'open' or v_claimed_by is not null then
    raise exception 'bounty is no longer open';
  end if;

  if v_expires_at is not null and v_expires_at <= now() then
    update public.bounties
    set status = 'expired'
    where id = p_bounty_id;
    raise exception 'bounty has expired';
  end if;

  update public.bounties
  set claimed_by = v_user_id,
      claim_video_url = v_video_url,
      status = 'claimed'
  where id = p_bounty_id;

  perform public.increment_user_xp(v_user_id, coalesce(v_reward, 0));

  insert into public.activity_feed (
    user_id,
    activity_type,
    title,
    description,
    xp_earned,
    media_id
  )
  values (
    v_user_id,
    'bounty_claimed',
    'Claimed bounty: ' || coalesce(v_trick_name, 'skate challenge'),
    'Video proof submitted and bounty claimed.',
    coalesce(v_reward, 0),
    p_media_id
  );

  return jsonb_build_object(
    'success', true,
    'xp_reward', coalesce(v_reward, 0),
    'bounty_id', p_bounty_id
  );
end;
$$;

revoke all on function public.claim_bounty(uuid, uuid) from public;
revoke all on function public.claim_bounty(uuid, uuid) from anon;
grant execute on function public.claim_bounty(uuid, uuid) to authenticated;
