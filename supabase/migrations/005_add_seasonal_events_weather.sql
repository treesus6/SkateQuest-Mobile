-- Phase 2: Seasonal Events + Weather Integration

-- ============================================================================
-- SEASONAL EVENTS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS seasonal_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  season TEXT NOT NULL CHECK (season IN ('spring', 'summer', 'fall', 'winter')),
  year INT NOT NULL,
  start_date TIMESTAMP NOT NULL,
  end_date TIMESTAMP NOT NULL,
  description TEXT,
  tier_count INT DEFAULT 5,  -- Number of tiers (Bronze to Ultimate)
  tier_rewards JSONB,  -- {tier1: {xp: 100, badge_name: "Bronze Skater"}, ...}
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_seasonal_events_active
  ON seasonal_events(start_date, end_date) WHERE start_date <= NOW() AND end_date > NOW();

ALTER TABLE seasonal_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view seasonal events"
  ON seasonal_events FOR SELECT TO public
  USING (true);

-- ============================================================================
-- SEASONAL USER PROGRESS TABLE (Tracks tier progression per user)
-- ============================================================================

CREATE TABLE IF NOT EXISTS seasonal_user_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  seasonal_event_id UUID NOT NULL REFERENCES seasonal_events(id) ON DELETE CASCADE,
  progress_value INT DEFAULT 0,  -- Points/progress toward next tier
  current_tier INT DEFAULT 0,  -- 0 = not started, 1-5 = tier unlocked
  max_tier_reached INT DEFAULT 0,  -- Highest tier ever reached in this season
  completed_at TIMESTAMP DEFAULT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, seasonal_event_id)
);

CREATE INDEX IF NOT EXISTS idx_seasonal_user_progress_user
  ON seasonal_user_progress(user_id);

CREATE INDEX IF NOT EXISTS idx_seasonal_user_progress_event_tier
  ON seasonal_user_progress(seasonal_event_id, current_tier DESC);

ALTER TABLE seasonal_user_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all seasonal progress"
  ON seasonal_user_progress FOR SELECT TO public
  USING (true);

CREATE POLICY "Service can update user progress"
  ON seasonal_user_progress FOR UPDATE TO authenticated
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- SPOT WEATHER TABLE (Cache hourly weather from OpenWeather API)
-- ============================================================================

