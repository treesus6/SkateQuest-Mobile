
DROP FUNCTION IF EXISTS public.increment_xp(uuid, integer);
DROP FUNCTION IF EXISTS public.increment_user_xp(uuid, integer);
DROP FUNCTION IF EXISTS public.get_level_progress(uuid);
DROP FUNCTION IF EXISTS public.increment_trick_attempts(uuid, text);
DROP FUNCTION IF EXISTS public.create_or_get_direct_conversation(uuid);
DROP FUNCTION IF EXISTS public.mark_messages_read(uuid);
DROP FUNCTION IF EXISTS public.get_unread_message_count(uuid);
DROP FUNCTION IF EXISTS public.get_referral_stats(uuid);
DROP FUNCTION IF EXISTS public.get_mentorship_stats(uuid);
DROP FUNCTION IF EXISTS public.update_seasonal_progress(uuid, uuid, integer);
DROP FUNCTION IF EXISTS public.apply_referral_code(text, uuid);

CREATE FUNCTION public.increment_user_xp(p_user_id uuid, p_xp_amount integer)
RETURNS void AS $$
  UPDATE public.profiles SET xp = COALESCE(xp, 0) + p_xp_amount WHERE id = p_user_id;
$$ LANGUAGE sql SECURITY DEFINER;

CREATE FUNCTION public.increment_xp(p_user_id uuid, p_xp_amount integer)
RETURNS void AS $$
  SELECT public.increment_user_xp(p_user_id, p_xp_amount);
$$ LANGUAGE sql SECURITY DEFINER;

CREATE FUNCTION public.get_level_progress(p_user_id uuid)
RETURNS jsonb AS $$
DECLARE
  user_xp integer;
  current_level integer;
  xp_for_next integer;
  xp_for_current integer;
BEGIN
  SELECT COALESCE(xp, 0) INTO user_xp FROM public.profiles WHERE id = p_user_id;
  current_level := FLOOR(SQRT(user_xp::float / 100))::integer;
  xp_for_current := (current_level * current_level) * 100;
  xp_for_next := ((current_level + 1) * (current_level + 1)) * 100;
  RETURN jsonb_build_object(
    'level', current_level,
    'xp', user_xp,
    'xp_for_current_level', xp_for_current,
    'xp_for_next_level', xp_for_next,
    'progress', CASE WHEN xp_for_next > xp_for_current THEN (user_xp - xp_for_current)::float / (xp_for_next - xp_for_current) ELSE 1 END
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE FUNCTION public.increment_trick_attempts(p_user_id uuid, p_trick_name text)
RETURNS void AS $$
  INSERT INTO public.user_tricks (user_id, trick_name, attempts, status)
  VALUES (p_user_id, p_trick_name, 1, 'trying')
  ON CONFLICT DO NOTHING;
  UPDATE public.user_tricks
  SET attempts = attempts + 1, updated_at = now()
  WHERE user_id = p_user_id AND trick_name = p_trick_name;
$$ LANGUAGE sql SECURITY DEFINER;

CREATE FUNCTION public.create_or_get_direct_conversation(p_other_user_id uuid)
RETURNS uuid AS $$
  SELECT NULL::uuid;
$$ LANGUAGE sql SECURITY DEFINER;

CREATE FUNCTION public.mark_messages_read(p_conversation_id uuid)
RETURNS void AS $$
  UPDATE public.messages SET read_at = now() WHERE conversation_id = p_conversation_id AND read_at IS NULL;
$$ LANGUAGE sql SECURITY DEFINER;

CREATE FUNCTION public.get_unread_message_count(p_user_id uuid)
RETURNS integer AS $$
  SELECT 0;
$$ LANGUAGE sql SECURITY DEFINER;

CREATE FUNCTION public.get_referral_stats(p_user_id uuid)
RETURNS jsonb AS $$
DECLARE
  total_referrals integer;
  claimed_referrals integer;
BEGIN
  SELECT COUNT(*), COUNT(*) FILTER (WHERE claimed = true)
  INTO total_referrals, claimed_referrals
  FROM public.referrals WHERE referrer_id = p_user_id;
  RETURN jsonb_build_object('total', total_referrals, 'claimed', claimed_referrals);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE FUNCTION public.get_mentorship_stats(p_user_id uuid)
RETURNS jsonb AS $$
DECLARE
  mentees integer;
  mentors integer;
BEGIN
  SELECT COUNT(*) INTO mentees FROM public.mentor_relationships WHERE mentor_id = p_user_id AND status = 'active';
  SELECT COUNT(*) INTO mentors FROM public.mentor_relationships WHERE mentee_id = p_user_id AND status = 'active';
  RETURN jsonb_build_object('mentees', mentees, 'mentors', mentors);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE FUNCTION public.update_seasonal_progress(p_user_id uuid, p_event_id uuid, p_points integer)
RETURNS void AS $$
  INSERT INTO public.user_achievements (user_id, achievement_id, unlocked_at)
  SELECT p_user_id, id, now() FROM public.achievements WHERE name = 'seasonal_progress' LIMIT 1
  ON CONFLICT DO NOTHING;
$$ LANGUAGE sql SECURITY DEFINER;

CREATE FUNCTION public.apply_referral_code(p_code text, p_user_id uuid)
RETURNS jsonb AS $$
DECLARE
  v_referral public.referrals%ROWTYPE;
BEGIN
  SELECT * INTO v_referral FROM public.referrals WHERE code = p_code AND claimed = false;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid or already claimed code');
  END IF;
  UPDATE public.referrals SET claimed = true, referred_id = p_user_id WHERE id = v_referral.id;
  PERFORM public.increment_user_xp(v_referral.referrer_id, 500);
  PERFORM public.increment_user_xp(p_user_id, 250);
  RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


