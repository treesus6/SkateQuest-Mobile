-- Generic progress-increment function used by all mission triggers.
-- Finds the user's active missions matching a requirement_type, bumps progress,
-- and completes + awards XP when target is hit.
CREATE OR REPLACE FUNCTION public.increment_mission_progress(
  p_user_id uuid,
  p_requirement_type text,
  p_increment int DEFAULT 1
) RETURNS void AS $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT um.id, um.progress_current, um.progress_target, c.xp_reward
    FROM public.user_missions um
    JOIN public.challenges c ON c.id = um.challenge_id
    WHERE um.user_id = p_user_id
      AND um.status = 'active'
      AND c.requirement_type = p_requirement_type
      AND c.expires_at > now()
  LOOP
    IF r.progress_current + p_increment >= r.progress_target THEN
      UPDATE public.user_missions
        SET progress_current = r.progress_target,
            status = 'completed',
            completed_at = now()
        WHERE id = r.id;

      UPDATE public.profiles
        SET xp = COALESCE(xp, 0) + COALESCE(r.xp_reward, 0)
        WHERE id = p_user_id;
    ELSE
      UPDATE public.user_missions
        SET progress_current = r.progress_current + p_increment
        WHERE id = r.id;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 1. Trick landed -> 'land_trick'
-- Sourced from `activities` where activity_type = 'trick_landed'
CREATE OR REPLACE FUNCTION public.trg_mission_trick_landed() RETURNS trigger AS $$
BEGIN
  IF NEW.activity_type = 'trick_landed' AND NEW.user_id IS NOT NULL THEN
    PERFORM public.increment_mission_progress(NEW.user_id, 'land_trick', 1);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_activity_trick_landed ON public.activities;
CREATE TRIGGER on_activity_trick_landed
  AFTER INSERT ON public.activities
  FOR EACH ROW EXECUTE FUNCTION public.trg_mission_trick_landed();

-- 2. New park visited -> 'visit_new_park'
-- Only counts if this is the user's FIRST visit to that park_id.
CREATE OR REPLACE FUNCTION public.trg_mission_park_visit() RETURNS trigger AS $$
DECLARE
  v_prior_count int;
BEGIN
  SELECT count(*) INTO v_prior_count
  FROM public.park_visits
  WHERE user_id = NEW.user_id AND park_id = NEW.park_id AND id != NEW.id;

  IF v_prior_count = 0 THEN
    PERFORM public.increment_mission_progress(NEW.user_id, 'visit_new_park', 1);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_park_visit_new ON public.park_visits;
CREATE TRIGGER on_park_visit_new
  AFTER INSERT ON public.park_visits
  FOR EACH ROW EXECUTE FUNCTION public.trg_mission_park_visit();

-- 3. New spot added -> 'add_spot'
-- skate_spots.added_by -> users.id, which shares the same UUID space as profiles.id (both FK auth.users)
CREATE OR REPLACE FUNCTION public.trg_mission_spot_added() RETURNS trigger AS $$
BEGIN
  IF NEW.added_by IS NOT NULL THEN
    PERFORM public.increment_mission_progress(NEW.added_by, 'add_spot', 1);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_spot_added ON public.skate_spots;
CREATE TRIGGER on_spot_added
  AFTER INSERT ON public.skate_spots
  FOR EACH ROW EXECUTE FUNCTION public.trg_mission_spot_added();

-- 4. Clip/media upload -> 'upload_clip'
CREATE OR REPLACE FUNCTION public.trg_mission_media_upload() RETURNS trigger AS $$
BEGIN
  IF NEW.user_id IS NOT NULL THEN
    PERFORM public.increment_mission_progress(NEW.user_id, 'upload_clip', 1);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_media_uploaded ON public.media;
CREATE TRIGGER on_media_uploaded
  AFTER INSERT ON public.media
  FOR EACH ROW EXECUTE FUNCTION public.trg_mission_media_upload();

-- 5. Liking a clip -> 'like_clips' (credits the liker, not the clip owner)
CREATE OR REPLACE FUNCTION public.trg_mission_media_like() RETURNS trigger AS $$
BEGIN
  IF NEW.user_id IS NOT NULL THEN
    PERFORM public.increment_mission_progress(NEW.user_id, 'like_clips', 1);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_media_liked ON public.media_likes;
