-- ============================================================
-- Migration 004: Sessions, Crews, Content & Charity tables
-- Run this in Supabase Dashboard → SQL Editor
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- 1. PROFILES (base table – Supabase auth trigger creates rows)
--    Add missing columns if they don't exist yet
-- ─────────────────────────────────────────────────────────────
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS username        TEXT,
  ADD COLUMN IF NOT EXISTS xp              INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS level           INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS total_xp_donated INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS avatar_url      TEXT,
  ADD COLUMN IF NOT EXISTS bio             TEXT,
  ADD COLUMN IF NOT EXISTS updated_at      TIMESTAMPTZ DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_profiles_username ON profiles(username);

-- ─────────────────────────────────────────────────────────────
-- 2. CREWS
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS crews (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name         TEXT NOT NULL,
  description  TEXT,
  created_by   UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  member_count INTEGER DEFAULT 1,
  total_xp     INTEGER DEFAULT 0,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_crews_created_by ON crews(created_by);

-- ─────────────────────────────────────────────────────────────
-- 3. CREW MEMBERS
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS crew_members (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  crew_id    UUID NOT NULL REFERENCES crews(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role       TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'member')),
  joined_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(crew_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_crew_members_crew   ON crew_members(crew_id);
CREATE INDEX IF NOT EXISTS idx_crew_members_user   ON crew_members(user_id);

-- ─────────────────────────────────────────────────────────────
-- 4. SKATE SESSIONS
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS skate_sessions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title         TEXT NOT NULL,
  spot_id       UUID,                          -- optional link to skate_spots
  spot_name     TEXT,                          -- free-text fallback
  date          DATE NOT NULL,
  time          TIME NOT NULL,
  description   TEXT,
  created_by    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  max_attendees INTEGER,                       -- NULL = unlimited
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_skate_sessions_created_by ON skate_sessions(created_by);
CREATE INDEX IF NOT EXISTS idx_skate_sessions_date       ON skate_sessions(date);

-- ─────────────────────────────────────────────────────────────
-- 5. SESSION ATTENDEES  (RSVP list)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS session_attendees (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES skate_sessions(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(session_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_session_attendees_session ON session_attendees(session_id);
CREATE INDEX IF NOT EXISTS idx_session_attendees_user    ON session_attendees(user_id);

-- ─────────────────────────────────────────────────────────────
-- 6. TRICK TUTORIALS  (TrickTutorialsScreen)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS trick_tutorials (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trick_name   TEXT NOT NULL,
  youtube_url  TEXT NOT NULL,
  difficulty   TEXT NOT NULL CHECK (difficulty IN ('Beginner', 'Intermediate', 'Advanced', 'Pro')),
  channel_name TEXT,
  duration     TEXT,                           -- e.g. "4:32"
  suggested_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  approved     BOOLEAN DEFAULT FALSE,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_trick_tutorials_difficulty ON trick_tutorials(difficulty);
CREATE INDEX IF NOT EXISTS idx_trick_tutorials_approved   ON trick_tutorials(approved);

-- Seed a handful of starter tutorials (approved = true)
INSERT INTO trick_tutorials (trick_name, youtube_url, difficulty, channel_name, duration, approved)
VALUES
  ('Ollie',          'https://www.youtube.com/watch?v=0ODODKvyGcM', 'Beginner',     'Braille Skateboarding', '6:12', TRUE),
  ('Kickflip',       'https://www.youtube.com/watch?v=BH5D8TsOLkA', 'Beginner',     'Braille Skateboarding', '7:45', TRUE),
  ('Heelflip',       'https://www.youtube.com/watch?v=sSVOPfJGVMQ', 'Intermediate', 'Braille Skateboarding', '5:30', TRUE),
  ('Backside 180',   'https://www.youtube.com/watch?v=0XnFh9OmxoY', 'Beginner',     'SkateSupport',          '4:10', TRUE),
  ('Tre Flip',       'https://www.youtube.com/watch?v=M8nQhHnhzgM', 'Advanced',     'Jonny Giger',           '8:22', TRUE),
  ('Hardflip',       'https://www.youtube.com/watch?v=FtmKdUwQmhA', 'Advanced',     'Braille Skateboarding', '6:50', TRUE),
  ('Frontside Feeble','https://www.youtube.com/watch?v=yc9QYmV_JRE','Intermediate', 'SkateSupport',          '5:05', TRUE),
  ('Switch Kickflip','https://www.youtube.com/watch?v=Qlf6LxuNg2w', 'Pro',          'Jonny Giger',           '9:15', TRUE)
ON CONFLICT DO NOTHING;

-- ─────────────────────────────────────────────────────────────
-- 7. TUTORIAL BOOKMARKS
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tutorial_bookmarks (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tutorial_id UUID NOT NULL REFERENCES trick_tutorials(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tutorial_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_tutorial_bookmarks_user ON tutorial_bookmarks(user_id);

-- ─────────────────────────────────────────────────────────────
-- 8. CLIP OF WEEK  (weekly video submissions)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS weekly_clips (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  video_url   TEXT NOT NULL,
  thumbnail   TEXT,
  caption     TEXT,
  trick_name  TEXT,
  spot_name   TEXT,
  vote_count  INTEGER DEFAULT 0,
  week_start  DATE NOT NULL,                  -- Monday of submission week
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_weekly_clips_week  ON weekly_clips(week_start);
CREATE INDEX IF NOT EXISTS idx_weekly_clips_votes ON weekly_clips(vote_count DESC);

-- ─────────────────────────────────────────────────────────────
-- 9. CLIP VOTES  (one vote per user per clip)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS clip_votes (
  id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clip_id  UUID NOT NULL REFERENCES weekly_clips(id) ON DELETE CASCADE,
  user_id  UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  UNIQUE(clip_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_clip_votes_clip ON clip_votes(clip_id);
CREATE INDEX IF NOT EXISTS idx_clip_votes_user ON clip_votes(user_id);

-- RPC: increment clip vote count
CREATE OR REPLACE FUNCTION increment_clip_votes(p_clip_id UUID)
RETURNS VOID LANGUAGE plpgsql AS $$
BEGIN
  UPDATE weekly_clips SET vote_count = vote_count + 1 WHERE id = p_clip_id;
END;
$$;

-- RPC: decrement clip vote count (floor 0)
CREATE OR REPLACE FUNCTION decrement_clip_votes(p_clip_id UUID)
RETURNS VOID LANGUAGE plpgsql AS $$
BEGIN
  UPDATE weekly_clips SET vote_count = GREATEST(vote_count - 1, 0) WHERE id = p_clip_id;
END;
$$;

-- ─────────────────────────────────────────────────────────────
-- 10. XP DONATIONS  (DonateXPScreen)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS xp_donations (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  xp_amount    INTEGER NOT NULL CHECK (xp_amount > 0),
  usd_value    NUMERIC(10,2) GENERATED ALWAYS AS (xp_amount::NUMERIC / 1000) STORED,
  boards_funded NUMERIC(10,4) GENERATED ALWAYS AS (xp_amount::NUMERIC / 50000) STORED,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_xp_donations_user       ON xp_donations(user_id);
CREATE INDEX IF NOT EXISTS idx_xp_donations_created    ON xp_donations(created_at DESC);

-- ─────────────────────────────────────────────────────────────
-- 11. ROW LEVEL SECURITY
-- ─────────────────────────────────────────────────────────────

-- Crews: anyone can read, only auth users can insert
ALTER TABLE crews ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "crews_select" ON crews;
DROP POLICY IF EXISTS "crews_insert" ON crews;
CREATE POLICY "crews_select" ON crews FOR SELECT USING (TRUE);
CREATE POLICY "crews_insert" ON crews FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "crews_update" ON crews FOR UPDATE USING (created_by = auth.uid());

-- Crew members: read all, write own
ALTER TABLE crew_members ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "crew_members_select" ON crew_members;
DROP POLICY IF EXISTS "crew_members_insert" ON crew_members;
CREATE POLICY "crew_members_select" ON crew_members FOR SELECT USING (TRUE);
CREATE POLICY "crew_members_insert" ON crew_members FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "crew_members_delete" ON crew_members FOR DELETE USING (user_id = auth.uid());

-- Skate sessions: read all, write own
ALTER TABLE skate_sessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "skate_sessions_select" ON skate_sessions;
CREATE POLICY "skate_sessions_select" ON skate_sessions FOR SELECT USING (TRUE);
CREATE POLICY "skate_sessions_insert" ON skate_sessions FOR INSERT WITH CHECK (auth.uid() = created_by);
CREATE POLICY "skate_sessions_update" ON skate_sessions FOR UPDATE USING (auth.uid() = created_by);
CREATE POLICY "skate_sessions_delete" ON skate_sessions FOR DELETE USING (auth.uid() = created_by);

-- Session attendees: read all, write own
ALTER TABLE session_attendees ENABLE ROW LEVEL SECURITY;
CREATE POLICY "session_attendees_select" ON session_attendees FOR SELECT USING (TRUE);
CREATE POLICY "session_attendees_insert" ON session_attendees FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "session_attendees_delete" ON session_attendees FOR DELETE USING (auth.uid() = user_id);

-- Tutorials: read approved, insert for suggestions
ALTER TABLE trick_tutorials ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tutorials_select" ON trick_tutorials FOR SELECT USING (approved = TRUE OR suggested_by = auth.uid());
CREATE POLICY "tutorials_insert" ON trick_tutorials FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Tutorial bookmarks: own rows
ALTER TABLE tutorial_bookmarks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "bookmarks_select" ON tutorial_bookmarks FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "bookmarks_insert" ON tutorial_bookmarks FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "bookmarks_delete" ON tutorial_bookmarks FOR DELETE USING (user_id = auth.uid());

-- Weekly clips: read all, insert own
ALTER TABLE weekly_clips ENABLE ROW LEVEL SECURITY;
CREATE POLICY "clips_select" ON weekly_clips FOR SELECT USING (TRUE);
CREATE POLICY "clips_insert" ON weekly_clips FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Clip votes: read all, insert/delete own
ALTER TABLE clip_votes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "clip_votes_select" ON clip_votes FOR SELECT USING (TRUE);
CREATE POLICY "clip_votes_insert" ON clip_votes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "clip_votes_delete" ON clip_votes FOR DELETE USING (auth.uid() = user_id);

-- XP donations: read all (leaderboard), insert own
ALTER TABLE xp_donations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "xp_donations_select" ON xp_donations FOR SELECT USING (TRUE);
CREATE POLICY "xp_donations_insert" ON xp_donations FOR INSERT WITH CHECK (auth.uid() = user_id);
