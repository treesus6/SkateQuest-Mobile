-- Migration 012: RPC functions referenced in app code but missing from prior migrations

-- ── increment_user_xp ─────────────────────────────────────────────────────────
-- Called in CheckInScreen
CREATE OR REPLACE FUNCTION increment_user_xp(uid uuid, amount int)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE profiles SET xp = xp + amount WHERE id = uid;
END;
$$;

-- ── increment_xp (alias) ──────────────────────────────────────────────────────
-- Called via profilesService.incrementXp
CREATE OR REPLACE FUNCTION increment_xp(user_id uuid, amount int)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE profiles SET xp = xp + amount WHERE id = user_id;
END;
$$;

-- ── get_level_progress ────────────────────────────────────────────────────────
-- Called in ProfileScreen via profilesService.getLevelProgress
CREATE OR REPLACE FUNCTION get_level_progress(user_xp int)
RETURNS TABLE (
  current_level int,
  current_xp int,
  xp_for_current_level int,
  xp_for_next_level int,
  xp_progress int,
  xp_needed int,
  progress_percentage numeric
) LANGUAGE plpgsql STABLE AS $$
DECLARE
  xp_per_level int := 500;
  lvl int;
  base_xp int;
  next_xp int;
BEGIN
  lvl := 1 + (user_xp / xp_per_level);
  base_xp := (lvl - 1) * xp_per_level;
  next_xp := lvl * xp_per_level;

  RETURN QUERY SELECT
    lvl,
    user_xp,
    base_xp,
    next_xp,
    user_xp - base_xp,
    next_xp - user_xp,
    ROUND(((user_xp - base_xp)::numeric / xp_per_level) * 100, 1);
END;
$$;

-- ── increment_trick_attempts ──────────────────────────────────────────────────
-- Called in TrickTrackerScreen via userTricksService.incrementAttempts
CREATE OR REPLACE FUNCTION increment_trick_attempts(trick_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE user_tricks
  SET attempts = attempts + 1, updated_at = now()
  WHERE id = trick_id AND user_id = auth.uid();
END;
$$;

-- ── create_or_get_direct_conversation ────────────────────────────────────────
-- Called in messagesService.createDirectConversation
CREATE OR REPLACE FUNCTION create_or_get_direct_conversation(p_user1_id uuid, p_user2_id uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  conv_id uuid;
BEGIN
  -- Check if a direct conversation already exists between these two users
  SELECT c.id INTO conv_id
  FROM conversations c
  JOIN conversation_members m1 ON m1.conversation_id = c.id AND m1.user_id = p_user1_id
  JOIN conversation_members m2 ON m2.conversation_id = c.id AND m2.user_id = p_user2_id
  WHERE c.type = 'direct'
  LIMIT 1;

  IF conv_id IS NOT NULL THEN
    RETURN conv_id;
  END IF;

  -- Create new conversation
  INSERT INTO conversations (type, created_by)
  VALUES ('direct', p_user1_id)
  RETURNING id INTO conv_id;

  -- Add both members
  INSERT INTO conversation_members (conversation_id, user_id)
  VALUES (conv_id, p_user1_id), (conv_id, p_user2_id);

  RETURN conv_id;
END;
$$;

-- ── mark_messages_read ────────────────────────────────────────────────────────
-- Called in messagesService.markMessagesAsRead
CREATE OR REPLACE FUNCTION mark_messages_read(p_conversation_id uuid, p_user_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE messages
  SET read_at = now()
  WHERE conversation_id = p_conversation_id
    AND user_id != p_user_id
    AND read_at IS NULL;
END;
$$;

-- ── get_unread_message_count ──────────────────────────────────────────────────
-- Called in messagesService.getUnreadCount
CREATE OR REPLACE FUNCTION get_unread_message_count(p_user_id uuid)
RETURNS int LANGUAGE plpgsql STABLE SECURITY DEFINER AS $$
DECLARE
  total int;
BEGIN
  SELECT COUNT(*) INTO total
  FROM messages m
  JOIN conversation_members cm ON cm.conversation_id = m.conversation_id AND cm.user_id = p_user_id
  WHERE m.user_id != p_user_id AND m.read_at IS NULL AND m.deleted_at IS NULL;
  RETURN COALESCE(total, 0);
END;
$$;

-- ── get_referral_stats ────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION get_referral_stats(p_user_id uuid)
RETURNS TABLE (total_referrals int, total_xp_earned int, active_codes int)
LANGUAGE plpgsql STABLE SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY
  SELECT
    (SELECT COUNT(*)::int FROM referral_uses WHERE recruiter_user_id = p_user_id),
    (SELECT COALESCE(SUM(recruiter_bonus_xp_awarded), 0)::int FROM referral_uses WHERE recruiter_user_id = p_user_id),
    (SELECT COUNT(*)::int FROM referral_codes WHERE user_id = p_user_id AND active = true);
END;
$$;

-- ── get_mentorship_stats ──────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION get_mentorship_stats(p_user_id uuid)
RETURNS TABLE (mentees_count int, mentors_count int, active_relationships int)
LANGUAGE plpgsql STABLE SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY
  SELECT
    (SELECT COUNT(*)::int FROM mentor_relationships WHERE mentor_user_id = p_user_id AND status = 'active'),
    (SELECT COUNT(*)::int FROM mentor_relationships WHERE mentee_user_id = p_user_id AND status = 'active'),
    (SELECT COUNT(*)::int FROM mentor_relationships WHERE (mentor_user_id = p_user_id OR mentee_user_id = p_user_id) AND status = 'active');
END;
$$;

-- ── update_seasonal_progress ──────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_seasonal_progress(p_user_id uuid, p_seasonal_event_id uuid, p_progress_increment int)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  tier_threshold int := 200;
BEGIN
  INSERT INTO seasonal_user_progress (user_id, seasonal_event_id, progress_value, current_tier)
  VALUES (p_user_id, p_seasonal_event_id, p_progress_increment, 0)
  ON CONFLICT (user_id, seasonal_event_id) DO UPDATE
  SET
    progress_value = seasonal_user_progress.progress_value + p_progress_increment,
    current_tier = LEAST(
      5,
      (seasonal_user_progress.progress_value + p_progress_increment) / tier_threshold
    ),
    updated_at = now();
END;
$$;

-- ── apply_referral_code ───────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION apply_referral_code(p_referral_code text, p_new_user_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  code_record referral_codes%ROWTYPE;
  result jsonb;
BEGIN
  SELECT * INTO code_record FROM referral_codes
  WHERE code = UPPER(p_referral_code) AND active = true
  LIMIT 1;

  IF code_record IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid or expired code');
  END IF;

  -- Award XP to new user
  UPDATE profiles SET xp = xp + code_record.activation_bonus_xp WHERE id = p_new_user_id;

  -- Award XP to recruiter
  UPDATE profiles SET xp = xp + code_record.recruiter_bonus_xp WHERE id = code_record.user_id;

  -- Record the use
  INSERT INTO referral_uses (referral_code_id, recruiter_user_id, new_user_id, bonus_xp_awarded, recruiter_bonus_xp_awarded)
  VALUES (code_record.id, code_record.user_id, p_new_user_id, code_record.activation_bonus_xp, code_record.recruiter_bonus_xp);

  RETURN jsonb_build_object(
    'success', true,
    'recruiter_name', (SELECT username FROM profiles WHERE id = code_record.user_id)
  );
END;
$$;
