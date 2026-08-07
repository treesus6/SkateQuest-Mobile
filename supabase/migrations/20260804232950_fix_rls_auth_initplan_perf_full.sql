-- Wrap bare auth.<fn>() calls in RLS policies with (select auth.<fn>()) so
-- Postgres evaluates them once per query instead of once per row.
-- Pure performance fix -- logically identical to the original policies.

ALTER POLICY "users_manage_own_bingo" ON public.bingo_cards
    USING ((user_id = (select auth.uid())));

ALTER POLICY "crew_members_create_bounties" ON public.bounties
    WITH CHECK ((created_by = (select auth.uid())));

ALTER POLICY "users_claim_bounties" ON public.bounties
    WITH CHECK ((claimed_by = (select auth.uid())));

ALTER POLICY "users_can_report_bust" ON public.bust_risk_reports
    WITH CHECK ((user_id = (select auth.uid())));

ALTER POLICY "Users can create callouts" ON public.callouts
    WITH CHECK (((select auth.uid()) = challenger_id));

ALTER POLICY "Users can update own callouts" ON public.callouts
    USING ((((select auth.uid()) = challenger_id) OR ((select auth.uid()) = challenged_id)));

ALTER POLICY "Users can view own callouts" ON public.callouts
    USING ((((select auth.uid()) = challenger_id) OR ((select auth.uid()) = challenged_id)));

ALTER POLICY "Users can create own completions" ON public.challenge_completions
    WITH CHECK (((select auth.uid()) = user_id));

ALTER POLICY "Users can update own completions" ON public.challenge_completions
    USING (((select auth.uid()) = user_id));

ALTER POLICY "Users can view own completions" ON public.challenge_completions
    USING (((select auth.uid()) = user_id));

ALTER POLICY "Users insert submissions" ON public.challenge_submissions
    WITH CHECK (((select auth.uid()) = user_id));

ALTER POLICY "Authenticated users can complete challenges" ON public.challenges
    USING (((select auth.uid()) IS NOT NULL));

ALTER POLICY "Authenticated users can create challenges" ON public.challenges
    WITH CHECK (((select auth.uid()) IS NOT NULL));

ALTER POLICY "users_manage_own_clips" ON public.clip_submissions
    USING ((user_id = (select auth.uid())));

ALTER POLICY "Users can manage own votes" ON public.clip_votes
    USING (((select auth.uid()) = user_id));

ALTER POLICY "Users can create comments" ON public.comments
    WITH CHECK (((select auth.uid()) = user_id));

ALTER POLICY "Users can delete own comments" ON public.comments
    USING (((select auth.uid()) = user_id));

ALTER POLICY "Users can update own comments" ON public.comments
    USING (((select auth.uid()) = user_id));

ALTER POLICY "Users can add members to conversations" ON public.conversation_members
    WITH CHECK ((user_id = (select auth.uid())));

ALTER POLICY "Users can view conversation members" ON public.conversation_members
    USING (((user_id = (select auth.uid())) OR (EXISTS ( SELECT 1    FROM conversation_members cm2   WHERE ((cm2.conversation_id = conversation_members.conversation_id) AND (cm2.user_id = (select auth.uid())))))));

ALTER POLICY "Users can create conversations" ON public.conversations
    WITH CHECK ((created_by = (select auth.uid())));

ALTER POLICY "Users can view conversations they're in" ON public.conversations
    USING ((EXISTS ( SELECT 1    FROM conversation_members cm   WHERE ((cm.conversation_id = conversations.id) AND (cm.user_id = (select auth.uid()))))));

ALTER POLICY "crew_battle_votes_own_insert" ON public.crew_battle_votes
    WITH CHECK (((select auth.uid()) = user_id));

ALTER POLICY "crew_battles_auth_insert" ON public.crew_battles
    WITH CHECK (((select auth.uid()) IS NOT NULL));

ALTER POLICY "crew_battles_auth_update" ON public.crew_battles
    USING (((select auth.uid()) IS NOT NULL));

