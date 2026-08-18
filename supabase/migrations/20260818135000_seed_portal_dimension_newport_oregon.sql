-- Keep Portal Dimension map-only and tied to the real Newport, Oregon skatepark area.
-- This migration mirrors the production data so fresh Supabase environments do not drift.

insert into public.skate_shop_locations (
  id,
  shop_name,
  address,
  latitude,
  longitude,
  website,
  city,
  state,
  country,
  description,
  verified
)
values (
  'b5f2ad5b-32a2-404b-b802-835cd75a526d'::uuid,
  'Portal Dimension',
  'Near Newport Skatepark',
  44.64155,
  -124.05915,
  'https://portaldimension.com',
  'Newport',
  'OR',
  'USA',
  'SkateQuest map partner beside the Newport, Oregon skatepark.',
  false
)
on conflict (id) do update set
  shop_name = excluded.shop_name,
  address = excluded.address,
  latitude = excluded.latitude,
  longitude = excluded.longitude,
  website = excluded.website,
  city = excluded.city,
  state = excluded.state,
  country = excluded.country,
  description = excluded.description;

update public.skate_spots
set
  sponsor_name = 'Portal Dimension',
  sponsor_url = 'https://portaldimension.com',
  sponsor_logo_url = 'assets/supporters/portal-dimension.png'
where id = '95764ccf-5817-411a-ba66-6364f20b4367'::uuid
  and latitude between 44.63 and 44.65
  and longitude between -124.07 and -124.05;
