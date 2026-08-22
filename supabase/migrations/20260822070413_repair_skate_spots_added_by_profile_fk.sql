-- Community spot creation submits the authenticated Supabase user id.
-- Profiles are keyed by auth.users.id; public.users is a legacy empty table.
-- Point added_by at profiles so authenticated inserts can satisfy both RLS and
-- referential integrity.

alter table public.skate_spots
  drop constraint if exists skate_spots_added_by_fkey;

alter table public.skate_spots
  add constraint skate_spots_added_by_fkey
  foreign key (added_by)
  references public.profiles(id)
  on delete set null;
