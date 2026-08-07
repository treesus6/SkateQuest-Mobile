-- ============================================
-- COMPLETE FIX FOR ACHIEVEMENTS & REWARDS
-- ============================================

-- Fix reward_codes table - add missing columns if needed
DO $$
BEGIN
  -- Add user_id column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'reward_codes' AND column_name = 'user_id') THEN
    ALTER TABLE reward_codes ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;

  -- Add sponsorship_id column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'reward_codes' AND column_name = 'sponsorship_id') THEN
    ALTER TABLE reward_codes ADD COLUMN sponsorship_id UUID;
  END IF;

  -- Add code column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'reward_codes' AND column_name = 'code') THEN
    ALTER TABLE reward_codes ADD COLUMN code TEXT;
  END IF;

  -- Add expires_at column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'reward_codes' AND column_name = 'expires_at') THEN
    ALTER TABLE reward_codes ADD COLUMN expires_at TIMESTAMPTZ;
  END IF;

  -- Add redeemed column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'reward_codes' AND column_name = 'redeemed') THEN
    ALTER TABLE reward_codes ADD COLUMN redeemed BOOLEAN DEFAULT FALSE;
  END IF;
END $$;

-- Drop and recreate city_war_stats view
DROP VIEW IF EXISTS city_war_stats;

CREATE VIEW city_war_stats AS
SELECT
  c.id as crew_id,
  c.name as crew_name,
  c.color_hex,
  COUNT(DISTINCT s.id)::INTEGER as spots_owned,
  COUNT(DISTINCT cm.user_id)::INTEGER as total_members,
  COALESCE(SUM(p.xp), 0)::BIGINT as total_xp
FROM crews c
LEFT JOIN spots s ON s.crew_id = c.id
LEFT JOIN crew_members cm ON cm.crew_id = c.id
LEFT JOIN profiles p ON p.id = cm.user_id
GROUP BY c.id, c.name, c.color_hex
ORDER BY spots_owned DESC;

-- RPC function to redeem shop deals
CREATE OR REPLACE FUNCTION redeem_shop_deal(
  p_user_id UUID,
  p_sponsorship_id UUID,
  p_xp_cost INTEGER
) RETURNS JSON AS $$
DECLARE
  v_code TEXT;
  v_expires TIMESTAMPTZ;
  v_result JSON;
BEGIN
  UPDATE profiles
  SET xp = xp - p_xp_cost
  WHERE id = p_user_id AND xp >= p_xp_cost;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Insufficient XP';
  END IF;

  v_code := UPPER(SUBSTRING(MD5(RANDOM()::TEXT || NOW()::TEXT) FROM 1 FOR 8));
  v_expires := NOW() + INTERVAL '30 days';

  INSERT INTO reward_codes (user_id, sponsorship_id, code, expires_at)
  VALUES (p_user_id, p_sponsorship_id, v_code, v_expires)
  RETURNING json_build_object(
    'id', id,
    'code', code,
    'expires_at', expires_at
  ) INTO v_result;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enable RLS
ALTER TABLE achievements ENABLE ROW LEVEL SECURITY;

ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;

ALTER TABLE reward_codes ENABLE ROW LEVEL SECURITY;

-- Drop all existing policies first
DROP POLICY IF EXISTS "Achievements are viewable by all" ON achievements;

DROP POLICY IF EXISTS "Users can view their own achievements" ON user_achievements;

DROP POLICY IF EXISTS "System can insert user achievements" ON user_achievements;

DROP POLICY IF EXISTS "Users can update their own achievements" ON user_achievements;

DROP POLICY IF EXISTS "Users can view their own reward codes" ON reward_codes;

-- Create policies
CREATE POLICY "Achievements are viewable by all" ON achievements FOR SELECT USING (true);

CREATE POLICY "Users can view their own achievements" ON user_achievements FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can insert user achievements" ON user_achievements FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update their own achievements" ON user_achievements FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own reward codes" ON reward_codes FOR SELECT USING (auth.uid() = user_id);

-- Ensure achievements have data
INSERT INTO achievements (name, description, icon, xp_reward, requirement_type, requirement_value, category, rarity) VALUES
('First Blood', 'Claim your first spot', '⚔️', 100, 'spots_claimed', 1, 'territory', 'common'),
('Turf Lord', 'Own 5 spots simultaneously', '👑', 500, 'spots_owned', 5, 'territory', 'rare'),
('City Conqueror', 'Own 25 spots simultaneously', '🏰', 2000, 'spots_owned', 25, 'territory', 'legendary'),
('Judge Judy', 'Cast 50 votes in the Judges Booth', '⚖️', 300, 'votes_cast', 50, 'social', 'rare'),
('Kingmaker', 'Help crown 10 new kings', '🎭', 500, 'kings_crowned', 10, 'social', 'epic'),
('Trick Master', 'Land 100 tricks', '🛹', 1000, 'tricks_landed', 100, 'tricks', 'epic'),
('Explorer', 'Visit 20 different spots', '🗺️', 250, 'spots_visited', 20, 'explorer', 'rare'),
('DIY Hero', 'Fix 5 DIY spots', '🔨', 750, 'diy_fixed', 5, 'special', 'epic'),
('Rookie', 'Complete your first session', '🌟', 50, 'sessions_completed', 1, 'explorer', 'common'),
('Regular', 'Complete 10 sessions', '⭐', 200, 'sessions_completed', 10, 'explorer', 'rare'),
('Defender', 'Successfully defend your throne 3 times', '🛡️', 400, 'throne_defended', 3, 'territory', 'epic'),
('Social Butterfly', 'Join a crew', '🦋', 100, 'crew_joined', 1, 'social', 'common'),
('Crew Leader', 'Create your own crew', '🚩', 300, 'crew_created', 1, 'social', 'rare')
ON CONFLICT DO NOTHING;

-- Success message
SELECT 'Achievements & Rewards schema complete!' as status

