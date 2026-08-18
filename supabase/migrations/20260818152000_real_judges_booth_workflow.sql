-- Real Judge's Booth backend.
-- Proof submissions remain pending until community judges approve or reject them.
-- No client may award itself challenge/bounty XP directly.

CREATE TABLE IF NOT EXISTS public.challenge_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id uuid NOT NULL REFERENCES public.challenges(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  media_id uuid NOT NULL REFERENCES public.media(id) ON DELETE CASCADE,
  video_url text NOT NULL,
  status text NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING','APPROVED','REJECTED')),
  stomped_votes integer NOT NULL DEFAULT 0,
  bail_votes integer NOT NULL DEFAULT 0,
  submitted_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz,
  UNIQUE (user_id, challenge_id)
);

CREATE TABLE IF NOT EXISTS public.submission_votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id uuid NOT NULL REFERENCES public.challenge_submissions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  vote text NOT NULL CHECK (vote IN ('stomped','bail')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (submission_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.bounty_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bounty_id uuid NOT NULL REFERENCES public.bounties(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  media_id uuid NOT NULL REFERENCES public.media(id) ON DELETE CASCADE,
  video_url text NOT NULL,
  trick_name text NOT NULL,
  status text NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING','APPROVED','REJECTED')),
  stomped_votes integer NOT NULL DEFAULT 0,
  bail_votes integer NOT NULL DEFAULT 0,
  submitted_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz,
  UNIQUE (user_id, bounty_id)
);

CREATE TABLE IF NOT EXISTS public.bounty_submission_votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id uuid NOT NULL REFERENCES public.bounty_submissions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  vote text NOT NULL CHECK (vote IN ('stomped','bail')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (submission_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_challenge_submissions_pending
  ON public.challenge_submissions(status, submitted_at);
CREATE INDEX IF NOT EXISTS idx_bounty_submissions_pending
  ON public.bounty_submissions(status, submitted_at);
CREATE INDEX IF NOT EXISTS idx_submission_votes_user
  ON public.submission_votes(user_id, submission_id);
CREATE INDEX IF NOT EXISTS idx_bounty_submission_votes_user
  ON public.bounty_submission_votes(user_id, submission_id);

ALTER TABLE public.challenge_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.submission_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bounty_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bounty_submission_votes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "challenge_submissions_read" ON public.challenge_submissions;
CREATE POLICY "challenge_submissions_read"
ON public.challenge_submissions FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "submission_votes_read_own" ON public.submission_votes;
CREATE POLICY "submission_votes_read_own"
ON public.submission_votes FOR SELECT TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS "bounty_submissions_read" ON public.bounty_submissions;
CREATE POLICY "bounty_submissions_read"
ON public.bounty_submissions FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "bounty_submission_votes_read_own" ON public.bounty_submission_votes;
CREATE POLICY "bounty_submission_votes_read_own"
ON public.bounty_submission_votes FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.submit_challenge_proof(
  p_challenge_id uuid,
  p_media_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_video_url text;
  v_media_type text;
  v_status text;
  v_active boolean;
  v_expires_at timestamptz;
  v_submission_id uuid;
  v_existing_status text;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  SELECT m.url, m.type
  INTO v_video_url, v_media_type
  FROM public.media m
  WHERE m.id = p_media_id AND m.user_id = v_user_id;

  IF NOT FOUND OR v_video_url IS NULL THEN
    RAISE EXCEPTION 'owned media proof not found';
  END IF;
  IF v_media_type IS DISTINCT FROM 'video' THEN
    RAISE EXCEPTION 'challenge proof must be a video';
  END IF;

  SELECT c.status, c.active, c.expires_at
  INTO v_status, v_active, v_expires_at
  FROM public.challenges c
  WHERE c.id = p_challenge_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'challenge not found';
  END IF;
  IF v_status IS DISTINCT FROM 'pending' OR v_active IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'challenge is not active';
  END IF;
  IF v_expires_at IS NOT NULL AND v_expires_at <= now() THEN
    RAISE EXCEPTION 'challenge has expired';
  END IF;

  SELECT id, status
  INTO v_submission_id, v_existing_status
  FROM public.challenge_submissions
  WHERE user_id = v_user_id AND challenge_id = p_challenge_id
  FOR UPDATE;

  IF FOUND THEN
    IF v_existing_status = 'PENDING' THEN
      RAISE EXCEPTION 'challenge proof is already pending';
    END IF;
    IF v_existing_status = 'APPROVED' THEN
      RAISE EXCEPTION 'challenge proof is already approved';
    END IF;

    DELETE FROM public.submission_votes WHERE submission_id = v_submission_id;
    UPDATE public.challenge_submissions
    SET media_id = p_media_id,
        video_url = v_video_url,
        status = 'PENDING',
        stomped_votes = 0,
        bail_votes = 0,
        submitted_at = now(),
        reviewed_at = NULL
    WHERE id = v_submission_id;
  ELSE
    INSERT INTO public.challenge_submissions (challenge_id, user_id, media_id, video_url)
    VALUES (p_challenge_id, v_user_id, p_media_id, v_video_url)
    RETURNING id INTO v_submission_id;
  END IF;

  RETURN jsonb_build_object('success', true, 'submission_id', v_submission_id, 'status', 'PENDING');
END;
$$;

CREATE OR REPLACE FUNCTION public.submit_bounty_claim(
  p_bounty_id uuid,
  p_media_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_video_url text;
  v_media_type text;
  v_bounty_status text;
  v_expires_at timestamptz;
  v_created_by uuid;
  v_trick_name text;
  v_submission_id uuid;
  v_existing_status text;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  SELECT m.url, m.type
  INTO v_video_url, v_media_type
  FROM public.media m
  WHERE m.id = p_media_id AND m.user_id = v_user_id;

  IF NOT FOUND OR v_video_url IS NULL THEN
    RAISE EXCEPTION 'owned media proof not found';
  END IF;
  IF v_media_type IS DISTINCT FROM 'video' THEN
    RAISE EXCEPTION 'bounty proof must be a video';
  END IF;

  SELECT b.status, b.expires_at, b.created_by, b.trick_name
  INTO v_bounty_status, v_expires_at, v_created_by, v_trick_name
  FROM public.bounties b
  WHERE b.id = p_bounty_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'bounty not found';
  END IF;
  IF v_bounty_status IS DISTINCT FROM 'open' THEN
    RAISE EXCEPTION 'bounty is no longer open';
  END IF;
  IF v_expires_at IS NOT NULL AND v_expires_at <= now() THEN
    UPDATE public.bounties SET status = 'expired' WHERE id = p_bounty_id AND status = 'open';
    RAISE EXCEPTION 'bounty has expired';
  END IF;
  IF v_created_by = v_user_id THEN
    RAISE EXCEPTION 'you cannot claim your own bounty';
  END IF;

  SELECT id, status
  INTO v_submission_id, v_existing_status
  FROM public.bounty_submissions
  WHERE user_id = v_user_id AND bounty_id = p_bounty_id
  FOR UPDATE;

  IF FOUND THEN
    IF v_existing_status = 'PENDING' THEN
      RAISE EXCEPTION 'bounty proof is already pending';
    END IF;
    IF v_existing_status = 'APPROVED' THEN
      RAISE EXCEPTION 'bounty proof is already approved';
    END IF;

    DELETE FROM public.bounty_submission_votes WHERE submission_id = v_submission_id;
    UPDATE public.bounty_submissions
    SET media_id = p_media_id,
        video_url = v_video_url,
        trick_name = v_trick_name,
        status = 'PENDING',
        stomped_votes = 0,
        bail_votes = 0,
        submitted_at = now(),
        reviewed_at = NULL
    WHERE id = v_submission_id;
  ELSE
    INSERT INTO public.bounty_submissions (bounty_id, user_id, media_id, video_url, trick_name)
    VALUES (p_bounty_id, v_user_id, p_media_id, v_video_url, v_trick_name)
    RETURNING id INTO v_submission_id;
  END IF;

  RETURN jsonb_build_object('success', true, 'submission_id', v_submission_id, 'status', 'PENDING');
END;
$$;

CREATE OR REPLACE FUNCTION public.judge_challenge_submission(
  p_submission_id uuid,
  p_vote text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_judge_id uuid := auth.uid();
  v_submitter_id uuid;
  v_challenge_id uuid;
  v_status text;
  v_stomped integer;
  v_bail integer;
  v_reward integer := 0;
  v_result_status text := 'PENDING';
  v_total_judge_votes integer := 0;
  v_bonus integer := 0;
BEGIN
  IF v_judge_id IS NULL THEN RAISE EXCEPTION 'not authorized'; END IF;
  p_vote := lower(p_vote);
  IF p_vote NOT IN ('stomped','bail') THEN RAISE EXCEPTION 'invalid vote'; END IF;

  SELECT user_id, challenge_id, status
  INTO v_submitter_id, v_challenge_id, v_status
  FROM public.challenge_submissions
  WHERE id = p_submission_id
  FOR UPDATE;

  IF NOT FOUND THEN RAISE EXCEPTION 'submission not found'; END IF;
  IF v_submitter_id = v_judge_id THEN RAISE EXCEPTION 'cannot judge own submission'; END IF;
  IF v_status <> 'PENDING' THEN RAISE EXCEPTION 'submission is no longer pending'; END IF;

  BEGIN
    INSERT INTO public.submission_votes (submission_id, user_id, vote)
    VALUES (p_submission_id, v_judge_id, p_vote);
  EXCEPTION WHEN unique_violation THEN
    RAISE EXCEPTION 'already voted';
  END;

  SELECT
    count(*) FILTER (WHERE vote = 'stomped')::integer,
    count(*) FILTER (WHERE vote = 'bail')::integer
  INTO v_stomped, v_bail
  FROM public.submission_votes
  WHERE submission_id = p_submission_id;

  UPDATE public.challenge_submissions
  SET stomped_votes = v_stomped, bail_votes = v_bail
  WHERE id = p_submission_id;

  PERFORM public.increment_user_xp(v_judge_id, 10);
  SELECT
    (SELECT count(*) FROM public.submission_votes WHERE user_id = v_judge_id) +
    (SELECT count(*) FROM public.bounty_submission_votes WHERE user_id = v_judge_id)
  INTO v_total_judge_votes;

  IF v_total_judge_votes > 0 AND v_total_judge_votes % 5 = 0 THEN
    v_bonus := 50;
    PERFORM public.increment_user_xp(v_judge_id, v_bonus);
  END IF;

  IF v_bail >= 3 THEN
    v_result_status := 'REJECTED';
    UPDATE public.challenge_submissions
    SET status = 'REJECTED', reviewed_at = now()
    WHERE id = p_submission_id;
  ELSIF v_stomped >= 10 THEN
    UPDATE public.challenges
    SET status = 'completed', completed_by = v_submitter_id, completed_at = now()
    WHERE id = v_challenge_id AND status = 'pending'
    RETURNING coalesce(xp_reward, 0) INTO v_reward;

    IF FOUND THEN
      v_result_status := 'APPROVED';
      UPDATE public.challenge_submissions
      SET status = 'APPROVED', reviewed_at = now()
      WHERE id = p_submission_id;
      PERFORM public.increment_user_xp(v_submitter_id, v_reward);
      INSERT INTO public.activity_feed (user_id, activity_type, title, description, xp_earned, media_id)
      SELECT v_submitter_id, 'challenge_completed', 'Challenge approved', c.description, v_reward, s.media_id
      FROM public.challenge_submissions s
      JOIN public.challenges c ON c.id = s.challenge_id
      WHERE s.id = p_submission_id;
    ELSE
      v_result_status := 'REJECTED';
      UPDATE public.challenge_submissions
      SET status = 'REJECTED', reviewed_at = now()
      WHERE id = p_submission_id;
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'status', v_result_status,
    'judge_xp', 10,
    'bonus_xp', v_bonus,
    'stomped_votes', v_stomped,
    'bail_votes', v_bail
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.judge_bounty_submission(
  p_submission_id uuid,
  p_vote text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_judge_id uuid := auth.uid();
  v_submitter_id uuid;
  v_bounty_id uuid;
  v_media_id uuid;
  v_video_url text;
  v_status text;
  v_stomped integer;
  v_bail integer;
  v_reward integer := 0;
  v_trick_name text;
  v_result_status text := 'PENDING';
  v_total_judge_votes integer := 0;
  v_bonus integer := 0;
BEGIN
  IF v_judge_id IS NULL THEN RAISE EXCEPTION 'not authorized'; END IF;
  p_vote := lower(p_vote);
  IF p_vote NOT IN ('stomped','bail') THEN RAISE EXCEPTION 'invalid vote'; END IF;

  SELECT user_id, bounty_id, media_id, video_url, status, trick_name
  INTO v_submitter_id, v_bounty_id, v_media_id, v_video_url, v_status, v_trick_name
  FROM public.bounty_submissions
  WHERE id = p_submission_id
  FOR UPDATE;

  IF NOT FOUND THEN RAISE EXCEPTION 'submission not found'; END IF;
  IF v_submitter_id = v_judge_id THEN RAISE EXCEPTION 'cannot judge own submission'; END IF;
  IF v_status <> 'PENDING' THEN RAISE EXCEPTION 'submission is no longer pending'; END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.bounties
    WHERE id = v_bounty_id AND status = 'open' AND (expires_at IS NULL OR expires_at > now())
  ) THEN
    UPDATE public.bounty_submissions SET status = 'REJECTED', reviewed_at = now() WHERE id = p_submission_id;
    RAISE EXCEPTION 'bounty is no longer open';
  END IF;

  BEGIN
    INSERT INTO public.bounty_submission_votes (submission_id, user_id, vote)
    VALUES (p_submission_id, v_judge_id, p_vote);
  EXCEPTION WHEN unique_violation THEN
    RAISE EXCEPTION 'already voted';
  END;

  SELECT
    count(*) FILTER (WHERE vote = 'stomped')::integer,
    count(*) FILTER (WHERE vote = 'bail')::integer
  INTO v_stomped, v_bail
  FROM public.bounty_submission_votes
  WHERE submission_id = p_submission_id;

  UPDATE public.bounty_submissions
  SET stomped_votes = v_stomped, bail_votes = v_bail
  WHERE id = p_submission_id;

  PERFORM public.increment_user_xp(v_judge_id, 10);
  SELECT
    (SELECT count(*) FROM public.submission_votes WHERE user_id = v_judge_id) +
    (SELECT count(*) FROM public.bounty_submission_votes WHERE user_id = v_judge_id)
  INTO v_total_judge_votes;

  IF v_total_judge_votes > 0 AND v_total_judge_votes % 5 = 0 THEN
    v_bonus := 50;
    PERFORM public.increment_user_xp(v_judge_id, v_bonus);
  END IF;

  IF v_bail >= 3 THEN
    v_result_status := 'REJECTED';
    UPDATE public.bounty_submissions SET status = 'REJECTED', reviewed_at = now() WHERE id = p_submission_id;
  ELSIF v_stomped >= 10 THEN
    UPDATE public.bounties
    SET claimed_by = v_submitter_id,
        claim_video_url = v_video_url,
        status = 'claimed'
    WHERE id = v_bounty_id
      AND status = 'open'
      AND (expires_at IS NULL OR expires_at > now())
    RETURNING coalesce(xp_reward, 0) INTO v_reward;

    IF FOUND THEN
      v_result_status := 'APPROVED';
      UPDATE public.bounty_submissions SET status = 'APPROVED', reviewed_at = now() WHERE id = p_submission_id;
      UPDATE public.bounty_submissions
      SET status = 'REJECTED', reviewed_at = now()
      WHERE bounty_id = v_bounty_id AND id <> p_submission_id AND status = 'PENDING';
      PERFORM public.increment_user_xp(v_submitter_id, v_reward);
      INSERT INTO public.activity_feed (user_id, activity_type, title, description, xp_earned, media_id)
      VALUES (v_submitter_id, 'bounty_claimed', 'Bounty approved: ' || coalesce(v_trick_name, 'skate challenge'), 'Community judges approved the video proof.', v_reward, v_media_id);
    ELSE
      v_result_status := 'REJECTED';
      UPDATE public.bounty_submissions SET status = 'REJECTED', reviewed_at = now() WHERE id = p_submission_id;
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'status', v_result_status,
    'judge_xp', 10,
    'bonus_xp', v_bonus,
    'stomped_votes', v_stomped,
    'bail_votes', v_bail
  );
END;
$$;

-- The old direct-claim RPC bypassed community proof review. Keep it inaccessible.
REVOKE ALL ON FUNCTION public.claim_bounty(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.claim_bounty(uuid, uuid) FROM anon;
REVOKE ALL ON FUNCTION public.claim_bounty(uuid, uuid) FROM authenticated;

REVOKE ALL ON FUNCTION public.submit_challenge_proof(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.submit_bounty_claim(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.judge_challenge_submission(uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.judge_bounty_submission(uuid, text) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.submit_challenge_proof(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.submit_bounty_claim(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.judge_challenge_submission(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.judge_bounty_submission(uuid, text) TO authenticated;
