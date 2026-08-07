
CREATE TYPE sponsor_category AS ENUM (
  'skate_shop', 'clothing_brand', 'board_company', 'wheel_company',
  'truck_company', 'hardware_company', 'diy_supporter', 'media_crew',
  'event_organizer', 'other'
);

CREATE TABLE IF NOT EXISTS map_sponsors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  category sponsor_category NOT NULL DEFAULT 'skate_shop',
  tagline text,
  description text,
  website_url text,
  instagram_url text,
  youtube_url text,
  tiktok_url text,
  logo_url text,
  latitude double precision NOT NULL,
  longitude double precision NOT NULL,
  location geography(POINT, 4326) GENERATED ALWAYS AS (ST_MakePoint(longitude, latitude)) STORED,
  city text,
  state text,
  country text DEFAULT 'US',
  spot_id uuid REFERENCES skate_spots(id) ON DELETE SET NULL,
  active bool DEFAULT true,
  featured bool DEFAULT false,
  is_free_tier bool DEFAULT true,
  free_until date,
  added_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX idx_map_sponsors_location ON map_sponsors USING GIST(location);
CREATE INDEX idx_map_sponsors_active ON map_sponsors(active) WHERE active = true;
CREATE INDEX idx_map_sponsors_category ON map_sponsors(category);

ALTER TABLE map_sponsors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read active sponsors" ON map_sponsors
  FOR SELECT TO authenticated USING (active = true);
CREATE POLICY "Authenticated users can manage sponsors" ON map_sponsors
  FOR ALL USING (auth.uid() IS NOT NULL);

CREATE TABLE IF NOT EXISTS sponsor_clicks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sponsor_id uuid REFERENCES map_sponsors(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  clicked_at timestamptz DEFAULT now() NOT NULL,
  action text DEFAULT 'marker_tap',
  date date DEFAULT CURRENT_DATE NOT NULL
);

CREATE INDEX idx_sponsor_clicks_sponsor ON sponsor_clicks(sponsor_id);
CREATE INDEX idx_sponsor_clicks_date ON sponsor_clicks(sponsor_id, date);
ALTER TABLE sponsor_clicks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can insert clicks" ON sponsor_clicks FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can read own clicks" ON sponsor_clicks FOR SELECT USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION get_sponsor_stats(p_sponsor_id uuid)
RETURNS TABLE (
  total_clicks bigint, clicks_today bigint,
  clicks_this_week bigint, clicks_this_month bigint, unique_users bigint
) LANGUAGE plpgsql STABLE SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY SELECT
    COUNT(*)::bigint,
    COUNT(*) FILTER (WHERE date = CURRENT_DATE)::bigint,
    COUNT(*) FILTER (WHERE date >= CURRENT_DATE - 7)::bigint,
    COUNT(*) FILTER (WHERE date >= date_trunc('month', CURRENT_DATE)::date)::bigint,
    COUNT(DISTINCT user_id)::bigint
  FROM sponsor_clicks WHERE sponsor_id = p_sponsor_id;
END;
$$;

CREATE OR REPLACE FUNCTION get_nearby_sponsors(
  user_lat double precision, user_lng double precision,
  radius_meters double precision DEFAULT 50000
)
RETURNS TABLE (
  id uuid, name text, category sponsor_category, tagline text,
  latitude double precision, longitude double precision,
  city text, state text, logo_url text, website_url text,
  instagram_url text, featured bool, distance_meters double precision
) LANGUAGE plpgsql STABLE AS $$
BEGIN
  RETURN QUERY
  SELECT s.id, s.name, s.category, s.tagline, s.latitude, s.longitude,
    s.city, s.state, s.logo_url, s.website_url, s.instagram_url, s.featured,
    ST_Distance(s.location, ST_MakePoint(user_lng, user_lat)::geography) as distance_meters
  FROM map_sponsors s
  WHERE s.active = true
    AND ST_DWithin(s.location, ST_MakePoint(user_lng, user_lat)::geography, radius_meters)
  ORDER BY s.featured DESC, distance_meters ASC;
END;
$$;

INSERT INTO map_sponsors (
  name, category, tagline, description, website_url, instagram_url, logo_url,
  latitude, longitude, city, state, active, featured, is_free_tier, free_until
) VALUES (
  'Portal Dimension', 'clothing_brand', 'Newport''s underground skate brand',
  'Portal Dimension is Newport Oregon''s homegrown skate clothing brand. Supporting the local scene since day one.',
  'https://portaldimension.com', 'https://instagram.com/portaldimension',
  'supporters/portal-dimension.png',
  44.6368, -124.0537, 'Newport', 'OR',
  true, true, true, '2027-01-01'
);


