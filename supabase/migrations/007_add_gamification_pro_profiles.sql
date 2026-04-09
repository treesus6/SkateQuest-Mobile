-- Phase 4: GamePlay + Pro Profiles

-- ============================================================================
-- EXTEND PROFILES TABLE WITH PRO ATHLETE FIELDS
-- ============================================================================

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS pro_athlete BOOLEAN DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS pro_sponsor TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS pro_tier TEXT CHECK (pro_tier IN ('bronze', 'silver', 'gold', 'platinum'));
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS verified_badge BOOLEAN DEFAULT false;

-- ============================================================================
-- SPOT CLAIMS TABLE (King of the Hill mechanic)
-- ============================================================================

CREATE TABLE IF NOT EXISTS spot_claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  spot_id UUID NOT NULL REFERENCES skate_spots(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  claimed_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP DEFAULT (NOW() + INTERVAL '30 days'),
  claim_strength INT DEFAULT 1,  -- How many people have challenged/defended
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(spot_id)  -- Only one active claim per spot
);

CREATE INDEX IF NOT EXISTS idx_spot_claims_spot
  ON spot_claims(spot_id);

CREATE INDEX IF NOT EXISTS idx_spot_claims_user
  ON spot_claims(user_id);

CREATE INDEX IF NOT EXISTS idx_spot_claims_expires
  ON spot_claims(expires_at) WHERE expires_at > NOW();

ALTER TABLE spot_claims ENABLE ROW LEVEL SECURITY;

-- Spot Claims: Everyone can view
CREATE POLICY "Public can view spot claims"
  ON spot_claims FOR SELECT TO public
  USING (true);

-- Spot Claims: Users can create/update their own claims
CREATE POLICY "Users can claim spots"
  ON spot_claims FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their claims"
  ON spot_claims FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ============================================================================
-- SPOT CLAIM HISTORY TABLE (Track challenges and claim changes)
-- ============================================================================

CREATE TABLE IF NOT EXISTS spot_claim_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  spot_id UUID NOT NULL REFERENCES skate_spots(id) ON DELETE CASCADE,
  previous_holder_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  new_holder_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  action TEXT CHECK (action IN ('claimed', 'challenged', 'reclaimed', 'expired')),
  challenge_xp_reward INT DEFAULT 50,  -- XP rewarded for successful challenge
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_spot_claim_history_spot
  ON spot_claim_history(spot_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_spot_claim_history_user
  ON spot_claim_history(new_holder_id);

ALTER TABLE spot_claim_history ENABLE ROW LEVEL SECURITY;

-- History: Everyone can view
CREATE POLICY "Public can view claim history"
  ON spot_claim_history FOR SELECT TO public
  USING (true);

-- ============================================================================
-- FUNCTION: Claim a spot (King of the Hill)
-- ============================================================================

CREATE OR REPLACE FUNCTION claim_spot(
  p_spot_id UUID,
  p_user_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_previous_holder UUID;
  v_xp_reward INT := 50;
  v_action TEXT := 'claimed';
  v_claim_record spot_claims;
BEGIN
  -- Get current claim if exists
  SELECT * INTO v_claim_record FROM spot_claims WHERE spot_id = p_spot_id;

  IF v_claim_record.id IS NOT NULL THEN
    -- Spot already claimed - this is a challenge
    v_previous_holder := v_claim_record.user_id;
    v_action := 'challenged';
    v_xp_reward := 100;  -- More XP for successful challenge

    -- Update existing claim
    UPDATE spot_claims
    SET user_id = p_user_id,
        claimed_at = NOW(),
        expires_at = NOW() + INTERVAL '30 days',
        claim_strength = claim_strength + 1,
        updated_at = NOW()
    WHERE spot_id = p_spot_id;
  ELSE
    -- New claim
    INSERT INTO spot_claims (spot_id, user_id, claim_strength)
    VALUES (p_spot_id, p_user_id, 1);
    v_xp_reward := 50;
  END IF;

  -- Record history
  INSERT INTO spot_claim_history (spot_id, previous_holder_id, new_holder_id, action, challenge_xp_reward)
  VALUES (p_spot_id, v_previous_holder, p_user_id, v_action, v_xp_reward);

  -- Award XP to user
  UPDATE profiles
  SET xp = xp + v_xp_reward
  WHERE id = p_user_id;

  RETURN json_build_object(
    'success', true,
    'action', v_action,
    'xp_reward', v_xp_reward,
    'previous_holder', v_previous_holder
  );
END;
$$;

-- ============================================================================
-- FUNCTION: Get leaderboard by claim strength
-- ============================================================================

CREATE OR REPLACE FUNCTION get_spot_claims_leaderboard(p_limit INT = 50)
RETURNS TABLE (
  rank INT,
  user_id UUID,
  display_name TEXT,
  claimed_spots INT,
  total_claim_strength INT,
  pro_athlete BOOLEAN,
  pro_tier TEXT
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    ROW_NUMBER() OVER (ORDER BY SUM(claim_strength) DESC) as rank,
    sc.user_id,
    p.display_name,
    COUNT(DISTINCT sc.spot_id)::INT as claimed_spots,
    SUM(sc.claim_strength)::INT as total_claim_strength,
    p.pro_athlete,
    p.pro_tier
  FROM spot_claims sc
  INNER JOIN profiles p ON sc.user_id = p.id
  WHERE sc.expires_at > NOW()
  GROUP BY sc.user_id, p.display_name, p.pro_athlete, p.pro_tier
  ORDER BY total_claim_strength DESC
  LIMIT p_limit;
$$;

-- ============================================================================
-- FUNCTION: Get spots claimed by user
-- ============================================================================

CREATE OR REPLACE FUNCTION get_user_claimed_spots(p_user_id UUID)
RETURNS TABLE (
  claim_id UUID,
  spot_id UUID,
  spot_name TEXT,
  latitude FLOAT,
  longitude FLOAT,
  claimed_at TIMESTAMP,
  claim_strength INT
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    sc.id,
    sc.spot_id,
    ss.name,
    ss.latitude,
    ss.longitude,
    sc.claimed_at,
    sc.claim_strength
  FROM spot_claims sc
  INNER JOIN skate_spots ss ON sc.spot_id = ss.id
  WHERE sc.user_id = p_user_id
  AND sc.expires_at > NOW()
  ORDER BY sc.claim_strength DESC;
$$;

-- ============================================================================
-- FUNCTION: Check if spot is claimed
-- ============================================================================

CREATE OR REPLACE FUNCTION get_spot_claim_info(p_spot_id UUID)
RETURNS TABLE (
  claim_id UUID,
  holder_id UUID,
  holder_name TEXT,
  holder_pro_tier TEXT,
  claimed_at TIMESTAMP,
  claim_strength INT,
  days_held INT
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    sc.id,
    sc.user_id,
    p.display_name,
    p.pro_tier,
    sc.claimed_at,
    sc.claim_strength,
    EXTRACT(DAY FROM (NOW() - sc.claimed_at))::INT as days_held
  FROM spot_claims sc
  INNER JOIN profiles p ON sc.user_id = p.id
  WHERE sc.spot_id = p_spot_id
  AND sc.expires_at > NOW();
$$;

-- ============================================================================
-- TRIGGER: Auto-cleanup expired claims
-- ============================================================================

CREATE OR REPLACE FUNCTION cleanup_expired_claims()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  DELETE FROM spot_claims
  WHERE expires_at <= NOW();

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_cleanup_expired_claims
BEFORE INSERT ON spot_claims
EXECUTE FUNCTION cleanup_expired_claims();