CREATE TRIGGER on_media_liked
  AFTER INSERT ON public.media_likes
  FOR EACH ROW EXECUTE FUNCTION public.trg_mission_media_like();

-- 6. Commenting -> 'comment_clips' (covers both video and spot comments via `comments`)
CREATE OR REPLACE FUNCTION public.trg_mission_comment() RETURNS trigger AS $$
BEGIN
  IF NEW.user_id IS NOT NULL THEN
    PERFORM public.increment_mission_progress(NEW.user_id, 'comment_clips', 1);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_comment_added ON public.comments;
CREATE TRIGGER on_comment_added
  AFTER INSERT ON public.comments
  FOR EACH ROW EXECUTE FUNCTION public.trg_mission_comment();

-- 7. Sending a callout -> 'send_callout' (credits the challenger)
CREATE OR REPLACE FUNCTION public.trg_mission_callout_sent() RETURNS trigger AS $$
BEGIN
  IF NEW.challenger_id IS NOT NULL THEN
    PERFORM public.increment_mission_progress(NEW.challenger_id, 'send_callout', 1);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_callout_sent ON public.callouts;
CREATE TRIGGER on_callout_sent
  AFTER INSERT ON public.callouts
  FOR EACH ROW EXECUTE FUNCTION public.trg_mission_callout_sent();

-- 8. Rating a spot/park -> 'rate_spot'
CREATE OR REPLACE FUNCTION public.trg_mission_park_rated() RETURNS trigger AS $$
BEGIN
  IF NEW.user_id IS NOT NULL THEN
    PERFORM public.increment_mission_progress(NEW.user_id, 'rate_spot', 1);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_park_rated ON public.park_ratings;
CREATE TRIGGER on_park_rated
  AFTER INSERT ON public.park_ratings
  FOR EACH ROW EXECUTE FUNCTION public.trg_mission_park_rated();

-- 9. Completing an existing challenge -> 'complete_challenge'
CREATE OR REPLACE FUNCTION public.trg_mission_challenge_completed() RETURNS trigger AS $$
BEGIN
  IF NEW.completed = true AND (OLD.completed IS DISTINCT FROM true) AND NEW.user_id IS NOT NULL THEN
    PERFORM public.increment_mission_progress(NEW.user_id, 'complete_challenge', 1);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_challenge_completed ON public.challenge_completions;
CREATE TRIGGER on_challenge_completed
  AFTER UPDATE ON public.challenge_completions
  FOR EACH ROW EXECUTE FUNCTION public.trg_mission_challenge_completed();

-- 10. Finding a hidden QR -> 'find_qr'
CREATE OR REPLACE FUNCTION public.trg_mission_qr_found() RETURNS trigger AS $$
BEGIN
  IF NEW.success = true AND NEW.user_id IS NOT NULL THEN
    PERFORM public.increment_mission_progress(NEW.user_id, 'find_qr', 1);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_qr_scanned ON public.qr_scans;
CREATE TRIGGER on_qr_scanned
  AFTER INSERT ON public.qr_scans
  FOR EACH ROW EXECUTE FUNCTION public.trg_mission_qr_found();

-- 11. Session duration -> 'session_duration'
-- Fires when a session's end time is set (UPDATE), checks minutes elapsed.
CREATE OR REPLACE FUNCTION public.trg_mission_session_duration() RETURNS trigger AS $$
DECLARE
  v_minutes int;
BEGIN
  IF NEW.session_end IS NOT NULL AND OLD.session_end IS NULL THEN
    v_minutes := EXTRACT(EPOCH FROM (NEW.session_end - NEW.session_start)) / 60;
    IF v_minutes > 0 THEN
      PERFORM public.increment_mission_progress(NEW.user_id, 'session_duration', v_minutes);
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_session_ended ON public.park_visits;
CREATE TRIGGER on_session_ended
  AFTER UPDATE ON public.park_visits
  FOR EACH ROW EXECUTE FUNCTION public.trg_mission_session_duration();