ALTER POLICY "Authenticated users can join crews" ON public.crew_members
    WITH CHECK (((select auth.uid()) IS NOT NULL));

ALTER POLICY "Users can leave crews" ON public.crew_members
    USING (((select auth.uid()) = user_id));

ALTER POLICY "Members can update projects" ON public.crew_projects
    USING (((creator_id = ((select auth.uid()))::text) OR (EXISTS ( SELECT 1    FROM crew_members cm   WHERE (((cm.crew_id)::text = crew_projects.crew_id) AND (cm.user_id = (select auth.uid())))))))
    WITH CHECK (((creator_id = ((select auth.uid()))::text) OR (EXISTS ( SELECT 1    FROM crew_members cm   WHERE (((cm.crew_id)::text = crew_projects.crew_id) AND (cm.user_id = (select auth.uid())))))));

ALTER POLICY "Users can create projects" ON public.crew_projects
    WITH CHECK (((creator_id = ((select auth.uid()))::text) AND (EXISTS ( SELECT 1    FROM crew_members cm   WHERE (((cm.crew_id)::text = crew_projects.crew_id) AND (cm.user_id = (select auth.uid())))))));

ALTER POLICY "crew_territories_insert_members" ON public.crew_territories
    WITH CHECK ((EXISTS ( SELECT 1    FROM crew_members   WHERE ((crew_members.crew_id = crew_territories.crew_id) AND (crew_members.user_id = (select auth.uid()))))));

ALTER POLICY "crew_territories_update_members" ON public.crew_territories
    USING ((EXISTS ( SELECT 1    FROM crew_members   WHERE ((crew_members.crew_id = crew_territories.crew_id) AND (crew_members.user_id = (select auth.uid()))))));

ALTER POLICY "Authenticated users can create crews" ON public.crews
    WITH CHECK (((select auth.uid()) IS NOT NULL));

ALTER POLICY "Creator can update crew" ON public.crews
    USING (((select auth.uid()) = created_by));

ALTER POLICY "users_manage_own_completions" ON public.daily_quest_completions
    USING ((user_id = (select auth.uid())));

ALTER POLICY "Users can create their own daily trick completions" ON public.daily_trick_completions
    WITH CHECK (((select auth.uid()) = user_id));

ALTER POLICY "users_manage_own_rsvps" ON public.demo_day_rsvps
    USING ((user_id = (select auth.uid())));

ALTER POLICY "Authenticated users can RSVP" ON public.event_rsvps
    WITH CHECK (((select auth.uid()) IS NOT NULL));

ALTER POLICY "Users can cancel RSVP" ON public.event_rsvps
    USING (((select auth.uid()) = user_id));

ALTER POLICY "Authenticated users can create events" ON public.events
    WITH CHECK (((select auth.uid()) IS NOT NULL));

ALTER POLICY "Creator can update events" ON public.events
    USING (((select auth.uid()) = created_by));

ALTER POLICY "Service role can write forecast cache" ON public.forecast_cache
    USING (((select auth.role()) = 'service_role'::text));

ALTER POLICY "users_manage_own_checkins" ON public.live_checkins
    USING ((user_id = (select auth.uid())));

ALTER POLICY "Streamers can update streams" ON public.live_streams
    USING ((streamer_id = ((select auth.uid()))::text))
    WITH CHECK ((streamer_id = ((select auth.uid()))::text));

ALTER POLICY "Users can create streams" ON public.live_streams
    WITH CHECK ((streamer_id = ((select auth.uid()))::text));

ALTER POLICY "Users can insert messages" ON public.lounge_messages
    WITH CHECK ((user_id = ((select auth.uid()))::text));

ALTER POLICY "Authenticated users can manage sponsors" ON public.map_sponsors
    USING (((select auth.uid()) IS NOT NULL));

ALTER POLICY "Users can delete own media" ON public.media
    USING (((select auth.uid()) = user_id));

ALTER POLICY "Users can upload media" ON public.media
    WITH CHECK (((select auth.uid()) = user_id));

