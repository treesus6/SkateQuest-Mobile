create or replace function public.verify_spot_mission_stop(
  p_stop_id uuid,
  p_latitude double precision,
  p_longitude double precision
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_stop public.spot_mission_stops%rowtype;
  v_route public.spot_mission_routes%rowtype;
  v_spot public.skate_spots%rowtype;
  v_distance double precision;
  v_complete boolean;
  v_inserted boolean := false;
begin
  if v_user_id is null then raise exception 'Authentication required'; end if;
  if p_latitude not between -90 and 90 or p_longitude not between -180 and 180 then
    raise exception 'Invalid coordinates';
  end if;

  select * into v_stop from public.spot_mission_stops where id = p_stop_id for update;
  if not found then raise exception 'Mission stop not found'; end if;
  select * into v_route from public.spot_mission_routes where id = v_stop.route_id for update;
  if v_route.user_id <> v_user_id then raise exception 'Not authorized'; end if;
  if v_route.status <> 'active' then raise exception 'Route is not active'; end if;
  if v_stop.verified_at is not null then raise exception 'Stop is already verified'; end if;
  if exists (
    select 1 from public.spot_mission_stops
    where route_id = v_stop.route_id and position < v_stop.position and verified_at is null
  ) then raise exception 'Complete the previous stop first'; end if;

  select * into v_spot from public.skate_spots where id = v_stop.spot_id;
  v_distance := 6371000 * 2 * asin(sqrt(
    power(sin(radians(p_latitude - v_spot.latitude) / 2), 2) +
    cos(radians(v_spot.latitude)) * cos(radians(p_latitude)) *
    power(sin(radians(p_longitude - v_spot.longitude) / 2), 2)
  ));
  if v_distance > v_stop.verification_radius_meters then
    raise exception 'Move within % meters of this spot (currently % meters away)',
      v_stop.verification_radius_meters, round(v_distance);
  end if;

  update public.spot_mission_stops set
    verified_at = now(), verified_latitude = p_latitude,
    verified_longitude = p_longitude, verified_distance_meters = v_distance
  where id = v_stop.id;

  select not exists (
    select 1 from public.spot_mission_stops
    where route_id = v_stop.route_id and verified_at is null
  ) into v_complete;

  if v_complete then
    update public.spot_mission_routes
      set status = 'completed', completed_at = now(), updated_at = now()
      where id = v_route.id and status = 'active';

    if found and v_route.xp_reward > 0 then
      insert into public.xp_reward_ledger(user_id,reward_key,source,xp_amount)
      values(v_user_id,'spot_mission_route:'||v_route.id::text,'spot_mission_route',v_route.xp_reward)
      on conflict(user_id,reward_key) do nothing;
      get diagnostics v_inserted = row_count;
      if v_inserted then
        perform public.increment_user_xp(v_user_id,v_route.xp_reward);
      end if;
    end if;
  end if;

  return jsonb_build_object(
    'verified', true,
    'distance_meters', round(v_distance),
    'route_completed', v_complete,
    'xp_awarded', case when v_complete and v_inserted then v_route.xp_reward else 0 end
  );
end;
$$;
revoke all on function public.verify_spot_mission_stop(uuid,double precision,double precision) from public,anon;
grant execute on function public.verify_spot_mission_stop(uuid,double precision,double precision) to authenticated,service_role;
