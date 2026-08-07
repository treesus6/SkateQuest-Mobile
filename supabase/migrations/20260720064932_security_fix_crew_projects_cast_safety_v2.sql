-- v1 of this fix (previous migration) had two bugs:
-- 1. crew_id::uuid on the text column threw a hard error on invalid UUID text.
-- 2. The v1 attempted fix (cm.crew_id::text = crew_id) was itself broken: inside
--    the EXISTS subquery, unqualified `crew_id` resolves to crew_members.crew_id
--    (both tables have a column of that name), not the outer crew_projects.crew_id
--    -- so it silently compared cm.crew_id::text to cm.crew_id (uuid), which
--    Postgres correctly rejects as "operator does not exist: text = uuid".
-- Explicitly qualifying the outer table reference fixes both.
drop policy if exists "Users can create projects" on public.crew_projects;
create policy "Users can create projects" on public.crew_projects
  for insert
  to authenticated
  with check (
    creator_id = auth.uid()::text
    and exists (select 1 from public.crew_members cm where cm.crew_id::text = crew_projects.crew_id and cm.user_id = auth.uid())
  );

drop policy if exists "Members can update projects" on public.crew_projects;
create policy "Members can update projects" on public.crew_projects
  for update
  to authenticated
  using (
    creator_id = auth.uid()::text
    or exists (select 1 from public.crew_members cm where cm.crew_id::text = crew_projects.crew_id and cm.user_id = auth.uid())
  )
  with check (
    creator_id = auth.uid()::text
    or exists (select 1 from public.crew_members cm where cm.crew_id::text = crew_projects.crew_id and cm.user_id = auth.uid())
  );

