begin;

drop policy if exists "crew_territories_insert_members" on public.crew_territories;
drop policy if exists "crew_territories_update_members" on public.crew_territories;
revoke insert, update, delete on public.crew_territories from anon, authenticated;
grant select on public.crew_territories to authenticated;

commit;
