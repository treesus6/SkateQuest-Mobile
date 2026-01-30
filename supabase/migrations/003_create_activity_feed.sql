-- ============================================
-- SkateQuest Activity Feed
-- Global "hype" feed for achievements, spot claims, and shop redemptions
-- ============================================

-- Create the activity feed table
CREATE TABLE IF NOT EXISTS activity_feed (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL CHECK (activity_type IN ('achievement', 'spot_claim', 'shop_redeem', 'level_up', 'first_blood')),
  message TEXT NOT NULL,
  metadata JSONB DEFAULT '{}', -- Store extra data like achievement_id, spot_id, etc.
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS so everyone can see the hype
ALTER TABLE activity_feed ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any (idempotent)
DROP POLICY IF EXISTS "Public activity is viewable by everyone" ON activity_feed;
DROP POLICY IF EXISTS "Users can create their own activities" ON activity_feed;
DROP POLICY IF EXISTS "Service role can manage all activities" ON activity_feed;

-- Everyone can view the global feed
CREATE POLICY "Public activity is viewable by everyone"
ON activity_feed FOR SELECT
TO public
USING (true);

-- Users can only create their own activity entries (for manual inserts if needed)
CREATE POLICY "Users can create their own activities"
ON activity_feed FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Performance indexes for the feed
CREATE INDEX IF NOT EXISTS idx_activity_feed_created_at
ON activity_feed(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_activity_feed_user_id
ON activity_feed(user_id);

CREATE INDEX IF NOT EXISTS idx_activity_feed_type
ON activity_feed(activity_type);

-- ============================================
-- TRIGGER: Auto-log achievement unlocks
-- ============================================

CREATE OR REPLACE FUNCTION log_achievement_activity()
RETURNS TRIGGER AS $$
DECLARE
  achievement_name TEXT;
  achievement_icon TEXT;
  achievement_rarity TEXT;
  username TEXT;
BEGIN
  -- Get the achievement details
  SELECT name, icon, rarity INTO achievement_name, achievement_icon, achievement_rarity
  FROM achievements
  WHERE id = NEW.achievement_id;

  -- Get the username
  SELECT u.username INTO username
  FROM profiles u
  WHERE u.id = NEW.user_id;

  -- Insert into activity feed with rich message
  INSERT INTO activity_feed (user_id, activity_type, message, metadata)
  VALUES (
    NEW.user_id,
    'achievement',
    COALESCE(username, 'A skater') || ' just unlocked ' || COALESCE(achievement_icon, '') || ' ' || COALESCE(achievement_name, 'an achievement') || '!',
    jsonb_build_object(
      'achievement_id', NEW.achievement_id,
      'achievement_name', achievement_name,
      'achievement_icon', achievement_icon,
      'rarity', achievement_rarity
    )
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger on user_achievements
DROP TRIGGER IF EXISTS tr_log_achievement ON user_achievements;
CREATE TRIGGER tr_log_achievement
AFTER INSERT ON user_achievements
FOR EACH ROW EXECUTE FUNCTION log_achievement_activity();

-- ============================================
-- TRIGGER: Auto-log spot claims
-- ============================================

CREATE OR REPLACE FUNCTION log_spot_claim_activity()
RETURNS TRIGGER AS $$
DECLARE
  spot_name TEXT;
  username TEXT;
BEGIN
  -- Only trigger on new spots, not updates
  IF TG_OP = 'INSERT' THEN
    -- Get spot name
    spot_name := NEW.name;

    -- Get username
    SELECT u.username INTO username
    FROM profiles u
    WHERE u.id = NEW.added_by;

    -- Insert into activity feed
    INSERT INTO activity_feed (user_id, activity_type, message, metadata)
    VALUES (
      NEW.added_by,
      'spot_claim',
      COALESCE(username, 'A skater') || ' claimed a new spot: ' || COALESCE(spot_name, 'Unknown Spot') || '!',
      jsonb_build_object(
        'spot_id', NEW.id,
        'spot_name', spot_name,
        'latitude', NEW.latitude,
        'longitude', NEW.longitude
      )
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger on skate_spots
DROP TRIGGER IF EXISTS tr_log_spot_claim ON skate_spots;
CREATE TRIGGER tr_log_spot_claim
AFTER INSERT ON skate_spots
FOR EACH ROW EXECUTE FUNCTION log_spot_claim_activity();

-- ============================================
-- TRIGGER: Auto-log level ups
-- ============================================

CREATE OR REPLACE FUNCTION log_level_up_activity()
RETURNS TRIGGER AS $$
BEGIN
  -- Only trigger when level actually increases
  IF NEW.level > OLD.level THEN
    INSERT INTO activity_feed (user_id, activity_type, message, metadata)
    VALUES (
      NEW.id,
      'level_up',
      COALESCE(NEW.username, 'A skater') || ' just hit Level ' || NEW.level || '!',
      jsonb_build_object(
        'new_level', NEW.level,
        'previous_level', OLD.level,
        'total_xp', NEW.xp
      )
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger on profiles
DROP TRIGGER IF EXISTS tr_log_level_up ON profiles;
CREATE TRIGGER tr_log_level_up
AFTER UPDATE ON profiles
FOR EACH ROW
WHEN (NEW.level > OLD.level)
EXECUTE FUNCTION log_level_up_activity();

-- ============================================
-- FUNCTION: Log shop redemption (call from app)
-- ============================================

CREATE OR REPLACE FUNCTION log_shop_redeem(
  p_user_id UUID,
  p_item_name TEXT,
  p_item_type TEXT DEFAULT 'deal'
)
RETURNS UUID AS $$
DECLARE
  username TEXT;
  activity_id UUID;
  rarity_label TEXT;
BEGIN
  -- Get username
  SELECT u.username INTO username
  FROM profiles u
  WHERE u.id = p_user_id;

  -- Determine rarity label based on item type
  rarity_label := CASE
    WHEN p_item_type = 'legendary' THEN 'a LEGENDARY '
    WHEN p_item_type = 'epic' THEN 'an EPIC '
    WHEN p_item_type = 'rare' THEN 'a RARE '
    ELSE 'a '
  END;

  -- Insert into activity feed
  INSERT INTO activity_feed (user_id, activity_type, message, metadata)
  VALUES (
    p_user_id,
    'shop_redeem',
    COALESCE(username, 'A skater') || ' just redeemed ' || rarity_label || 'deal: ' || p_item_name || '!',
    jsonb_build_object(
      'item_name', p_item_name,
      'item_type', p_item_type
    )
  )
  RETURNING id INTO activity_id;

  RETURN activity_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION log_shop_redeem(UUID, TEXT, TEXT) TO authenticated;

-- ============================================
-- FUNCTION: Get global feed with user info
-- ============================================

CREATE OR REPLACE FUNCTION get_global_feed(
  p_limit INTEGER DEFAULT 50,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  username TEXT,
  user_level INTEGER,
  activity_type TEXT,
  message TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    af.id,
    af.user_id,
    p.username,
    p.level as user_level,
    af.activity_type,
    af.message,
    af.metadata,
    af.created_at
  FROM activity_feed af
  LEFT JOIN profiles p ON p.id = af.user_id
  ORDER BY af.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Grant execute to everyone (public feed)
GRANT EXECUTE ON FUNCTION get_global_feed(INTEGER, INTEGER) TO public;

-- ============================================
-- Verification
-- ============================================

SELECT 'Activity Feed created successfully!' as status;
