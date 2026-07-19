-- Root cause of "the map is empty": an earlier import successfully loaded 24,761
-- real skateparks (from OpenStreetMap, see scripts/fetch_skateparks.py) into the
-- `skateparks` table, but the app's map/spots code (spotsService, get_nearby_spots)
-- has only ever queried `skate_spots`, which had 3 rows. The two tables were never
-- reconciled. This copies the orphaned data into the table the app actually reads.

insert into public.skate_spots (
  id, name, latitude, longitude, rating, image_url, created_at,
  sponsor_name, sponsor_url, sponsor_logo_url, spot_type, obstacles,
  bust_risk, has_qr, status
)
select
  id, name, latitude, longitude, rating_avg, photo_url, created_at,
  sponsor_name, sponsor_url, sponsor_logo_url, spot_type, obstacles,
  bust_risk, coalesce(has_qr, false), coalesce(current_status, 'active')
from public.skateparks
where latitude is not null and longitude is not null
on conflict (id) do nothing;
