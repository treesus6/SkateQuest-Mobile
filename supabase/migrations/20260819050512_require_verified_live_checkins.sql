begin;

drop policy if exists "users_manage_own_checkins_insert" on public.live_checkins;
drop policy if exists "users_manage_own_checkins_update" on public.live_checkins;
drop policy if exists "users_manage_own_checkins_delete" on public.live_checkins;
revoke insert, update, delete on public.live_checkins from anon, authenticated;
grant select on public.live_checkins to authenticated;

revoke execute on function public.increment_xp(uuid,integer) from authenticated;
revoke execute on function public.increment_xp(uuid,integer,boolean) from authenticated;

create or replace function public.verified_live_check_in(
  p_spot_id uuid,
  p_latitude double precision,
  p_longitude double precision,
  p_message text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_result jsonb;
  v_checkin_id uuid;
  v_message text := nullif(btrim(coalesce(p_message,'')), '');
begin
  if v_user is null then
    raise exception 'authentication required';
  end if;
  if v_message is not null and char_length(v_message) > 280 then
    raise exception 'check-in message is too long';
  end if;

  v_result := public.verified_web_check_in(p_spot_id, p_latitude, p_longitude);
  v_checkin_id := nullif(v_result->>'checkin_id','')::uuid;

  if v_checkin_id is not null then
    update public.live_checkins
    set message = v_message
    where id = v_checkin_id and user_id = v_user;
  end if;

  return v_result || jsonb_build_object('message', v_message);
end;
$$;
revoke all on function public.verified_live_check_in(uuid,double precision,double precision,text) from public, anon;
grant execute on function public.verified_live_check_in(uuid,double precision,double precision,text) to authenticated, service_role;

commit;
