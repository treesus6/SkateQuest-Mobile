# Run These SQL Commands in Supabase

Go to https://supabase.com/dashboard → Your Project → **SQL Editor** → Click **New query**

## STEP 1: Add Sponsor Fields (copy and run this)

```sql
-- Add sponsor fields to skate_spots table
ALTER TABLE skate_spots
ADD COLUMN IF NOT EXISTS sponsor_name TEXT,
ADD COLUMN IF NOT EXISTS sponsor_url TEXT,
ADD COLUMN IF NOT EXISTS sponsor_logo_url TEXT;

-- Add Portal Dimension to Newport Skate Park
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

-- Create index for faster sponsor queries
CREATE INDEX IF NOT EXISTS idx_skate_spots_sponsor ON skate_spots(sponsor_name) WHERE sponsor_name IS NOT NULL;
```

Click **Run** ✅

---

## STEP 2: Create Nearby Spots Function (copy and run this)

```sql
-- Create function to get nearby skate spots using PostGIS
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

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_nearby_spots(DOUBLE PRECISION, DOUBLE PRECISION, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_nearby_spots(DOUBLE PRECISION, DOUBLE PRECISION, INTEGER) TO anon;
```

Click **Run** ✅

---

## DONE! ✅

Now your database has:

- ✅ Sponsor fields for Portal Dimension (and future businesses)
- ✅ Newport Skate Park with Portal Dimension link
- ✅ Function for loading nearby spots on the map

---

## Test It Works

Run this to verify:

```sql
-- Check if Newport has Portal Dimension
SELECT name, sponsor_name, sponsor_url
FROM skate_spots
WHERE sponsor_name = 'Portal Dimension';

-- Test the nearby spots function (Newport coordinates)
SELECT name, sponsor_name, distance_meters
FROM get_nearby_spots(44.6369, -124.0533, 50000)
LIMIT 5;
```

If you see results, it worked! 🎉
