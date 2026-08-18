-- King of the Hill requires both physical presence and judged video proof.
-- Location-only claim RPCs are retired so a button press cannot directly replace
-- a verified holder or mint throne XP.

create or replace function public.submit_spot_claim_proof(
  p_spot_id uuid,
  p_media_id uuid,
  p_trick_description text,
  p_latitude double precision,
  p_longitude double precision
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_spot_lat double precision;
  v_spot_lng double precision;
  v_distance double precision;
begin
  if v_user_id is null then
    raise exception 'not authorized';
  end if;

  if p_latitude not between -90 and 90 or p_longitude not between -180 and 180 then
    raise exception 'invalid coordinates';
  end if;

  select latitude, longitude
  into v_spot_lat, v_spot_lng
  from public.skate_spots
  where id = p_spot_id;

  if not found then
    raise exception 'spot not found';
  end if;

  if v_spot_lat is null or v_spot_lng is null then
    raise exception 'spot has no verified location';
  end if;

  v_distance := 6371000 * 2 * asin(sqrt(
    power(sin(radians(p_latitude - v_spot_lat) / 2), 2) +
    cos(radians(v_spot_lat)) * cos(radians(p_latitude)) *
    power(sin(radians(p_longitude - v_spot_lng) / 2), 2)
  ));

  if v_distance > 150 then
    raise exception 'move within 150 meters of the spot before submitting proof (currently % meters away)', round(v_distance);
  end if;

  return public.submit_spot_claim_proof(
    p_spot_id,
    p_media_id,
    p_trick_description
  ) || jsonb_build_object('distance_meters', round(v_distance));
end;
$$;

-- The 3-argument overload has no location proof and must not be callable by clients.
revoke all on function public.submit_spot_claim_proof(uuid, uuid, text) from public, anon, authenticated;
revoke all on function public.submit_spot_claim_proof(uuid, uuid, text, double precision, double precision) from public, anon;
grant execute on function public.submit_spot_claim_proof(uuid, uuid, text, double precision, double precision) to authenticated;

-- Retire any location-only direct-claim overloads that may exist on an older/live schema.
-- They bypass video judging and conflict with the verified King of the Hill workflow.
do $$
declare
  r record;
begin
  for r in
    select p.oid::regprocedure as signature
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'claim_spot_verified'
  loop
    execute 'revoke all on function ' || r.signature || ' from public, anon, authenticated';
  end loop;
end $$;
