-- === Genuine merges (different quals, need real OR-combination) ===

ALTER POLICY "authenticated_can_select_active_challenges" ON public.challenges
    USING (
        ((COALESCE(active, false) = true) AND (COALESCE(expires_at, 'infinity'::timestamp with time zone) > now()) AND (COALESCE(starts_at, '-infinity'::timestamp with time zone) <= now()))
        OR
        (((issued_by_user_id)::text = ( SELECT auth.uid() AS uid)::text) OR ((challenger_id)::text = ( SELECT auth.uid() AS uid)::text))
    );
DROP POLICY "owners_can_select_their_challenges" ON public.challenges;

-- === Redundant policies: one is already a strict superset of the other, safe to drop ===

DROP POLICY "park_xp_log_select_own_rows" ON public.park_xp_log;
DROP POLICY "Profiles select" ON public.profiles;
DROP POLICY "Profiles update" ON public.profiles;
DROP POLICY "Users can view their own achievements" ON public.user_achievements;

-- === FOR ALL policies split into INSERT/UPDATE/DELETE so SELECT isn't double-evaluated
--     against the separate dedicated SELECT policy on each table. Postgres implicitly
--     uses USING as WITH CHECK when WITH CHECK is absent on ALL policies, so this split
--     is behavior-preserving. ===

DROP POLICY "Users can manage own votes" ON public.clip_votes;
CREATE POLICY "Users can manage own votes_insert" ON public.clip_votes FOR INSERT TO public WITH CHECK ((( SELECT auth.uid() AS uid) = user_id));
CREATE POLICY "Users can manage own votes_update" ON public.clip_votes FOR UPDATE TO public USING ((( SELECT auth.uid() AS uid) = user_id)) WITH CHECK ((( SELECT auth.uid() AS uid) = user_id));
CREATE POLICY "Users can manage own votes_delete" ON public.clip_votes FOR DELETE TO public USING ((( SELECT auth.uid() AS uid) = user_id));

DROP POLICY "Service role can write forecast cache" ON public.forecast_cache;
CREATE POLICY "Service role can write forecast cache_insert" ON public.forecast_cache FOR INSERT TO public WITH CHECK ((( SELECT auth.role() AS role) = 'service_role'::text));
CREATE POLICY "Service role can write forecast cache_update" ON public.forecast_cache FOR UPDATE TO public USING ((( SELECT auth.role() AS role) = 'service_role'::text)) WITH CHECK ((( SELECT auth.role() AS role) = 'service_role'::text));
CREATE POLICY "Service role can write forecast cache_delete" ON public.forecast_cache FOR DELETE TO public USING ((( SELECT auth.role() AS role) = 'service_role'::text));

DROP POLICY "users_manage_own_checkins" ON public.live_checkins;
CREATE POLICY "users_manage_own_checkins_insert" ON public.live_checkins FOR INSERT TO authenticated WITH CHECK ((user_id = ( SELECT auth.uid() AS uid)));
CREATE POLICY "users_manage_own_checkins_update" ON public.live_checkins FOR UPDATE TO authenticated USING ((user_id = ( SELECT auth.uid() AS uid))) WITH CHECK ((user_id = ( SELECT auth.uid() AS uid)));
CREATE POLICY "users_manage_own_checkins_delete" ON public.live_checkins FOR DELETE TO authenticated USING ((user_id = ( SELECT auth.uid() AS uid)));

DROP POLICY "Authenticated users can manage sponsors" ON public.map_sponsors;
CREATE POLICY "Authenticated users can manage sponsors_insert" ON public.map_sponsors FOR INSERT TO public WITH CHECK ((( SELECT auth.uid() AS uid) IS NOT NULL));
CREATE POLICY "Authenticated users can manage sponsors_update" ON public.map_sponsors FOR UPDATE TO public USING ((( SELECT auth.uid() AS uid) IS NOT NULL)) WITH CHECK ((( SELECT auth.uid() AS uid) IS NOT NULL));
CREATE POLICY "Authenticated users can manage sponsors_delete" ON public.map_sponsors FOR DELETE TO public USING ((( SELECT auth.uid() AS uid) IS NOT NULL));

