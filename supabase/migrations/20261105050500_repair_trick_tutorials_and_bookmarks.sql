-- Repair Trick Tutorials to match the live UI and persist user bookmarks.
alter table public.trick_tutorials
  add column if not exists suggested_by uuid references auth.users(id) on delete set null,
  add column if not exists votes integer not null default 0 check (votes >= 0);

drop policy if exists "authenticated_can_suggest_tutorials" on public.trick_tutorials;
create policy "authenticated_can_suggest_tutorials"
on public.trick_tutorials
for insert
to authenticated
with check (auth.uid() = suggested_by);

grant select, insert on public.trick_tutorials to authenticated;

create table if not exists public.tutorial_bookmarks (
  id uuid primary key default gen_random_uuid(),
  tutorial_id uuid not null references public.trick_tutorials(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (tutorial_id, user_id)
);

alter table public.tutorial_bookmarks enable row level security;

drop policy if exists "tutorial_bookmarks_select_own" on public.tutorial_bookmarks;
create policy "tutorial_bookmarks_select_own"
on public.tutorial_bookmarks
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "tutorial_bookmarks_insert_own" on public.tutorial_bookmarks;
create policy "tutorial_bookmarks_insert_own"
on public.tutorial_bookmarks
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "tutorial_bookmarks_delete_own" on public.tutorial_bookmarks;
create policy "tutorial_bookmarks_delete_own"
on public.tutorial_bookmarks
for delete
to authenticated
using (auth.uid() = user_id);

grant select, insert, delete on public.tutorial_bookmarks to authenticated;

create index if not exists idx_tutorial_bookmarks_user
  on public.tutorial_bookmarks(user_id);

create index if not exists idx_tutorial_bookmarks_tutorial
  on public.tutorial_bookmarks(tutorial_id);
