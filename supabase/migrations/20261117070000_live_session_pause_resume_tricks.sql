begin;

-- Live sessions: real pause, resume/recovery, persisted trick records.
--
-- Audit findings fixed here (Nov 16 audit, PR #432 follow-up):
-- (a) Pause did not pause: the client only cleared its interval while
--     SessionTimer kept counting from startTime and the server finish RPC
--     computed duration as now() - started_at, so paused time was billed as
--     skate time. Paused time is now accumulated in paused_total_seconds
--     (plus the open pause in paused_at) and subtracted on both sides.
-- (b) No resume/recovery and trick taps were local-only: a killed app left
--     an orphaned active session with no way back in, and the trick counter
--     only reached the server once at finish. This migration adds
--     get_active_skate_activity_session (read-only resume lookup) and
--     skate_session_tricks + log_skate_session_trick, so every trick tap
--     inserts a real row and increments the server trick_count immediately.
--     start_skate_activity_session now also returns the resume state
--     (paused_total_seconds, paused_at, trick_count, spot_name) so a
--     resumed session restores its timer and counter exactly.
-- (c) is a client change only (the duplicate feedService.create call is
--     removed from ActiveSessionScreen.tsx); the server feed row inserted
--     by finish_skate_activity_session stays the single feed entry.
-- (d) History reads finished rows with the owner's RLS select policy below;
--     no schema change needed for that read.

alter table public.skate_activity_sessions
  add column if not exists paused_total_seconds integer not null default 0,
  add column if not exists paused_at timestamptz null;

-- One real row per landed trick in a session. RLS mirrors
-- skate_activity_sessions: owner-only reads, all writes through the
-- security-definer RPC so a client can never forge another user's count.
create table if not exists public.skate_session_tricks (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.skate_activity_sessions(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  logged_at timestamptz not null default now()
);
create index if not exists skate_session_tricks_session_idx
  on public.skate_session_tricks (session_id, logged_at);

alter table public.skate_session_tricks enable row level security;
drop policy if exists "users_view_own_skate_session_tricks" on public.skate_session_tricks;
create policy "users_view_own_skate_session_tricks" on public.skate_session_tricks for select to authenticated using (user_id = auth.uid());
revoke all on public.skate_session_tricks from anon;
revoke insert, update, delete on public.skate_session_tricks from authenticated;
grant select on public.skate_session_tricks to authenticated;

-- Read-only lookup for resume/recovery: the caller's active session, if any.
create or replace function public.get_active_skate_activity_session()
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user uuid := auth.uid();
  v_session public.skate_activity_sessions%rowtype;
begin
  if v_user is null then
    raise exception 'Authentication required';
  end if;

  select * into v_session
  from public.skate_activity_sessions
  where user_id = v_user
    and status = 'active'
  order by started_at desc
  limit 1;

  if not found then
    return null;
  end if;

  return jsonb_build_object(
    'session_id', v_session.id,
    'spot_id', v_session.spot_id,
    'spot_name', v_session.spot_name,
    'started_at', v_session.started_at,
    'paused_total_seconds', v_session.paused_total_seconds,
    'paused_at', v_session.paused_at,
    'trick_count', v_session.trick_count
  );
end;
$$;

revoke all on function public.get_active_skate_activity_session() from public, anon;
grant execute on function public.get_active_skate_activity_session() to authenticated;

create or replace function public.pause_skate_activity_session(p_session_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user uuid := auth.uid();
  v_session public.skate_activity_sessions%rowtype;
begin
  if v_user is null then
    raise exception 'Authentication required';
  end if;

  select * into v_session
  from public.skate_activity_sessions
  where id = p_session_id and user_id = v_user
  for update;
  if not found then raise exception 'session not found'; end if;
  if v_session.status <> 'active' then raise exception 'session is not active'; end if;
  if v_session.paused_at is not null then
    return jsonb_build_object(
      'session_id', v_session.id,
      'paused', true,
      'paused_at', v_session.paused_at,
      'paused_total_seconds', v_session.paused_total_seconds
    );
  end if;

  update public.skate_activity_sessions
  set paused_at = now()
  where id = v_session.id and status = 'active' and paused_at is null
  returning * into v_session;
  if not found then raise exception 'session pause raced; try again'; end if;

  return jsonb_build_object(
    'session_id', v_session.id,
    'paused', true,
    'paused_at', v_session.paused_at,
    'paused_total_seconds', v_session.paused_total_seconds
  );
end;
$$;

revoke all on function public.pause_skate_activity_session(uuid) from public, anon;
grant execute on function public.pause_skate_activity_session(uuid) to authenticated;

create or replace function public.resume_skate_activity_session(p_session_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user uuid := auth.uid();
  v_session public.skate_activity_sessions%rowtype;
begin
  if v_user is null then
    raise exception 'Authentication required';
  end if;

  select * into v_session
  from public.skate_activity_sessions
  where id = p_session_id and user_id = v_user
  for update;
  if not found then raise exception 'session not found'; end if;
  if v_session.status <> 'active' then raise exception 'session is not active'; end if;
  if v_session.paused_at is null then
    return jsonb_build_object(
      'session_id', v_session.id,
      'resumed', true,
      'paused_total_seconds', v_session.paused_total_seconds
    );
  end if;

  update public.skate_activity_sessions
  set paused_total_seconds = v_session.paused_total_seconds
        + greatest(0, floor(extract(epoch from (now() - v_session.paused_at)))::integer),
      paused_at = null
  where id = v_session.id and status = 'active' and paused_at is not null
  returning * into v_session;
  if not found then raise exception 'session resume raced; try again'; end if;

  return jsonb_build_object(
    'session_id', v_session.id,
    'resumed', true,
    'paused_total_seconds', v_session.paused_total_seconds
  );
end;
$$;

revoke all on function public.resume_skate_activity_session(uuid) from public, anon;
grant execute on function public.resume_skate_activity_session(uuid) to authenticated;

-- Persist one trick tap: insert the trick record and bump the session's
-- trick_count in the same transaction, so a killed app loses nothing.
create or replace function public.log_skate_session_trick(p_session_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user uuid := auth.uid();
  v_session public.skate_activity_sessions%rowtype;
  v_new_trick_count integer;
begin
  if v_user is null then
    raise exception 'Authentication required';
  end if;

  select * into v_session
  from public.skate_activity_sessions
  where id = p_session_id and user_id = v_user
  for update;
  if not found then raise exception 'session not found'; end if;
  if v_session.status <> 'active' then raise exception 'session is not active'; end if;
  if v_session.paused_at is not null then raise exception 'session is paused'; end if;

  insert into public.skate_session_tricks (session_id, user_id)
  values (v_session.id, v_user);

  update public.skate_activity_sessions
  set trick_count = trick_count + 1
  where id = v_session.id and status = 'active'
  returning trick_count into v_new_trick_count;
  if not found then raise exception 'session trick log raced; try again'; end if;

  return jsonb_build_object(
    'session_id', v_session.id,
    'trick_count', v_new_trick_count
  );
end;
$$;

revoke all on function public.log_skate_session_trick(uuid) from public, anon;
grant execute on function public.log_skate_session_trick(uuid) to authenticated;

-- Start now returns the resume state, so a resumed session restores its
-- timer (started_at minus accumulated paused time) and trick counter.
create or replace function public.start_skate_activity_session(p_spot_id uuid, p_spot_name text)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user uuid := auth.uid();
  v_session public.skate_activity_sessions%rowtype;
begin
  if v_user is null then
    raise exception 'Authentication required';
  end if;

  -- One live session per user: resume the active one instead of starting a
  -- duplicate.
  select * into v_session
  from public.skate_activity_sessions
  where user_id = v_user
    and status = 'active'
  order by started_at desc
  limit 1;

  if found then
    return jsonb_build_object(
      'session_id', v_session.id,
      'started_at', v_session.started_at,
      'resumed', true,
      'spot_name', v_session.spot_name,
      'paused_total_seconds', v_session.paused_total_seconds,
      'paused_at', v_session.paused_at,
      'trick_count', v_session.trick_count
    );
  end if;

  begin
    insert into public.skate_activity_sessions (user_id, spot_id, spot_name)
    values (v_user, p_spot_id, nullif(trim(p_spot_name), ''))
    returning * into v_session;
  exception when unique_violation then
    -- A concurrent start won the race: resume the session it created.
    select * into v_session
    from public.skate_activity_sessions
    where user_id = v_user
      and status = 'active'
    order by started_at desc
    limit 1;
    if not found then
      raise;
    end if;
    return jsonb_build_object(
      'session_id', v_session.id,
      'started_at', v_session.started_at,
      'resumed', true,
      'spot_name', v_session.spot_name,
      'paused_total_seconds', v_session.paused_total_seconds,
      'paused_at', v_session.paused_at,
      'trick_count', v_session.trick_count
    );
  end;

  return jsonb_build_object(
    'session_id', v_session.id,
    'started_at', v_session.started_at,
    'resumed', false,
    'spot_name', v_session.spot_name,
    'paused_total_seconds', v_session.paused_total_seconds,
    'paused_at', v_session.paused_at,
    'trick_count', v_session.trick_count
  );
end;
$$;

revoke all on function public.start_skate_activity_session(uuid, text) from public, anon;
grant execute on function public.start_skate_activity_session(uuid, text) to authenticated;

-- Finish now bills only active (unpaused) time, and keeps the higher of the
-- server-persisted trick count and the count the client sends, so tricks
-- logged before a kill are never lost. A session finished while paused has
-- its open pause interval excluded too. The activity_feed insert below
-- stays the ONE feed entry for a finished session (the client no longer
-- writes its own).
create or replace function public.finish_skate_activity_session(
  p_session_id uuid,
  p_trick_count integer default 0
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_session public.skate_activity_sessions%rowtype;
  v_active_seconds integer;
  v_minutes integer;
  v_xp integer;
  v_tricks integer := greatest(coalesce(p_trick_count,0),0);
  v_reward_rows integer := 0;
begin
  if v_user_id is null then raise exception 'authentication required'; end if;

  select * into v_session
  from public.skate_activity_sessions
  where id = p_session_id and user_id = v_user_id
  for update;
  if not found then raise exception 'session not found'; end if;

  if v_session.status = 'completed' then
    return jsonb_build_object(
      'session_id', v_session.id,
      'duration_minutes', v_session.duration_minutes,
      'xp_awarded', v_session.xp_awarded,
      'trick_count', v_session.trick_count,
      'already_completed', true
    );
  end if;
  if v_session.status <> 'active' then raise exception 'session is not active'; end if;

  -- Active time only: wall-clock time minus all paused time, including an
  -- open pause if the session is finished while paused.
  v_active_seconds := greatest(
    0,
    floor(extract(epoch from (now() - v_session.started_at)))::integer
      - coalesce(v_session.paused_total_seconds, 0)
      - case when v_session.paused_at is not null
          then greatest(0, floor(extract(epoch from (now() - v_session.paused_at)))::integer)
          else 0 end
  );
  -- Never drop tricks the server already persisted (e.g. logged before the
  -- app was killed and resumed with a stale local counter).
  v_tricks := greatest(v_tricks, coalesce(v_session.trick_count, 0));

  v_minutes := greatest(0, least(60, floor(v_active_seconds / 60)::integer));
  v_xp := least(120, v_minutes * 2);

  update public.skate_activity_sessions
  set ended_at = now(),
      duration_minutes = v_minutes,
      trick_count = v_tricks,
      xp_awarded = v_xp,
      paused_at = null,
      status = 'completed'
  where id = v_session.id and status = 'active';

  if not found then raise exception 'session completion raced; try again'; end if;

  if v_xp > 0 then
    insert into public.xp_reward_ledger(user_id,reward_key,source,xp_amount)
    values(
      v_user_id,
      'skate_activity_session:'||v_session.id::text,
      'skate_activity_session',
      v_xp
    )
    on conflict(user_id,reward_key) do nothing;
    get diagnostics v_reward_rows = row_count;
    if v_reward_rows = 1 then
      perform public.increment_user_xp(v_user_id,v_xp);
    end if;
  end if;

  update public.profiles
  set total_sessions = coalesce(total_sessions,0) + 1,
      total_hours_skated = coalesce(total_hours_skated,0) + (v_minutes::numeric / 60.0)
  where id = v_user_id;

  insert into public.activity_feed(
    user_id,
    activity_type,
    title,
    description,
    xp_earned
  )
  values(
    v_user_id,
    'skate_session',
    'Completed a skate session',
    v_minutes::text || ' min · ' || v_tricks::text || ' tricks logged',
    case when v_reward_rows = 1 then v_xp else 0 end
  );

  return jsonb_build_object(
    'session_id', v_session.id,
    'duration_minutes', v_minutes,
    'xp_awarded', case when v_reward_rows = 1 then v_xp else 0 end,
    'trick_count', v_tricks,
    'already_completed', false
  );
end;
$$;

revoke all on function public.finish_skate_activity_session(uuid,integer)
  from public,anon;
grant execute on function public.finish_skate_activity_session(uuid,integer)
  to authenticated,service_role;

commit;
