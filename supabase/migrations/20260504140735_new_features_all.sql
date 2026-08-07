
-- SKATE PASSPORT
CREATE TABLE IF NOT EXISTS public.skate_passport_stamps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  location_type text DEFAULT 'state',
  location_name text NOT NULL,
  location_code text,
  park_id uuid,
  stamped_at timestamptz DEFAULT now(),
  UNIQUE(user_id, location_code)
);
ALTER TABLE public.skate_passport_stamps ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_manage_own_stamps" ON public.skate_passport_stamps FOR ALL TO authenticated USING (user_id = auth.uid());
CREATE POLICY "anyone_can_view_stamps" ON public.skate_passport_stamps FOR SELECT TO authenticated USING (true);

-- SESSION CHECK-INS
CREATE TABLE IF NOT EXISTS public.live_checkins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  park_id uuid,
  park_name text,
  latitude double precision,
  longitude double precision,
  message text,
  expires_at timestamptz DEFAULT (now() + interval '4 hours'),
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.live_checkins ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_manage_own_checkins" ON public.live_checkins FOR ALL TO authenticated USING (user_id = auth.uid());
CREATE POLICY "anyone_can_view_checkins" ON public.live_checkins FOR SELECT TO authenticated USING (true);

-- TRICK OF THE WEEK
CREATE TABLE IF NOT EXISTS public.trick_of_week (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trick_name text NOT NULL,
  description text,
  week_start date NOT NULL,
  week_end date NOT NULL,
  winner_id uuid REFERENCES public.profiles(id),
  winner_clip_id uuid,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.trick_of_week ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anyone_can_view_totw" ON public.trick_of_week FOR SELECT TO authenticated USING (true);

CREATE TABLE IF NOT EXISTS public.trick_of_week_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  totw_id uuid REFERENCES public.trick_of_week(id) ON DELETE CASCADE,
  video_url text,
  thumbnail_url text,
  votes integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, totw_id)
);
ALTER TABLE public.trick_of_week_submissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_manage_own_totw" ON public.trick_of_week_submissions FOR ALL TO authenticated USING (user_id = auth.uid());
CREATE POLICY "anyone_can_view_totw_subs" ON public.trick_of_week_submissions FOR SELECT TO authenticated USING (true);

CREATE TABLE IF NOT EXISTS public.trick_of_week_votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  submission_id uuid REFERENCES public.trick_of_week_submissions(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, submission_id)
);
ALTER TABLE public.trick_of_week_votes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_manage_own_totw_votes" ON public.trick_of_week_votes FOR ALL TO authenticated USING (user_id = auth.uid());

-- BUST RISK REPORTS
CREATE TABLE IF NOT EXISTS public.bust_risk_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  park_id uuid,
  risk_level text CHECK (risk_level IN ('low', 'medium', 'high', 'no_skate')),
  notes text,
  reported_at timestamptz DEFAULT now()
);
ALTER TABLE public.bust_risk_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_can_report_bust" ON public.bust_risk_reports FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "anyone_can_view_bust" ON public.bust_risk_reports FOR SELECT TO authenticated USING (true);

-- BOUNTY SYSTEM
CREATE TABLE IF NOT EXISTS public.bounties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  crew_id uuid REFERENCES public.crews(id) ON DELETE CASCADE,
  created_by uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  park_id uuid,
  park_name text,
  trick_name text NOT NULL,
  description text,
  xp_reward integer DEFAULT 500,
  claimed_by uuid REFERENCES public.profiles(id),
  claim_video_url text,
  status text DEFAULT 'open' CHECK (status IN ('open', 'claimed', 'expired')),
  expires_at timestamptz DEFAULT (now() + interval '7 days'),
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.bounties ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anyone_can_view_bounties" ON public.bounties FOR SELECT TO authenticated USING (true);
CREATE POLICY "crew_members_create_bounties" ON public.bounties FOR INSERT TO authenticated WITH CHECK (created_by = auth.uid());
CREATE POLICY "users_claim_bounties" ON public.bounties FOR UPDATE TO authenticated USING (true);

