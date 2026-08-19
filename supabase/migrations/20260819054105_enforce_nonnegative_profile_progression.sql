begin;

do $$ begin
  alter table public.profiles add constraint profiles_xp_nonnegative check (coalesce(xp,0) >= 0) not valid;
exception when duplicate_object then null; end $$;
alter table public.profiles validate constraint profiles_xp_nonnegative;

do $$ begin
  alter table public.profiles add constraint profiles_level_positive check (coalesce(level,1) >= 1) not valid;
exception when duplicate_object then null; end $$;
alter table public.profiles validate constraint profiles_level_positive;

commit;
