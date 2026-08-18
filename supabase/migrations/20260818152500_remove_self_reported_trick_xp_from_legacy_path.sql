begin;

create or replace function public.increment_xp(p_user_id uuid, p_xp_amount integer)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user uuid := auth.uid();
  v_checkin_id uuid;
  v_inserted boolean := false;
begin
  if v_user is null or v_user is distinct from p_user_id then
    raise exception 'Not authorized to modify this user''s XP';
  end if;
  if p_xp_amount <> 25 then
    raise exception 'This legacy reward path only supports verified 25 XP check-ins';
  end if;
  select lc.id into v_checkin_id
  from public.live_checkins lc
  where lc.user_id=v_user
    and lc.created_at>=now()-interval '15 minutes'
    and not exists(select 1 from public.xp_reward_ledger x where x.user_id=v_user and x.reward_key='checkin:'||lc.id::text)
  order by lc.created_at desc limit 1;
  if v_checkin_id is null then raise exception 'No verified unclaimed check-in found'; end if;
  insert into public.xp_reward_ledger(user_id,reward_key,source,xp_amount)
  values(v_user,'checkin:'||v_checkin_id::text,'checkin',25)
  on conflict(user_id,reward_key) do nothing;
  get diagnostics v_inserted=row_count;
  if v_inserted then perform public.increment_user_xp(v_user,25); end if;
end;
$$;

commit;
