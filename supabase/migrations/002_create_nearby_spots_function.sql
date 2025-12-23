-- Create function to get nearby skate spots using PostGIS
-- This function is used by the MapScreen to load spots within a radius

CREATE OR REPLACE FUNCTION get_nearby_spots(
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  radius_meters INTEGER DEFAULT 50000
)
RETURNS TABLE (
  id TEXT,
  name TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  difficulty TEXT,
  tricks TEXT[],
  rating DOUBLE PRECISION,
  image_url TEXT,
  added_by TEXT,
  created_at TIMESTAMP WITH TIME ZONE,
  sponsor_name TEXT,
  sponsor_url TEXT,
  sponsor_logo_url TEXT,
  distance_meters DOUBLE PRECISION
) AS $$
BEGIN
  RETURN QUERY
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
    ST_Distance(
      ST_MakePoint(lng, lat)::geography,
      ST_MakePoint(s.longitude, s.latitude)::geography
    ) as distance_meters
  FROM skate_spots s
  WHERE ST_DWithin(
    ST_MakePoint(lng, lat)::geography,
    ST_MakePoint(s.longitude, s.latitude)::geography,
    radius_meters
  )
  ORDER BY distance_meters ASC
  LIMIT 500;
END;
$$ LANGUAGE plpgsql STABLE;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_nearby_spots(DOUBLE PRECISION, DOUBLE PRECISION, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_nearby_spots(DOUBLE PRECISION, DOUBLE PRECISION, INTEGER) TO anon;
