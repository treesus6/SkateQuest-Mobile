begin;

create table if not exists public.skate_session_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  spot_id uuid null,
  spot_name text null,
  started_at timestamptz not null default now(),
  ended_at timestamptz null,
  duration_minutes integer null,
  xp_awarded integer not null default 0,
  created_at timestamptz not null default now()
);
alter table public.skate_session_runs enable row level security;
drop policy if exists "users_view_own_skate_session_runs" on public.skate_session_runs;
create policy "users_view_own_skate_session_runs" on public.skate_session_runs for select to authenticated using (user_id = auth.uid());
revoke all on public.skate_session_runs from anon;
revoke insert, update, delete on public.skate_session_runs from authenticated;
grant select on public.skate_session_runs to authenticated;

create or replace function public.start_skate_session(p_spot_id uuid default null, p_spot_name text default null)
returns uuid language plpgsql security definer set search_path = public, pg_temp as $$
declare v_user uuid := auth.uid(); v_id uuid;
begin
  if v_user is null then raise exception 'Authentication required'; end if;
  if exists (select 1 from public.skate_session_runs where user_id=v_user and ended_at is null and started_at > now()-interval '12 hours') then
    select id into v_id from public.skate_session_runs where user_id=v_user and ended_at is null and started_at > now()-interval '12 hours' order by started_at desc limit 1;
    return v_id;
  end if;
  insert into public.skate_session_runs(user_id,spot_id,spot_name) values(v_user,p_spot_id,nullif(trim(p_spot_name),'')) returning id into v_id;
  return v_id;
end;
$$;

create or replace function public.finish_skate_session(p_session_id uuid)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare v_user uuid := auth.uid(); v_run public.skate_session_runs%rowtype; v_minutes integer; v_xp integer; v_inserted boolean := false;
begin
  if v_user is null then raise exception 'Authentication required'; end if;
  select * into v_run from public.skate_session_runs where id=p_session_id and user_id=v_user for update;
  if not found then raise exception 'Session not found'; end if;
  if v_run.ended_at is not null then return jsonb_build_object('success',true,'duration_minutes',v_run.duration_minutes,'xp_awarded',v_run.xp_awarded,'already_finished',true); end if;
  v_minutes := greatest(0,floor(extract(epoch from (now()-v_run.started_at))/60)::integer);
  v_xp := case when v_minutes < 1 then 0 else least(v_minutes,60)*2 end;
  update public.skate_session_runs set ended_at=now(),duration_minutes=v_minutes,xp_awarded=v_xp where id=p_session_id;
  if v_xp > 0 then
    insert into public.xp_reward_ledger(user_id,reward_key,source,xp_amount) values(v_user,'session:'||p_session_id::text,'skate_session',v_xp) on conflict(user_id,reward_key) do nothing;
    get diagnostics v_inserted = row_count;
    if v_inserted then perform public.increment_user_xp(v_user,v_xp); end if;
  end if;
  return jsonb_build_object('success',true,'duration_minutes',v_minutes,'xp_awarded',v_xp,'already_finished',false);
end;
$$;

revoke all on function public.start_skate_session(uuid,text) from public,anon;
grant execute on function public.start_skate_session(uuid,text) to authenticated;
revoke all on function public.finish_skate_session(uuid) from public,anon;
grant execute on function public.finish_skate_session(uuid) to authenticated;

create or replace function public.increment_xp(p_user_id uuid,p_xp_amount integer)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
declare v_user uuid := auth.uid(); v_checkin_id uuid; v_trick_id uuid; v_inserted boolean := false;
begin
  if v_user is null or v_user is distinct from p_user_id then raise exception 'Not authorized to modify this user''s XP'; end if;
  if p_xp_amount <> 25 then raise exception 'This legacy reward path only supports verified 25 XP activity'; end if;
  select lc.id into v_checkin_id from public.live_checkins lc where lc.user_id=v_user and lc.created_at>=now()-interval '15 minutes' and not exists(select 1 from public.xp_reward_ledger x where x.user_id=v_user and x.reward_key='checkin:'||lc.id::text) order by lc.created_at desc limit 1;
  if v_checkin_id is not null then
    insert into public.xp_reward_ledger(user_id,reward_key,source,xp_amount) values(v_user,'checkin:'||v_checkin_id::text,'checkin',25) on conflict(user_id,reward_key) do nothing;
    get diagnostics v_inserted = row_count;
    if v_inserted then perform public.increment_user_xp(v_user,25); end if;
    return;
  end if;
  select ut.id into v_trick_id from public.user_tricks ut where ut.user_id=v_user and ut.status in('landed','consistent') and ut.first_landed_at is not null and ut.first_landed_at>=now()-interval '15 minutes' and not exists(select 1 from public.xp_reward_ledger x where x.user_id=v_user and x.reward_key='trick:'||ut.id::text) order by ut.first_landed_at desc limit 1;
  if v_trick_id is not null then
    insert into public.xp_reward_ledger(user_id,reward_key,source,xp_amount) values(v_user,'trick:'||v_trick_id::text,'trick_landed',25) on conflict(user_id,reward_key) do nothing;
    get diagnostics v_inserted = row_count;
    if v_inserted then perform public.increment_user_xp(v_user,25); end if;
    return;
  end if;
  raise exception 'No verified unclaimed 25 XP activity found';
end;
$$;

create or replace function public.increment_xp(user_id uuid,amount integer,legacy_compat boolean default true)
returns void language plpgsql security definer set search_path = public, pg_temp as $$ begin perform public.increment_xp(p_user_id=>user_id,p_xp_amount=>amount); end; $$;
revoke execute on function public.increment_xp(uuid,integer,uuid,text) from anon,authenticated;
revoke execute on function public.increment_xp(uuid,integer) from anon;
revoke execute on function public.increment_xp(uuid,integer,boolean) from anon;
grant execute on function public.increment_xp(uuid,integer) to authenticated;
grant execute on function public.increment_xp(uuid,integer,boolean) to authenticated;

commit;
