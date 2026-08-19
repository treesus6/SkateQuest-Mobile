begin;

create table if not exists public.spot_of_day_rsvps (
  id uuid primary key default gen_random_uuid(),
  spot_of_day_id uuid not null references public.spot_of_day(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (spot_of_day_id, user_id)
);
alter table public.spot_of_day_rsvps enable row level security;
drop policy if exists "spot_of_day_rsvps_read" on public.spot_of_day_rsvps;
drop policy if exists "spot_of_day_rsvps_insert_own" on public.spot_of_day_rsvps;
drop policy if exists "spot_of_day_rsvps_delete_own" on public.spot_of_day_rsvps;
create policy "spot_of_day_rsvps_read" on public.spot_of_day_rsvps for select to authenticated using (true);
create policy "spot_of_day_rsvps_insert_own" on public.spot_of_day_rsvps for insert to authenticated with check (user_id=(select auth.uid()));
create policy "spot_of_day_rsvps_delete_own" on public.spot_of_day_rsvps for delete to authenticated using (user_id=(select auth.uid()));
revoke all on public.spot_of_day_rsvps from anon;
grant select, insert, delete on public.spot_of_day_rsvps to authenticated;

drop policy if exists "Authenticated users can RSVP" on public.event_rsvps;
create policy "Users can RSVP as themselves" on public.event_rsvps for insert to authenticated
with check (user_id=(select auth.uid()));

drop policy if exists "Authenticated users can manage sponsors_delete" on public.map_sponsors;
drop policy if exists "Authenticated users can manage sponsors_insert" on public.map_sponsors;
drop policy if exists "Authenticated users can manage sponsors_update" on public.map_sponsors;
revoke insert, update, delete on public.map_sponsors from anon, authenticated;

drop policy if exists "Authenticated users can add entries" on public.scene_entries;
revoke insert, update, delete on public.scene_entries from anon, authenticated;

drop policy if exists "Authenticated users can add shops" on public.shops;
revoke insert, update, delete on public.shops from anon, authenticated;

drop policy if exists "Authenticated users can create spots" on public.skate_spots;
create policy "Users can create own community spots" on public.skate_spots for insert to authenticated
with check (
  added_by=(select auth.uid())
  and sponsor_name is null
  and sponsor_url is null
  and sponsor_logo_url is null
  and coalesce(has_qr,false)=false
  and crew_id is null
  and coalesce(reputation_points,0)=0
  and status is null
);
drop policy if exists "Users can update own spots" on public.skate_spots;
revoke update on public.skate_spots from anon, authenticated;

drop policy if exists "Users can add spot photos" on public.spot_photos;
create policy "Users can add their own spot photos" on public.spot_photos for insert to authenticated
with check (uploaded_by=(select auth.uid()));

drop policy if exists "Anyone can insert clicks" on public.sponsor_clicks;
create policy "Track anonymous or own sponsor clicks" on public.sponsor_clicks for insert to public
with check (user_id is null or user_id=(select auth.uid()));

commit;
