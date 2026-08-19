begin;

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
  v_minutes integer;
  v_xp integer;
  v_tricks integer := greatest(coalesce(p_trick_count,0),0);
  v_inserted boolean := false;
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

  v_minutes := greatest(0, least(60, floor(extract(epoch from (now() - v_session.started_at)) / 60)::integer));
  v_xp := least(120, v_minutes * 2);

  update public.skate_activity_sessions
  set ended_at = now(),
      duration_minutes = v_minutes,
      trick_count = v_tricks,
      xp_awarded = v_xp,
      status = 'completed'
  where id = v_session.id and status = 'active';

  if not found then raise exception 'session completion raced; try again'; end if;

  if v_xp > 0 then
    insert into public.xp_reward_ledger(user_id,reward_key,source,xp_amount)
    values(v_user_id,'skate_activity_session:'||v_session.id::text,'skate_activity_session',v_xp)
    on conflict(user_id,reward_key) do nothing;
    get diagnostics v_inserted = row_count;
    if v_inserted then
      perform public.increment_user_xp(v_user_id,v_xp);
    end if;
  end if;

  update public.profiles
  set total_sessions = coalesce(total_sessions,0) + 1,
      total_hours_skated = coalesce(total_hours_skated,0) + (v_minutes::numeric / 60.0)
  where id = v_user_id;

  return jsonb_build_object(
    'session_id', v_session.id,
    'duration_minutes', v_minutes,
    'xp_awarded', case when v_inserted then v_xp else 0 end,
    'trick_count', v_tricks,
    'already_completed', false
  );
end;
$$;
revoke all on function public.finish_skate_activity_session(uuid,integer) from public,anon;
grant execute on function public.finish_skate_activity_session(uuid,integer) to authenticated,service_role;

revoke execute on function public.start_skate_session(uuid,text) from authenticated;
revoke execute on function public.finish_skate_session(uuid) from authenticated;

commit;
