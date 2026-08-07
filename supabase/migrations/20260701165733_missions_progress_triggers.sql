-- Core function: bumps progress on all of a user's active missions matching a requirement_type.
-- Marks complete + awards XP when target is hit. Recurses once into 'complete_challenge'
-- meta-missions so weekly "complete N challenges" tracks other mission completions.
CREATE OR REPLACE FUNCTION public.bump_mission_progress(
  p_user_id uuid,
  p_requirement_type text,
  p_increment int
) RETURNS void AS $$
DECLARE
  v_mission record;
  v_xp_reward int;
BEGIN
  FOR v_mission IN
    SELECT um.id, um.progress_current, um.progress_target, um.challenge_id
    FROM public.user_missions um
    JOIN public.challenges c ON c.id = um.challenge_id
    WHERE um.user_id = p_user_id
      AND um.status = 'active'
      AND c.requirement_type = p_requirement_type
  LOOP
    UPDATE public.user_missions
    SET progress_current = LEAST(v_mission.progress_current + p_increment, v_mission.progress_target)
    WHERE id = v_mission.id;

    IF v_mission.progress_current + p_increment >= v_mission.progress_target THEN
      UPDATE public.user_missions
      SET status = 'completed', completed_at = now()
      WHERE id = v_mission.id AND status = 'active';

      SELECT xp_reward INTO v_xp_reward FROM public.challenges WHERE id = v_mission.challenge_id;

      UPDATE public.profiles
      SET xp = COALESCE(xp, 0) + COALESCE(v_xp_reward, 0)
      WHERE id = p_user_id;

      IF p_requirement_type <> 'complete_challenge' THEN
        PERFORM public.bump_mission_progress(p_user_id, 'complete_challenge', 1);
      END IF;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- land_trick: fires on AI Trick Analyzer output
CREATE OR REPLACE FUNCTION public.trg_trick_analyses_mission() RETURNS trigger AS $$
BEGIN
  PERFORM public.bump_mission_progress(NEW.user_id, 'land_trick', 1);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trick_analyses_mission_trigger ON public.trick_analyses;
CREATE TRIGGER trick_analyses_mission_trigger
  AFTER INSERT ON public.trick_analyses
  FOR EACH ROW EXECUTE FUNCTION public.trg_trick_analyses_mission();

-- visit_new_park: only counts if this is the user's first visit to that park
CREATE OR REPLACE FUNCTION public.trg_park_visits_mission() RETURNS trigger AS $$
DECLARE
  v_prior_count int;
BEGIN
  SELECT count(*) INTO v_prior_count
  FROM public.park_visits
  WHERE user_id = NEW.user_id AND park_id = NEW.park_id AND id <> NEW.id;

  IF v_prior_count = 0 THEN
    PERFORM public.bump_mission_progress(NEW.user_id, 'visit_new_park', 1);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS park_visits_mission_trigger ON public.park_visits;
CREATE TRIGGER park_visits_mission_trigger
  AFTER INSERT ON public.park_visits
  FOR EACH ROW EXECUTE FUNCTION public.trg_park_visits_mission();

-- session_duration: fires when a session closes out with session_end set (cumulative minutes/day)
CREATE OR REPLACE FUNCTION public.trg_park_visits_duration_mission() RETURNS trigger AS $$
DECLARE
  v_minutes int;
BEGIN
  IF NEW.session_end IS NOT NULL AND OLD.session_end IS NULL THEN
    v_minutes := GREATEST(0, EXTRACT(EPOCH FROM (NEW.session_end - NEW.session_start)) / 60)::int;
    IF v_minutes > 0 THEN
      PERFORM public.bump_mission_progress(NEW.user_id, 'session_duration', v_minutes);
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS park_visits_duration_mission_trigger ON public.park_visits;
CREATE TRIGGER park_visits_duration_mission_trigger
  AFTER UPDATE ON public.park_visits
  FOR EACH ROW EXECUTE FUNCTION public.trg_park_visits_duration_mission();

-- upload_clip
CREATE OR REPLACE FUNCTION public.trg_videos_mission() RETURNS trigger AS $$
BEGIN
  PERFORM public.bump_mission_progress(NEW.user_id, 'upload_clip', 1);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS videos_mission_trigger ON public.videos;
