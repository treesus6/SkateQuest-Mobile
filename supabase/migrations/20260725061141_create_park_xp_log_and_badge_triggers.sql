-- XP attribution table, per park
CREATE TABLE IF NOT EXISTS park_xp_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  park_id uuid NOT NULL REFERENCES skateparks(id) ON DELETE CASCADE,
  xp_amount integer NOT NULL,
  source text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_park_xp_log_park ON park_xp_log(park_id);
CREATE INDEX IF NOT EXISTS idx_park_xp_log_user ON park_xp_log(user_id);
CREATE INDEX IF NOT EXISTS idx_park_xp_log_created ON park_xp_log(created_at);

ALTER TABLE park_xp_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "park_xp_log_select_all" ON park_xp_log FOR SELECT USING (true);
CREATE POLICY "park_xp_log_insert_own" ON park_xp_log FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Views for Local Legend + King of the Park (compute on read, no cron needed)
CREATE OR REPLACE VIEW park_local_legends AS
SELECT DISTINCT ON (park_id)
  park_id, user_id, SUM(xp_amount) OVER (PARTITION BY park_id, user_id) as total_xp
FROM park_xp_log
ORDER BY park_id, total_xp DESC;

CREATE OR REPLACE VIEW park_king_of_week AS
SELECT DISTINCT ON (park_id)
  park_id, user_id, SUM(xp_amount) OVER (PARTITION BY park_id, user_id) as weekly_xp
FROM park_xp_log
WHERE created_at > now() - interval '7 days'
ORDER BY park_id, weekly_xp DESC;

-- Pioneer badge: award on first-ever check-in to a park (globally first, not per-user)
CREATE OR REPLACE FUNCTION award_pioneer_badge() RETURNS trigger AS $$
DECLARE
  pioneer_badge_id uuid;
  already_visited boolean;
BEGIN
  SELECT EXISTS(SELECT 1 FROM park_visits WHERE park_id = NEW.park_id AND id != NEW.id) INTO already_visited;
  IF NOT already_visited THEN
    SELECT id INTO pioneer_badge_id FROM badges WHERE name = 'Pioneer';
    IF pioneer_badge_id IS NOT NULL THEN
      INSERT INTO user_badges (user_id, badge_id) VALUES (NEW.user_id, pioneer_badge_id) ON CONFLICT DO NOTHING;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_award_pioneer ON park_visits;
CREATE TRIGGER trg_award_pioneer AFTER INSERT ON park_visits FOR EACH ROW EXECUTE FUNCTION award_pioneer_badge();

-- Dawn Patrol / Night Owl badges: award based on session_start time
CREATE OR REPLACE FUNCTION award_time_badges() RETURNS trigger AS $$
DECLARE
  badge_id uuid;
  local_hour int;
BEGIN
  local_hour := EXTRACT(HOUR FROM NEW.session_start);
  IF local_hour < 7 THEN
    SELECT id INTO badge_id FROM badges WHERE name = 'Dawn Patrol';
  ELSIF local_hour >= 21 THEN
    SELECT id INTO badge_id FROM badges WHERE name = 'Night Owl';
  END IF;
  IF badge_id IS NOT NULL THEN
    INSERT INTO user_badges (user_id, badge_id) VALUES (NEW.user_id, badge_id) ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_award_time_badges ON park_visits;
CREATE TRIGGER trg_award_time_badges AFTER INSERT ON park_visits FOR EACH ROW EXECUTE FUNCTION award_time_badges();

-- Fix crew_territories: RLS was on with zero policies (confirmed bug from audit)
CREATE POLICY "crew_territories_select_all" ON crew_territories FOR SELECT USING (true);
CREATE POLICY "crew_territories_insert_members" ON crew_territories FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM crew_members WHERE crew_members.crew_id = crew_territories.crew_id AND crew_members.user_id = auth.uid())
);
CREATE POLICY "crew_territories_update_members" ON crew_territories FOR UPDATE USING (
  EXISTS (SELECT 1 FROM crew_members WHERE crew_members.crew_id = crew_territories.crew_id AND crew_members.user_id = auth.uid())
);

