
-- Add proof fields to quest completions
ALTER TABLE public.daily_quest_completions 
  ADD COLUMN IF NOT EXISTS proof_type text CHECK (proof_type IN ('photo', 'video', 'location')),
  ADD COLUMN IF NOT EXISTS proof_url text,
  ADD COLUMN IF NOT EXISTS proof_note text,
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  ADD COLUMN IF NOT EXISTS reviewed_at timestamptz;

-- Standalone proof submissions table
CREATE TABLE IF NOT EXISTS public.quest_proof_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  quest_id uuid REFERENCES public.daily_quests(id) ON DELETE CASCADE,
  proof_type text NOT NULL CHECK (proof_type IN ('photo', 'video', 'location')),
  proof_url text,
  proof_note text,
  latitude double precision,
  longitude double precision,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  xp_awarded boolean DEFAULT false,
  submitted_at timestamptz DEFAULT now(),
  reviewed_at timestamptz,
  UNIQUE(user_id, quest_id)
);
ALTER TABLE public.quest_proof_submissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_manage_own_proofs" ON public.quest_proof_submissions 
  FOR ALL TO authenticated USING (user_id = auth.uid());
CREATE POLICY "anyone_can_view_proofs" ON public.quest_proof_submissions 
  FOR SELECT TO authenticated USING (true);

-- Auto-approve function (for now approves all valid submissions)
CREATE OR REPLACE FUNCTION public.submit_quest_proof(
  p_user_id uuid,
  p_quest_id uuid,
  p_proof_type text,
  p_proof_url text DEFAULT null,
  p_proof_note text DEFAULT null,
  p_latitude double precision DEFAULT null,
  p_longitude double precision DEFAULT null
)
RETURNS jsonb AS $$
DECLARE
  v_quest public.daily_quests%ROWTYPE;
  v_existing public.quest_proof_submissions%ROWTYPE;
BEGIN
  -- Get quest
  SELECT * INTO v_quest FROM public.daily_quests WHERE id = p_quest_id AND active = true;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Quest not found or inactive');
  END IF;

  -- Check already submitted
  SELECT * INTO v_existing FROM public.quest_proof_submissions 
  WHERE user_id = p_user_id AND quest_id = p_quest_id;
  IF FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Already submitted proof for this quest');
  END IF;

  -- Insert proof
  INSERT INTO public.quest_proof_submissions 
    (user_id, quest_id, proof_type, proof_url, proof_note, latitude, longitude, status, xp_awarded)
  VALUES 
    (p_user_id, p_quest_id, p_proof_type, p_proof_url, p_proof_note, p_latitude, p_longitude, 'approved', true);

  -- Award XP
  UPDATE public.profiles SET xp = COALESCE(xp, 0) + v_quest.xp_reward WHERE id = p_user_id;

  -- Mark quest complete
  INSERT INTO public.daily_quest_completions (user_id, quest_id, date, proof_type, proof_url, status)
  VALUES (p_user_id, p_quest_id, CURRENT_DATE, p_proof_type, p_proof_url, 'approved')
  ON CONFLICT (user_id, quest_id, date) DO UPDATE SET status = 'approved';

  RETURN jsonb_build_object('success', true, 'xp_awarded', v_quest.xp_reward);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