-- HIDDEN GEMS
CREATE TABLE IF NOT EXISTS public.hidden_gems (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  latitude double precision NOT NULL,
  longitude double precision NOT NULL,
  unlock_xp_required integer DEFAULT 1000,
  added_by uuid REFERENCES public.profiles(id),
  photos text[],
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.hidden_gems ENABLE ROW LEVEL SECURITY;
CREATE POLICY "unlock_hidden_gems" ON public.hidden_gems FOR SELECT TO authenticated USING (true);

-- SKATE FORECAST
CREATE TABLE IF NOT EXISTS public.skate_forecasts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  park_id uuid,
  forecast_date date DEFAULT CURRENT_DATE,
  weather_condition text,
  temperature_f integer,
  chance_of_rain integer,
  bust_risk_score integer DEFAULT 50,
  overall_score integer DEFAULT 50,
  recommendation text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.skate_forecasts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anyone_can_view_forecast" ON public.skate_forecasts FOR SELECT TO authenticated USING (true);

-- SHOP SPONSOR OFFERS
CREATE TABLE IF NOT EXISTS public.shop_sponsor_offers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid REFERENCES public.skate_shops(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  discount_percent integer,
  discount_code text,
  min_level_required integer DEFAULT 5,
  max_redemptions integer,
  redemptions_count integer DEFAULT 0,
  expires_at timestamptz,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.shop_sponsor_offers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anyone_can_view_offers" ON public.shop_sponsor_offers FOR SELECT TO authenticated USING (true);

CREATE TABLE IF NOT EXISTS public.shop_offer_redemptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  offer_id uuid REFERENCES public.shop_sponsor_offers(id) ON DELETE CASCADE,
  redeemed_at timestamptz DEFAULT now(),
  UNIQUE(user_id, offer_id)
);
ALTER TABLE public.shop_offer_redemptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_manage_own_redemptions" ON public.shop_offer_redemptions FOR ALL TO authenticated USING (user_id = auth.uid());

-- DEMO DAYS
CREATE TABLE IF NOT EXISTS public.demo_days (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid REFERENCES public.skate_shops(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  latitude double precision,
  longitude double precision,
  event_date timestamptz NOT NULL,
  brands text[],
  free_stuff boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.demo_days ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anyone_can_view_demos" ON public.demo_days FOR SELECT TO authenticated USING (true);

CREATE TABLE IF NOT EXISTS public.demo_day_rsvps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  demo_id uuid REFERENCES public.demo_days(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, demo_id)
);
ALTER TABLE public.demo_day_rsvps ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_manage_own_rsvps" ON public.demo_day_rsvps FOR ALL TO authenticated USING (user_id = auth.uid());

-- SKATE TV
CREATE TABLE IF NOT EXISTS public.skatetv_clips (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  video_url text NOT NULL,
  thumbnail_url text,
  title text,
  trick_name text,
  park_name text,
  latitude double precision,
  longitude double precision,
  likes integer DEFAULT 0,
  views integer DEFAULT 0,
  featured boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.skatetv_clips ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anyone_can_view_skatetv" ON public.skatetv_clips FOR SELECT TO authenticated USING (true);
CREATE POLICY "users_post_clips" ON public.skatetv_clips FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "users_delete_own_clips" ON public.skatetv_clips FOR DELETE TO authenticated USING (user_id = auth.uid());

CREATE TABLE IF NOT EXISTS public.skatetv_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  clip_id uuid REFERENCES public.skatetv_clips(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, clip_id)
);
ALTER TABLE public.skatetv_likes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_manage_own_likes" ON public.skatetv_likes FOR ALL TO authenticated USING (user_id = auth.uid());

-- AI TRICK COACH
CREATE TABLE IF NOT EXISTS public.ai_coach_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  video_url text NOT NULL,
  trick_name text,
  analysis text,
  tips text[],
  score integer,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.ai_coach_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_manage_own_coach" ON public.ai_coach_sessions FOR ALL TO authenticated USING (user_id = auth.uid());

-- Indexes
CREATE INDEX IF NOT EXISTS idx_live_checkins_park ON public.live_checkins(park_id);
CREATE INDEX IF NOT EXISTS idx_bounties_status ON public.bounties(status);
CREATE INDEX IF NOT EXISTS idx_skatetv_featured ON public.skatetv_clips(featured, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_passport_user ON public.skate_passport_stamps(user_id);


