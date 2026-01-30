-- ============================================================================
-- SKATEQUEST ENGINE DATABASE SCHEMA
-- Complete schema for: Spots, Challenges, Territory, QR, Shops
-- Migration: 004_skatequest_engine_schema
-- ============================================================================

-- ============================================================================
-- 1. UPDATE SKATE_SPOTS TABLE WITH NEW FIELDS
-- ============================================================================

-- Add new columns to skate_spots if they don't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'skate_spots' AND column_name = 'spot_type') THEN
        ALTER TABLE skate_spots ADD COLUMN spot_type TEXT DEFAULT 'PARK' CHECK (spot_type IN ('PARK', 'STREET', 'DIY', 'QUEST', 'SHOP'));
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'skate_spots' AND column_name = 'obstacles') THEN
        ALTER TABLE skate_spots ADD COLUMN obstacles TEXT[] DEFAULT '{}';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'skate_spots' AND column_name = 'bust_risk') THEN
        ALTER TABLE skate_spots ADD COLUMN bust_risk TEXT DEFAULT 'LOW' CHECK (bust_risk IN ('LOW', 'MED', 'HIGH'));
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'skate_spots' AND column_name = 'has_qr') THEN
        ALTER TABLE skate_spots ADD COLUMN has_qr BOOLEAN DEFAULT FALSE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'skate_spots' AND column_name = 'qr_code') THEN
        ALTER TABLE skate_spots ADD COLUMN qr_code TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'skate_spots' AND column_name = 'current_status') THEN
        ALTER TABLE skate_spots ADD COLUMN current_status TEXT CHECK (current_status IN ('BONDO_NEEDED', 'SECURITY_ACTIVE', 'DRY', 'WET'));
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'skate_spots' AND column_name = 'cover_image_url') THEN
        ALTER TABLE skate_spots ADD COLUMN cover_image_url TEXT;
    END IF;
END $$;

-- Create indexes for new columns
CREATE INDEX IF NOT EXISTS idx_skate_spots_spot_type ON skate_spots(spot_type);
CREATE INDEX IF NOT EXISTS idx_skate_spots_has_qr ON skate_spots(has_qr) WHERE has_qr = TRUE;

-- ============================================================================
-- 2. SPOT CLAIMS (KING OF THE HILL / TERRITORY CONTROL)
-- ============================================================================

CREATE TABLE IF NOT EXISTS spot_claims (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    spot_id UUID REFERENCES skate_spots(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    crew_id UUID,

    trick_name TEXT NOT NULL,
    video_url TEXT NOT NULL,
    points INTEGER DEFAULT 0,

    verified BOOLEAN DEFAULT FALSE,
    claimed_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(spot_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_spot_claims_spot ON spot_claims(spot_id);
CREATE INDEX IF NOT EXISTS idx_spot_claims_points ON spot_claims(points DESC);
CREATE INDEX IF NOT EXISTS idx_spot_claims_crew ON spot_claims(crew_id);

-- ============================================================================
-- 3. ENHANCED CHALLENGES TABLE
-- ============================================================================

-- Drop and recreate if needed, or alter existing
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'challenges' AND column_name = 'challenge_type') THEN
        ALTER TABLE challenges ADD COLUMN challenge_type TEXT DEFAULT 'DAILY' CHECK (challenge_type IN ('DAILY', 'SPOT_SPECIFIC', 'USER_ISSUED', 'WEEKLY', 'BOUNTY'));
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'challenges' AND column_name = 'bounty_multiplier') THEN
        ALTER TABLE challenges ADD COLUMN bounty_multiplier DECIMAL DEFAULT 1.0;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'challenges' AND column_name = 'last_bounty_increase') THEN
        ALTER TABLE challenges ADD COLUMN last_bounty_increase TIMESTAMPTZ;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'challenges' AND column_name = 'active') THEN
        ALTER TABLE challenges ADD COLUMN active BOOLEAN DEFAULT TRUE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'challenges' AND column_name = 'starts_at') THEN
        ALTER TABLE challenges ADD COLUMN starts_at TIMESTAMPTZ DEFAULT NOW();
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'challenges' AND column_name = 'expires_at') THEN
        ALTER TABLE challenges ADD COLUMN expires_at TIMESTAMPTZ;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_challenges_type ON challenges(challenge_type);
CREATE INDEX IF NOT EXISTS idx_challenges_active ON challenges(active) WHERE active = TRUE;
CREATE INDEX IF NOT EXISTS idx_challenges_expires ON challenges(expires_at);

