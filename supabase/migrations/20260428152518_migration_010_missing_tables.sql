
-- Migration 010: Missing tables

-- Notifications
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  type text NOT NULL,
  title text,
  body text,
  data jsonb DEFAULT '{}',
  read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "users_see_own_notifications" ON public.notifications;
CREATE POLICY "users_see_own_notifications" ON public.notifications FOR ALL TO authenticated USING (user_id = auth.uid());

-- Conversations
CREATE TABLE IF NOT EXISTS public.conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text DEFAULT 'direct',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

-- Conversation members
CREATE TABLE IF NOT EXISTS public.conversation_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid REFERENCES public.conversations(id) ON DELETE CASCADE,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.conversation_members ENABLE ROW LEVEL SECURITY;

-- Messages
CREATE TABLE IF NOT EXISTS public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  content text,
  read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Spot of the day
CREATE TABLE IF NOT EXISTS public.spot_of_day (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  spot_id uuid,
  date date DEFAULT CURRENT_DATE,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.spot_of_day ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anyone_can_view_spot_of_day" ON public.spot_of_day;
CREATE POLICY "anyone_can_view_spot_of_day" ON public.spot_of_day FOR SELECT TO authenticated USING (true);

-- Trick tutorials
CREATE TABLE IF NOT EXISTS public.trick_tutorials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  difficulty text,
  category text,
  description text,
  video_url text,
  thumbnail_url text,
  tips text[],
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.trick_tutorials ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anyone_can_view_tutorials" ON public.trick_tutorials;
CREATE POLICY "anyone_can_view_tutorials" ON public.trick_tutorials FOR SELECT TO authenticated USING (true);

-- Clip submissions
CREATE TABLE IF NOT EXISTS public.clip_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  challenge_id uuid,
  video_url text,
  thumbnail_url text,
  status text DEFAULT 'pending',
  score integer,
  feedback text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.clip_submissions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "users_manage_own_clips" ON public.clip_submissions;
CREATE POLICY "users_manage_own_clips" ON public.clip_submissions FOR ALL TO authenticated USING (user_id = auth.uid());

-- Bingo cards
CREATE TABLE IF NOT EXISTS public.bingo_cards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  card_data jsonb DEFAULT '{}',
  completed_cells integer[] DEFAULT '{}',
  completed boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.bingo_cards ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "users_manage_own_bingo" ON public.bingo_cards;
CREATE POLICY "users_manage_own_bingo" ON public.bingo_cards FOR ALL TO authenticated USING (user_id = auth.uid());

-- Mentor relationships
CREATE TABLE IF NOT EXISTS public.mentor_relationships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mentor_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  mentee_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  status text DEFAULT 'pending',
  created_at timestamptz DEFAULT now(),
  UNIQUE(mentor_id, mentee_id)
);
ALTER TABLE public.mentor_relationships ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "users_see_own_mentorships" ON public.mentor_relationships;
CREATE POLICY "users_see_own_mentorships" ON public.mentor_relationships FOR ALL TO authenticated USING (mentor_id = auth.uid() OR mentee_id = auth.uid());

-- Referrals
CREATE TABLE IF NOT EXISTS public.referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  referred_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  code text UNIQUE,
  claimed boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "users_see_own_referrals" ON public.referrals;
CREATE POLICY "users_see_own_referrals" ON public.referrals FOR ALL TO authenticated USING (referrer_id = auth.uid() OR referred_id = auth.uid());

-- Seasonal events
CREATE TABLE IF NOT EXISTS public.seasonal_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  start_date timestamptz,
  end_date timestamptz,
  rewards jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.seasonal_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anyone_can_view_seasonal_events" ON public.seasonal_events;
CREATE POLICY "anyone_can_view_seasonal_events" ON public.seasonal_events FOR SELECT TO authenticated USING (true);

-- Changelogs
CREATE TABLE IF NOT EXISTS public.changelogs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  version text NOT NULL,
  title text,
  body text,
  published_at timestamptz DEFAULT now()
);
ALTER TABLE public.changelogs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anyone_can_view_changelogs" ON public.changelogs;
CREATE POLICY "anyone_can_view_changelogs" ON public.changelogs FOR SELECT TO authenticated USING (true);

-- Moderation queue
CREATE TABLE IF NOT EXISTS public.moderation_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reported_by uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  content_type text,
  content_id uuid,
  reason text,
  status text DEFAULT 'pending',
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.moderation_queue ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "users_can_report" ON public.moderation_queue;
CREATE POLICY "users_can_report" ON public.moderation_queue FOR INSERT TO authenticated WITH CHECK (reported_by = auth.uid());

-- User saved spots
CREATE TABLE IF NOT EXISTS public.user_saved_spots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  spot_id uuid,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, spot_id)
);
ALTER TABLE public.user_saved_spots ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "users_manage_saved_spots" ON public.user_saved_spots;
CREATE POLICY "users_manage_saved_spots" ON public.user_saved_spots FOR ALL TO authenticated USING (user_id = auth.uid());

-- Spot comments
CREATE TABLE IF NOT EXISTS public.spot_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  spot_id uuid,
  content text NOT NULL,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.spot_comments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "users_manage_own_comments" ON public.spot_comments;
CREATE POLICY "users_manage_own_comments" ON public.spot_comments FOR ALL TO authenticated USING (user_id = auth.uid());
DROP POLICY IF EXISTS "anyone_can_view_comments" ON public.spot_comments;
CREATE POLICY "anyone_can_view_comments" ON public.spot_comments FOR SELECT TO authenticated USING (true);


