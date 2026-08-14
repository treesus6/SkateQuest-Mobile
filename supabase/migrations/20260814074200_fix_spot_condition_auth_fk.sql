-- Align spot condition reports with Supabase Auth identities used by the app.
-- The table had no rows when this migration was prepared.
alter table public.spot_conditions
  drop constraint if exists spot_conditions_reported_by_fkey;

alter table public.spot_conditions
  add constraint spot_conditions_reported_by_fkey
  foreign key (reported_by) references auth.users(id) on delete set null;

drop policy if exists "Users can report conditions" on public.spot_conditions;
create policy "Users can report conditions"
  on public.spot_conditions for insert
  to authenticated
  with check (reported_by = (select auth.uid()));

grant select, insert on public.spot_conditions to authenticated;