DROP POLICY "Users can manage own hype" ON public.media_hype_users;
CREATE POLICY "Users can manage own hype_insert" ON public.media_hype_users FOR INSERT TO public WITH CHECK ((( SELECT auth.uid() AS uid) = user_id));
CREATE POLICY "Users can manage own hype_update" ON public.media_hype_users FOR UPDATE TO public USING ((( SELECT auth.uid() AS uid) = user_id)) WITH CHECK ((( SELECT auth.uid() AS uid) = user_id));
CREATE POLICY "Users can manage own hype_delete" ON public.media_hype_users FOR DELETE TO public USING ((( SELECT auth.uid() AS uid) = user_id));

DROP POLICY "users_see_own_notifications" ON public.notifications;
CREATE POLICY "users_see_own_notifications_insert" ON public.notifications FOR INSERT TO authenticated WITH CHECK ((user_id = ( SELECT auth.uid() AS uid)));
CREATE POLICY "users_see_own_notifications_update" ON public.notifications FOR UPDATE TO authenticated USING ((user_id = ( SELECT auth.uid() AS uid))) WITH CHECK ((user_id = ( SELECT auth.uid() AS uid)));
CREATE POLICY "users_see_own_notifications_delete" ON public.notifications FOR DELETE TO authenticated USING ((user_id = ( SELECT auth.uid() AS uid)));

DROP POLICY "users_manage_own_proofs" ON public.quest_proof_submissions;
CREATE POLICY "users_manage_own_proofs_insert" ON public.quest_proof_submissions FOR INSERT TO authenticated WITH CHECK ((user_id = ( SELECT auth.uid() AS uid)));
CREATE POLICY "users_manage_own_proofs_update" ON public.quest_proof_submissions FOR UPDATE TO authenticated USING ((user_id = ( SELECT auth.uid() AS uid))) WITH CHECK ((user_id = ( SELECT auth.uid() AS uid)));
CREATE POLICY "users_manage_own_proofs_delete" ON public.quest_proof_submissions FOR DELETE TO authenticated USING ((user_id = ( SELECT auth.uid() AS uid)));

DROP POLICY "users_manage_own_stamps" ON public.skate_passport_stamps;
CREATE POLICY "users_manage_own_stamps_insert" ON public.skate_passport_stamps FOR INSERT TO authenticated WITH CHECK ((user_id = ( SELECT auth.uid() AS uid)));
CREATE POLICY "users_manage_own_stamps_update" ON public.skate_passport_stamps FOR UPDATE TO authenticated USING ((user_id = ( SELECT auth.uid() AS uid))) WITH CHECK ((user_id = ( SELECT auth.uid() AS uid)));
CREATE POLICY "users_manage_own_stamps_delete" ON public.skate_passport_stamps FOR DELETE TO authenticated USING ((user_id = ( SELECT auth.uid() AS uid)));

DROP POLICY "users_manage_own_comments" ON public.spot_comments;
CREATE POLICY "users_manage_own_comments_insert" ON public.spot_comments FOR INSERT TO authenticated WITH CHECK ((user_id = ( SELECT auth.uid() AS uid)));
CREATE POLICY "users_manage_own_comments_update" ON public.spot_comments FOR UPDATE TO authenticated USING ((user_id = ( SELECT auth.uid() AS uid))) WITH CHECK ((user_id = ( SELECT auth.uid() AS uid)));
CREATE POLICY "users_manage_own_comments_delete" ON public.spot_comments FOR DELETE TO authenticated USING ((user_id = ( SELECT auth.uid() AS uid)));

DROP POLICY "users_manage_own_totw" ON public.trick_of_week_submissions;
CREATE POLICY "users_manage_own_totw_insert" ON public.trick_of_week_submissions FOR INSERT TO authenticated WITH CHECK ((user_id = ( SELECT auth.uid() AS uid)));
CREATE POLICY "users_manage_own_totw_update" ON public.trick_of_week_submissions FOR UPDATE TO authenticated USING ((user_id = ( SELECT auth.uid() AS uid))) WITH CHECK ((user_id = ( SELECT auth.uid() AS uid)));
CREATE POLICY "users_manage_own_totw_delete" ON public.trick_of_week_submissions FOR DELETE TO authenticated USING ((user_id = ( SELECT auth.uid() AS uid)));


