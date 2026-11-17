begin;

-- Live skate sessions: the missing table and start RPC.
--
-- Background: screens/ActiveSessionScreen.tsx calls
-- start_skate_activity_session, and finish_skate_activity_session
-- (migrations 20260819051202 and 20261003173452) reads and updates
-- public.skate_activity_sessions — but neither the table nor the start
-- function ever existed in a migration, so tapping "Start session" always
-- failed into the "Could not start session" alert and the whole tracked
-- session flow (timer, trick counter, server-verified XP) was unreachable.
-- The legacy start_skate_session / skate_session_runs API was retired in
-- 20260819051202. This migration supplies the missing backend contract:
-- the table finish expects, plus the start function the screen calls.
create table if not exists public.skate_activity_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  spot_id uuid null,
  spot_name text null,
  started_at timestamptz not null default now(),
  ended_at timestamptz null,
  duration_minutes integer null,
  trick_count integer not null default 0,
  xp_awarded integer not null default 0,
  status text not null default 'active' check (status in ('active', 'completed')),
  created_at timestamptz not null default now()
);

-- One live session per user: the resume lookup and the duplicate guard share
-- this partial unique index.
create unique index if not exists skate_activity_sessions_one_active_per_user_idx
  on public.skate_activity_sessions (user_id)
  where status = 'active';

-- RLS: owner-only reads, mirroring public.skate_session_runs. All writes go
-- through the security-definer RPCs; direct writes are revoked so a new table
-- never ships open.
alter table public.skate_activity_sessions enable row level security;
drop policy if exists "users_view_own_skate_activity_sessions" on public.skate_activity_sessions;
create policy "users_view_own_skate_activity_sessions" on public.skate_activity_sessions for select to authenticated using (user_id = auth.uid());
revoke all on public.skate_activity_sessions from anon;
revoke insert, update, delete on public.skate_activity_sessions from authenticated;
grant select on public.skate_activity_sessions to authenticated;

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
      'resumed', true
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
      'resumed', true
    );
  end;

  return jsonb_build_object(
    'session_id', v_session.id,
    'started_at', v_session.started_at,
    'resumed', false
  );
end;
$$;

revoke all on function public.start_skate_activity_session(uuid, text) from public, anon;
grant execute on function public.start_skate_activity_session(uuid, text) to authenticated;

commit;
