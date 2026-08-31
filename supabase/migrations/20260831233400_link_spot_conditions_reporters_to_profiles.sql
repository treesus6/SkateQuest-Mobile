-- Keep the SpotDetail reporter join valid for PostgREST/Supabase embeds.
-- spot_conditions.reported_by already references auth.users(id), while the app
-- embeds reporter:profiles(id, username). Add the matching public relationship
-- without removing the auth.users integrity constraint.

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.spot_conditions'::regclass
      and conname = 'spot_conditions_reported_by_profiles_fkey'
  ) then
    alter table public.spot_conditions
      add constraint spot_conditions_reported_by_profiles_fkey
      foreign key (reported_by)
      references public.profiles(id)
      on delete set null;
  end if;
end
$$;
