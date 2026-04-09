-- Phase 1: Notifications & Achievements System

-- ============================================================================
-- NOTIFICATIONS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('challenge', 'crew', 'achievement', 'message', 'nearby', 'seasonal', 'system')),
  title TEXT NOT NULL,
  body TEXT,
  data JSONB DEFAULT NULL,  -- type-specific payload
  read_at TIMESTAMP DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_unread
  ON notifications(user_id, read_at DESC) WHERE read_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_notifications_user_created
  ON notifications(user_id, created_at DESC);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notifications"
  ON notifications FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Service can insert notifications"
  ON notifications FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update own notifications"
  ON notifications FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- ACHIEVEMENTS TABLE (Master list of all possible achievements)
-- ============================================================================

CREATE TABLE IF NOT EXISTS achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  description TEXT,
  icon_url TEXT,
  tier INT CHECK (tier BETWEEN 1 AND 5),  -- 1=Bronze ... 5=Platinum
  condition_type TEXT CHECK (condition_type IN ('spot_visits', 'tricks_landed', 'xp_earned', 'crew_member', 'video_uploaded', 'challenge_completed', 'spots_added', 'streak_days')),
  condition_value INT,  -- e.g., "visit 100 spots" or "land 50 tricks"
  xp_reward INT DEFAULT 50,
  created_at TIMESTAMP DEFAULT NOW()
);

ALTER TABLE achievements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view achievements"
  ON achievements FOR SELECT TO public
  USING (true);

-- ============================================================================
-- USER_ACHIEVEMENTS TABLE (Tracks which achievements user has unlocked)
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  achievement_id UUID NOT NULL REFERENCES achievements(id) ON DELETE CASCADE,
  unlocked_at TIMESTAMP DEFAULT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, achievement_id)
);

CREATE INDEX IF NOT EXISTS idx_user_achievements_user
  ON user_achievements(user_id);

CREATE INDEX IF NOT EXISTS idx_user_achievements_unlocked
  ON user_achievements(unlocked_at) WHERE unlocked_at IS NOT NULL;

ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all achievements"
  ON user_achievements FOR SELECT TO public
  USING (true);

CREATE POLICY "Service can insert achievements"
  ON user_achievements FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update own achievements"
  ON user_achievements FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- SEED INITIAL ACHIEVEMENTS
-- ============================================================================

INSERT INTO achievements (name, description, icon_url, tier, condition_type, condition_value, xp_reward)
VALUES
  ('First Steps', 'Visit your first skatepark', 'map-pin', 1, 'spot_visits', 1, 50),
  ('Local Expert', 'Visit 10 skateparks', 'map-pin', 2, 'spot_visits', 10, 100),
  ('Globe Trotter', 'Visit 50 skateparks', 'map-pin', 3, 'spot_visits', 50, 250),
  ('Spot Master', 'Visit 100 skateparks', 'map-pin', 4, 'spot_visits', 100, 500),
  ('World Skater', 'Visit 250 skateparks', 'map-pin', 5, 'spot_visits', 250, 1000),

  ('Landing Practice', 'Land your first trick', 'target', 1, 'tricks_landed', 1, 50),
  ('Trick Collector', 'Land 10 different tricks', 'target', 2, 'tricks_landed', 10, 100),
  ('Trick Master', 'Land 25 different tricks', 'target', 3, 'tricks_landed', 25, 250),
  ('Trick Legend', 'Land 50 different tricks', 'target', 4, 'tricks_landed', 50, 500),
  ('Trick God', 'Land 100 different tricks', 'target', 5, 'tricks_landed', 100, 1000),

  ('XP Grinder', 'Earn 500 XP', 'zap', 1, 'xp_earned', 500, 50),
  ('XP Warrior', 'Earn 5,000 XP', 'zap', 2, 'xp_earned', 5000, 100),
  ('XP Master', 'Earn 25,000 XP', 'zap', 3, 'xp_earned', 25000, 250),
  ('XP Legend', 'Earn 100,000 XP', 'zap', 4, 'xp_earned', 100000, 500),
  ('XP Immortal', 'Earn 500,000 XP', 'zap', 5, 'xp_earned', 500000, 1000),

  ('Crew Founder', 'Create your first crew', 'users', 2, 'crew_member', 1, 100),
  ('Crew Veteran', 'Join a crew', 'users', 1, 'crew_member', 1, 50),

  ('Video Star', 'Upload your first video', 'video', 1, 'video_uploaded', 1, 50),
  ('Documentary', 'Upload 5 videos', 'video', 2, 'video_uploaded', 5, 100),
  ('Studio Pro', 'Upload 20 videos', 'video', 3, 'video_uploaded', 20, 250),

  ('Challenge Completed', 'Complete your first challenge', 'trophy', 1, 'challenge_completed', 1, 50),
  ('Challenge Hunter', 'Complete 10 challenges', 'trophy', 2, 'challenge_completed', 10, 100),
  ('Challenge Master', 'Complete 50 challenges', 'trophy', 3, 'challenge_completed', 50, 250),

  ('Spot Contributor', 'Add your first skatepark', 'plus', 1, 'spots_added', 1, 75),
  ('Spot Scout', 'Add 5 skateparks', 'plus', 2, 'spots_added', 5, 150),
  ('Spot Curator', 'Add 25 skateparks', 'plus', 3, 'spots_added', 25, 300),

  ('On Fire', 'Build a 7-day streak', 'flame', 2, 'streak_days', 7, 100),
  ('Unstoppable', 'Build a 30-day streak', 'flame', 3, 'streak_days', 30, 250),
  ('Legendary Grind', 'Build a 100-day streak', 'flame', 5, 'streak_days', 100, 1000)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- HELPER FUNCTION: Auto-unlock achievements when conditions are met
