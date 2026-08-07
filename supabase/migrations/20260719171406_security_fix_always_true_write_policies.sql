-- bounties: claim flow was USING(true) -- anyone could rewrite any bounty row
drop policy if exists "users_claim_bounties" on public.bounties;
create policy "users_claim_bounties" on public.bounties
  for update
  to authenticated
  using (status = 'open' and claimed_by is null)
  with check (claimed_by = auth.uid());

-- crew_projects: insert/update were wide open to any authenticated user for any crew
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

-- live_streams: anyone could start/end/edit anyone else's stream
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

-- lounge_messages: could insert messages impersonating another user_id
drop policy if exists "Users can insert messages" on public.lounge_messages;
create policy "Users can insert messages" on public.lounge_messages
  for insert
  to authenticated
  with check (user_id = auth.uid()::text);

-- skate_sessions: anyone could create/edit/delete anyone else's session
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

-- user_achievements: anyone could grant an achievement to ANY user_id
drop policy if exists "System can insert user achievements" on public.user_achievements;
create policy "System can insert user achievements" on public.user_achievements
  for insert
  to authenticated
  with check (user_id = auth.uid());