CREATE TABLE IF NOT EXISTS spot_weather (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  spot_id UUID NOT NULL REFERENCES skate_spots(id) ON DELETE CASCADE,
  temperature NUMERIC(5, 2),  -- Celsius
  feels_like NUMERIC(5, 2),
  humidity INT CHECK (humidity BETWEEN 0 AND 100),
  wind_speed NUMERIC(5, 2),  -- m/s
  weather_main TEXT,  -- Clear, Clouds, Rain, Snow, Thunderstorm, Mist, etc.
  weather_description TEXT,  -- e.g., "scattered clouds"
  weather_icon TEXT,  -- OpenWeather icon code (01d, 02n, etc.)
  cloud_cover INT CHECK (cloud_cover BETWEEN 0 AND 100),
  precipitation NUMERIC(5, 2),  -- mm
  visibility INT,  -- meters
  uvi NUMERIC(3, 1),  -- UV index
  last_updated TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP,  -- TTL for cache (1 hour)
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_spot_weather_spot
  ON spot_weather(spot_id, last_updated DESC);

CREATE INDEX IF NOT EXISTS idx_spot_weather_expires
  ON spot_weather(expires_at) WHERE expires_at > NOW();

ALTER TABLE spot_weather ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view weather"
  ON spot_weather FOR SELECT TO public
  USING (true);

-- ============================================================================
-- SEED INITIAL SEASONAL EVENTS FOR 2026
-- ============================================================================

INSERT INTO seasonal_events (name, season, year, start_date, end_date, description, tier_count, tier_rewards)
VALUES
  (
    'Spring Shred 2026',
    'spring',
    2026,
    '2026-03-21'::timestamp,
    '2026-06-20'::timestamp,
    'Spring season challenge: Complete 25 spot check-ins to unlock tiers. Fresh parks, fresh vibes.',
    5,
    jsonb_build_object(
      'tier1', jsonb_build_object('xp', 100, 'threshold', 5, 'badge', 'Spring Rookie'),
      'tier2', jsonb_build_object('xp', 250, 'threshold', 10, 'badge', 'Spring Seeker'),
      'tier3', jsonb_build_object('xp', 500, 'threshold', 15, 'badge', 'Spring Champion'),
      'tier4', jsonb_build_object('xp', 750, 'threshold', 20, 'badge', 'Spring Legend'),
      'tier5', jsonb_build_object('xp', 1000, 'threshold', 25, 'badge', 'Spring Immortal')
    )
  ),
  (
    'Summer Grind 2026',
    'summer',
    2026,
    '2026-06-21'::timestamp,
    '2026-09-22'::timestamp,
    'Summer season challenge: Land 50 trick completions across all challenges.',
    5,
    jsonb_build_object(
      'tier1', jsonb_build_object('xp', 150, 'threshold', 5, 'badge', 'Summer Starter'),
      'tier2', jsonb_build_object('xp', 350, 'threshold', 15, 'badge', 'Summer Slayer'),
      'tier3', jsonb_build_object('xp', 600, 'threshold', 25, 'badge', 'Summer Shredder'),
      'tier4', jsonb_build_object('xp', 900, 'threshold', 40, 'badge', 'Summer Savage'),
      'tier5', jsonb_build_object('xp', 1250, 'threshold', 50, 'badge', 'Summer Supreme')
    )
  ),
  (
    'Fall Flow 2026',
    'fall',
    2026,
    '2026-09-23'::timestamp,
    '2026-12-20'::timestamp,
    'Fall season challenge: Earn 10,000 XP total. Cooler weather, hotter skating.',
    5,
    jsonb_build_object(
      'tier1', jsonb_build_object('xp', 200, 'threshold', 1000, 'badge', 'Fall Fledgling'),
      'tier2', jsonb_build_object('xp', 400, 'threshold', 3000, 'badge', 'Fall Fighter'),
      'tier3', jsonb_build_object('xp', 700, 'threshold', 5000, 'badge', 'Fall Fiend'),
      'tier4', jsonb_build_object('xp', 1000, 'threshold', 7500, 'badge', 'Fall Fanatic'),
      'tier5', jsonb_build_object('xp', 1500, 'threshold', 10000, 'badge', 'Fall Fortress')
    )
  ),
  (
    'Winter Wonder 2026',
    'winter',
    2026,
    '2026-12-21'::timestamp,
    '2027-03-20'::timestamp,
    'Winter season challenge: Complete 5 video uploads. Show your skills on frozen ground.',
    5,
    jsonb_build_object(
      'tier1', jsonb_build_object('xp', 150, 'threshold', 1, 'badge', 'Winter Warrior'),
      'tier2', jsonb_build_object('xp', 350, 'threshold', 2, 'badge', 'Winter Wizard'),
      'tier3', jsonb_build_object('xp', 650, 'threshold', 3, 'badge', 'Winter Wildcard'),
      'tier4', jsonb_build_object('xp', 1000, 'threshold', 4, 'badge', 'Winter Wanderer'),
      'tier5', jsonb_build_object('xp', 1500, 'threshold', 5, 'badge', 'Winter Warlord')
    )
  )
ON CONFLICT DO NOTHING;

-- ============================================================================
-- HELPER FUNCTION: Update seasonal user progress
-- ============================================================================

CREATE OR REPLACE FUNCTION update_seasonal_progress(
  p_user_id UUID,
  p_seasonal_event_id UUID,
  p_progress_increment INT
)
RETURNS TABLE(new_tier INT, tier_advanced BOOLEAN) AS $$
DECLARE
  v_current_progress INT;
  v_current_tier INT;
  v_tier_thresholds INT[] := ARRAY[0, 5, 10, 15, 20, 25];  -- Thresholds for tiers
  v_new_tier INT;
BEGIN
  -- Get current progress
  SELECT progress_value, current_tier
  INTO v_current_progress, v_current_tier
  FROM seasonal_user_progress
  WHERE user_id = p_user_id AND seasonal_event_id = p_seasonal_event_id;

  IF v_current_progress IS NULL THEN
    v_current_progress := 0;
    v_current_tier := 0;
  END IF;

  -- Calculate new progress
  v_new_tier := v_current_tier;
  v_current_progress := v_current_progress + p_progress_increment;

  -- Determine tier based on thresholds
  FOR i IN 1..5 LOOP
    IF v_current_progress >= v_tier_thresholds[i + 1] THEN
      v_new_tier := i;
    END IF;
  END LOOP;

  -- Update or insert progress record
  INSERT INTO seasonal_user_progress (user_id, seasonal_event_id, progress_value, current_tier, max_tier_reached)
  VALUES (p_user_id, p_seasonal_event_id, v_current_progress, v_new_tier, GREATEST(v_new_tier, COALESCE((SELECT max_tier_reached FROM seasonal_user_progress WHERE user_id = p_user_id AND seasonal_event_id = p_seasonal_event_id), 0)))
  ON CONFLICT (user_id, seasonal_event_id)
  DO UPDATE SET
    progress_value = v_current_progress,
    current_tier = GREATEST(v_new_tier, seasonal_user_progress.max_tier_reached),
    max_tier_reached = GREATEST(v_new_tier, seasonal_user_progress.max_tier_reached),
    updated_at = NOW();

  RETURN QUERY SELECT v_new_tier, v_new_tier > v_current_tier;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION update_seasonal_progress(UUID, UUID, INT) TO authenticated;
