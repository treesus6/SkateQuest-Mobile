-- A client may only create a feed card for media it actually uploaded. The
-- server derives the feed wording from the media row so a client cannot invent
-- challenge wins, XP, or other activity types.

create or replace function public.sanitize_client_activity_feed_insert()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
declare
  v_type text;
  v_caption text;
  v_trick_name text;
begin
  if current_user in ('authenticated','anon') then
    if auth.uid() is null then raise exception 'authentication required'; end if;
    if new.media_id is null then raise exception 'client feed posts require owned media'; end if;

    select m.type, m.caption, m.trick_name
    into v_type, v_caption, v_trick_name
    from public.media m
    where m.id = new.media_id
      and m.user_id = auth.uid();

    if not found then raise exception 'owned media not found'; end if;

    new.user_id := auth.uid();
    new.activity_type := 'media_uploaded';
    new.xp_earned := 0;
    new.title := case
      when v_trick_name is not null and btrim(v_trick_name) <> ''
        then 'Posted a ' || btrim(v_trick_name) || ' clip'
      when v_type = 'video' then 'Posted a skate video'
      when v_type = 'photo' then 'Posted a skate photo'
      else 'Posted skate media'
    end;
    new.description := nullif(btrim(coalesce(v_caption, '')), '');
  end if;
  return new;
end;
$$;

drop policy if exists "activity_feed_insert_own_zero_xp" on public.activity_feed;
create policy "activity_feed_insert_own_media"
on public.activity_feed
for insert
to authenticated
with check (
  user_id = auth.uid()
  and xp_earned = 0
  and activity_type = 'media_uploaded'
  and media_id is not null
  and exists (
    select 1
    from public.media m
    where m.id = media_id
      and m.user_id = auth.uid()
  )
);
