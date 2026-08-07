
-- Migration 011: Daily quests tables

CREATE TABLE IF NOT EXISTS public.daily_quests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  xp_reward integer DEFAULT 50,
  quest_type text DEFAULT 'general',
  requirement_type text,
  requirement_value integer DEFAULT 1,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.daily_quests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anyone_can_view_quests" ON public.daily_quests;
CREATE POLICY "anyone_can_view_quests" ON public.daily_quests FOR SELECT TO authenticated USING (true);

CREATE TABLE IF NOT EXISTS public.daily_quest_completions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  quest_id uuid REFERENCES public.daily_quests(id) ON DELETE CASCADE,
  completed_at timestamptz DEFAULT now(),
  date date DEFAULT CURRENT_DATE,
  UNIQUE(user_id, quest_id, date)
);
ALTER TABLE public.daily_quest_completions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "users_manage_own_completions" ON public.daily_quest_completions;
CREATE POLICY "users_manage_own_completions" ON public.daily_quest_completions FOR ALL TO authenticated USING (user_id = auth.uid());

-- Seed some default daily quests
INSERT INTO public.daily_quests (title, description, xp_reward, quest_type, requirement_type, requirement_value) VALUES
  ('Visit a Skatepark', 'Check in at any skatepark on the map', 100, 'location', 'checkins', 1),
  ('Log 3 Tricks', 'Log at least 3 tricks in your session', 75, 'tricks', 'trick_count', 3),
  ('Explore a New Spot', 'Visit a skatepark you''ve never been to', 150, 'exploration', 'new_spot', 1),
  ('Complete a Challenge', 'Finish any active challenge', 200, 'challenge', 'challenge_complete', 1),
  ('Rate a Spot', 'Leave a rating or comment on a skatepark', 50, 'social', 'spot_rating', 1)
ON CONFLICT DO NOTHING;