CREATE TRIGGER videos_mission_trigger
  AFTER INSERT ON public.videos
  FOR EACH ROW EXECUTE FUNCTION public.trg_videos_mission();

-- like_clips
CREATE OR REPLACE FUNCTION public.trg_skatetv_likes_mission() RETURNS trigger AS $$
BEGIN
  PERFORM public.bump_mission_progress(NEW.user_id, 'like_clips', 1);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS skatetv_likes_mission_trigger ON public.skatetv_likes;
CREATE TRIGGER skatetv_likes_mission_trigger
  AFTER INSERT ON public.skatetv_likes
  FOR EACH ROW EXECUTE FUNCTION public.trg_skatetv_likes_mission();

-- comment_clips
CREATE OR REPLACE FUNCTION public.trg_comments_mission() RETURNS trigger AS $$
BEGIN
  PERFORM public.bump_mission_progress(NEW.user_id, 'comment_clips', 1);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS comments_mission_trigger ON public.comments;
CREATE TRIGGER comments_mission_trigger
  AFTER INSERT ON public.comments
  FOR EACH ROW EXECUTE FUNCTION public.trg_comments_mission();

-- send_callout
CREATE OR REPLACE FUNCTION public.trg_callouts_mission() RETURNS trigger AS $$
BEGIN
  PERFORM public.bump_mission_progress(NEW.challenger_id, 'send_callout', 1);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS callouts_mission_trigger ON public.callouts;
CREATE TRIGGER callouts_mission_trigger
  AFTER INSERT ON public.callouts
  FOR EACH ROW EXECUTE FUNCTION public.trg_callouts_mission();

-- rate_spot
CREATE OR REPLACE FUNCTION public.trg_park_ratings_mission() RETURNS trigger AS $$
BEGIN
  PERFORM public.bump_mission_progress(NEW.user_id, 'rate_spot', 1);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS park_ratings_mission_trigger ON public.park_ratings;
CREATE TRIGGER park_ratings_mission_trigger
  AFTER INSERT ON public.park_ratings
  FOR EACH ROW EXECUTE FUNCTION public.trg_park_ratings_mission();

-- add_spot (skate_spots.added_by is a public.users id, which shares the same UUID space
-- as public.profiles.id since both FK to auth.users.id — safe to bump directly)
CREATE OR REPLACE FUNCTION public.trg_skate_spots_mission() RETURNS trigger AS $$
BEGIN
  IF NEW.added_by IS NOT NULL THEN
    PERFORM public.bump_mission_progress(NEW.added_by, 'add_spot', 1);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS skate_spots_mission_trigger ON public.skate_spots;
CREATE TRIGGER skate_spots_mission_trigger
  AFTER INSERT ON public.skate_spots
  FOR EACH ROW EXECUTE FUNCTION public.trg_skate_spots_mission();

-- find_qr (secret missions)
CREATE OR REPLACE FUNCTION public.trg_qr_scans_mission() RETURNS trigger AS $$
BEGIN
  IF NEW.success = true AND NEW.user_id IS NOT NULL THEN
    PERFORM public.bump_mission_progress(NEW.user_id, 'find_qr', 1);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS qr_scans_mission_trigger ON public.qr_scans;
CREATE TRIGGER qr_scans_mission_trigger
  AFTER INSERT ON public.qr_scans
  FOR EACH ROW EXECUTE FUNCTION public.trg_qr_scans_mission();

-- complete_challenge: covers manual challenge_completions rows (non-auto-generated challenges)
CREATE OR REPLACE FUNCTION public.trg_challenge_completions_mission() RETURNS trigger AS $$
BEGIN
  IF NEW.completed = true AND (TG_OP = 'INSERT' OR OLD.completed IS DISTINCT FROM NEW.completed) THEN
    PERFORM public.bump_mission_progress(NEW.user_id, 'complete_challenge', 1);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS challenge_completions_mission_trigger ON public.challenge_completions;
CREATE TRIGGER challenge_completions_mission_trigger
  AFTER INSERT OR UPDATE OF completed ON public.challenge_completions
  FOR EACH ROW EXECUTE FUNCTION public.trg_challenge_completions_mission();


