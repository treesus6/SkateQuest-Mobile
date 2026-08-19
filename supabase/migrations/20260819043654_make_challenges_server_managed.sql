begin;

drop policy if exists "Authenticated users can create challenges" on public.challenges;
drop policy if exists "Authenticated users can complete challenges" on public.challenges;

revoke insert, update, delete on public.challenges from anon, authenticated;
grant select on public.challenges to authenticated;

commit;
