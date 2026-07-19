-- Security hardening pass — fixes findings from Supabase Security Advisor.
-- Applied directly to the live project via MCP on 2026-07-19; saved here so the
-- migration history in this repo stays in sync (the migrations/ folder had already
-- drifted behind what's actually deployed — see 014+ applied but not saved locally).

-- 1. Set a fixed search_path on every function we own in public. Mutable search_path
--    on SECURITY DEFINER functions is a privilege-escalation / hijack vector.
do $$
declare
  r record;
begin
  for r in
    select p.oid::regprocedure::text as sig
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and not exists (
        select 1 from pg_depend d
        where d.objid = p.oid and d.deptype = 'e'
      )
  loop
    begin
      execute format('alter function %s set search_path = public, pg_temp', r.sig);
    exception when insufficient_privilege then
      raise notice 'skipped % (not owner)', r.sig;
    end;
  end loop;
end $$;

-- 2. Fix RLS policies that used USING(true)/WITH CHECK(true) for write operations,
--    which let any authenticated user write/delete rows belonging to anyone else.
drop policy if exists "users_claim_bounties" on public.bounties;
create policy "users_claim_bounties" on public.bounties
  for update
  to authenticated
  using (status = 'open' and claimed_by is null)
  with check (claimed_by = auth.uid());

drop policy if exists "Users can create projects" on public.crew_projects;
create policy "Users can create projects" on public.crew_projects
  for insert
  to authenticated
  with check (
    creator_id = auth.uid()::text
    and exists (select 1 from public.crew_members cm where cm.crew_id = crew_id::uuid and cm.user_id = auth.uid())
  );

drop policy if exists "Members can update projects" on public.crew_projects;
create policy "Members can update projects" on public.crew_projects
  for update
  to authenticated
  using (
    creator_id = auth.uid()::text
    or exists (select 1 from public.crew_members cm where cm.crew_id = crew_id::uuid and cm.user_id = auth.uid())
  )
  with check (
    creator_id = auth.uid()::text
    or exists (select 1 from public.crew_members cm where cm.crew_id = crew_id::uuid and cm.user_id = auth.uid())
  );

drop policy if exists "Users can create streams" on public.live_streams;
create policy "Users can create streams" on public.live_streams
  for insert
  to authenticated
  with check (streamer_id = auth.uid()::text);

drop policy if exists "Streamers can update streams" on public.live_streams;
create policy "Streamers can update streams" on public.live_streams
  for update
  to authenticated
  using (streamer_id = auth.uid()::text)
  with check (streamer_id = auth.uid()::text);

drop policy if exists "Users can insert messages" on public.lounge_messages;
create policy "Users can insert messages" on public.lounge_messages
  for insert
  to authenticated
  with check (user_id = auth.uid()::text);

drop policy if exists "Users can create sessions" on public.skate_sessions;
create policy "Users can create sessions" on public.skate_sessions
  for insert
  to authenticated
  with check (creator_id = auth.uid()::text);

drop policy if exists "Users can update sessions" on public.skate_sessions;
create policy "Users can update sessions" on public.skate_sessions
  for update
  to authenticated
  using (creator_id = auth.uid()::text)
  with check (creator_id = auth.uid()::text);

drop policy if exists "Creators can delete sessions" on public.skate_sessions;
create policy "Creators can delete sessions" on public.skate_sessions
  for delete
  to authenticated
  using (creator_id = auth.uid()::text);

drop policy if exists "System can insert user achievements" on public.user_achievements;
create policy "System can insert user achievements" on public.user_achievements
  for insert
  to authenticated
  with check (user_id = auth.uid());

-- Note: sponsor_clicks "Anyone can insert clicks" (WITH CHECK true) is left as-is —
-- it's write-only click analytics, intentionally open to anonymous users.

-- 3. Storage object policy fixes.
-- quest_proofs_upload/quest_proofs_view were unscoped duplicates that fully negated
-- the correctly-scoped "authenticated users can upload quest proofs" policy, since
-- Postgres RLS policies are OR'd together.
drop policy if exists "quest_proofs_upload" on storage.objects;
drop policy if exists "quest_proofs_view" on storage.objects;

-- avatars_upload allowed uploading to ANY user's avatar path.
drop policy if exists "avatars_upload" on storage.objects;
create policy "avatars_upload" on storage.objects
  for insert
  to authenticated
  with check (bucket_id = 'user-avatars' and (storage.foldername(name))[2] = auth.uid()::text);

-- skatetv_upload allowed uploading under any other user's folder.
drop policy if exists "skatetv_upload" on storage.objects;
create policy "skatetv_upload" on storage.objects
  for insert
  to authenticated
  with check (bucket_id = 'skatetv-clips' and (storage.foldername(name))[2] = auth.uid()::text);

-- skatetv_delete_own checked foldername[1] (a literal 'clips') instead of
-- foldername[2] (the actual user id segment) — delete-own-clip could never succeed.
drop policy if exists "skatetv_delete_own" on storage.objects;
create policy "skatetv_delete_own" on storage.objects
  for delete
  to authenticated
  using (bucket_id = 'skatetv-clips' and (storage.foldername(name))[2] = auth.uid()::text);

-- 4. Revoke anonymous execute on SECURITY DEFINER functions that mutate XP,
--    achievements, referrals, missions, or messaging. Every real caller in the app
--    invokes these only after auth, so this closes unauthenticated abuse without
--    touching any legitimate app flow. handle_new_user (auth trigger) and
--    st_estimatedextent (postgis internal) are intentionally left alone.
do $$
declare
  r record;
  fn_names text[] := array[
    'apply_referral_code','award_xp','bump_mission_progress',
    'create_or_get_direct_conversation','current_user_is_minor','get_level_progress',
    'get_mentorship_stats','get_referral_stats','get_sponsor_stats',
    'get_unread_message_count','increment_crew_xp','increment_fields',
    'increment_mission_progress','increment_trick_attempts','increment_user_xp',
    'increment_xp','is_shop_member','is_user_minor','mark_messages_read',
    'redeem_shop_deal','submit_quest_proof','update_is_minor','update_seasonal_progress'
  ];
begin
  for r in
    select p.oid::regprocedure::text as sig
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = any(fn_names)
      and not exists (select 1 from pg_depend d where d.objid = p.oid and d.deptype = 'e')
  loop
    begin
      -- PUBLIC grants execute by default at function creation; revoking only from
      -- `anon` leaves it reachable because anon inherits PUBLIC's grants.
      execute format('revoke execute on function %s from public', r.sig);
      execute format('grant execute on function %s to authenticated', r.sig);
      execute format('grant execute on function %s to service_role', r.sig);
    exception when insufficient_privilege then
      raise notice 'skipped % (not owner)', r.sig;
    end;
  end loop;
end $$;

-- 5. Public-read hygiene on skate_shops (RLS was enabled with zero policies, so
--    every request was silently denied).
drop policy if exists "Skate shops are viewable by everyone" on public.skate_shops;
create policy "Skate shops are viewable by everyone" on public.skate_shops
  for select
  to public
  using (true);

-- Remaining items that need manual action and were NOT applied here:
--   * spatial_ref_sys has RLS disabled and is owned by the postgis extension —
--     the API role can't ALTER it. Run this in the Supabase SQL Editor as the
--     project owner:
--       ALTER TABLE public.spatial_ref_sys ENABLE ROW LEVEL SECURITY;
--       CREATE POLICY "public read spatial_ref_sys" ON public.spatial_ref_sys
--         FOR SELECT TO public USING (true);
--   * "Leaked password protection" (HaveIBeenPwned check) is off — toggle it in
--     Dashboard > Authentication > Providers > Email. Not settable via SQL.
--   * postgis and pg_net extensions live in the public schema (Supabase's own
--     default install location). Relocating them is invasive and risks breaking
--     every spatial query in the app — deferred, not attempted here.
