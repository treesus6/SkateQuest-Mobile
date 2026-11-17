-- Reconcile start_skate_activity_session with the live database.
--
-- PR #434's migration (20261117070000_live_session_pause_resume_tricks)
-- replaced start_skate_activity_session with a version that has NO
-- parameter defaults. The live function had:
--   * p_spot_id uuid DEFAULT NULL, p_spot_name text DEFAULT NULL
--   * a 12-hour stale-session cancel (active sessions older than 12 hours
--     are cancelled before a new start)
-- CREATE OR REPLACE cannot remove parameter defaults (Postgres 42P13), so
-- the #434 version could never have applied live, and applying it would
-- also have silently dropped the stale-session cancel.
--
-- The live database already runs the merged definition below (applied
-- Nov 17, 2026 when the #434 migration was applied live): defaults and
-- stale-cancel kept, plus the #434 resume-state return fields
-- (paused_total_seconds, paused_at, trick_count, spot_name).
--
-- This migration re-applies that exact live definition to the repo so the
-- two match. NO behavior change vs live. If this migration ever runs
-- against a database that already has this definition, it is a no-op.
CREATE OR REPLACE FUNCTION public.start_skate_activity_session(p_spot_id uuid DEFAULT NULL::uuid, p_spot_name text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_user uuid := auth.uid();
  v_session public.skate_activity_sessions%rowtype;
begin
  if v_user is null then
    raise exception 'Authentication required';
  end if;

  -- Live-only behavior (kept): cancel stale sessions older than 12 hours.
  update public.skate_activity_sessions
  set status = 'cancelled', ended_at = now()
  where user_id = v_user
    and status = 'active'
    and started_at < now() - interval '12 hours';

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
$function$;

revoke all on function public.start_skate_activity_session(uuid, text) from public, anon;
grant execute on function public.start_skate_activity_session(uuid, text) to authenticated;