ALTER POLICY "Users can manage own hype" ON public.media_hype_users
    USING (((select auth.uid()) = user_id));

ALTER POLICY "Users can like media" ON public.media_likes
    WITH CHECK (((select auth.uid()) = user_id));

ALTER POLICY "Users can unlike media" ON public.media_likes
    USING (((select auth.uid()) = user_id));

ALTER POLICY "users_see_own_mentorships" ON public.mentor_relationships
    USING (((mentor_id = (select auth.uid())) OR (mentee_id = (select auth.uid()))));

ALTER POLICY "Users can delete their own messages" ON public.messages
    USING ((user_id = (select auth.uid())));

ALTER POLICY "Users can insert messages" ON public.messages
    WITH CHECK (((user_id = (select auth.uid())) AND (EXISTS ( SELECT 1    FROM conversation_members cm   WHERE ((cm.conversation_id = messages.conversation_id) AND (cm.user_id = (select auth.uid()))))) AND (deleted_at IS NULL)));

ALTER POLICY "Users can update their own messages" ON public.messages
    USING ((user_id = (select auth.uid())))
    WITH CHECK ((user_id = (select auth.uid())));

ALTER POLICY "Users can view messages in their conversations" ON public.messages
    USING ((EXISTS ( SELECT 1    FROM conversation_members cm   WHERE ((cm.conversation_id = messages.conversation_id) AND (cm.user_id = (select auth.uid()))))));

ALTER POLICY "users_can_report" ON public.moderation_queue
    WITH CHECK ((reported_by = (select auth.uid())));

ALTER POLICY "Users update own notifications" ON public.notifications
    USING (((select auth.uid()) = user_id));

ALTER POLICY "Users view own notifications" ON public.notifications
    USING (((select auth.uid()) = user_id));

ALTER POLICY "users_see_own_notifications" ON public.notifications
    USING ((user_id = (select auth.uid())));

ALTER POLICY "Users can create ratings" ON public.park_ratings
    WITH CHECK (((select auth.uid()) = user_id));

ALTER POLICY "Users can update own ratings" ON public.park_ratings
    USING (((select auth.uid()) = user_id));

ALTER POLICY "Users can create visits" ON public.park_visits
    WITH CHECK (((select auth.uid()) = user_id));

ALTER POLICY "Users can view own visits" ON public.park_visits
    USING (((select auth.uid()) = user_id));

ALTER POLICY "park_xp_log_insert_own" ON public.park_xp_log
    WITH CHECK (((select auth.uid()) = user_id));

ALTER POLICY "park_xp_log_select_own_rows" ON public.park_xp_log
    USING ((user_id = (select auth.uid())));

ALTER POLICY "Users can like playlists" ON public.playlist_likes
    WITH CHECK (((select auth.uid()) = user_id));

ALTER POLICY "Users can unlike playlists" ON public.playlist_likes
    USING (((select auth.uid()) = user_id));

ALTER POLICY "Anyone can view public playlists" ON public.playlists
    USING (((is_public = true) OR ((select auth.uid()) = user_id)));

ALTER POLICY "Users can create playlists" ON public.playlists
    WITH CHECK (((select auth.uid()) = user_id));

ALTER POLICY "Users can delete own playlists" ON public.playlists
    USING (((select auth.uid()) = user_id));

ALTER POLICY "Users can update own playlists" ON public.playlists
    USING (((select auth.uid()) = user_id));

ALTER POLICY "Public profiles are viewable by everyone" ON public.profiles
    USING (((is_public = true) OR ((select auth.uid()) = id)));

ALTER POLICY "Users can update own profile" ON public.profiles
    USING (((select auth.uid()) = id));

ALTER POLICY "qr_codes_auth_insert" ON public.qr_codes
    WITH CHECK (((select auth.uid()) IS NOT NULL));

ALTER POLICY "qr_codes_auth_update" ON public.qr_codes
    USING (((select auth.uid()) IS NOT NULL));