-- ============================================================================
-- 4. CHALLENGE SUBMISSIONS (JUDGE'S BOOTH)
-- ============================================================================

CREATE TABLE IF NOT EXISTS challenge_submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    challenge_id UUID REFERENCES challenges(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,

    video_url TEXT NOT NULL,
    spot_id UUID REFERENCES skate_spots(id) ON DELETE SET NULL,

    stomped_votes INTEGER DEFAULT 0,
    bail_votes INTEGER DEFAULT 0,

    status TEXT DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),

    submitted_at TIMESTAMPTZ DEFAULT NOW(),
    approved_at TIMESTAMPTZ,

    UNIQUE(challenge_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_submissions_status ON challenge_submissions(status);
CREATE INDEX IF NOT EXISTS idx_submissions_challenge ON challenge_submissions(challenge_id);
CREATE INDEX IF NOT EXISTS idx_submissions_user ON challenge_submissions(user_id);

-- ============================================================================
-- 5. SUBMISSION VOTES
-- ============================================================================

CREATE TABLE IF NOT EXISTS submission_votes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    submission_id UUID REFERENCES challenge_submissions(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,

    vote TEXT NOT NULL CHECK (vote IN ('STOMPED', 'BAIL')),
    voted_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(submission_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_submission_votes_submission ON submission_votes(submission_id);
CREATE INDEX IF NOT EXISTS idx_submission_votes_user ON submission_votes(user_id);

-- ============================================================================
-- 6. USER STREAKS & DAILY PROGRESS
-- ============================================================================

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'last_challenge_date') THEN
        ALTER TABLE profiles ADD COLUMN last_challenge_date DATE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'current_streak') THEN
        ALTER TABLE profiles ADD COLUMN current_streak INTEGER DEFAULT 0;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'longest_streak') THEN
        ALTER TABLE profiles ADD COLUMN longest_streak INTEGER DEFAULT 0;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'daily_challenges_completed') THEN
        ALTER TABLE profiles ADD COLUMN daily_challenges_completed INTEGER DEFAULT 0;
    END IF;
END $$;

-- ============================================================================
-- 7. SPOT STATUS UPDATES (BONDO ALERTS, SECURITY, WEATHER)
-- ============================================================================

CREATE TABLE IF NOT EXISTS spot_status_updates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    spot_id UUID REFERENCES skate_spots(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,

    status TEXT NOT NULL CHECK (status IN ('BONDO_NEEDED', 'SECURITY_ACTIVE', 'DRY', 'WET')),
    notes TEXT,

    reported_at TIMESTAMPTZ DEFAULT NOW(),
    resolved_at TIMESTAMPTZ,

    upvotes INTEGER DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_status_updates_spot ON spot_status_updates(spot_id);
CREATE INDEX IF NOT EXISTS idx_status_updates_status ON spot_status_updates(status);
CREATE INDEX IF NOT EXISTS idx_status_updates_active ON spot_status_updates(resolved_at) WHERE resolved_at IS NULL;

-- Function to auto-update skate_spots current_status
CREATE OR REPLACE FUNCTION update_spot_current_status()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE skate_spots
    SET current_status = NEW.status
    WHERE id = NEW.spot_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS trigger_update_spot_status ON spot_status_updates;
CREATE TRIGGER trigger_update_spot_status
    AFTER INSERT ON spot_status_updates
    FOR EACH ROW
    EXECUTE FUNCTION update_spot_current_status();

-- ============================================================================
-- 8. SKATE SHOPS
-- ============================================================================

CREATE TABLE IF NOT EXISTS skate_shops (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    spot_id UUID REFERENCES skate_spots(id) ON DELETE CASCADE,

    shop_name TEXT NOT NULL,
    description TEXT,
    website_url TEXT,
    phone TEXT,

    discount_code TEXT,
    discount_percentage INTEGER,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_skate_shops_spot ON skate_shops(spot_id);

-- ============================================================================
-- 9. SHOP CHECK-INS
-- ============================================================================

CREATE TABLE IF NOT EXISTS shop_checkins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id UUID REFERENCES skate_shops(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,

    checked_in_at TIMESTAMPTZ DEFAULT NOW()
);

-- Unique constraint to prevent multiple check-ins same day
CREATE UNIQUE INDEX IF NOT EXISTS idx_shop_checkins_daily ON shop_checkins(shop_id, user_id, (checked_in_at::DATE));

CREATE INDEX IF NOT EXISTS idx_shop_checkins_shop ON shop_checkins(shop_id);
CREATE INDEX IF NOT EXISTS idx_shop_checkins_user ON shop_checkins(user_id);

-- ============================================================================
-- 10. SHOP EVENTS
-- ============================================================================

CREATE TABLE IF NOT EXISTS shop_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id UUID REFERENCES skate_shops(id) ON DELETE CASCADE,

    event_name TEXT NOT NULL,
    description TEXT,
    event_date TIMESTAMPTZ NOT NULL,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_shop_events_shop ON shop_events(shop_id);
CREATE INDEX IF NOT EXISTS idx_shop_events_date ON shop_events(event_date);

-- ============================================================================
-- 11. CREWS (IF NOT EXISTS)
-- ============================================================================

CREATE TABLE IF NOT EXISTS crews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT UNIQUE NOT NULL,
    description TEXT,
    color TEXT DEFAULT '#FF0000',
    logo_url TEXT,

    founder_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,

    total_xp INTEGER DEFAULT 0,
    member_count INTEGER DEFAULT 0,
    spots_controlled INTEGER DEFAULT 0,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_crews_total_xp ON crews(total_xp DESC);

-- Add foreign key to spot_claims if crews table exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'spot_claims_crew_id_fkey'
    ) THEN
        ALTER TABLE spot_claims
        ADD CONSTRAINT spot_claims_crew_id_fkey
        FOREIGN KEY (crew_id) REFERENCES crews(id) ON DELETE SET NULL;
    END IF;
END $$;

-- ============================================================================
-- 12. USER CREWS
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_crews (
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    crew_id UUID REFERENCES crews(id) ON DELETE CASCADE,

    role TEXT DEFAULT 'MEMBER' CHECK (role IN ('FOUNDER', 'ADMIN', 'MEMBER')),
    xp_contributed INTEGER DEFAULT 0,

    joined_at TIMESTAMPTZ DEFAULT NOW(),

    PRIMARY KEY (user_id, crew_id)
);

CREATE INDEX IF NOT EXISTS idx_user_crews_crew ON user_crews(crew_id);
CREATE INDEX IF NOT EXISTS idx_user_crews_user ON user_crews(user_id);

-- ============================================================================
-- 13. CREW TERRITORY (SPOT OWNERSHIP BY CREW)
-- ============================================================================

CREATE TABLE IF NOT EXISTS crew_territories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    spot_id UUID REFERENCES skate_spots(id) ON DELETE CASCADE,
    crew_id UUID REFERENCES crews(id) ON DELETE CASCADE,

    total_points INTEGER DEFAULT 0,
    claim_count INTEGER DEFAULT 0,

    captured_at TIMESTAMPTZ DEFAULT NOW(),
    last_activity TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(spot_id, crew_id)
);

