-- Migration 010: Tables referenced in app code but missing from prior migrations
-- Run this in your Supabase SQL editor or via supabase db push

-- ── Notifications ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  type text NOT NULL DEFAULT 'system',
  title text NOT NULL,
  body text,
  data jsonb,
  read_at timestamptz,
  created_at timestamptz DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own notifications" ON notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own notifications" ON notifications FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own notifications" ON notifications FOR DELETE USING (auth.uid() = user_id);

-- ── Conversations & Messages ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL DEFAULT 'direct' CHECK (type IN ('direct', 'crew')),
  name text,
  crew_id uuid REFERENCES crews(id) ON DELETE CASCADE,
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  last_message_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS conversation_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid REFERENCES conversations(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  joined_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(conversation_id, user_id)
);

CREATE TABLE IF NOT EXISTS messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid REFERENCES conversations(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  content text NOT NULL,
  read_at timestamptz,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  deleted_at timestamptz
);
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id);
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members can read conversations" ON conversations FOR SELECT USING (
  EXISTS (SELECT 1 FROM conversation_members WHERE conversation_id = id AND user_id = auth.uid())
);
CREATE POLICY "Members can read messages" ON messages FOR SELECT USING (
  EXISTS (SELECT 1 FROM conversation_members WHERE conversation_id = messages.conversation_id AND user_id = auth.uid())
);
CREATE POLICY "Members can insert messages" ON messages FOR INSERT WITH CHECK (
  auth.uid() = user_id AND
  EXISTS (SELECT 1 FROM conversation_members WHERE conversation_id = messages.conversation_id AND user_id = auth.uid())
);

-- ── Spot of the Day ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS spot_of_day (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  spot_id uuid REFERENCES skate_spots(id) ON DELETE CASCADE NOT NULL,
  date date NOT NULL UNIQUE DEFAULT CURRENT_DATE,
  description text,
  created_at timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS spot_day_rsvps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  spot_day_id uuid REFERENCES spot_of_day(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(spot_day_id, user_id)
);

CREATE TABLE IF NOT EXISTS spot_day_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  spot_day_id uuid REFERENCES spot_of_day(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  comment_text text NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);
ALTER TABLE spot_of_day ENABLE ROW LEVEL SECURITY;
ALTER TABLE spot_day_rsvps ENABLE ROW LEVEL SECURITY;
ALTER TABLE spot_day_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read spot of day" ON spot_of_day FOR SELECT TO authenticated USING (true);
CREATE POLICY "Anyone can rsvp" ON spot_day_rsvps FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Anyone can comment" ON spot_day_comments FOR ALL USING (auth.uid() = user_id);

-- ── Trick Tutorials ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS trick_tutorials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trick_name text NOT NULL,
  youtube_url text NOT NULL,
  difficulty text NOT NULL DEFAULT 'Beginner' CHECK (difficulty IN ('Beginner', 'Intermediate', 'Advanced', 'Pro')),
  submitted_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  votes int DEFAULT 0,
  created_at timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS tutorial_bookmarks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  tutorial_id uuid REFERENCES trick_tutorials(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(user_id, tutorial_id)
);
ALTER TABLE trick_tutorials ENABLE ROW LEVEL SECURITY;
ALTER TABLE tutorial_bookmarks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read tutorials" ON trick_tutorials FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert tutorials" ON trick_tutorials FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Users manage own bookmarks" ON tutorial_bookmarks FOR ALL USING (auth.uid() = user_id);

-- ── Clip of Week ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS clip_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  media_id uuid REFERENCES media(id) ON DELETE CASCADE,
  week_number int NOT NULL,
  year int NOT NULL,
  trick_name text NOT NULL DEFAULT 'Unknown',
  votes int DEFAULT 0,
  created_at timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS clip_votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  submission_id uuid REFERENCES clip_submissions(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(user_id, submission_id)
);
ALTER TABLE clip_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE clip_votes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read clip submissions" ON clip_submissions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can submit clips" ON clip_submissions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users manage own votes" ON clip_votes FOR ALL USING (auth.uid() = user_id);

-- RPC to increment/decrement clip votes atomically
CREATE OR REPLACE FUNCTION increment_clip_votes(submission_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE clip_submissions SET votes = votes + 1 WHERE id = submission_id;
END;
$$;
CREATE OR REPLACE FUNCTION decrement_clip_votes(submission_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE clip_submissions SET votes = GREATEST(0, votes - 1) WHERE id = submission_id;
END;
$$;

-- ── Trick Bingo ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS bingo_cards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  week_number int NOT NULL,
  tricks text[] NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS bingo_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  bingo_card_id uuid REFERENCES bingo_cards(id) ON DELETE CASCADE NOT NULL,
  landed_cells int[] DEFAULT '{}',
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(user_id, bingo_card_id)
);
ALTER TABLE bingo_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE bingo_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read bingo cards" ON bingo_cards FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users manage own progress" ON bingo_progress FOR ALL USING (auth.uid() = user_id);

-- ── Mentorship ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS mentor_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL UNIQUE,
  specialty text NOT NULL DEFAULT 'street',
  tricks_mastered int DEFAULT 0,
  level int DEFAULT 1,
  available bool DEFAULT true,
  created_at timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS mentorships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mentor_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  apprentice_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'completed', 'declined')),
  xp_earned int DEFAULT 0,
  tricks_learned int DEFAULT 0,
  created_at timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS mentor_relationships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mentor_user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  mentee_user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  status text DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed', 'declined')),
  goals text,
  progress_notes text,
  started_at timestamptz DEFAULT now(),
  ended_at timestamptz,
  last_interaction timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);
