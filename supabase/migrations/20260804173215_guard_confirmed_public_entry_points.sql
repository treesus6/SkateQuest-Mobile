-- increment_xp (2-arg): confirmed client entry point via profilesService.incrementXp
CREATE OR REPLACE FUNCTION public.increment_xp(p_user_id uuid, p_xp_amount integer)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  IF auth.uid() IS DISTINCT FROM p_user_id THEN
    RAISE EXCEPTION 'Not authorized to modify this user''s XP';
  END IF;
  PERFORM public.increment_user_xp(p_user_id, p_xp_amount);
END;
$function$;

-- increment_xp (4-arg, with park attribution): this was the one callable by anon (unauthenticated!)
CREATE OR REPLACE FUNCTION public.increment_xp(p_user_id uuid, p_xp_amount integer, p_park_id uuid DEFAULT NULL::uuid, p_source text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  IF auth.uid() IS DISTINCT FROM p_user_id THEN
    RAISE EXCEPTION 'Not authorized to modify this user''s XP';
  END IF;
  PERFORM public.increment_user_xp(p_user_id, p_xp_amount);
  IF p_park_id IS NOT NULL THEN
    INSERT INTO public.park_xp_log (user_id, park_id, xp_amount, source)
    VALUES (p_user_id, p_park_id, p_xp_amount, p_source);
  END IF;
END;
$function$;
-- This RPC was previously EXECUTE-granted to anon (unauthenticated). The guard above closes
-- the exploit, but also drop the standing grant so future signature changes don't re-open it.
REVOKE EXECUTE ON FUNCTION public.increment_xp(uuid, integer, uuid, text) FROM anon;

-- create_or_get_direct_conversation (2-arg): confirmed live via messagesService.ts
CREATE OR REPLACE FUNCTION public.create_or_get_direct_conversation(p_user1_id uuid, p_user2_id uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE v_conversation_id UUID;
BEGIN
  IF auth.uid() IS DISTINCT FROM p_user1_id AND auth.uid() IS DISTINCT FROM p_user2_id THEN
    RAISE EXCEPTION 'Not authorized to create this conversation';
  END IF;
  SELECT c.id INTO v_conversation_id FROM conversations c
    WHERE c.type = 'direct'
    AND EXISTS (SELECT 1 FROM conversation_members cm1 WHERE cm1.conversation_id = c.id AND cm1.user_id = p_user1_id)
    AND EXISTS (SELECT 1 FROM conversation_members cm2 WHERE cm2.conversation_id = c.id AND cm2.user_id = p_user2_id)
    LIMIT 1;
  IF v_conversation_id IS NOT NULL THEN RETURN v_conversation_id; END IF;
  INSERT INTO conversations (type, created_by) VALUES ('direct', p_user1_id) RETURNING id INTO v_conversation_id;
  INSERT INTO conversation_members (conversation_id, user_id) VALUES (v_conversation_id, p_user1_id), (v_conversation_id, p_user2_id);
  RETURN v_conversation_id;
END;
$function$;

-- mark_messages_read (2-arg): confirmed live via messagesService.markMessagesAsRead
CREATE OR REPLACE FUNCTION public.mark_messages_read(p_conversation_id uuid, p_user_id uuid)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  IF auth.uid() IS DISTINCT FROM p_user_id THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  UPDATE messages SET read_at = NOW()
    WHERE conversation_id = p_conversation_id AND user_id != p_user_id AND read_at IS NULL AND deleted_at IS NULL;
  RETURN 1;
END;
$function$;

-- get_referral_stats: confirmed live via referralService.getReferralStats
CREATE OR REPLACE FUNCTION public.get_referral_stats(p_user_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  total_referrals integer;
  claimed_referrals integer;
BEGIN
  IF auth.uid() IS DISTINCT FROM p_user_id THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  SELECT COUNT(*), COUNT(*) FILTER (WHERE claimed = true)
  INTO total_referrals, claimed_referrals
  FROM public.referrals WHERE referrer_id = p_user_id;
  RETURN jsonb_build_object('total', total_referrals, 'claimed', claimed_referrals);
END;
$function$;

-- apply_referral_code: confirmed live via referralService.applyReferralCodeOnSignup
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

-- redeem_shop_deal: confirmed live via shopsService.redeemDeal
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
    RAISE EXCEPTION 'Not authorized';
  END IF;
  UPDATE profiles SET xp = xp - p_xp_cost WHERE id = p_user_id AND xp >= p_xp_cost;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Insufficient XP';
  END IF;
  v_code := UPPER(SUBSTRING(MD5(RANDOM()::TEXT || NOW()::TEXT) FROM 1 FOR 8));
  v_expires := NOW() + INTERVAL '30 days';
  INSERT INTO reward_codes (user_id, sponsorship_id, code, expires_at)
  VALUES (p_user_id, p_sponsorship_id, v_code, v_expires)
  RETURNING json_build_object('id', id, 'code', code, 'expires_at', expires_at) INTO v_result;
  RETURN v_result;
END;
$function$;

-- get_level_progress: guarded for consistency (client call is currently broken by param mismatch anyway - see follow-up list)
CREATE OR REPLACE FUNCTION public.get_level_progress(p_user_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  user_xp integer;
  current_level integer;
  xp_for_next integer;
  xp_for_current integer;
BEGIN
  IF auth.uid() IS DISTINCT FROM p_user_id THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  SELECT COALESCE(xp, 0) INTO user_xp FROM public.profiles WHERE id = p_user_id;
  current_level := FLOOR(SQRT(user_xp::float / 100))::integer;
  xp_for_current := (current_level * current_level) * 100;
  xp_for_next := ((current_level + 1) * (current_level + 1)) * 100;
  RETURN jsonb_build_object(
    'level', current_level, 'xp', user_xp,
    'xp_for_current_level', xp_for_current, 'xp_for_next_level', xp_for_next,
    'progress', CASE WHEN xp_for_next > xp_for_current THEN (user_xp - xp_for_current)::float / (xp_for_next - xp_for_current) ELSE 1 END
  );
END;
$function$;

-- get_unread_message_count: was a stub (SELECT 0) - actually implemented now, plus guarded
CREATE OR REPLACE FUNCTION public.get_unread_message_count(p_user_id uuid)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_count integer;
BEGIN
  IF auth.uid() IS DISTINCT FROM p_user_id THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  SELECT COUNT(*) INTO v_count
  FROM public.messages m
  JOIN public.conversation_members cm ON cm.conversation_id = m.conversation_id
  WHERE cm.user_id = p_user_id
    AND m.user_id != p_user_id
    AND m.read_at IS NULL
    AND m.deleted_at IS NULL;
  RETURN COALESCE(v_count, 0);
END;
$function$;

