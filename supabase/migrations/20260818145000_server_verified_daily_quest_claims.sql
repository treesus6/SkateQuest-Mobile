alter table public.daily_quest_completions
  drop constraint if exists daily_quest_completions_proof_type_check;

alter table public.daily_quest_completions
  add constraint daily_quest_completions_proof_type_check
  check (proof_type = any (array['photo'::text,'video'::text,'location'::text,'activity'::text]));

create or replace function public.claim_daily_quest(p_quest_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_quest public.daily_quests%rowtype;
  v_progress integer := 0;
  v_required integer := 1;
  v_existing_status text;
begin
  if v_user_id is null then
    return jsonb_build_object('success', false, 'error', 'Not authenticated');
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended(v_user_id::text || ':' || p_quest_id::text || ':' || current_date::text, 0)
  );

  select * into v_quest
  from public.daily_quests
  where id = p_quest_id
    and active = true
    and coalesce(frozen, false) = false;

  if not found then
    return jsonb_build_object('success', false, 'error', 'Quest not found, inactive, or frozen');
  end if;

  select status into v_existing_status
  from public.daily_quest_completions
  where user_id = v_user_id and quest_id = p_quest_id and date = current_date
  for update;

  if v_existing_status = 'approved' then
    return jsonb_build_object('success', false, 'error', 'Quest already completed today');
  end if;

  v_required := greatest(coalesce(v_quest.requirement_value, 1), 1);

  case v_quest.requirement_type
    when 'checkins' then
      select count(*)::int into v_progress
      from public.park_visits
      where user_id = v_user_id
        and session_start >= current_date
        and session_start < current_date + interval '1 day';

    when 'trick_count' then
      select count(*)::int into v_progress
      from public.user_tricks
      where user_id = v_user_id
        and created_at >= current_date
        and created_at < current_date + interval '1 day';

    when 'new_spot' then
      select count(*)::int into v_progress
      from public.park_visits pv
      where pv.user_id = v_user_id
        and pv.session_start >= current_date
        and pv.session_start < current_date + interval '1 day'
        and not exists (
          select 1 from public.park_visits older
          where older.user_id = v_user_id
            and older.park_id = pv.park_id
            and older.session_start < current_date
        );

    when 'challenge_complete' then
      select count(*)::int into v_progress
      from public.challenge_completions cc
      where cc.user_id = v_user_id
        and cc.completed = true
        and cc.verified = true
        and cc.completed_at >= current_date
        and cc.completed_at < current_date + interval '1 day';

    when 'spot_rating' then
      select count(*)::int into v_progress
      from public.park_ratings pr
      where pr.user_id = v_user_id
        and pr.created_at >= current_date
        and pr.created_at < current_date + interval '1 day';

    else
      return jsonb_build_object('success', false, 'error', 'This quest type does not have a verified completion rule yet');
  end case;

  if v_progress < v_required then
    return jsonb_build_object(
      'success', false,
      'error', 'Quest requirement not met yet',
      'progress', v_progress,
      'required', v_required
    );
  end if;

  insert into public.daily_quest_completions (
    user_id, quest_id, date, proof_type, proof_note, status, reviewed_at
  ) values (
    v_user_id, p_quest_id, current_date, 'activity',
    'Automatically verified from SkateQuest activity', 'approved', now()
  )
  on conflict (user_id, quest_id, date)
  do update set
    status = 'approved',
    proof_type = 'activity',
    proof_note = 'Automatically verified from SkateQuest activity',
    reviewed_at = now();

  perform public.increment_user_xp(v_user_id, coalesce(v_quest.xp_reward, 0));

  return jsonb_build_object(
    'success', true,
    'xp_awarded', coalesce(v_quest.xp_reward, 0),
    'progress', v_progress,
    'required', v_required
  );
end;
$$;

revoke all on function public.claim_daily_quest(uuid) from public, anon;
grant execute on function public.claim_daily_quest(uuid) to authenticated;
