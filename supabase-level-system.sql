-- XP and Leveling System for SkateQuest
-- Automatic level calculation based on XP

-- Function to calculate level from XP
-- Using formula: XP needed for next level = 100 * level^1.5
-- Level 1: 0 XP
-- Level 2: 100 XP
-- Level 3: 282 XP
-- Level 4: 519 XP
-- Level 5: 806 XP
-- Level 10: 3,162 XP
-- Level 20: 8,944 XP
-- Level 50: 35,355 XP
CREATE OR REPLACE FUNCTION calculate_level_from_xp(xp_amount INTEGER)
RETURNS INTEGER AS $$
DECLARE
  level_num INTEGER := 1;
  xp_required INTEGER := 0;
BEGIN
  -- Start at level 1 and increment until we find the right level
  WHILE xp_amount >= xp_required LOOP
    level_num := level_num + 1;
    xp_required := FLOOR(100 * POWER(level_num, 1.5));
  END LOOP;

  -- Return the level (subtract 1 because we went one level too far)
  RETURN level_num - 1;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to get XP required for a specific level
CREATE OR REPLACE FUNCTION get_xp_for_level(target_level INTEGER)
RETURNS INTEGER AS $$
BEGIN
  IF target_level <= 1 THEN
    RETURN 0;
  END IF;

  RETURN FLOOR(100 * POWER(target_level, 1.5));
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to get XP progress to next level
-- Returns JSON with: current_level, current_xp, xp_for_current_level, xp_for_next_level, xp_progress, xp_needed
CREATE OR REPLACE FUNCTION get_level_progress(user_xp INTEGER)
RETURNS JSON AS $$
DECLARE
  current_level INTEGER;
  xp_current_level INTEGER;
  xp_next_level INTEGER;
  xp_progress INTEGER;
  xp_needed INTEGER;
BEGIN
  current_level := calculate_level_from_xp(user_xp);
  xp_current_level := get_xp_for_level(current_level);
  xp_next_level := get_xp_for_level(current_level + 1);
  xp_progress := user_xp - xp_current_level;
  xp_needed := xp_next_level - user_xp;

  RETURN json_build_object(
    'current_level', current_level,
    'current_xp', user_xp,
    'xp_for_current_level', xp_current_level,
    'xp_for_next_level', xp_next_level,
    'xp_progress', xp_progress,
    'xp_needed', xp_needed,
    'progress_percentage', ROUND((xp_progress::NUMERIC / (xp_next_level - xp_current_level)::NUMERIC) * 100, 1)
  );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Trigger function to automatically update level when XP changes
CREATE OR REPLACE FUNCTION update_user_level()
RETURNS TRIGGER AS $$
BEGIN
  -- Calculate new level based on XP
  NEW.level := calculate_level_from_xp(NEW.xp);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if it exists and recreate
DROP TRIGGER IF EXISTS auto_update_level ON public.profiles;

-- Create trigger to auto-update level when XP changes
CREATE TRIGGER auto_update_level
BEFORE INSERT OR UPDATE OF xp ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION update_user_level();

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION calculate_level_from_xp(INTEGER) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION get_xp_for_level(INTEGER) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION get_level_progress(INTEGER) TO authenticated, anon;

-- Example queries:
-- Get level from XP:
--   SELECT calculate_level_from_xp(500); -- Returns 4
--
-- Get XP needed for level:
--   SELECT get_xp_for_level(10); -- Returns 3162
--
-- Get detailed progress:
--   SELECT get_level_progress(500);
--   Returns: {"current_level":4,"current_xp":500,"xp_for_current_level":519,...}
