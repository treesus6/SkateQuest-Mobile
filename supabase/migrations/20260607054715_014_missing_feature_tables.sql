
-- trick_analyses: stores AI trick analysis results from UploadMediaScreen
CREATE TABLE IF NOT EXISTS trick_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  trick_name TEXT NOT NULL,
  difficulty TEXT,
  xp_value INTEGER DEFAULT 0,
  style_notes TEXT,
  video_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE trick_analyses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own analyses" ON trick_analyses FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own analyses" ON trick_analyses FOR INSERT WITH CHECK (auth.uid() = user_id);

-- media_hype_users: tracks who hyped what media (FeedScreen)
CREATE TABLE IF NOT EXISTS media_hype_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  media_id UUID NOT NULL,
  hype_count INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, media_id)
);
ALTER TABLE media_hype_users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own hype" ON media_hype_users FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Anyone can view hype" ON media_hype_users FOR SELECT USING (true);

-- clip_votes: tracks votes on TrickOfWeekScreen submissions
CREATE TABLE IF NOT EXISTS clip_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  submission_id UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, submission_id)
);
ALTER TABLE clip_votes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own votes" ON clip_votes FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Anyone can view votes" ON clip_votes FOR SELECT USING (true);

-- scene_entries: The Scene community map pins
CREATE TABLE IF NOT EXISTS scene_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  category TEXT DEFAULT 'shop',
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  website_url TEXT,
  instagram_url TEXT,
  image_url TEXT,
  is_verified BOOLEAN DEFAULT FALSE,
  added_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE scene_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view scene entries" ON scene_entries FOR SELECT USING (true);
CREATE POLICY "Authenticated users can add entries" ON scene_entries FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Insert Portal Dimension as the first scene entry (Kevin's shop, Newport OR)
INSERT INTO scene_entries (name, description, category, latitude, longitude, website_url, is_verified)
VALUES (
  'Portal Dimension',
  'Independent skate shop in Newport, OR. Core of the Lincoln City coast skate scene.',
  'shop',
  44.6368,
  -124.0537,
  'https://portaldimension.com',
  TRUE
) ON CONFLICT DO NOTHING;

-- callouts: skater-to-skater trick challenges (used in callouts feature)
CREATE TABLE IF NOT EXISTS callouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenger_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  challenged_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  trick_name TEXT NOT NULL,
  park_id TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'completed', 'declined', 'expired')),
  challenger_video_url TEXT,
  challenged_video_url TEXT,
  winner_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  xp_stake INTEGER DEFAULT 50,
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days'),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE callouts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own callouts" ON callouts FOR SELECT USING (auth.uid() = challenger_id OR auth.uid() = challenged_id);
CREATE POLICY "Users can create callouts" ON callouts FOR INSERT WITH CHECK (auth.uid() = challenger_id);
CREATE POLICY "Users can update own callouts" ON callouts FOR UPDATE USING (auth.uid() = challenger_id OR auth.uid() = challenged_id);

-- forecast_cache: caches weather/skate forecast data (SkateForecastScreen)
CREATE TABLE IF NOT EXISTS forecast_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_key TEXT NOT NULL UNIQUE,
  forecast_data JSONB NOT NULL,
  skate_score INTEGER DEFAULT 0,
  conditions TEXT,
  cached_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '1 hour')
);
ALTER TABLE forecast_cache ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read forecast cache" ON forecast_cache FOR SELECT USING (true);
CREATE POLICY "Service role can write forecast cache" ON forecast_cache FOR ALL USING (auth.role() = 'service_role');

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_trick_analyses_user ON trick_analyses(user_id);
CREATE INDEX IF NOT EXISTS idx_media_hype_users_media ON media_hype_users(media_id);
CREATE INDEX IF NOT EXISTS idx_clip_votes_submission ON clip_votes(submission_id);
CREATE INDEX IF NOT EXISTS idx_callouts_challenger ON callouts(challenger_id);
CREATE INDEX IF NOT EXISTS idx_callouts_challenged ON callouts(challenged_id);
CREATE INDEX IF NOT EXISTS idx_scene_entries_location ON scene_entries(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_forecast_cache_location ON forecast_cache(location_key);


