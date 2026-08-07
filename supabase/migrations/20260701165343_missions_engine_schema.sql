-- Extend challenges to support auto-generated missions
ALTER TABLE public.challenges
  ADD COLUMN IF NOT EXISTS mission_category text CHECK (mission_category = ANY (ARRAY['trick','exploration','community','progression','secret'])),
  ADD COLUMN IF NOT EXISTS min_skill_level text CHECK (min_skill_level = ANY (ARRAY['beginner','intermediate','advanced','pro'])),
  ADD COLUMN IF NOT EXISTS max_skill_level text CHECK (max_skill_level = ANY (ARRAY['beginner','intermediate','advanced','pro'])),
  ADD COLUMN IF NOT EXISTS requirement_type text,
  ADD COLUMN IF NOT EXISTS requirement_value int DEFAULT 1,
  ADD COLUMN IF NOT EXISTS requirement_meta jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS is_auto_generated boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS template_key text;

CREATE INDEX IF NOT EXISTS idx_challenges_auto_active
  ON public.challenges (is_auto_generated, active, challenge_type)
  WHERE is_auto_generated = true;

-- Mission template pool
CREATE TABLE IF NOT EXISTS public.mission_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  category text NOT NULL CHECK (category = ANY (ARRAY['trick','exploration','community','progression','secret'])),
  cadence text NOT NULL CHECK (cadence = ANY (ARRAY['daily','weekly'])),
  title_template text NOT NULL,
  description_template text,
  requirement_type text NOT NULL,
  requirement_value_min int NOT NULL DEFAULT 1,
  requirement_value_max int NOT NULL DEFAULT 1,
  min_skill_level text CHECK (min_skill_level = ANY (ARRAY['beginner','intermediate','advanced','pro'])),
  max_skill_level text CHECK (max_skill_level = ANY (ARRAY['beginner','intermediate','advanced','pro'])),
  base_xp_reward int NOT NULL DEFAULT 50,
  needs_geolocation boolean DEFAULT false,
  weight int NOT NULL DEFAULT 10,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Repetition prevention
CREATE TABLE IF NOT EXISTS public.user_mission_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  template_key text NOT NULL,
  challenge_id uuid REFERENCES public.challenges(id) ON DELETE SET NULL,
  assigned_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_mission_history_lookup
  ON public.user_mission_history (user_id, template_key, assigned_at DESC);

-- Per-user active mission assignment + progress
CREATE TABLE IF NOT EXISTS public.user_missions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  challenge_id uuid NOT NULL REFERENCES public.challenges(id) ON DELETE CASCADE,
  progress_current int NOT NULL DEFAULT 0,
  progress_target int NOT NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status = ANY (ARRAY['active','completed','expired'])),
  assigned_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  UNIQUE (user_id, challenge_id)
);

CREATE INDEX IF NOT EXISTS idx_user_missions_active
  ON public.user_missions (user_id, status) WHERE status = 'active';

ALTER TABLE public.mission_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_mission_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_missions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "templates_public_read" ON public.mission_templates;
CREATE POLICY "templates_public_read" ON public.mission_templates FOR SELECT USING (true);

DROP POLICY IF EXISTS "own_mission_history" ON public.user_mission_history;
CREATE POLICY "own_mission_history" ON public.user_mission_history FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "own_missions_read" ON public.user_missions;
CREATE POLICY "own_missions_read" ON public.user_missions FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "own_missions_update" ON public.user_missions;
CREATE POLICY "own_missions_update" ON public.user_missions FOR UPDATE USING (auth.uid() = user_id);

-- Freeze the two legacy quest systems: stop new writes, keep history readable.
ALTER TABLE public.daily_quests
  ADD COLUMN IF NOT EXISTS frozen boolean DEFAULT true;

ALTER TABLE public.daily_tricks
  ADD COLUMN IF NOT EXISTS frozen boolean DEFAULT true;

UPDATE public.daily_quests SET active = false, frozen = true;


