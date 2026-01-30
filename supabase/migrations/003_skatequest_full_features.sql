-- SkateQuest Complete Features Migration
-- This migration adds all the features from the Gemini vision
-- Run this in Supabase SQL Editor

-- ============================================================
-- 1. UPDATE EXISTING TABLES
-- ============================================================

-- Add new columns to skate_spots table
ALTER TABLE skate_spots
  ADD COLUMN IF NOT EXISTS spot_type TEXT CHECK (spot_type IN ('park', 'street', 'diy', 'quest', 'shop')),
  ADD COLUMN IF NOT EXISTS obstacles TEXT[],
  ADD COLUMN IF NOT EXISTS bust_risk TEXT CHECK (bust_risk IN ('low', 'medium', 'high')),
  ADD COLUMN IF NOT EXISTS has_qr BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS crew_id UUID REFERENCES crews(id),
  ADD COLUMN IF NOT EXISTS reputation_points INTEGER DEFAULT 0;

-- Add daily_streak column to profiles
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS daily_streak INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_daily_challenge DATE;

-- ============================================================
-- 2. CHALLENGE SUBMISSIONS & VOTING (Judge's Booth)
-- ============================================================

CREATE TABLE IF NOT EXISTS challenge_submissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  challenge_id UUID REFERENCES challenges(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  video_url TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  stomped_votes INTEGER DEFAULT 0,
  bail_votes INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS submission_votes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  submission_id UUID REFERENCES challenge_submissions(id) ON DELETE CASCADE,
  voter_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  vote_type TEXT NOT NULL CHECK (vote_type IN ('stomped', 'bail')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(submission_id, voter_id)
);

CREATE INDEX IF NOT EXISTS idx_challenge_submissions_status ON challenge_submissions(status);
CREATE INDEX IF NOT EXISTS idx_submission_votes_submission ON submission_votes(submission_id);

-- ============================================================
-- 3. TERRITORY CONTROL (Crew Ownership)
-- ============================================================

CREATE TABLE IF NOT EXISTS crew_territories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  spot_id UUID REFERENCES skate_spots(id) ON DELETE CASCADE,
  crew_id UUID REFERENCES crews(id) ON DELETE CASCADE,
  total_points INTEGER DEFAULT 0,
  last_activity TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(spot_id, crew_id)
);

CREATE INDEX IF NOT EXISTS idx_crew_territories_spot ON crew_territories(spot_id);
CREATE INDEX IF NOT EXISTS idx_crew_territories_crew ON crew_territories(crew_id);

-- ============================================================
-- 4. KING OF THE HILL (Individual Spot Claims)
-- ============================================================

CREATE TABLE IF NOT EXISTS spot_claims (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  spot_id UUID REFERENCES skate_spots(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  video_url TEXT NOT NULL,
  trick_description TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'dethroned')),
  claimed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_spot_claims_spot ON spot_claims(spot_id);
CREATE INDEX IF NOT EXISTS idx_spot_claims_status ON spot_claims(status);

-- ============================================================
-- 5. QR GEOCACHING SYSTEM
-- ============================================================

CREATE TABLE IF NOT EXISTS qr_scans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  spot_id UUID REFERENCES skate_spots(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  qr_code TEXT NOT NULL,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  distance_from_spot DOUBLE PRECISION,
  scanned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(spot_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_qr_scans_spot ON qr_scans(spot_id);
CREATE INDEX IF NOT EXISTS idx_qr_scans_user ON qr_scans(user_id);

-- ============================================================
-- 6. GHOST CLIPS (Unlockable Videos)
-- ============================================================

CREATE TABLE IF NOT EXISTS ghost_clips (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  spot_id UUID REFERENCES skate_spots(id) ON DELETE CASCADE,
  video_url TEXT NOT NULL,
  title TEXT,
  description TEXT,
  uploaded_by UUID REFERENCES profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_unlocks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  ghost_clip_id UUID REFERENCES ghost_clips(id) ON DELETE CASCADE,
  unlocked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, ghost_clip_id)
);

CREATE INDEX IF NOT EXISTS idx_ghost_clips_spot ON ghost_clips(spot_id);
CREATE INDEX IF NOT EXISTS idx_user_unlocks_user ON user_unlocks(user_id);

-- ============================================================
-- 7. ACTIVITY FEED
-- ============================================================

CREATE TABLE IF NOT EXISTS activity_feed (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  xp_earned INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_activity_feed_user ON activity_feed(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_feed_created ON activity_feed(created_at DESC);

-- ============================================================
-- 8. USER ACHIEVEMENTS (For Confetti)
-- ============================================================

CREATE TABLE IF NOT EXISTS user_achievements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  achievement_type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_achievements_user ON user_achievements(user_id);

-- ============================================================
-- 9. SHOP DEALS & REDEMPTIONS
-- ============================================================

CREATE TABLE IF NOT EXISTS shop_deals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shop_id UUID REFERENCES skate_shops(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  xp_cost INTEGER DEFAULT 0,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS deal_redemptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  deal_id UUID REFERENCES shop_deals(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  redemption_code TEXT UNIQUE NOT NULL,
  redeemed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '24 hours'),
  used BOOLEAN DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_shop_deals_shop ON shop_deals(shop_id);
CREATE INDEX IF NOT EXISTS idx_deal_redemptions_user ON deal_redemptions(user_id);

-- ============================================================
-- 10. SPOT STATUS SYSTEM
-- ============================================================

CREATE TABLE IF NOT EXISTS spot_status_updates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  spot_id UUID REFERENCES skate_spots(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  status_type TEXT NOT NULL CHECK (status_type IN ('bondo_needed', 'security_active', 'dry', 'wet')),
  note TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_spot_status_spot ON spot_status_updates(spot_id);
CREATE INDEX IF NOT EXISTS idx_spot_status_created ON spot_status_updates(created_at DESC);

-- ============================================================
-- 11. DAILY HOTSPOTS
-- ============================================================

CREATE TABLE IF NOT EXISTS daily_hotspots (
  id SERIAL PRIMARY KEY,
  spot_id UUID REFERENCES skate_spots(id) ON DELETE CASCADE,
  bonus_multiplier FLOAT DEFAULT 3.0,
  active_date DATE DEFAULT CURRENT_DATE UNIQUE
);

-- ============================================================
-- 12. SPOT REPORTS (Moderation)
-- ============================================================

CREATE TABLE IF NOT EXISTS spot_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  spot_id UUID REFERENCES skate_spots(id) ON DELETE CASCADE,
  reporter_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  resolved BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_spot_reports_resolved ON spot_reports(resolved);

-- ============================================================
-- 13. VIEWS & HELPER FUNCTIONS
-- ============================================================

-- Crew Leaderboard View
CREATE OR REPLACE VIEW crew_leaderboard AS
SELECT
  c.id,
  c.name,
  c.color_hex,
  COUNT(DISTINCT ct.spot_id) as spots_held,
  COALESCE(SUM(ct.total_points), 0) as total_points
FROM crews c
LEFT JOIN crew_territories ct ON ct.crew_id = c.id
GROUP BY c.id, c.name, c.color_hex
ORDER BY total_points DESC, spots_held DESC;

-- User Level Calculator
CREATE OR REPLACE FUNCTION get_user_level(user_xp INTEGER)
RETURNS INTEGER AS $$
BEGIN
  RETURN FLOOR(user_xp / 1000) + 1;
END;
$$ LANGUAGE plpgsql;

-- Shop Deal Redemption Function
CREATE OR REPLACE FUNCTION redeem_shop_deal(
  p_user_id UUID,
  p_deal_id UUID
) RETURNS TABLE(code TEXT, expires_at TIMESTAMP WITH TIME ZONE) AS $$
DECLARE
  v_code TEXT;
  v_xp_cost INTEGER;
  v_user_xp INTEGER;
  v_expires TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Get deal cost
  SELECT xp_cost INTO v_xp_cost FROM shop_deals WHERE id = p_deal_id;

  -- Get user XP
  SELECT xp INTO v_user_xp FROM profiles WHERE id = p_user_id;

  -- Check if user has enough XP
  IF v_user_xp < v_xp_cost THEN
    RAISE EXCEPTION 'Not enough XP';
  END IF;

  -- Generate unique code
  v_code := 'SQ-' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 8));
  v_expires := NOW() + INTERVAL '24 hours';

  -- Deduct XP
  UPDATE profiles SET xp = xp - v_xp_cost WHERE id = p_user_id;

  -- Create redemption
  INSERT INTO deal_redemptions (deal_id, user_id, redemption_code, expires_at)
  VALUES (p_deal_id, p_user_id, v_code, v_expires);

  RETURN QUERY SELECT v_code, v_expires;
END;
$$ LANGUAGE plpgsql;

-- Daily Hotspot Refresh Function
CREATE OR REPLACE FUNCTION refresh_daily_hotspot()
RETURNS VOID AS $$
BEGIN
  INSERT INTO daily_hotspots (spot_id, active_date)
  SELECT id, CURRENT_DATE
  FROM skate_spots
  WHERE spot_type IN ('park', 'street', 'diy')
  ORDER BY RANDOM()
  LIMIT 1
  ON CONFLICT (active_date) DO NOTHING;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 14. ROW LEVEL SECURITY (RLS)
-- ============================================================

-- Enable RLS on new tables
ALTER TABLE challenge_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE submission_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE crew_territories ENABLE ROW LEVEL SECURITY;
ALTER TABLE spot_claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE qr_scans ENABLE ROW LEVEL SECURITY;
ALTER TABLE ghost_clips ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_unlocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_feed ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE shop_deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE deal_redemptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE spot_status_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_hotspots ENABLE ROW LEVEL SECURITY;
ALTER TABLE spot_reports ENABLE ROW LEVEL SECURITY;

-- RLS Policies (Public read, authenticated write)
CREATE POLICY "Public can view challenge submissions" ON challenge_submissions FOR SELECT USING (true);
CREATE POLICY "Users can create submissions" ON challenge_submissions FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Public can view votes" ON submission_votes FOR SELECT USING (true);
CREATE POLICY "Users can vote" ON submission_votes FOR INSERT WITH CHECK (auth.uid() = voter_id);

CREATE POLICY "Public can view territories" ON crew_territories FOR SELECT USING (true);
CREATE POLICY "Authenticated users can capture territory" ON crew_territories FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Public can view spot claims" ON spot_claims FOR SELECT USING (true);
CREATE POLICY "Users can claim spots" ON spot_claims FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their QR scans" ON qr_scans FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can record scans" ON qr_scans FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Public can view ghost clips" ON ghost_clips FOR SELECT USING (true);
CREATE POLICY "Users can upload ghost clips" ON ghost_clips FOR INSERT WITH CHECK (auth.uid() = uploaded_by);

CREATE POLICY "Users can view their unlocks" ON user_unlocks FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can unlock clips" ON user_unlocks FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Public can view activity feed" ON activity_feed FOR SELECT USING (true);
CREATE POLICY "System can create activities" ON activity_feed FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can view achievements" ON user_achievements FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "System can create achievements" ON user_achievements FOR INSERT WITH CHECK (true);

CREATE POLICY "Public can view shop deals" ON shop_deals FOR SELECT USING (true);

CREATE POLICY "Users can view their redemptions" ON deal_redemptions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "System can create redemptions" ON deal_redemptions FOR INSERT WITH CHECK (true);

CREATE POLICY "Public can view spot status" ON spot_status_updates FOR SELECT USING (true);
CREATE POLICY "Users can update spot status" ON spot_status_updates FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Public can view hotspots" ON daily_hotspots FOR SELECT USING (true);

CREATE POLICY "Users can view reports" ON spot_reports FOR SELECT USING (auth.uid() = reporter_id);
CREATE POLICY "Users can create reports" ON spot_reports FOR INSERT WITH CHECK (auth.uid() = reporter_id);

-- ============================================================
-- MIGRATION COMPLETE
-- ============================================================

-- Grant permissions
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO postgres, anon, authenticated, service_role;

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ SkateQuest Full Features Migration Complete!';
  RAISE NOTICE '   - Judge''s Booth (voting system)';
  RAISE NOTICE '   - Territory Control (crew ownership)';
  RAISE NOTICE '   - King of the Hill (individual claims)';
  RAISE NOTICE '   - QR Geocaching (GPS proximity)';
  RAISE NOTICE '   - Ghost Clips (unlockable videos)';
  RAISE NOTICE '   - Activity Feed & Achievements';
  RAISE NOTICE '   - Shop Deals & Redemptions';
  RAISE NOTICE '   - Spot Status System';
  RAISE NOTICE '   - Daily Hotspots';
  RAISE NOTICE '   - Bounty System (via created_at)';
  RAISE NOTICE '   - Hot Streak Tracking';
END $$;
