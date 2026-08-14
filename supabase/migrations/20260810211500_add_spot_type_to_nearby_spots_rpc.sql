-- Expose spot_type from get_nearby_spots() so map type filters receive
-- the real database category. The prior RPC also declared UUID columns as TEXT,
-- which caused a runtime return-type mismatch on the live schema.
DROP FUNCTION IF EXISTS public.get_nearby_spots(
  double precision,
  double precision,
  integer
);

CREATE FUNCTION public.get_nearby_spots(
  lat double precision,
  lng double precision,
  radius_meters integer DEFAULT 50000
)
RETURNS TABLE (
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
    s.id,
    s.name,
    s.latitude,
    s.longitude,
    s.difficulty,
    s.tricks,
    s.rating,
    s.image_url,
    s.added_by,
    s.created_at,
    s.sponsor_name,
    s.sponsor_url,
    s.sponsor_logo_url,
    s.spot_type,
    ST_Distance(
      ST_MakePoint(lng, lat)::geography,
      ST_MakePoint(s.longitude, s.latitude)::geography
    ) AS distance_meters
  FROM public.skate_spots s
  WHERE ST_DWithin(
    ST_MakePoint(lng, lat)::geography,
    ST_MakePoint(s.longitude, s.latitude)::geography,
    radius_meters
  )
  ORDER BY distance_meters ASC
  LIMIT 500;
$function$;

REVOKE ALL ON FUNCTION public.get_nearby_spots(
  double precision,
  double precision,
  integer
) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.get_nearby_spots(
  double precision,
  double precision,
  integer
) TO anon, authenticated;
