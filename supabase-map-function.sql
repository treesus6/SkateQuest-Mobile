-- Function to get nearby skate spots using PostGIS
-- This function efficiently queries spots within a given radius from a lat/lng point
-- Usage: SELECT * FROM get_nearby_spots(37.7749, -122.4194, 50000);

CREATE OR REPLACE FUNCTION get_nearby_spots(
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  radius_meters INTEGER DEFAULT 50000
)
RETURNS TABLE (
  id UUID,
  name TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  difficulty TEXT,
  tricks TEXT[],
  rating NUMERIC,
  added_by UUID,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE
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
    s.added_by,
    s.created_at,
    s.updated_at
  FROM skate_spots s
  WHERE ST_DWithin(
    s.location::geography,
    ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography,
    radius_meters
  )
  ORDER BY ST_Distance(
    s.location::geography,
    ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography
  )
  LIMIT 500;
END;
$$ LANGUAGE plpgsql STABLE;

-- Grant access to authenticated users
GRANT EXECUTE ON FUNCTION get_nearby_spots(DOUBLE PRECISION, DOUBLE PRECISION, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_nearby_spots(DOUBLE PRECISION, DOUBLE PRECISION, INTEGER) TO anon;

-- Create a spatial index on the location column for better performance
CREATE INDEX IF NOT EXISTS idx_skate_spots_location ON skate_spots USING GIST (location);
