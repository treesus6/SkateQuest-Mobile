alter table public.skate_shop_locations
  add column if not exists last_verified_at timestamptz,
  add column if not exists verification_source text;

update public.skate_shop_locations
set verified = false,
    last_verified_at = null,
    verification_source = null;

delete from public.skate_shop_locations
where shop_name = 'Asphalt Beach'
  and address = '961 Woodland St, Nashville, TN 37206';

update public.skate_shop_locations
set address = '924 W Wilson Ave, Chicago, IL 60640'
where shop_name = 'Citizen Skate Shop';

update public.skate_shop_locations as s
set verified = true,
    last_verified_at = now(),
    verification_source = v.source,
    website = coalesce(v.website, s.website)
from (values
 ('Freedom Board Shop','https://www.freedomboardshop.com/service/about/','https://www.freedomboardshop.com'),
 ('Cowtown Skateboards','https://www.cowtownskateboards.com/','https://www.cowtownskateboards.com'),
 ('Sidewalk Surfer','https://sidewalksurfer.com/','https://sidewalksurfer.com'),
 ('LA Skate Co.','https://laskate.com/','https://laskate.com'),
 ('Non Factory','https://www.instagram.com/nonfactoryskateshop/','https://www.instagram.com/nonfactoryskateshop/'),
 ('Warning Skate Shop','https://warningskateshop.online/','https://warningskateshop.online'),
 ('Deluxe Skateshop','https://dlxskateshop.com/pages/contact','https://dlxskateshop.com'),
 ('FTC Skateboarding','https://locations.vans.com/','https://ftcsf.com'),
 ('303 Boards','https://www.303boards.com/pages/locations','https://www.303boards.com'),
 ('Emage','https://businessden.com/','https://emagenetwork.com'),
 ('Andrew Skateshop','https://andrewmiami.com/','https://andrewmiami.com'),
 ('High Five Skate Shop','https://highfiveskateshop.com/pages/faq','https://highfiveskateshop.com'),
 ('Skate Plug','https://www.instagram.com/','https://www.instagram.com/skateplugatl/'),
 ('Citizen Skate Shop','https://citizenskateshop.com/contact/','https://citizenskateshop.com'),
 ('Uprise','https://upriseskateshop.com/pages/contact-us','https://upriseskateshop.com'),
 ('Orchard Skateshop','https://orchardshop.com/','https://orchardshop.com'),
 ('Help Boardshop and Indoor Skatepark','https://www.instagram.com/','https://helpboardshop.com'),
 ('Familia Skateboard Shop','https://familiaskate.com/','https://familiaskate.com'),
 ('Pharmacy Boardshop Las Vegas','https://locations.vans.com/','https://pharmacyboardshop.com'),
 ('Powder and Sun','https://powderandsunrideshop.com/','https://powderandsunrideshop.com'),
 ('Labor Skateboard Shop','https://laborskateshop.com/pages/faq','https://laborskateshop.com'),
 ('Uncle Funkys Boards','https://www.instagram.com/','https://www.instagram.com/unclefunkysboards/'),
 ('Upper West Skates','https://linktr.ee/upperwestskates','https://www.upperwestskates.com'),
 ('Substunce Skate Shop','https://www.substunce.com/','https://www.substunce.com'),
 ('Cal Skate Skateboards','https://calsk8.com','https://calsk8.com'),
 ('Commonwealth Skateboarding','https://cwskate.com/','https://cwskate.com'),
 ('Daddies Board Shop','https://www.daddiesboardshop.com/','https://www.daddiesboardshop.com'),
 ('Tactics Portland','https://www.tactics.com/info/portland-shop','https://www.tactics.com/info/portland-shop'),
 ('Nocturnal Skateshop','https://kineticskateboarding.com/','https://www.nocturnalphilly.com'),
 ('Zembo Temple of Skate and Design','https://zembo.square.site/','https://zembo.square.site'),
 ('Cecil''s Skate Shop','https://www.instagram.com/cecilsskateshop/','https://www.instagram.com/cecilsskateshop/'),
 ('No-Comply Skateshop','https://nocomplyatx.com/','https://nocomplyatx.com'),
 ('35th North Skate Shop','https://www.nikesb.com/skateshops/35th-north','https://35thnorth.com'),
 ('Black Market Skates','https://www.blackmarketskates.com/','https://www.blackmarketskates.com')
) as v(shop_name, source, website)
where s.shop_name = v.shop_name;

drop policy if exists "anyone_can_view_shop_locations" on public.skate_shop_locations;
create policy "anyone_can_view_verified_shop_locations"
on public.skate_shop_locations
for select
to public
using (verified = true);

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
  where s.verified = true
    and ST_DWithin(
      ST_MakePoint(lng, lat)::geography,
      ST_MakePoint(s.longitude, s.latitude)::geography,
      radius_km * 1000
    )
  order by distance_km asc
  limit 100;
end;
$function$;