ALTER POLICY "Users insert qr_scans" ON public.qr_scans
    WITH CHECK (((select auth.uid()) = user_id));

ALTER POLICY "users_manage_own_proofs" ON public.quest_proof_submissions
    USING ((user_id = (select auth.uid())));

ALTER POLICY "users_see_own_referrals" ON public.referrals
    USING (((referrer_id = (select auth.uid())) OR (referred_id = (select auth.uid()))));

ALTER POLICY "Users can view their own reward codes" ON public.reward_codes
    USING (((select auth.uid()) = user_id));

ALTER POLICY "Authenticated users can add entries" ON public.scene_entries
    WITH CHECK (((select auth.uid()) IS NOT NULL));

ALTER POLICY "Users insert checkins" ON public.shop_checkins
    WITH CHECK (((select auth.uid()) = user_id));

ALTER POLICY "shop_members_delete_own" ON public.shop_members
    USING ((user_id = (select auth.uid())));

ALTER POLICY "shop_members_insert_own" ON public.shop_members
    WITH CHECK ((user_id = (select auth.uid())));

ALTER POLICY "shop_members_select_own" ON public.shop_members
    USING ((user_id = (select auth.uid())));

ALTER POLICY "users_manage_own_redemptions" ON public.shop_offer_redemptions
    USING ((user_id = (select auth.uid())));

ALTER POLICY "Authenticated users can add shops" ON public.shops
    WITH CHECK (((select auth.uid()) IS NOT NULL));

ALTER POLICY "skate_game_tricks_insert_setter" ON public.skate_game_tricks
    WITH CHECK ((setter_id = (select auth.uid())));

ALTER POLICY "skate_game_tricks_select_participant" ON public.skate_game_tricks
    USING (((setter_id = (select auth.uid())) OR (responder_id = (select auth.uid()))));

ALTER POLICY "skate_game_tricks_update_participant" ON public.skate_game_tricks
    USING (((setter_id = (select auth.uid())) OR (responder_id = (select auth.uid()))))
    WITH CHECK (((setter_id = (select auth.uid())) OR (responder_id = (select auth.uid()))));

ALTER POLICY "Players can add turns" ON public.skate_game_turns
    WITH CHECK (((select auth.uid()) = player_id));

ALTER POLICY "Players can update their games" ON public.skate_games
    USING ((((select auth.uid()) = challenger_id) OR ((select auth.uid()) = opponent_id)));

ALTER POLICY "Users can create games" ON public.skate_games
    WITH CHECK (((select auth.uid()) = challenger_id));

ALTER POLICY "Users can view their games" ON public.skate_games
    USING ((((select auth.uid()) = challenger_id) OR ((select auth.uid()) = opponent_id)));

ALTER POLICY "users_manage_own_stamps" ON public.skate_passport_stamps
    USING ((user_id = (select auth.uid())));

ALTER POLICY "Creators can delete sessions" ON public.skate_sessions
    USING ((creator_id = ((select auth.uid()))::text));

ALTER POLICY "Users can create sessions" ON public.skate_sessions
    WITH CHECK ((creator_id = ((select auth.uid()))::text));

ALTER POLICY "Users can update sessions" ON public.skate_sessions
    USING ((creator_id = ((select auth.uid()))::text))
    WITH CHECK ((creator_id = ((select auth.uid()))::text));

ALTER POLICY "Authenticated users can create spots" ON public.skate_spots
    WITH CHECK (((select auth.uid()) IS NOT NULL));

ALTER POLICY "Users can delete own spots" ON public.skate_spots
    USING (((select auth.uid()) = added_by));

ALTER POLICY "Users can update own spots" ON public.skate_spots
    USING (((select auth.uid()) = added_by));

ALTER POLICY "users_delete_own_clips" ON public.skatetv_clips
    USING ((user_id = (select auth.uid())));

ALTER POLICY "users_post_clips" ON public.skatetv_clips
    WITH CHECK ((user_id = (select auth.uid())));

ALTER POLICY "users_manage_own_likes" ON public.skatetv_likes
    USING ((user_id = (select auth.uid())));

