-- Real-world Spot Mission Routes + GPS-verified Crew Territory claims.
-- All mutations that award points/XP are atomic, authenticated RPCs.

create table if not exists public.spot_mission_routes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 80),
  status text not null default 'active' check (status in ('active', 'completed', 'abandoned')),
  xp_reward integer not null default 0 check (xp_reward >= 0),
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists spot_mission_routes_one_active_per_user
  on public.spot_mission_routes(user_id) where status = 'active';
create index if not exists spot_mission_routes_user_created
  on public.spot_mission_routes(user_id, created_at desc);

create table if not exists public.spot_mission_stops (
  id uuid primary key default gen_random_uuid(),
  route_id uuid not null references public.spot_mission_routes(id) on delete cascade,
  spot_id uuid not null references public.skate_spots(id) on delete cascade,
  position integer not null check (position between 1 and 4),
  verification_radius_meters integer not null default 150
    check (verification_radius_meters between 25 and 500),
  verified_at timestamptz,
  verified_latitude double precision,
  verified_longitude double precision,
  verified_distance_meters double precision,
  created_at timestamptz not null default now(),
  unique(route_id, position),
  unique(route_id, spot_id)
);

create index if not exists spot_mission_stops_route_position
  on public.spot_mission_stops(route_id, position);
create index if not exists spot_mission_stops_spot
  on public.spot_mission_stops(spot_id);

