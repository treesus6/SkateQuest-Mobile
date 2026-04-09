-- Phase 6: Retention & Analytics

-- ============================================================================
-- REFERRAL CODES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS referral_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  code TEXT UNIQUE NOT NULL,  -- e.g., "SHRED2024K", max 15 chars
  description TEXT,
  activation_bonus_xp INT DEFAULT 500,  -- XP bonus for new user
  recruiter_bonus_xp INT DEFAULT 250,  -- XP bonus when new user signs up
  recruiter_bonus_credits INT DEFAULT 0,  -- Not used now, for future monetization
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_referral_codes_user
  ON referral_codes(user_id);

CREATE INDEX IF NOT EXISTS idx_referral_codes_code
  ON referral_codes(code);

ALTER TABLE referral_codes ENABLE ROW LEVEL SECURITY;

-- Referral codes: Public can view active codes (for signup flow)
CREATE POLICY "Public can view active referral codes"
  ON referral_codes FOR SELECT TO public
  USING (active = true);

-- Referral codes: Users can view/create their own
CREATE POLICY "Users can manage their referral codes"
  ON referral_codes FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ============================================================================
-- REFERRAL USES TABLE (Track successful signups via referral)
-- ============================================================================

CREATE TABLE IF NOT EXISTS referral_uses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referral_code_id UUID NOT NULL REFERENCES referral_codes(id) ON DELETE CASCADE,
  recruiter_user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  new_user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  bonus_xp_awarded INT DEFAULT 500,
  recruiter_bonus_xp_awarded INT DEFAULT 250,
  used_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(referral_code_id, new_user_id)
);

CREATE INDEX IF NOT EXISTS idx_referral_uses_code
  ON referral_uses(referral_code_id);

CREATE INDEX IF NOT EXISTS idx_referral_uses_recruiter
  ON referral_uses(recruiter_user_id);

CREATE INDEX IF NOT EXISTS idx_referral_uses_new_user
  ON referral_uses(new_user_id);

ALTER TABLE referral_uses ENABLE ROW LEVEL SECURITY;

-- Referral uses: Users can view their own
CREATE POLICY "Users can view their referral uses"
  ON referral_uses FOR SELECT TO authenticated
  USING (
    recruiter_user_id = auth.uid() OR
    new_user_id = auth.uid()
  );

-- ============================================================================
-- MENTOR RELATIONSHIPS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS mentor_relationships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mentor_user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  mentee_user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed', 'declined')),
  started_at TIMESTAMP DEFAULT NOW(),
  ended_at TIMESTAMP,
  goals TEXT,  -- JSON: {tricks_to_learn: [...], fitness_goals: [...]}
  progress_notes TEXT,
  last_interaction TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(mentor_user_id, mentee_user_id)
);

CREATE INDEX IF NOT EXISTS idx_mentor_relationships_mentor
  ON mentor_relationships(mentor_user_id) WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_mentor_relationships_mentee
  ON mentor_relationships(mentee_user_id) WHERE status = 'active';

ALTER TABLE mentor_relationships ENABLE ROW LEVEL SECURITY;

-- Mentorship: Users can view their own relationships
CREATE POLICY "Users can view their mentorship relationships"
  ON mentor_relationships FOR SELECT TO authenticated
  USING (
    mentor_user_id = auth.uid() OR
    mentee_user_id = auth.uid()
  );

-- Mentorship: Users can create relationships (as mentee)
CREATE POLICY "Users can request mentorship"
  ON mentor_relationships FOR INSERT TO authenticated
  WITH CHECK (mentee_user_id = auth.uid());

-- Mentorship: Mentor can update relationship
CREATE POLICY "Mentors can update relationships"
  ON mentor_relationships FOR UPDATE TO authenticated
  USING (mentor_user_id = auth.uid())
  WITH CHECK (mentor_user_id = auth.uid());

-- ============================================================================
-- CRASH REPORTS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS crash_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  error_message TEXT NOT NULL,
  stack_trace TEXT,
  app_version TEXT,
  os_version TEXT,
  device_model TEXT,
  environment TEXT CHECK (environment IN ('development', 'staging', 'production')),
  session_id TEXT,
  breadcrumbs JSONB,  -- Array of user actions leading to crash
  sentry_event_id TEXT,  -- Link to Sentry if applicable
  status TEXT DEFAULT 'new' CHECK (status IN ('new', 'acknowledged', 'investigating', 'fixed')),
  engineer_notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_crash_reports_user
  ON crash_reports(user_id);

CREATE INDEX IF NOT EXISTS idx_crash_reports_status
  ON crash_reports(status) WHERE status IN ('new', 'investigating');

