-- Treat blank legacy image_url values as missing so attached permanent
-- spot photos remain visible in nearby-map results.

CREATE OR REPLACE FUNCTION public.get_nearby_spots(
  lat double precision,
  lng double precision,
  radius_meters integer DEFAULT 50000
)
RETURNS TABLE(
  id uuid,
  name text,
  latitude double precision,
  longitude double precision,
  difficulty text,
  tricks text[],
  rating double precision,
  image_url text,
  added_by uuid,
  created_at timestamp with time zone,
  sponsor_name text,
  sponsor_url text,
  sponsor_logo_url text,
  spot_type text,
  distance_meters double precision
)
LANGUAGE sql
STABLE
SET search_path TO 'public', 'pg_temp'
AS $function$
  SELECT
    spot.id,
    spot.name,
    spot.latitude,
    spot.longitude,
    spot.difficulty,
    spot.tricks,
    spot.rating,
    COALESCE(
      NULLIF(btrim(spot.image_url), ''),
      (
        SELECT media.url
        FROM public.spot_photos AS photo
        JOIN public.media AS media ON media.id = photo.media_id
        WHERE photo.spot_id = spot.id
        ORDER BY photo.is_primary DESC NULLS LAST, photo.created_at ASC
        LIMIT 1
      )
    ) AS image_url,
    spot.added_by,
    spot.created_at,
    spot.sponsor_name,
    spot.sponsor_url,
    spot.sponsor_logo_url,
    spot.spot_type,
    ST_Distance(
      ST_MakePoint(lng, lat)::geography,
      ST_MakePoint(spot.longitude, spot.latitude)::geography
    ) AS distance_meters
  FROM public.skate_spots AS spot
  WHERE ST_DWithin(
    ST_MakePoint(lng, lat)::geography,
    ST_MakePoint(spot.longitude, spot.latitude)::geography,
    radius_meters
  )
  ORDER BY distance_meters ASC
  LIMIT 500;
$function$;
