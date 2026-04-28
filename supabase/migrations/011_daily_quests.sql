-- Migration 011: Daily Quests system
-- Supports the DailyQuestsScreen real DB integration

CREATE TABLE IF NOT EXISTS daily_quests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date date NOT NULL DEFAULT CURRENT_DATE,
  title text NOT NULL,
  description text NOT NULL,
  xp_reward int NOT NULL DEFAULT 50,
  difficulty text DEFAULT 'easy' CHECK (difficulty IN ('easy', 'medium', 'hard', 'insane')),
  quest_type text DEFAULT 'general',
  created_at timestamptz DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_daily_quests_date ON daily_quests(date);
ALTER TABLE daily_quests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read daily quests" ON daily_quests FOR SELECT TO authenticated USING (true);

CREATE TABLE IF NOT EXISTS daily_quest_completions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  quest_id uuid REFERENCES daily_quests(id) ON DELETE CASCADE NOT NULL,
  date date NOT NULL DEFAULT CURRENT_DATE,
  xp_earned int DEFAULT 0,
  created_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(user_id, quest_id, date)
);
CREATE INDEX IF NOT EXISTS idx_quest_completions_user_date ON daily_quest_completions(user_id, date);
ALTER TABLE daily_quest_completions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own completions" ON daily_quest_completions FOR ALL USING (auth.uid() = user_id);

-- Seed some quests for today (run manually to populate for testing)
-- INSERT INTO daily_quests (title, description, xp_reward, difficulty, quest_type)
-- VALUES
--   ('Check In Somewhere', 'Check in at any skate spot today.', 50, 'easy', 'checkin'),
--   ('Land a Trick', 'Mark any trick as landed in your Trick Tracker.', 75, 'easy', 'trick'),
--   ('Upload Proof', 'Upload a photo or video to the feed.', 100, 'medium', 'media'),
--   ('Call Out a Skater', 'Send a call out challenge to someone.', 125, 'medium', 'callout'),
--   ('Complete a Challenge', 'Finish any active challenge.', 150, 'hard', 'challenge');
