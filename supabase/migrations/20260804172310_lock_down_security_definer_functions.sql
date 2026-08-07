-- =========================================================================
-- PART 1: Lock down functions confirmed UNUSED by the client (grep found
-- zero call sites), or trigger-only functions that don't need direct
-- EXECUTE grants at all (triggers fire under the function owner regardless).
-- These revokes cannot break the app because nothing calls them directly.
-- =========================================================================
REVOKE EXECUTE ON FUNCTION public.award_pioneer_badge() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.award_time_badges() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.award_xp(uuid, integer) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.increment_user_xp(uuid, integer) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.increment_crew_xp(uuid, integer) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.bump_mission_progress(uuid, text, integer) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.increment_mission_progress(uuid, text, integer) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.submit_quest_proof(uuid, uuid, text, text, text, double precision, double precision) FROM anon, authenticated;

-- =========================================================================
-- PART 2: Close the critical hole — increment_xp(4-arg) is currently
-- callable by ANON (unauthenticated). Revoke anon entirely, and add an
-- ownership check so even a signed-in user can only credit their own XP.
-- Every real client call site (CheckInScreen, DailyQuestsScreen,
-- profilesService, charity-qr.js) passes the caller's own user id.
-- =========================================================================
REVOKE EXECUTE ON FUNCTION public.increment_xp(uuid, integer, uuid, text) FROM anon;

CREATE OR REPLACE FUNCTION public.increment_xp(p_user_id uuid, p_xp_amount integer, p_park_id uuid DEFAULT NULL::uuid, p_source text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  IF auth.uid() IS DISTINCT FROM p_user_id THEN
    RAISE EXCEPTION 'Cannot award XP to another user';
  END IF;
  PERFORM public.increment_user_xp(p_user_id, p_xp_amount);
  IF p_park_id IS NOT NULL THEN
    INSERT INTO public.park_xp_log (user_id, park_id, xp_amount, source)
    VALUES (p_user_id, p_park_id, p_xp_amount, p_source);
  END IF;
END;
$function$;

CREATE OR REPLACE FUNCTION public.increment_xp(p_user_id uuid, p_xp_amount integer)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  IF auth.uid() IS DISTINCT FROM p_user_id THEN
    RAISE EXCEPTION 'Cannot award XP to another user';
  END IF;
  PERFORM public.increment_user_xp(p_user_id, p_xp_amount);
END;
$function$;

-- =========================================================================
-- PART 3: apply_referral_code — called right after signup with the new
-- user's own id (applyReferralCodeOnSignup in referralService.ts). Add the
-- same ownership guard; this does NOT touch the referrer XP grant inside
-- (that stays a trusted internal call to increment_user_xp).
-- =========================================================================
CREATE OR REPLACE FUNCTION public.apply_referral_code(p_code text, p_user_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_referral public.referrals%ROWTYPE;
BEGIN
  IF auth.uid() IS DISTINCT FROM p_user_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authorized');
  END IF;

  SELECT * INTO v_referral FROM public.referrals WHERE code = p_code AND claimed = false;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid or already claimed code');
  END IF;
  UPDATE public.referrals SET claimed = true, referred_id = p_user_id WHERE id = v_referral.id;
  PERFORM public.increment_user_xp(v_referral.referrer_id, 500);
  PERFORM public.increment_user_xp(p_user_id, 250);
  RETURN jsonb_build_object('success', true);
END;
$function$;

-- =========================================================================
-- PART 4: mark_messages_read(2-arg) — client always passes the reader's
-- own id (messagesService.ts markMessagesAsRead). Add ownership guard so
-- a user can't mark another user's inbox as read.
-- =========================================================================
CREATE OR REPLACE FUNCTION public.mark_messages_read(p_conversation_id uuid, p_user_id uuid)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  IF auth.uid() IS DISTINCT FROM p_user_id THEN
    RAISE EXCEPTION 'Cannot mark another user''s messages as read';
  END IF;
  UPDATE messages SET read_at = NOW()
  WHERE conversation_id = p_conversation_id AND user_id != p_user_id AND read_at IS NULL AND deleted_at IS NULL;
  RETURN 1;
END;
$function$;

-- =========================================================================
-- PART 5: update_seasonal_progress — client always passes caller's own id
-- (seasonalEventsService.ts updateUserProgress). Add ownership guard.
-- =========================================================================
CREATE OR REPLACE FUNCTION public.update_seasonal_progress(p_user_id uuid, p_event_id uuid, p_points integer)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  IF auth.uid() IS DISTINCT FROM p_user_id THEN
    RAISE EXCEPTION 'Cannot update another user''s seasonal progress';
  END IF;
  INSERT INTO public.user_achievements (user_id, achievement_id, unlocked_at)
  SELECT p_user_id, id, now() FROM public.achievements WHERE name = 'seasonal_progress' LIMIT 1
  ON CONFLICT DO NOTHING;
END;
$function$;

-- =========================================================================
-- PART 6: redeem_shop_deal — client-passed p_user_id, add ownership guard.
-- (Client currently sends mismatched param names for this one — see notes.)
-- =========================================================================
CREATE OR REPLACE FUNCTION public.redeem_shop_deal(p_user_id uuid, p_sponsorship_id uuid, p_xp_cost integer)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_code TEXT;
  v_expires TIMESTAMPTZ;
  v_result JSON;
BEGIN
  IF auth.uid() IS DISTINCT FROM p_user_id THEN
    RAISE EXCEPTION 'Cannot redeem a deal for another user';
  END IF;

  UPDATE profiles
  SET xp = xp - p_xp_cost
  WHERE id = p_user_id AND xp >= p_xp_cost;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Insufficient XP';
  END IF;

  v_code := UPPER(SUBSTRING(MD5(RANDOM()::TEXT || NOW()::TEXT) FROM 1 FOR 8));
  v_expires := NOW() + INTERVAL '30 days';

  INSERT INTO reward_codes (user_id, sponsorship_id, code, expires_at)
  VALUES (p_user_id, p_sponsorship_id, v_code, v_expires)
  RETURNING json_build_object(
    'id', id,
    'code', code,
    'expires_at', expires_at
  ) INTO v_result;

  RETURN v_result;
END;
$function$;

