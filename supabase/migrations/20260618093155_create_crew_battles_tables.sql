
-- Crew vs Crew trick battles with community voting
CREATE TABLE IF NOT EXISTS public.crew_battles (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  crew_a_id       UUID NOT NULL REFERENCES public.crews(id) ON DELETE CASCADE,
  crew_b_id       UUID NOT NULL REFERENCES public.crews(id) ON DELETE CASCADE,
  spot_id         UUID REFERENCES public.skate_spots(id) ON DELETE SET NULL,
  trick_name      TEXT NOT NULL,
  votes_a         INTEGER DEFAULT 0,
  votes_b         INTEGER DEFAULT 0,
  ends_at         TIMESTAMPTZ NOT NULL,
  winner_crew_id  UUID REFERENCES public.crews(id) ON DELETE SET NULL,
  status          TEXT NOT NULL DEFAULT 'active'
                    CHECK (status IN ('active', 'completed')),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT crew_battles_different_crews CHECK (crew_a_id <> crew_b_id)
);

ALTER TABLE public.crew_battles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "crew_battles_public_select"
  ON public.crew_battles FOR SELECT USING (true);

CREATE POLICY "crew_battles_auth_insert"
  ON public.crew_battles FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Allow vote count updates and winner resolution
CREATE POLICY "crew_battles_auth_update"
  ON public.crew_battles FOR UPDATE USING (auth.uid() IS NOT NULL);

-- One vote per user per battle
CREATE TABLE IF NOT EXISTS public.crew_battle_votes (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  battle_id   UUID NOT NULL REFERENCES public.crew_battles(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  crew_voted  TEXT NOT NULL CHECK (crew_voted IN ('a', 'b')),
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (battle_id, user_id)
);

ALTER TABLE public.crew_battle_votes ENABLE ROW LEVEL SECURITY;

-- Anyone can see vote counts (for live vote bars)
CREATE POLICY "crew_battle_votes_public_select"
  ON public.crew_battle_votes FOR SELECT USING (true);

-- Users can only insert their own vote
CREATE POLICY "crew_battle_votes_own_insert"
  ON public.crew_battle_votes FOR INSERT WITH CHECK (auth.uid() = user_id);


