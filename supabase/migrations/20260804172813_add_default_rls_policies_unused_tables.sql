-- daily_tricks: shared content catalog (no user_id column) — public read,
-- writes reserved for admin/service role (not exposed to client roles).
CREATE POLICY daily_tricks_select_all
ON public.daily_tricks FOR SELECT TO authenticated, anon USING (true);

-- shop_members: membership junction table. Self-row visibility + self
-- join/leave. Loosen to "shop_id IN (my shops)" later if you build a
-- shop-roster screen.
CREATE POLICY shop_members_select_own
ON public.shop_members FOR SELECT TO authenticated
USING (user_id = auth.uid());

CREATE POLICY shop_members_insert_own
ON public.shop_members FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY shop_members_delete_own
ON public.shop_members FOR DELETE TO authenticated
USING (user_id = auth.uid());

-- skate_game_tricks: peer S-K-A-T-E game data (setter/responder). Private
-- to the two participants by default.
CREATE POLICY skate_game_tricks_select_participant
ON public.skate_game_tricks FOR SELECT TO authenticated
USING (setter_id = auth.uid() OR responder_id = auth.uid());

CREATE POLICY skate_game_tricks_insert_setter
ON public.skate_game_tricks FOR INSERT TO authenticated
WITH CHECK (setter_id = auth.uid());

CREATE POLICY skate_game_tricks_update_participant
ON public.skate_game_tricks FOR UPDATE TO authenticated
USING (setter_id = auth.uid() OR responder_id = auth.uid())
WITH CHECK (setter_id = auth.uid() OR responder_id = auth.uid());

-- user_crews: crew rosters — visible to any signed-in user (social
-- feature, "who's in this crew"), self join/leave only.
CREATE POLICY user_crews_select_all
ON public.user_crews FOR SELECT TO authenticated USING (true);

CREATE POLICY user_crews_insert_own
ON public.user_crews FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY user_crews_delete_own
ON public.user_crews FOR DELETE TO authenticated
USING (user_id = auth.uid());

