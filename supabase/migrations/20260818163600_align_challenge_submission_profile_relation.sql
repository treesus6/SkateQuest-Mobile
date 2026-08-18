-- The Judge's Booth reads usernames from profiles. Preserve the historical
-- users FK under a distinct name and expose the profile FK under the relation
-- name used by PostgREST in the app.

do $$
begin
  if exists (
    select 1
    from pg_constraint
    where conrelid = 'public.challenge_submissions'::regclass
      and conname = 'challenge_submissions_user_id_fkey'
      and confrelid = 'public.users'::regclass
  ) and not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.challenge_submissions'::regclass
      and conname = 'challenge_submissions_user_auth_fkey'
  ) then
    alter table public.challenge_submissions
      rename constraint challenge_submissions_user_id_fkey
      to challenge_submissions_user_auth_fkey;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.challenge_submissions'::regclass
      and conname = 'challenge_submissions_user_id_fkey'
      and confrelid = 'public.profiles'::regclass
  ) then
    alter table public.challenge_submissions
      add constraint challenge_submissions_user_id_fkey
      foreign key (user_id) references public.profiles(id) on delete cascade not valid;
  end if;
end $$;
