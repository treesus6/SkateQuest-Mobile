-- =========================================================================
-- The previous migration's REVOKEs didn't fully take because Postgres
-- grants EXECUTE to the PUBLIC pseudo-role by default when a function is
-- created — and anon/authenticated both inherit through PUBLIC. Revoking
-- from anon/authenticated directly doesn't remove that inherited access.
-- Re-doing these as REVOKE ... FROM PUBLIC closes the gap for real.
-- =========================================================================
REVOKE EXECUTE ON FUNCTION public.award_pioneer_badge() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.award_time_badges() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.award_xp(uuid, integer) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.increment_user_xp(uuid, integer) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.increment_crew_xp(uuid, integer) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.bump_mission_progress(uuid, text, integer) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.increment_mission_progress(uuid, text, integer) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.submit_quest_proof(uuid, uuid, text, text, text, double precision, double precision) FROM PUBLIC;

-- Trigger functions on auth.users signup — fire regardless of role grants,
-- so this is a pure privilege cleanup with zero functional impact.
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.update_is_minor() FROM PUBLIC;

-- =========================================================================
-- increment_fields(table_name, record_id, increments) — a GENERIC dynamic
-- SQL writer: any authenticated user could call this to increment ANY
-- numeric column on ANY table for ANY row id (e.g. grant themselves
-- infinite XP directly on the profiles table, bypassing every other guard
-- just added). Confirmed unused anywhere in the client. Lock it down hard.
-- =========================================================================
REVOKE EXECUTE ON FUNCTION public.increment_fields(text, uuid, jsonb) FROM PUBLIC, anon, authenticated;

-- =========================================================================
-- is_user_minor(user_id) — lets any authenticated user check whether ANY
-- OTHER user is a minor. Confirmed unused by the client. This is a
-- meaningful privacy/safety exposure on a platform with minors present —
-- lock it down entirely. current_user_is_minor() (self-only, auth.uid()
-- scoped) stays as-is; it's the safe replacement pattern.
-- =========================================================================
REVOKE EXECUTE ON FUNCTION public.is_user_minor(uuid) FROM PUBLIC, anon, authenticated;

-- =========================================================================
-- create_or_get_direct_conversation(p_user1_id, p_user2_id) — client
-- always passes the caller's own id as p_user1_id (messagesService.ts
-- createDirectConversation). Add ownership guard so a user can't wire up
-- a conversation between two other people.
-- =========================================================================
CREATE OR REPLACE FUNCTION public.create_or_get_direct_conversation(p_user1_id uuid, p_user2_id uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE v_conversation_id UUID;
BEGIN
  IF auth.uid() IS DISTINCT FROM p_user1_id THEN
    RAISE EXCEPTION 'Cannot create a conversation on behalf of another user';
  END IF;
  SELECT c.id INTO v_conversation_id FROM conversations c WHERE c.type = 'direct' AND EXISTS (SELECT 1 FROM conversation_members cm1 WHERE cm1.conversation_id = c.id AND cm1.user_id = p_user1_id) AND EXISTS (SELECT 1 FROM conversation_members cm2 WHERE cm2.conversation_id = c.id AND cm2.user_id = p_user2_id) LIMIT 1;
  IF v_conversation_id IS NOT NULL THEN RETURN v_conversation_id; END IF;
  INSERT INTO conversations (type, created_by) VALUES ('direct', p_user1_id) RETURNING id INTO v_conversation_id;
  INSERT INTO conversation_members (conversation_id, user_id) VALUES (v_conversation_id, p_user1_id), (v_conversation_id, p_user2_id);
  RETURN v_conversation_id;
END;
$function$;

-- =========================================================================
-- increment_trick_attempts(p_user_id, p_trick_name) — defense-in-depth
-- ownership guard (cheap, no legitimate cross-user call site found).
-- =========================================================================
CREATE OR REPLACE FUNCTION public.increment_trick_attempts(p_user_id uuid, p_trick_name text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  IF auth.uid() IS DISTINCT FROM p_user_id THEN
    RAISE EXCEPTION 'Cannot log trick attempts for another user';
  END IF;
  INSERT INTO public.user_tricks (user_id, trick_name, attempts, status)
  VALUES (p_user_id, p_trick_name, 1, 'trying')
  ON CONFLICT DO NOTHING;
  UPDATE public.user_tricks
  SET attempts = attempts + 1, updated_at = now()
  WHERE user_id = p_user_id AND trick_name = p_trick_name;
END;
$function$;

