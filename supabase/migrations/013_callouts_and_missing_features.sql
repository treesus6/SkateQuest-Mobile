-- Migration 013: Call Outs, Demo Days, and Bounties foundation

-- ── Call Outs ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS call_outs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  caller_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  target_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  spot_id uuid REFERENCES skate_spots(id) ON DELETE CASCADE NOT NULL,
  trick_name text NOT NULL,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'completed', 'declined', 'expired')),
  media_id uuid REFERENCES media(id) ON DELETE SET NULL,
  expires_at timestamptz DEFAULT (now() + interval '7 days'),
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE call_outs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can see call outs they are involved in" ON call_outs
  FOR SELECT USING (auth.uid() = caller_id OR auth.uid() = target_id);

CREATE POLICY "Users can create call outs" ON call_outs
  FOR INSERT WITH CHECK (auth.uid() = caller_id);

CREATE POLICY "Targets can update call out status" ON call_outs
  FOR UPDATE USING (auth.uid() = target_id)
  WITH CHECK (status IN ('accepted', 'completed', 'declined'));

-- ── Demo Days ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS demo_days (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid REFERENCES skate_shops(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  event_date timestamptz NOT NULL,
  brands text[],
  free_stuff boolean DEFAULT false,
  created_at timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS demo_day_rsvps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  demo_id uuid REFERENCES demo_days(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(demo_id, user_id)
);

ALTER TABLE demo_days ENABLE ROW LEVEL SECURITY;
ALTER TABLE demo_day_rsvps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read demo days" ON demo_days FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can manage their RSVPs" ON demo_day_rsvps FOR ALL USING (auth.uid() = user_id);

-- ── Bounties (Fixing existing implementation) ───────────────────────────────
CREATE TABLE IF NOT EXISTS bounties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  crew_id uuid REFERENCES crews(id) ON DELETE CASCADE,
  trick_name text NOT NULL,
  park_name text,
  description text,
  xp_reward integer DEFAULT 500,
  status text DEFAULT 'open' CHECK (status IN ('open', 'claimed', 'expired')),
  expires_at timestamptz DEFAULT (now() + interval '30 days'),
  created_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE bounties ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read bounties" ON bounties FOR SELECT TO authenticated USING (true);
