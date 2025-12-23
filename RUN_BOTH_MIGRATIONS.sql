-- ======================================
-- SKATEQUEST DATABASE MIGRATIONS
-- Copy this entire file and run in Supabase SQL Editor
-- ======================================

-- MIGRATION 1: Add Sponsor Fields
-- ======================================

ALTER TABLE skate_spots
ADD COLUMN IF NOT EXISTS sponsor_name TEXT,
ADD COLUMN IF NOT EXISTS sponsor_url TEXT,
ADD COLUMN IF NOT EXISTS sponsor_logo_url TEXT;

UPDATE skate_spots
SET
  sponsor_name = 'Portal Dimension',
  sponsor_url = 'https://portaldimension.com'
WHERE id = (
  SELECT id FROM skate_spots
  WHERE (
    name ILIKE '%newport%'
    OR city ILIKE '%newport%'
  )
  AND state ILIKE '%OR%'
  LIMIT 1
);

CREATE INDEX IF NOT EXISTS idx_skate_spots_sponsor ON skate_spots(sponsor_name) WHERE sponsor_name IS NOT NULL;


-- MIGRATION 2: Create Nearby Spots Function
-- ======================================

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

GRANT EXECUTE ON FUNCTION get_nearby_spots(DOUBLE PRECISION, DOUBLE PRECISION, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_nearby_spots(DOUBLE PRECISION, DOUBLE PRECISION, INTEGER) TO anon;