CREATE INDEX IF NOT EXISTS idx_crew_territories_spot ON crew_territories(spot_id);
CREATE INDEX IF NOT EXISTS idx_crew_territories_crew ON crew_territories(crew_id);
CREATE INDEX IF NOT EXISTS idx_crew_territories_points ON crew_territories(total_points DESC);

-- ============================================================================
-- 14. QR CODE SCANS
-- ============================================================================

CREATE TABLE IF NOT EXISTS qr_scans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    spot_id UUID REFERENCES skate_spots(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,

    scanned_at TIMESTAMPTZ DEFAULT NOW(),
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    distance_from_spot INTEGER, -- in meters

    success BOOLEAN DEFAULT TRUE
);

-- Unique daily scan per user per spot
CREATE UNIQUE INDEX IF NOT EXISTS idx_qr_scans_daily ON qr_scans(spot_id, user_id, (scanned_at::DATE));

CREATE INDEX IF NOT EXISTS idx_qr_scans_spot ON qr_scans(spot_id);
CREATE INDEX IF NOT EXISTS idx_qr_scans_user ON qr_scans(user_id);

-- ============================================================================
-- 15. GHOST CLIPS (UNLOCKED VIDEOS AT SPOTS)
-- ============================================================================

CREATE TABLE IF NOT EXISTS ghost_clips (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    spot_id UUID REFERENCES skate_spots(id) ON DELETE CASCADE,
    created_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,

    video_url TEXT NOT NULL,
    trick_name TEXT,
    description TEXT,

    requires_qr_scan BOOLEAN DEFAULT TRUE,

    views INTEGER DEFAULT 0,
    likes INTEGER DEFAULT 0,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ghost_clips_spot ON ghost_clips(spot_id);
CREATE INDEX IF NOT EXISTS idx_ghost_clips_qr ON ghost_clips(requires_qr_scan);

-- ============================================================================
-- 16. USER UNLOCKS
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_unlocks (
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    ghost_clip_id UUID REFERENCES ghost_clips(id) ON DELETE CASCADE,

    unlocked_at TIMESTAMPTZ DEFAULT NOW(),

    PRIMARY KEY (user_id, ghost_clip_id)
);

CREATE INDEX IF NOT EXISTS idx_user_unlocks_user ON user_unlocks(user_id);

-- ============================================================================
-- 17. ROW LEVEL SECURITY POLICIES
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE spot_claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE challenge_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE submission_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE spot_status_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE shop_checkins ENABLE ROW LEVEL SECURITY;
ALTER TABLE qr_scans ENABLE ROW LEVEL SECURITY;
ALTER TABLE ghost_clips ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_unlocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE crews ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_crews ENABLE ROW LEVEL SECURITY;
ALTER TABLE crew_territories ENABLE ROW LEVEL SECURITY;
ALTER TABLE skate_shops ENABLE ROW LEVEL SECURITY;
ALTER TABLE shop_events ENABLE ROW LEVEL SECURITY;

-- Public read access policies (unique names)
CREATE POLICY "spot_claims_public_read" ON spot_claims FOR SELECT USING (true);
CREATE POLICY "challenge_submissions_public_read" ON challenge_submissions FOR SELECT USING (true);
CREATE POLICY "spot_status_updates_public_read" ON spot_status_updates FOR SELECT USING (true);
CREATE POLICY "ghost_clips_public_read" ON ghost_clips FOR SELECT USING (true);
CREATE POLICY "crews_public_read" ON crews FOR SELECT USING (true);
CREATE POLICY "crew_territories_public_read" ON crew_territories FOR SELECT USING (true);
CREATE POLICY "skate_shops_public_read" ON skate_shops FOR SELECT USING (true);
CREATE POLICY "shop_events_public_read" ON shop_events FOR SELECT USING (true);

-- Users can insert their own data
CREATE POLICY "spot_claims_user_insert" ON spot_claims FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "challenge_submissions_user_insert" ON challenge_submissions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "submission_votes_user_insert" ON submission_votes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "spot_status_updates_user_insert" ON spot_status_updates FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "shop_checkins_user_insert" ON shop_checkins FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "qr_scans_user_insert" ON qr_scans FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can read their own unlocks
CREATE POLICY "user_unlocks_user_read" ON user_unlocks FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "user_unlocks_user_insert" ON user_unlocks FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can read submission votes
CREATE POLICY "submission_votes_public_read" ON submission_votes FOR SELECT USING (true);

-- Users can manage their crew membership
CREATE POLICY "user_crews_user_read" ON user_crews FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "user_crews_user_insert" ON user_crews FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can read their shop checkins
CREATE POLICY "shop_checkins_user_read" ON shop_checkins FOR SELECT USING (auth.uid() = user_id);

-- Users can read their QR scans
CREATE POLICY "qr_scans_user_read" ON qr_scans FOR SELECT USING (auth.uid() = user_id);

-- ============================================================================
-- 18. HELPFUL VIEWS
-- ============================================================================

-- View: Spot leaderboard
CREATE OR REPLACE VIEW spot_leaderboard AS
SELECT
    sc.spot_id,
    ss.name as spot_name,
    ss.spot_type,
    p.id as user_id,
    p.username,
    p.avatar_url,
    sc.trick_name,
    sc.points,
    sc.video_url,
    sc.claimed_at,
    ROW_NUMBER() OVER (PARTITION BY sc.spot_id ORDER BY sc.points DESC) as rank
FROM spot_claims sc
JOIN profiles p ON sc.user_id = p.id
JOIN skate_spots ss ON sc.spot_id = ss.id
WHERE sc.verified = TRUE;

-- View: Active challenges
CREATE OR REPLACE VIEW active_challenges AS
SELECT *
FROM challenges
WHERE active = TRUE
AND (expires_at IS NULL OR expires_at > NOW());

-- View: Pending submissions for Judge's Booth
CREATE OR REPLACE VIEW pending_submissions AS
SELECT
    cs.*,
    c.title as challenge_title,
    p.username,
    p.avatar_url,
    ss.name as spot_name
FROM challenge_submissions cs
JOIN challenges c ON cs.challenge_id = c.id
JOIN profiles p ON cs.user_id = p.id
LEFT JOIN skate_spots ss ON cs.spot_id = ss.id
WHERE cs.status = 'PENDING'
ORDER BY cs.submitted_at ASC;

-- View: Crew territory control
CREATE OR REPLACE VIEW crew_territory_control AS
SELECT
    c.id as crew_id,
    c.name as crew_name,
    c.color,
    COUNT(DISTINCT ct.spot_id) as spots_controlled,
    COALESCE(SUM(ct.total_points), 0) as total_territory_points
FROM crews c
LEFT JOIN crew_territories ct ON c.id = ct.crew_id
GROUP BY c.id, c.name, c.color
ORDER BY spots_controlled DESC, total_territory_points DESC;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
