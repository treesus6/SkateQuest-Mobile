-- Make King of the Hill a real proof-based feature.
-- A user uploads an owned video, community judges review it, and only an
-- approved submission can create or replace the active spot claim.

ALTER TABLE public.spot_claims
  ADD COLUMN IF NOT EXISTS video_url text,
  ADD COLUMN IF NOT EXISTS trick_description text,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active';

UPDATE public.spot_claims
SET status = 'active'
WHERE status IS NULL;

CREATE TABLE IF NOT EXISTS public.spot_claim_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  spot_id uuid NOT NULL REFERENCES public.skate_spots(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  media_id uuid NOT NULL REFERENCES public.media(id) ON DELETE CASCADE,
  video_url text NOT NULL,
  trick_description text NOT NULL,
  status text NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING','APPROVED','REJECTED')),
  stomped_votes integer NOT NULL DEFAULT 0,
  bail_votes integer NOT NULL DEFAULT 0,
  submitted_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz,
  UNIQUE (user_id, spot_id)
);

CREATE TABLE IF NOT EXISTS public.spot_claim_submission_votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id uuid NOT NULL REFERENCES public.spot_claim_submissions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  vote text NOT NULL CHECK (vote IN ('stomped','bail')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (submission_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_spot_claim_submissions_pending
  ON public.spot_claim_submissions(status, submitted_at);
CREATE INDEX IF NOT EXISTS idx_spot_claim_submission_votes_user
  ON public.spot_claim_submission_votes(user_id, submission_id);

ALTER TABLE public.spot_claim_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.spot_claim_submission_votes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "spot_claim_submissions_read" ON public.spot_claim_submissions;
CREATE POLICY "spot_claim_submissions_read"
ON public.spot_claim_submissions FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "spot_claim_submission_votes_read_own" ON public.spot_claim_submission_votes;
CREATE POLICY "spot_claim_submission_votes_read_own"
ON public.spot_claim_submission_votes FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.submit_spot_claim_proof(
  p_spot_id uuid,
  p_media_id uuid,
  p_trick_description text
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
  v_submission_id uuid;
  v_existing_status text;
  v_description text := btrim(coalesce(p_trick_description, ''));
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'not authorized';
  END IF;
  IF v_description = '' THEN
    RAISE EXCEPTION 'add the trick you landed';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.skate_spots WHERE id = p_spot_id) THEN
    RAISE EXCEPTION 'spot not found';
  END IF;

  SELECT m.url, m.type
  INTO v_video_url, v_media_type
  FROM public.media m
  WHERE m.id = p_media_id
    AND m.user_id = v_user_id;

  IF NOT FOUND OR v_video_url IS NULL THEN
    RAISE EXCEPTION 'owned media proof not found';
  END IF;
  IF v_media_type IS DISTINCT FROM 'video' THEN
    RAISE EXCEPTION 'spot claim proof must be a video';
  END IF;

  SELECT id, status
  INTO v_submission_id, v_existing_status
  FROM public.spot_claim_submissions
  WHERE user_id = v_user_id AND spot_id = p_spot_id
  FOR UPDATE;

  IF FOUND THEN
    IF v_existing_status = 'PENDING' THEN
      RAISE EXCEPTION 'spot claim proof is already pending';
    END IF;

    DELETE FROM public.spot_claim_submission_votes
    WHERE submission_id = v_submission_id;

    UPDATE public.spot_claim_submissions
    SET media_id = p_media_id,
        video_url = v_video_url,
        trick_description = v_description,
        status = 'PENDING',
        stomped_votes = 0,
        bail_votes = 0,
        submitted_at = now(),
        reviewed_at = NULL
    WHERE id = v_submission_id;
  ELSE
    INSERT INTO public.spot_claim_submissions (
      spot_id, user_id, media_id, video_url, trick_description
    )
    VALUES (
      p_spot_id, v_user_id, p_media_id, v_video_url, v_description
    )
    RETURNING id INTO v_submission_id;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'submission_id', v_submission_id,
    'status', 'PENDING'
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.judge_spot_claim_submission(
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
  v_spot_id uuid;
  v_media_id uuid;
  v_video_url text;
  v_trick_description text;
  v_status text;
  v_stomped integer;
  v_bail integer;
  v_previous_holder uuid;
  v_previous_strength integer := 0;
  v_reward integer := 50;
  v_result_status text := 'PENDING';
  v_total_judge_votes integer := 0;
  v_bonus integer := 0;
BEGIN
  IF v_judge_id IS NULL THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  p_vote := lower(p_vote);
  IF p_vote NOT IN ('stomped','bail') THEN
    RAISE EXCEPTION 'invalid vote';
  END IF;

  SELECT user_id, spot_id, media_id, video_url, trick_description, status
  INTO v_submitter_id, v_spot_id, v_media_id, v_video_url, v_trick_description, v_status
  FROM public.spot_claim_submissions
  WHERE id = p_submission_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'submission not found';
  END IF;
  IF v_submitter_id = v_judge_id THEN
    RAISE EXCEPTION 'cannot judge own submission';
  END IF;
  IF v_status <> 'PENDING' THEN
    RAISE EXCEPTION 'submission is no longer pending';
  END IF;

  BEGIN
    INSERT INTO public.spot_claim_submission_votes (submission_id, user_id, vote)
    VALUES (p_submission_id, v_judge_id, p_vote);
  EXCEPTION WHEN unique_violation THEN
    RAISE EXCEPTION 'already voted';
  END;

  SELECT
    count(*) FILTER (WHERE vote = 'stomped')::integer,
    count(*) FILTER (WHERE vote = 'bail')::integer
  INTO v_stomped, v_bail
  FROM public.spot_claim_submission_votes
  WHERE submission_id = p_submission_id;

  UPDATE public.spot_claim_submissions
  SET stomped_votes = v_stomped,
      bail_votes = v_bail
  WHERE id = p_submission_id;

  PERFORM public.increment_user_xp(v_judge_id, 10);

  SELECT
    coalesce((SELECT count(*) FROM public.submission_votes WHERE user_id = v_judge_id), 0) +
    coalesce((SELECT count(*) FROM public.bounty_submission_votes WHERE user_id = v_judge_id), 0) +
    coalesce((SELECT count(*) FROM public.spot_claim_submission_votes WHERE user_id = v_judge_id), 0)
  INTO v_total_judge_votes;

  IF v_total_judge_votes > 0 AND v_total_judge_votes % 5 = 0 THEN
    v_bonus := 50;
    PERFORM public.increment_user_xp(v_judge_id, v_bonus);
  END IF;

  IF v_bail >= 3 THEN
    v_result_status := 'REJECTED';
    UPDATE public.spot_claim_submissions
    SET status = 'REJECTED', reviewed_at = now()
    WHERE id = p_submission_id;
  ELSIF v_stomped >= 10 THEN
    SELECT user_id, coalesce(claim_strength, 0)
    INTO v_previous_holder, v_previous_strength
    FROM public.spot_claims
    WHERE spot_id = v_spot_id
      AND status = 'active'
      AND (expires_at IS NULL OR expires_at > now())
    ORDER BY claimed_at DESC
    LIMIT 1
    FOR UPDATE;

    IF v_previous_holder IS NOT NULL AND v_previous_holder <> v_submitter_id THEN
      v_reward := 100;
    ELSE
      v_reward := 50;
    END IF;

    DELETE FROM public.spot_claims
    WHERE spot_id = v_spot_id;

    INSERT INTO public.spot_claims (
      spot_id,
      user_id,
      claimed_at,
      expires_at,
      claim_strength,
      updated_at,
      video_url,
      trick_description,
      status
    )
    VALUES (
      v_spot_id,
      v_submitter_id,
      now(),
      now() + interval '30 days',
      greatest(v_previous_strength + 1, 1),
      now(),
      v_video_url,
      v_trick_description,
      'active'
    );

    INSERT INTO public.spot_claim_history (
      spot_id,
      previous_holder_id,
      new_holder_id,
      action,
      challenge_xp_reward,
      created_at
    )
    VALUES (
      v_spot_id,
      v_previous_holder,
      v_submitter_id,
      CASE WHEN v_previous_holder IS NULL THEN 'claimed' ELSE 'challenged' END,
      v_reward,
      now()
    );

    UPDATE public.spot_claim_submissions
    SET status = 'APPROVED', reviewed_at = now()
    WHERE id = p_submission_id;

    UPDATE public.spot_claim_submissions
    SET status = 'REJECTED', reviewed_at = now()
    WHERE spot_id = v_spot_id
      AND id <> p_submission_id
      AND status = 'PENDING';

    PERFORM public.increment_user_xp(v_submitter_id, v_reward);

    INSERT INTO public.activity_feed (
      user_id, activity_type, title, description, xp_earned, media_id
    )
    VALUES (
      v_submitter_id,
      'spot_claimed',
      CASE WHEN v_previous_holder IS NULL THEN 'Claimed King of the Hill' ELSE 'Took over King of the Hill' END,
      v_trick_description,
      v_reward,
      v_media_id
    );

    v_result_status := 'APPROVED';
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'status', v_result_status,
    'judge_xp', 10,
    'bonus_xp', v_bonus,
    'stomped_votes', v_stomped,
    'bail_votes', v_bail,
    'claim_xp', CASE WHEN v_result_status = 'APPROVED' THEN v_reward ELSE 0 END
  );
END;
$$;

-- Disable the old proofless claim path. A spot claim must now come from a judged video.
REVOKE ALL ON FUNCTION public.claim_spot(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.claim_spot(uuid, uuid) FROM anon;
REVOKE ALL ON FUNCTION public.claim_spot(uuid, uuid) FROM authenticated;

REVOKE ALL ON FUNCTION public.submit_spot_claim_proof(uuid, uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.judge_spot_claim_submission(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_spot_claim_proof(uuid, uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.judge_spot_claim_submission(uuid, text) TO authenticated;
