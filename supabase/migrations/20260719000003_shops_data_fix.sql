-- Same orphaned-data pattern as skateparks: 40 real skate shops (name, address,
-- phone, website, verified) live in `skate_shop_locations`, but shopsService.getAll()
-- read from the empty `skate_shops` table (see lib/shopsService.ts fix in this
-- commit). shopsService.getNearby() also called a `get_nearby_shops` RPC that never
-- existed in the database at all — every call to it would have errored.

create or replace function public.get_nearby_shops(lat double precision, lng double precision, radius_km double precision default 10)
returns table(
  id uuid, shop_name text, address text, latitude double precision,
  longitude double precision, phone text, website text, verified boolean,
  distance_km double precision
)
language plpgsql
stable
set search_path = public, pg_temp
as $function$
begin
  return query
  select
    s.id, s.shop_name, s.address, s.latitude, s.longitude, s.phone, s.website, s.verified,
    ST_Distance(
      ST_MakePoint(lng, lat)::geography,
      ST_MakePoint(s.longitude, s.latitude)::geography
    ) / 1000 as distance_km
  from public.skate_shop_locations s
  where ST_DWithin(
    ST_MakePoint(lng, lat)::geography,
    ST_MakePoint(s.longitude, s.latitude)::geography,
    radius_km * 1000
  )
  order by distance_km asc
  limit 100;
end;
$function$;

drop policy if exists "anyone_can_view_shop_locations" on public.skate_shop_locations;
create policy "anyone_can_view_shop_locations" on public.skate_shop_locations
  for select
  to public
  using (true);
