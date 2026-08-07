-- Same PUBLIC-inheritance gotcha as before, for the remaining functions.
-- These already have auth.uid() = p_user_id guards inside from the prior
-- migration, so anon calling them would already fail — this closes the
-- privilege itself too, for defense-in-depth and to fully clear the lint.

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

REVOKE EXECUTE ON FUNCTION public.increment_xp(uuid, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.increment_xp(uuid, integer) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.increment_xp(uuid, integer, uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.increment_xp(uuid, integer, uuid, text) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.apply_referral_code(text, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.apply_referral_code(text, uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.mark_messages_read(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.mark_messages_read(uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.mark_messages_read(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.mark_messages_read(uuid, uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.update_seasonal_progress(uuid, uuid, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.update_seasonal_progress(uuid, uuid, integer) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.redeem_shop_deal(uuid, uuid, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.redeem_shop_deal(uuid, uuid, integer) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.create_or_get_direct_conversation(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_or_get_direct_conversation(uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.create_or_get_direct_conversation(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_or_get_direct_conversation(uuid, uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.increment_trick_attempts(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.increment_trick_attempts(uuid, text) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.update_is_minor() FROM PUBLIC, anon, authenticated;

