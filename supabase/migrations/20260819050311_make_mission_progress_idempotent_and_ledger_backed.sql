begin;

create table if not exists public.mission_progress_events (
  id uuid primary key default gen_random_uuid(),
  user_mission_id uuid not null references public.user_missions(id) on delete cascade,
  event_key text not null,
  created_at timestamptz not null default now(),
  unique (user_mission_id, event_key)
);
alter table public.mission_progress_events enable row level security;
drop policy if exists "Users can view own mission progress events" on public.mission_progress_events;
create policy "Users can view own mission progress events"
on public.mission_progress_events for select to authenticated
using (
  exists (
    select 1 from public.user_missions um
    where um.id = user_mission_id and um.user_id = (select auth.uid())
  )
);
revoke all on public.mission_progress_events from anon, authenticated;
grant select on public.mission_progress_events to authenticated;

create or replace function private.apply_mission_increment(
  p_user_mission_id uuid,
  p_user_id uuid,
  p_increment integer
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_current integer;
  v_target integer;
  v_reward integer;
  v_next integer;
  v_remaining integer;
  v_chunk integer;
  v_chunk_index integer := 1;
  v_inserted boolean;
begin
  if p_increment <= 0 then return; end if;

  select um.progress_current, um.progress_target, greatest(0, coalesce(c.xp_reward,0))
    into v_current, v_target, v_reward
  from public.user_missions um
  join public.challenges c on c.id = um.challenge_id
  where um.id = p_user_mission_id
    and um.user_id = p_user_id
    and um.status = 'active'
  for update of um;

  if not found then return; end if;

  v_next := least(v_target, v_current + p_increment);

  if v_next < v_target then
    update public.user_missions
    set progress_current = v_next
    where id = p_user_mission_id and status = 'active';
    return;
  end if;

  update public.user_missions
  set progress_current = v_target,
      status = 'completed',
      completed_at = coalesce(completed_at, now())
  where id = p_user_mission_id and status = 'active';

  if not found or v_reward <= 0 then return; end if;

  v_remaining := v_reward;
  while v_remaining > 0 loop
    v_chunk := least(500, v_remaining);
    insert into public.xp_reward_ledger(user_id, reward_key, source, xp_amount)
    values (
      p_user_id,
      'mission:' || p_user_mission_id::text || ':' || v_chunk_index::text,
      'mission',
      v_chunk
    )
    on conflict (user_id, reward_key) do nothing;
    get diagnostics v_inserted = row_count;
    if v_inserted then
      perform public.increment_user_xp(p_user_id, v_chunk);
    end if;
    v_remaining := v_remaining - v_chunk;
    v_chunk_index := v_chunk_index + 1;
  end loop;
end;
$$;
revoke all on function private.apply_mission_increment(uuid,uuid,integer) from public, anon, authenticated;
grant execute on function private.apply_mission_increment(uuid,uuid,integer) to service_role;

create or replace function private.increment_mission_progress_once(
  p_user_id uuid,
  p_requirement_type text,
  p_event_key text,
  p_increment integer default 1
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  r record;
  v_inserted boolean;
begin
  if p_user_id is null or p_event_key is null or btrim(p_event_key) = '' or p_increment <= 0 then
    return;
  end if;

  for r in
    select um.id
    from public.user_missions um
    join public.challenges c on c.id = um.challenge_id
    where um.user_id = p_user_id
      and um.status = 'active'
      and c.requirement_type = p_requirement_type
      and (c.expires_at is null or c.expires_at > now())
  loop
    insert into public.mission_progress_events(user_mission_id, event_key)
    values (r.id, p_event_key)
    on conflict (user_mission_id, event_key) do nothing;
    get diagnostics v_inserted = row_count;
    if v_inserted then
      perform private.apply_mission_increment(r.id, p_user_id, p_increment);
    end if;
  end loop;
end;
$$;
revoke all on function private.increment_mission_progress_once(uuid,text,text,integer) from public, anon, authenticated;
grant execute on function private.increment_mission_progress_once(uuid,text,text,integer) to service_role;

create or replace function public.increment_mission_progress(
  p_user_id uuid,
  p_requirement_type text,
  p_increment integer default 1
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare r record;
begin
  if p_increment <= 0 then return; end if;
  for r in
    select um.id
    from public.user_missions um
    join public.challenges c on c.id = um.challenge_id
    where um.user_id = p_user_id
      and um.status = 'active'
      and c.requirement_type = p_requirement_type
      and (c.expires_at is null or c.expires_at > now())
  loop
    perform private.apply_mission_increment(r.id, p_user_id, p_increment);
  end loop;
end;
$$;
revoke all on function public.increment_mission_progress(uuid,text,integer) from public, anon, authenticated;
grant execute on function public.increment_mission_progress(uuid,text,integer) to service_role;

create or replace function public.trg_mission_media_like()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.user_id is not null then
    perform private.increment_mission_progress_once(new.user_id,'like_clips','media_like:'||new.media_id::text,1);
  end if;
  return new;
end; $$;

create or replace function public.trg_mission_media_upload()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.user_id is not null then
    perform private.increment_mission_progress_once(new.user_id,'upload_clip','media:'||new.id::text,1);
  end if;
  return new;
end; $$;

create or replace function public.trg_mission_comment()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.user_id is not null then
    perform private.increment_mission_progress_once(new.user_id,'comment_clips','comment:'||new.id::text,1);
  end if;
  return new;
end; $$;

create or replace function public.trg_mission_callout_sent()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.challenger_id is not null then
    perform private.increment_mission_progress_once(new.challenger_id,'send_callout','callout:'||new.id::text,1);
  end if;
  return new;
end; $$;

create or replace function public.trg_mission_challenge_completed()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.completed = true and old.completed is distinct from true and new.user_id is not null then
    perform private.increment_mission_progress_once(new.user_id,'complete_challenge','challenge_completion:'||new.id::text,1);
  end if;
  return new;
end; $$;

create or replace function public.trg_mission_park_rated()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.user_id is not null then
    perform private.increment_mission_progress_once(new.user_id,'rate_spot','park_rating:'||new.park_id::text,1);
  end if;
  return new;
end; $$;

create or replace function public.trg_mission_park_visit()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.user_id is not null and new.park_id is not null then
    perform private.increment_mission_progress_once(new.user_id,'visit_new_park','park:'||new.park_id::text,1);
  end if;
  return new;
end; $$;

create or replace function public.trg_mission_session_duration()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_minutes integer;
begin
  if new.session_end is not null and old.session_end is null and new.user_id is not null then
    v_minutes := floor(extract(epoch from (new.session_end-new.session_start))/60)::integer;
    if v_minutes > 0 then
      perform private.increment_mission_progress_once(new.user_id,'session_duration','session:'||new.id::text,v_minutes);
    end if;
  end if;
  return new;
end; $$;

create or replace function public.trg_mission_qr_found()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.success = true and new.user_id is not null then
    perform private.increment_mission_progress_once(new.user_id,'find_qr','qr_scan:'||new.id::text,1);
  end if;
  return new;
end; $$;

create or replace function public.trg_mission_spot_added()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.added_by is not null then
    perform private.increment_mission_progress_once(new.added_by,'add_spot','spot:'||new.id::text,1);
  end if;
  return new;
end; $$;

create or replace function public.trg_mission_trick_landed()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.activity_type='trick_landed' and new.user_id is not null then
    perform private.increment_mission_progress_once(new.user_id,'land_trick','activity:'||new.id::text,1);
  end if;
  return new;
end; $$;

revoke all on function public.trg_mission_media_like() from public, anon, authenticated;
revoke all on function public.trg_mission_media_upload() from public, anon, authenticated;
revoke all on function public.trg_mission_comment() from public, anon, authenticated;
revoke all on function public.trg_mission_callout_sent() from public, anon, authenticated;
revoke all on function public.trg_mission_challenge_completed() from public, anon, authenticated;
revoke all on function public.trg_mission_park_rated() from public, anon, authenticated;
revoke all on function public.trg_mission_park_visit() from public, anon, authenticated;
revoke all on function public.trg_mission_session_duration() from public, anon, authenticated;
revoke all on function public.trg_mission_qr_found() from public, anon, authenticated;
revoke all on function public.trg_mission_spot_added() from public, anon, authenticated;
revoke all on function public.trg_mission_trick_landed() from public, anon, authenticated;

commit;
