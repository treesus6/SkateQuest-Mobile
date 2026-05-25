-- ============================================================
-- Migration 005: New Features
-- Hype System, Active Sessions, XP Rewards Enhancements
-- ============================================================

-- ============================================================
-- 1. HYPE SYSTEM (replaces simple likes with multi-tap hype)
-- ============================================================

-- Total hype count per media item
CREATE TABLE IF NOT EXISTS media_hype (
  media_id UUID PRIMARY KEY REFERENCES media(id) ON DELETE CASCADE,
  total_hype INTEGER DEFAULT 0 NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Per-user hype count per media item (max 50 per user)
CREATE TABLE IF NOT EXISTS media_hype_users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  media_id UUID REFERENCES media(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  hype_count INTEGER DEFAULT 0 CHECK (hype_count >= 0 AND hype_count <= 50),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(media_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_media_hype_media ON media_hype(media_id);
CREATE INDEX IF NOT EXISTS idx_media_hype_users_media ON media_hype_users(media_id);
CREATE INDEX IF NOT EXISTS idx_media_hype_users_user ON media_hype_users(user_id);

-- RPC: Increment media hype total atomically
CREATE OR REPLACE FUNCTION increment_media_hype(
  p_media_id UUID,
  p_increment INTEGER DEFAULT 1
) RETURNS VOID AS $$
BEGIN
  INSERT INTO media_hype (media_id, total_hype, updated_at)
  VALUES (p_media_id, p_increment, NOW())
  ON CONFLICT (media_id)
  DO UPDATE SET
    total_hype = media_hype.total_hype + p_increment,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 2. ACTIVE SESSIONS (live session tracking with health sync)
-- ============================================================

CREATE TABLE IF NOT EXISTS active_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  spot_id UUID REFERENCES skate_spots(id) ON DELETE SET NULL,
  spot_name TEXT,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ended_at TIMESTAMP WITH TIME ZONE,
  duration_minutes INTEGER,
  tricks_logged INTEGER DEFAULT 0,
  calories_burned INTEGER,
  xp_earned INTEGER DEFAULT 0,
  synced_to_health BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_active_sessions_user ON active_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_active_sessions_started ON active_sessions(started_at DESC);

-- ============================================================
-- 3. SHOP DEALS ENHANCEMENTS
-- Add discount_percent and deal_type to existing shop_deals
-- ============================================================

ALTER TABLE shop_deals
  ADD COLUMN IF NOT EXISTS discount_percent INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS deal_type TEXT DEFAULT 'discount'
    CHECK (deal_type IN ('discount', 'freebie', 'bundle', 'event')),
  ADD COLUMN IF NOT EXISTS image_url TEXT,
  ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP WITH TIME ZONE;

-- ============================================================
-- 4. TRICK SPOT PREFERENCES (optional user preference for spot types)
-- ============================================================

CREATE TABLE IF NOT EXISTS user_spot_preferences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE UNIQUE,
  preferred_obstacles TEXT[] DEFAULT '{}',
  preferred_difficulty TEXT DEFAULT 'any'
    CHECK (preferred_difficulty IN ('any', 'Beginner', 'Intermediate', 'Advanced')),
  search_radius_km INTEGER DEFAULT 10,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- 5. ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE media_hype ENABLE ROW LEVEL SECURITY;
ALTER TABLE media_hype_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE active_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_spot_preferences ENABLE ROW LEVEL SECURITY;

-- media_hype: anyone can read, authenticated users can insert/update via RPC
CREATE POLICY "media_hype_read" ON media_hype FOR SELECT USING (true);
CREATE POLICY "media_hype_write" ON media_hype FOR ALL USING (auth.role() = 'authenticated');

-- media_hype_users: users manage their own hype
CREATE POLICY "media_hype_users_read" ON media_hype_users FOR SELECT USING (true);
CREATE POLICY "media_hype_users_own" ON media_hype_users
  FOR ALL USING (auth.uid() = user_id);

-- active_sessions: users manage their own sessions
CREATE POLICY "active_sessions_own" ON active_sessions
  FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "active_sessions_read" ON active_sessions
  FOR SELECT USING (true);

-- user_spot_preferences: users manage their own preferences
CREATE POLICY "spot_prefs_own" ON user_spot_preferences
  FOR ALL USING (auth.uid() = user_id);

-- ============================================================
-- 6. SEED SAMPLE SHOP DEALS (for testing)
-- ============================================================

-- Note: These will only insert if the skate_shops table has rows.
-- In production, shop owners add their own deals via the admin panel.
DO $$
DECLARE
  v_shop_id UUID;
BEGIN
  SELECT id INTO v_shop_id FROM skate_shops LIMIT 1;
  IF v_shop_id IS NOT NULL THEN
    INSERT INTO shop_deals (shop_id, title, description, xp_cost, discount_percent, deal_type, active)
    VALUES
      (v_shop_id, '15% Off Any Deck', 'Show this code at checkout for 15% off any complete or deck.', 500, 15, 'discount', true),
      (v_shop_id, 'Free Grip Tape', 'Redeem for one free sheet of grip tape with any purchase.', 250, 0, 'freebie', true),
      (v_shop_id, '20% Off Trucks', 'Upgrade your setup — 20% off any trucks in stock.', 750, 20, 'discount', true),
      (v_shop_id, 'Sticker Pack', 'Free sticker pack — just show up and redeem!', 100, 0, 'freebie', true)
    ON CONFLICT DO NOTHING;
  END IF;
END $$;
