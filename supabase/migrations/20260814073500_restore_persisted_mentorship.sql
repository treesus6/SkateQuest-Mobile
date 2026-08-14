-- Restore mentorship as a real persisted feature.
-- The relationship table was empty when this migration was prepared, but the
-- renames preserve data if rows are introduced before deployment.

alter table public.mentor_relationships
  rename column mentor_id to mentor_user_id;
alter table public.mentor_relationships
  rename column mentee_id to mentee_user_id;

alter table public.mentor_relationships
  add column if not exists goals text,
  add column if not exists progress_notes text,
  add column if not exists started_at timestamptz not null default now(),
  add column if not exists ended_at timestamptz,
  add column if not exists last_interaction timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

alter table public.mentor_relationships
  alter column mentor_user_id set not null,
  alter column mentee_user_id set not null;

alter table public.mentor_relationships
  drop constraint if exists mentor_relationships_distinct_users;
alter table public.mentor_relationships
  add constraint mentor_relationships_distinct_users
  check (mentor_user_id <> mentee_user_id);

create unique index if not exists mentor_relationships_unique_pair
  on public.mentor_relationships (mentor_user_id, mentee_user_id)
  where status in ('pending', 'active', 'paused');

create table if not exists public.mentor_profiles (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  available boolean not null default false,
  specialty text not null default 'street'
    check (specialty in ('street', 'park', 'vert', 'transition', 'flatground', 'freestyle', 'all-around')),
  tricks_mastered integer not null default 0 check (tricks_mastered >= 0),
  level integer not null default 1 check (level >= 1),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.mentor_profiles enable row level security;
alter table public.mentor_relationships enable row level security;

drop policy if exists mentor_profiles_select_available on public.mentor_profiles;
create policy mentor_profiles_select_available
  on public.mentor_profiles for select
  to authenticated
  using (available or user_id = (select auth.uid()));

drop policy if exists mentor_profiles_insert_own on public.mentor_profiles;
create policy mentor_profiles_insert_own
  on public.mentor_profiles for insert
  to authenticated
  with check (user_id = (select auth.uid()));

drop policy if exists mentor_profiles_update_own on public.mentor_profiles;
create policy mentor_profiles_update_own
  on public.mentor_profiles for update
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

drop policy if exists mentor_profiles_delete_own on public.mentor_profiles;
create policy mentor_profiles_delete_own
  on public.mentor_profiles for delete
  to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists users_see_own_mentorships on public.mentor_relationships;
drop policy if exists mentor_relationships_select_participant on public.mentor_relationships;
create policy mentor_relationships_select_participant
  on public.mentor_relationships for select
  to authenticated
  using (
    mentor_user_id = (select auth.uid())
    or mentee_user_id = (select auth.uid())
  );

drop policy if exists mentor_relationships_request_as_mentee on public.mentor_relationships;
create policy mentor_relationships_request_as_mentee
  on public.mentor_relationships for insert
  to authenticated
  with check (
    mentee_user_id = (select auth.uid())
    and mentor_user_id <> (select auth.uid())
  );

drop policy if exists mentor_relationships_update_participant on public.mentor_relationships;
create policy mentor_relationships_update_participant
  on public.mentor_relationships for update
  to authenticated
  using (
    mentor_user_id = (select auth.uid())
    or mentee_user_id = (select auth.uid())
  )
  with check (
    mentor_user_id = (select auth.uid())
    or mentee_user_id = (select auth.uid())
  );

drop policy if exists mentor_relationships_delete_participant on public.mentor_relationships;
create policy mentor_relationships_delete_participant
  on public.mentor_relationships for delete
  to authenticated
  using (
    mentor_user_id = (select auth.uid())
    or mentee_user_id = (select auth.uid())
  );

grant select, insert, update, delete on public.mentor_profiles to authenticated;
grant select, insert, update, delete on public.mentor_relationships to authenticated;

create or replace function public.get_mentorship_stats(p_user_id uuid)
returns jsonb
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  select jsonb_build_object(
    'mentees_count', count(*) filter (
      where mentor_user_id = p_user_id and status = 'active'
    ),
    'mentors_count', count(*) filter (
      where mentee_user_id = p_user_id and status = 'active'
    ),
    'active_relationships', count(*) filter (
      where (mentor_user_id = p_user_id or mentee_user_id = p_user_id)
        and status = 'active'
    )
  )
  from public.mentor_relationships
  where mentor_user_id = p_user_id or mentee_user_id = p_user_id;
$$;

revoke all on function public.get_mentorship_stats(uuid) from public, anon;
grant execute on function public.get_mentorship_stats(uuid) to authenticated;