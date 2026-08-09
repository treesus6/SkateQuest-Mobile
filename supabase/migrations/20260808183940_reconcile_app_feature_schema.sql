-- Reconcile schema used by the current SkateQuest app.
-- Safe to re-run on older databases.

alter table if exists public.spot_conditions
  add column if not exists bust_risk integer default 20;

alter table if exists public.achievements
  add column if not exists tier integer not null default 1;

create table if not exists public.streaks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.profiles(id) on delete cascade,
  current_streak integer not null default 0 check (current_streak >= 0),
  longest_streak integer not null default 0 check (longest_streak >= 0),
  last_active_date timestamptz,
  xp_at_risk integer not null default 0 check (xp_at_risk >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.streak_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  streak_length integer not null default 0,
  xp_lost integer not null default 0,
  ended_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_streak_history_user
  on public.streak_history(user_id, ended_at desc);

alter table public.streaks enable row level security;
alter table public.streak_history enable row level security;

drop policy if exists "Streak owners can read" on public.streaks;
create policy "Streak owners can read" on public.streaks
  for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Streak owners can insert" on public.streaks;
create policy "Streak owners can insert" on public.streaks
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "Streak owners can update" on public.streaks;
create policy "Streak owners can update" on public.streaks
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Streak owners can read history" on public.streak_history;
create policy "Streak owners can read history" on public.streak_history
  for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Streak owners can insert history" on public.streak_history;
create policy "Streak owners can insert history" on public.streak_history
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

grant select, insert, update on public.streaks to authenticated;
grant select, insert on public.streak_history to authenticated;

create or replace function public.increment_trick_attempts(trick_id uuid)
returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  update public.user_tricks
  set attempts = coalesce(attempts, 0) + 1,
      updated_at = now()
  where id = trick_id
    and user_id = (select auth.uid());
end;
$$;

grant execute on function public.increment_trick_attempts(uuid) to authenticated;
