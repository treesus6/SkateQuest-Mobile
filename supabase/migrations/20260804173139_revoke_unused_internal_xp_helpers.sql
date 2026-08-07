-- award_xp: app calls increment_xp, not this. Keep as internal-only building block.
REVOKE EXECUTE ON FUNCTION public.award_xp(uuid, integer) FROM PUBLIC, anon, authenticated;

-- increment_user_xp: internal helper used by increment_xp() and apply_referral_code()
-- (including cross-user referral-bonus crediting). Must stay callable by those,
-- but NOT directly by clients.
REVOKE EXECUTE ON FUNCTION public.increment_user_xp(uuid, integer) FROM PUBLIC, anon, authenticated;

-- No confirmed caller in crewsService.ts or elsewhere scanned
REVOKE EXECUTE ON FUNCTION public.increment_crew_xp(uuid, integer) FROM PUBLIC, anon, authenticated;

-- No confirmed caller in challengesService.ts (which has zero RPC calls)
REVOKE EXECUTE ON FUNCTION public.bump_mission_progress(uuid, text, integer) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.increment_mission_progress(uuid, text, integer) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.submit_quest_proof(uuid, uuid, text, text, text, double precision, double precision) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_seasonal_progress(uuid, uuid, integer) FROM PUBLIC, anon, authenticated;

-- Not scanned directly (userTricksService.ts, mentorshipService.ts, goProService.ts) -
-- revoking as a safe default given no confirmed legitimate direct-client use
REVOKE EXECUTE ON FUNCTION public.increment_trick_attempts(uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_mentorship_stats(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_sponsor_stats(uuid) FROM PUBLIC, anon, authenticated;

