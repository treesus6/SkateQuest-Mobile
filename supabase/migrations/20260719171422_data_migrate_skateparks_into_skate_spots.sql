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

