-- Trigger-only functions should never be directly RPC-callable
REVOKE EXECUTE ON FUNCTION public.award_pioneer_badge() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.award_time_badges() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_is_minor() FROM PUBLIC, anon, authenticated;

-- Close the "who is a minor" enumeration leak; current_user_is_minor() already
-- provides the correct self-scoped version for legitimate use
REVOKE EXECUTE ON FUNCTION public.is_user_minor(uuid) FROM PUBLIC, anon, authenticated;

-- CRITICAL: arbitrary table/column writer, not called anywhere in the app, no allowlist
DROP FUNCTION IF EXISTS public.increment_fields(text, uuid, jsonb);

-- Dead stub overloads confirmed unused (real logic lives in the other overloads)
DROP FUNCTION IF EXISTS public.create_or_get_direct_conversation(uuid);
DROP FUNCTION IF EXISTS public.mark_messages_read(uuid);