ALTER TABLE mentor_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE mentorships ENABLE ROW LEVEL SECURITY;
ALTER TABLE mentor_relationships ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view mentors" ON mentor_profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users manage own mentor profile" ON mentor_profiles FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can view their mentorships" ON mentorships FOR SELECT USING (
  auth.uid() = mentor_id OR auth.uid() = apprentice_id
);
CREATE POLICY "Users can view their relationships" ON mentor_relationships FOR SELECT USING (
  auth.uid() = mentor_user_id OR auth.uid() = mentee_user_id
);

-- ── Referrals ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS referral_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  code text NOT NULL UNIQUE,
  description text,
  activation_bonus_xp int DEFAULT 500,
  recruiter_bonus_xp int DEFAULT 250,
  active bool DEFAULT true,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS referral_uses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referral_code_id uuid REFERENCES referral_codes(id) ON DELETE CASCADE NOT NULL,
  recruiter_user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  new_user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  bonus_xp_awarded int DEFAULT 0,
  recruiter_bonus_xp_awarded int DEFAULT 0,
  used_at timestamptz DEFAULT now() NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);
ALTER TABLE referral_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE referral_uses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own codes" ON referral_codes FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can read all active codes" ON referral_codes FOR SELECT TO authenticated USING (active = true);
CREATE POLICY "Users can see own uses" ON referral_uses FOR SELECT USING (auth.uid() = recruiter_user_id);

-- ── Seasonal Events ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS seasonal_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  season text NOT NULL CHECK (season IN ('spring', 'summer', 'fall', 'winter')),
  year int NOT NULL,
  start_date timestamptz NOT NULL,
  end_date timestamptz NOT NULL,
  description text,
  tier_count int DEFAULT 5,
  tier_rewards jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS seasonal_user_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  seasonal_event_id uuid REFERENCES seasonal_events(id) ON DELETE CASCADE NOT NULL,
  progress_value int DEFAULT 0,
  current_tier int DEFAULT 0,
  max_tier_reached int DEFAULT 0,
  completed_at timestamptz,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(user_id, seasonal_event_id)
);
ALTER TABLE seasonal_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE seasonal_user_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read seasonal events" ON seasonal_events FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users manage own progress" ON seasonal_user_progress FOR ALL USING (auth.uid() = user_id);

-- ── Changelogs ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS changelogs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  version text NOT NULL UNIQUE,
  title text NOT NULL,
  description text,
  release_notes text,
  features text[],
  bug_fixes text[],
  known_issues text[],
  release_date date NOT NULL DEFAULT CURRENT_DATE,
  released_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  platform text[] DEFAULT '{ios,android}',
  is_critical bool DEFAULT false,
  created_at timestamptz DEFAULT now() NOT NULL
);
ALTER TABLE changelogs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read changelogs" ON changelogs FOR SELECT TO authenticated USING (true);

-- ── Content Moderation Queue ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS content_moderation_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content_type text NOT NULL,
  content_id uuid,
  user_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  content_preview text,
  reason_flagged text NOT NULL,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'flagged')),
  moderator_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  moderator_action text,
  actioned_at timestamptz,
  created_at timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS user_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  reported_user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  report_type text NOT NULL,
  reason text NOT NULL,
  context text,
  context_id uuid,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'resolved', 'dismissed')),
  moderator_notes text,
  moderator_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  created_at timestamptz DEFAULT now() NOT NULL
);
ALTER TABLE content_moderation_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage moderation queue" ON content_moderation_queue FOR ALL USING (true);
CREATE POLICY "Users can submit reports" ON user_reports FOR INSERT WITH CHECK (auth.uid() = reporter_id);
CREATE POLICY "Users can view own reports" ON user_reports FOR SELECT USING (auth.uid() = reporter_id OR auth.uid() = reported_user_id);

-- ── User Saved Spots ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_saved_spots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  spot_id uuid REFERENCES skate_spots(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(user_id, spot_id)
);
ALTER TABLE user_saved_spots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own saved spots" ON user_saved_spots FOR ALL USING (auth.uid() = user_id);

-- ── Seasonal Pass (pass_progress needs last_claimed_date) ─────────────────────
ALTER TABLE pass_progress ADD COLUMN IF NOT EXISTS last_claimed_date date;

-- ── Spot Comments (used in SpotDetailScreen) ──────────────────────────────────
CREATE TABLE IF NOT EXISTS spot_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  spot_id uuid REFERENCES skate_spots(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  content text NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);
ALTER TABLE spot_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read spot comments" ON spot_comments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can write spot comments" ON spot_comments FOR INSERT WITH CHECK (auth.uid() = user_id);
