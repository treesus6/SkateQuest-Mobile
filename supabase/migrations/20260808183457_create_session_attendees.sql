create table public.session_attendees (
  session_id uuid not null references public.skate_sessions(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (session_id, user_id)
);

alter table public.session_attendees enable row level security;

grant select, insert, delete on public.session_attendees to authenticated;

create policy "Authenticated users can read session attendees"
on public.session_attendees
for select
to authenticated
using (true);

create policy "Users can RSVP themselves"
on public.session_attendees
for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "Users can remove their own RSVP"
on public.session_attendees
for delete
to authenticated
using ((select auth.uid()) = user_id);

create index session_attendees_user_id_idx
on public.session_attendees(user_id);