CREATE INDEX IF NOT EXISTS idx_crash_reports_date
  ON crash_reports(created_at DESC);

ALTER TABLE crash_reports ENABLE ROW LEVEL SECURITY;

-- Crash reports: Users can view their own, admins can view all
CREATE POLICY "Users can view their crash reports"
  ON crash_reports FOR SELECT TO authenticated
  USING (
    user_id = auth.uid() OR
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Crash reports: Apps can insert crash reports
CREATE POLICY "Apps can insert crash reports"
  ON crash_reports FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() OR true);  -- Allow via app client

-- ============================================================================
-- CHANGELOG TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS changelogs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version TEXT NOT NULL UNIQUE,  -- e.g., "1.2.3"
  title TEXT NOT NULL,  -- e.g., "King of the Hill Released"
  description TEXT,
  release_notes TEXT,  -- Markdown
  features JSONB,  -- Array of feature strings
  bug_fixes JSONB,  -- Array of bug fix strings
  known_issues JSONB,  -- Array of known issue strings
  release_date TIMESTAMP NOT NULL,
  released_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  platform TEXT[] DEFAULT ARRAY['ios', 'android'],
  is_critical BOOLEAN DEFAULT false,  -- true = required update
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_changelogs_version
  ON changelogs(version DESC);

CREATE INDEX IF NOT EXISTS idx_changelogs_release_date
  ON changelogs(release_date DESC);

ALTER TABLE changelogs ENABLE ROW LEVEL SECURITY;

-- Changelogs: Public can view all
CREATE POLICY "Public can view changelogs"
  ON changelogs FOR SELECT TO public
  USING (true);

-- Changelogs: Only admins can create/update
CREATE POLICY "Admins can manage changelogs"
  ON changelogs FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ============================================================================
-- FUNCTION: Apply referral code on signup
-- ============================================================================

CREATE OR REPLACE FUNCTION apply_referral_code(
  p_referral_code TEXT,
  p_new_user_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_referral_code_id UUID;
  v_recruiter_user_id UUID;
  v_result JSON;
BEGIN
  -- Find referral code
  SELECT id, user_id INTO v_referral_code_id, v_recruiter_user_id
  FROM referral_codes
  WHERE code = p_referral_code AND active = true
  LIMIT 1;

  IF v_referral_code_id IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Invalid referral code'
    );
  END IF;

  -- Award XP to new user
  UPDATE profiles
  SET xp = xp + 500
  WHERE id = p_new_user_id;

  -- Award XP to recruiter
  UPDATE profiles
  SET xp = xp + 250
  WHERE id = v_recruiter_user_id;

  -- Record the referral use
  INSERT INTO referral_uses (referral_code_id, recruiter_user_id, new_user_id, bonus_xp_awarded, recruiter_bonus_xp_awarded)
  VALUES (v_referral_code_id, v_recruiter_user_id, p_new_user_id, 500, 250);

  RETURN json_build_object(
    'success', true,
    'recruiter_name', (SELECT display_name FROM profiles WHERE id = v_recruiter_user_id)
  );
END;
$$;

-- ============================================================================
-- FUNCTION: Get referral stats
-- ============================================================================

CREATE OR REPLACE FUNCTION get_referral_stats(p_user_id UUID)
RETURNS TABLE (
  total_referrals INT,
  total_xp_earned INT,
  active_codes INT
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    COUNT(DISTINCT ru.new_user_id)::INT as total_referrals,
    COALESCE(SUM(ru.recruiter_bonus_xp_awarded), 0)::INT as total_xp_earned,
    COUNT(DISTINCT CASE WHEN rc.active THEN rc.id END)::INT as active_codes
  FROM referral_codes rc
  LEFT JOIN referral_uses ru ON rc.id = ru.referral_code_id
  WHERE rc.user_id = p_user_id;
$$;

-- ============================================================================
-- FUNCTION: Get mentorship stats
-- ============================================================================

CREATE OR REPLACE FUNCTION get_mentorship_stats(p_user_id UUID)
RETURNS TABLE (
  mentees_count INT,
  mentors_count INT,
  active_relationships INT
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    COUNT(DISTINCT CASE WHEN mentor_user_id = p_user_id AND status = 'active' THEN mentee_user_id END)::INT as mentees_count,
    COUNT(DISTINCT CASE WHEN mentee_user_id = p_user_id AND status = 'active' THEN mentor_user_id END)::INT as mentors_count,
    COUNT(DISTINCT id)::INT as active_relationships
  FROM mentor_relationships
  WHERE (mentor_user_id = p_user_id OR mentee_user_id = p_user_id)
    AND status = 'active';
$$;
