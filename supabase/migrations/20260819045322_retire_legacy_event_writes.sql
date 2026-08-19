begin;

drop policy if exists "Authenticated users can create events" on public.events;
revoke insert, update, delete on public.events from anon, authenticated;

drop policy if exists "Users can RSVP as themselves" on public.event_rsvps;
revoke insert, update, delete on public.event_rsvps from anon, authenticated;

commit;
