-- Fixes a bug in 20260719000001_security_hardening.sql's crew_projects policies.
--
-- Both `crew_members cm where cm.crew_id = crew_id::uuid` and an earlier attempted
-- fix `cm.crew_id::text = crew_id` had the same root problem: crew_members ALSO has
-- a column named crew_id, so the unqualified `crew_id` inside the EXISTS subquery
-- resolves to crew_members.crew_id (the innermost scope), not the outer
-- crew_projects.crew_id. The original version degenerated to `cm.crew_id =
-- cm.crew_id` — always true — so the "must be a member of this project's crew"
-- check was a no-op: any member of ANY crew could pass it, not just members of the
-- crew the project actually belongs to. The attempted text-cast fix instead failed
-- outright with "operator does not exist: text = uuid" for the same reason.
--
-- Explicitly qualifying the outer table (crew_projects.crew_id) resolves both.
-- Currently inert in practice: crew_projects has 0 rows and no app code references
-- it yet, so this was never exploitable, but it needed fixing before the feature
-- ships.
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