create table if not exists public.crew_territory_claims (
  id uuid primary key default gen_random_uuid(),
  spot_id uuid not null references public.skate_spots(id) on delete cascade,
  crew_id uuid not null references public.crews(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  trick_name text not null check (char_length(trick_name) between 2 and 80),
  proof_url text,
  latitude double precision not null,
  longitude double precision not null,
  distance_meters double precision not null check (distance_meters >= 0),
  points_awarded integer not null default 10 check (points_awarded between 1 and 100),
  created_at timestamptz not null default now()
);

create index if not exists crew_territory_claims_spot_created
  on public.crew_territory_claims(spot_id, created_at desc);
create index if not exists crew_territory_claims_crew_created
  on public.crew_territory_claims(crew_id, created_at desc);
create index if not exists crew_territory_claims_user_created
  on public.crew_territory_claims(user_id, created_at desc);
create index if not exists idx_crew_members_user
  on public.crew_members(user_id);

alter table public.spot_mission_routes enable row level security;
alter table public.spot_mission_stops enable row level security;
alter table public.crew_territory_claims enable row level security;

drop policy if exists "users read own mission routes" on public.spot_mission_routes;
create policy "users read own mission routes"
  on public.spot_mission_routes for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "users read own mission stops" on public.spot_mission_stops;
create policy "users read own mission stops"
  on public.spot_mission_stops for select to authenticated
  using (
    exists (
      select 1 from public.spot_mission_routes route
      where route.id = route_id and route.user_id = (select auth.uid())
    )
  );

drop policy if exists "authenticated read territory claims" on public.crew_territory_claims;
create policy "authenticated read territory claims"
  on public.crew_territory_claims for select to authenticated using (true);

grant select on public.spot_mission_routes, public.spot_mission_stops to authenticated;
grant select on public.crew_territory_claims to authenticated;
revoke insert, update, delete on public.spot_mission_routes from anon, authenticated;
revoke insert, update, delete on public.spot_mission_stops from anon, authenticated;
revoke insert, update, delete on public.crew_territory_claims from anon, authenticated;

create or replace function public.create_spot_mission_route(
  p_spot_ids uuid[],
  p_title text default 'My Spot Mission'
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_route_id uuid;
  v_spot_count integer;
begin
  if v_user_id is null then raise exception 'Authentication required'; end if;
  if coalesce(array_length(p_spot_ids, 1), 0) not between 2 and 4 then
    raise exception 'A mission route requires 2 to 4 spots';
  end if;
  if (select count(distinct item) from unnest(p_spot_ids) item) <> array_length(p_spot_ids, 1) then
    raise exception 'Mission route spots must be unique';
  end if;
  if coalesce(char_length(trim(p_title)), 0) not between 1 and 80 then
    raise exception 'Route title must be between 1 and 80 characters';
  end if;
  if exists (
    select 1 from public.spot_mission_routes
    where user_id = v_user_id and status = 'active'
  ) then
    raise exception 'Finish or abandon your active route first';
  end if;

  select count(*) into v_spot_count
  from public.skate_spots where id = any(p_spot_ids);
  if v_spot_count <> array_length(p_spot_ids, 1) then
    raise exception 'One or more spots do not exist';
  end if;

  insert into public.spot_mission_routes(user_id, title, xp_reward)
  values (v_user_id, trim(p_title), 100 + (v_spot_count * 50))
  returning id into v_route_id;

  insert into public.spot_mission_stops(route_id, spot_id, position)
  select v_route_id, item, ordinal::integer
  from unnest(p_spot_ids) with ordinality as selected(item, ordinal);

  return v_route_id;
end;
$$;

create or replace function public.verify_spot_mission_stop(
  p_stop_id uuid,
  p_latitude double precision,
  p_longitude double precision
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_stop public.spot_mission_stops;
  v_route public.spot_mission_routes;
  v_spot public.skate_spots;
  v_distance double precision;
  v_complete boolean;
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
      where id = v_route.id;
    update public.profiles set xp = coalesce(xp, 0) + v_route.xp_reward where id = v_user_id;
  end if;

  return jsonb_build_object(
    'verified', true,
    'distance_meters', round(v_distance),
    'route_completed', v_complete,
    'xp_awarded', case when v_complete then v_route.xp_reward else 0 end
  );
end;
$$;

create or replace function public.abandon_spot_mission_route(p_route_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  update public.spot_mission_routes
    set status = 'abandoned', updated_at = now()
    where id = p_route_id and user_id = auth.uid() and status = 'active';
  if not found then raise exception 'Active route not found'; end if;
end;
$$;

create or replace function public.claim_crew_territory(
  p_spot_id uuid,
  p_latitude double precision,
  p_longitude double precision,
  p_trick_name text,
  p_proof_url text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_crew_id uuid;
  v_spot public.skate_spots;
  v_distance double precision;
  v_points integer := 10;
  v_total integer;
begin
  if v_user_id is null then raise exception 'Authentication required'; end if;
  if p_latitude not between -90 and 90 or p_longitude not between -180 and 180 then
    raise exception 'Invalid coordinates';
  end if;
  if coalesce(char_length(trim(p_trick_name)), 0) not between 2 and 80 then
    raise exception 'Enter the trick you landed';
  end if;

  select crew_id into v_crew_id from public.crew_members
  where user_id = v_user_id order by joined_at limit 1;
  if v_crew_id is null then raise exception 'Join a crew before claiming territory'; end if;
  select * into v_spot from public.skate_spots where id = p_spot_id;
  if not found then raise exception 'Spot not found'; end if;

  v_distance := 6371000 * 2 * asin(sqrt(
    power(sin(radians(p_latitude - v_spot.latitude) / 2), 2) +
    cos(radians(v_spot.latitude)) * cos(radians(p_latitude)) *
    power(sin(radians(p_longitude - v_spot.longitude) / 2), 2)
  ));
  if v_distance > 150 then
    raise exception 'Move within 150 meters of this spot (currently % meters away)', round(v_distance);
  end if;
  if exists (
    select 1 from public.crew_territory_claims
    where user_id = v_user_id and spot_id = p_spot_id
      and created_at > now() - interval '6 hours'
  ) then raise exception 'You already scored this spot in the last 6 hours'; end if;

  insert into public.crew_territory_claims(
    spot_id, crew_id, user_id, trick_name, proof_url,
    latitude, longitude, distance_meters, points_awarded
  ) values (
    p_spot_id, v_crew_id, v_user_id, trim(p_trick_name), nullif(trim(p_proof_url), ''),
    p_latitude, p_longitude, v_distance, v_points
  );

  insert into public.crew_territories(spot_id, crew_id, total_points, last_activity)
  values (p_spot_id, v_crew_id, v_points, now())
  on conflict (spot_id, crew_id) do update set
    total_points = public.crew_territories.total_points + excluded.total_points,
    last_activity = now()
  returning total_points into v_total;

  update public.crews set total_xp = coalesce(total_xp, 0) + v_points where id = v_crew_id;

  return jsonb_build_object(
    'claimed', true,
    'crew_id', v_crew_id,
    'points_awarded', v_points,
    'crew_spot_points', v_total,
    'distance_meters', round(v_distance)
  );
end;
$$;

revoke all on function public.create_spot_mission_route(uuid[], text) from public, anon;
revoke all on function public.verify_spot_mission_stop(uuid, double precision, double precision) from public, anon;
revoke all on function public.abandon_spot_mission_route(uuid) from public, anon;
revoke all on function public.claim_crew_territory(uuid, double precision, double precision, text, text) from public, anon;
grant execute on function public.create_spot_mission_route(uuid[], text) to authenticated;
grant execute on function public.verify_spot_mission_stop(uuid, double precision, double precision) to authenticated;
grant execute on function public.abandon_spot_mission_route(uuid) to authenticated;
grant execute on function public.claim_crew_territory(uuid, double precision, double precision, text, text) to authenticated;