ALTER POLICY "Anyone can read own clicks" ON public.sponsor_clicks
    USING (((select auth.uid()) = user_id));

ALTER POLICY "Users insert claims" ON public.spot_claims
    WITH CHECK (((select auth.uid()) = user_id));

ALTER POLICY "users_manage_own_comments" ON public.spot_comments
    USING ((user_id = (select auth.uid())));

ALTER POLICY "Users can report conditions" ON public.spot_conditions
    WITH CHECK (((select auth.uid()) IS NOT NULL));

ALTER POLICY "Users can add spot photos" ON public.spot_photos
    WITH CHECK (((select auth.uid()) IS NOT NULL));

ALTER POLICY "Users insert status" ON public.spot_status_updates
    WITH CHECK (((select auth.uid()) = user_id));

ALTER POLICY "Users insert votes" ON public.submission_votes
    WITH CHECK (((select auth.uid()) = user_id));

ALTER POLICY "Users can insert own analyses" ON public.trick_analyses
    WITH CHECK (((select auth.uid()) = user_id));

ALTER POLICY "Users can view own analyses" ON public.trick_analyses
    USING (((select auth.uid()) = user_id));

ALTER POLICY "users_manage_own_totw" ON public.trick_of_week_submissions
    USING ((user_id = (select auth.uid())));

ALTER POLICY "users_manage_own_totw_votes" ON public.trick_of_week_votes
    USING ((user_id = (select auth.uid())));

ALTER POLICY "System can insert user achievements" ON public.user_achievements
    WITH CHECK ((user_id = (select auth.uid())));

ALTER POLICY "Users can update their own achievements" ON public.user_achievements
    USING (((select auth.uid()) = user_id));

ALTER POLICY "Users can view their own achievements" ON public.user_achievements
    USING (((select auth.uid()) = user_id));

ALTER POLICY "user_crews_delete_own" ON public.user_crews
    USING ((user_id = (select auth.uid())));

ALTER POLICY "user_crews_insert_own" ON public.user_crews
    WITH CHECK ((user_id = (select auth.uid())));

ALTER POLICY "own_mission_history" ON public.user_mission_history
    USING (((select auth.uid()) = user_id));

ALTER POLICY "own_missions_read" ON public.user_missions
    USING (((select auth.uid()) = user_id));

ALTER POLICY "own_missions_update" ON public.user_missions
    USING (((select auth.uid()) = user_id));

ALTER POLICY "users_manage_saved_spots" ON public.user_saved_spots
    USING ((user_id = (select auth.uid())));

ALTER POLICY "Users can update their own stats" ON public.user_stats
    USING (((select auth.uid()) = id));

ALTER POLICY "Users can add tricks" ON public.user_tricks
    WITH CHECK (((select auth.uid()) = user_id));

ALTER POLICY "Users can delete own tricks" ON public.user_tricks
    USING (((select auth.uid()) = user_id));

ALTER POLICY "Users can update own tricks" ON public.user_tricks
    USING (((select auth.uid()) = user_id));

ALTER POLICY "Users can view own tricks" ON public.user_tricks
    USING (((select auth.uid()) = user_id));

ALTER POLICY "Users insert unlocks" ON public.user_unlocks
    WITH CHECK (((select auth.uid()) = user_id));

ALTER POLICY "Users read unlocks" ON public.user_unlocks
    USING (((select auth.uid()) = user_id));

ALTER POLICY "Users can insert own profile" ON public.users
    WITH CHECK (((select auth.uid()) = id));

ALTER POLICY "Users can update own profile" ON public.users
    USING (((select auth.uid()) = id));

ALTER POLICY "Users can delete own videos" ON public.videos
    USING (((select auth.uid()) = user_id));

ALTER POLICY "Users can update own videos" ON public.videos
    USING (((select auth.uid()) = user_id));

ALTER POLICY "Users can upload videos" ON public.videos
    WITH CHECK (((select auth.uid()) = user_id));


