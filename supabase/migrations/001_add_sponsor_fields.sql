-- Add sponsor fields to skate_spots table
ALTER TABLE skate_spots
ADD COLUMN IF NOT EXISTS sponsor_name TEXT,
ADD COLUMN IF NOT EXISTS sponsor_url TEXT,
ADD COLUMN IF NOT EXISTS sponsor_logo_url TEXT;

-- Add Portal Dimension to Newport Skate Park
-- Update based on exact park name in your database
UPDATE skate_spots
SET
  sponsor_name = 'Portal Dimension',
  sponsor_url = 'https://portaldimension.com'
WHERE id = (
  SELECT id FROM skate_spots
  WHERE name ILIKE '%newport%'
  LIMIT 1
);

-- Create index for faster sponsor queries
CREATE INDEX IF NOT EXISTS idx_skate_spots_sponsor ON skate_spots(sponsor_name) WHERE sponsor_name IS NOT NULL;
