-- User-authored feed records may describe real user actions, but they must not
-- claim XP that was not awarded by a verified server workflow.

create or replace function public.sanitize_client_activity_feed_insert()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if current_user in ('authenticated','anon') then
    new.xp_earned := 0;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_sanitize_client_activity_feed_insert on public.activity_feed;
create trigger trg_sanitize_client_activity_feed_insert
before insert on public.activity_feed
for each row
execute function public.sanitize_client_activity_feed_insert();

drop policy if exists "activity_feed_insert_own" on public.activity_feed;
drop policy if exists "activity_feed_insert_own_zero_xp" on public.activity_feed;
create policy "activity_feed_insert_own_zero_xp"
on public.activity_feed
for insert
to authenticated
with check (
  user_id = auth.uid()
  and xp_earned = 0
  and (
    media_id is null
    or exists (
      select 1
      from public.media m
      where m.id = media_id
        and m.user_id = auth.uid()
    )
  )
);
