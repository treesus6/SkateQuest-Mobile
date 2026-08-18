-- Community condition reports must be attributable to the signed-in skater.

alter table public.spot_conditions enable row level security;

do $$
declare r record;
begin
  for r in
    select policyname
    from pg_policies
    where schemaname = 'public'
      and tablename = 'spot_conditions'
      and cmd in ('INSERT','UPDATE','DELETE')
  loop
    execute format('drop policy if exists %I on public.spot_conditions', r.policyname);
  end loop;
end $$;

create policy "spot_conditions_insert_own"
on public.spot_conditions
for insert
to authenticated
with check (user_id = auth.uid());

create policy "spot_conditions_update_own"
on public.spot_conditions
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "spot_conditions_delete_own"
on public.spot_conditions
for delete
to authenticated
using (user_id = auth.uid());