-- ============================================================================

CREATE OR REPLACE FUNCTION check_and_unlock_achievements(p_user_id UUID)
RETURNS TABLE(achievement_id UUID, achievement_name TEXT) AS $$
DECLARE
  v_xp INT;
  v_level INT;
  v_spots_visited INT;
  v_tricks_landed INT;
  v_videos_uploaded INT;
  v_challenges_completed INT;
  v_spots_added INT;
  v_streak_days INT;
BEGIN
  -- Get user stats
  SELECT COALESCE(SUM(xp_earned), 0), COALESCE(MAX(level), 1)
  INTO v_xp, v_level
  FROM (
    SELECT xp, level FROM profiles WHERE id = p_user_id
  ) t;

  SELECT COUNT(DISTINCT spot_id) INTO v_spots_visited
  FROM activities WHERE user_id = p_user_id AND activity_type = 'spot_checkin';

  SELECT COUNT(DISTINCT trick_name) INTO v_tricks_landed
  FROM user_tricks WHERE user_id = p_user_id AND status != 'trying';

  SELECT COUNT(*) INTO v_videos_uploaded
  FROM media WHERE user_id = p_user_id AND type = 'video';

  SELECT COUNT(*) INTO v_challenges_completed
  FROM challenges WHERE completed_by_user = p_user_id;

  SELECT COUNT(*) INTO v_spots_added
  FROM skate_spots WHERE added_by = p_user_id;

  SELECT COALESCE(streak_days, 0) INTO v_streak_days
  FROM profiles WHERE id = p_user_id;

  -- Check each achievement condition and insert if unlocked and not already have it
  RETURN QUERY
  INSERT INTO user_achievements (user_id, achievement_id, unlocked_at)
  SELECT p_user_id, a.id, NOW()
  FROM achievements a
  WHERE
    -- Spot visits
    (a.condition_type = 'spot_visits' AND v_spots_visited >= a.condition_value)
    OR (a.condition_type = 'tricks_landed' AND v_tricks_landed >= a.condition_value)
    OR (a.condition_type = 'xp_earned' AND v_xp >= a.condition_value)
    OR (a.condition_type = 'video_uploaded' AND v_videos_uploaded >= a.condition_value)
    OR (a.condition_type = 'challenge_completed' AND v_challenges_completed >= a.condition_value)
    OR (a.condition_type = 'spots_added' AND v_spots_added >= a.condition_value)
    OR (a.condition_type = 'streak_days' AND v_streak_days >= a.condition_value)
  AND NOT EXISTS (
    SELECT 1 FROM user_achievements
    WHERE user_id = p_user_id AND achievement_id = a.id
  )
  RETURNING a.id, a.name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION check_and_unlock_achievements(UUID) TO authenticated;
