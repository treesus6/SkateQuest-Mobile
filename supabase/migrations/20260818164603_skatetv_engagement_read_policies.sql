alter table public.skatetv_likes enable row level security;
alter table public.skatetv_views enable row level security;

drop policy if exists "skatetv_likes_read_own" on public.skatetv_likes;
create policy "skatetv_likes_read_own"
on public.skatetv_likes
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "skatetv_views_read_own" on public.skatetv_views;
create policy "skatetv_views_read_own"
on public.skatetv_views
for select
to authenticated
using (user_id = auth.uid());
