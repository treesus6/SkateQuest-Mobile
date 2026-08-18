-- Keep the Bounty Board actionable: an official bounty disappears for a skater
-- while their proof is pending and after it has been approved. Rejected proof
-- makes the bounty available again for a new real attempt.

do $$
declare
  r record;
begin
  for r in
    select policyname
    from pg_policies
    where schemaname = 'public'
      and tablename = 'bounties'
      and cmd = 'SELECT'
  loop
    execute format('drop policy if exists %I on public.bounties', r.policyname);
  end loop;
end $$;

create policy "bounties_read_actionable"
on public.bounties
for select
to public
using (
  not coalesce(is_official, false)
  or auth.uid() is null
  or not exists (
    select 1
    from public.bounty_submissions bs
    where bs.bounty_id = bounties.id
      and bs.user_id = auth.uid()
      and bs.status in ('PENDING','APPROVED')
  )
);
