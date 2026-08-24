-- Make session creation and RSVP changes server-validated, atomic, and
-- idempotent for both the Android app and the web app.

alter table public.skate_sessions
  add column if not exists spot_name text;

update public.skate_sessions
set participants = '{}'
where participants is null;

alter table public.skate_sessions
  alter column participants set default '{}',
  alter column participants set not null;

alter table public.skate_sessions
  drop constraint if exists skate_sessions_title_length_check,
  add constraint skate_sessions_title_length_check
    check (char_length(btrim(title)) between 2 and 120),
  drop constraint if exists skate_sessions_description_length_check,
  add constraint skate_sessions_description_length_check
    check (description is null or char_length(description) <= 1000),
  drop constraint if exists skate_sessions_spot_name_length_check,
  add constraint skate_sessions_spot_name_length_check
    check (spot_name is null or char_length(spot_name) <= 160),
  drop constraint if exists skate_sessions_max_participants_check,
  add constraint skate_sessions_max_participants_check
    check (max_participants is null or max_participants between 1 and 500),
  drop constraint if exists skate_sessions_capacity_check,
  add constraint skate_sessions_capacity_check
    check (
      max_participants is null
      or coalesce(array_length(participants, 1), 0) <= max_participants
    );

create index if not exists skate_sessions_scheduled_time_idx
  on public.skate_sessions(scheduled_time);

create index if not exists skate_sessions_creator_id_idx
  on public.skate_sessions(creator_id);

create or replace function public.sync_session_attendees()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if exists (
    select 1
    from unnest(new.participants) as participant(user_id)
    where participant.user_id !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
       or not exists (
         select 1
         from public.profiles
         where id = participant.user_id::uuid
       )
  ) then
    raise exception 'Every session participant must be a valid profile';
  end if;

  insert into public.session_attendees(session_id, user_id)
  select new.id, participant.user_id::uuid
  from unnest(new.participants) as participant(user_id)
  on conflict (session_id, user_id) do nothing;

  delete from public.session_attendees
  where session_id = new.id
    and user_id::text <> all(new.participants);

  return new;
end;
$$;

drop trigger if exists sync_session_attendees_from_session on public.skate_sessions;
create trigger sync_session_attendees_from_session
after insert or update of participants on public.skate_sessions
for each row execute function public.sync_session_attendees();

revoke execute on function public.sync_session_attendees() from public, anon, authenticated;

drop policy if exists "Users can create sessions" on public.skate_sessions;
create policy "Users can create sessions"
on public.skate_sessions
for insert
to authenticated
with check (
  creator_id = (select auth.uid())::text
  and participants = array[(select auth.uid())::text]
);

-- RSVP mutations must use the atomic RPCs below. Direct updates could otherwise
-- bypass capacity and attendee synchronization.
revoke update on public.skate_sessions from authenticated;

create or replace function public.create_skate_session(
  p_title text,
  p_scheduled_time timestamptz,
  p_spot_id text,
  p_spot_name text,
  p_description text,
  p_max_participants integer
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_title text := btrim(coalesce(p_title, ''));
  v_description text := nullif(btrim(coalesce(p_description, '')), '');
  v_spot_name text := nullif(btrim(coalesce(p_spot_name, '')), '');
  v_session public.skate_sessions%rowtype;
begin
  if v_user is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  if char_length(v_title) < 2 or char_length(v_title) > 120 then
    raise exception 'Session title must be between 2 and 120 characters' using errcode = '22023';
  end if;
  if p_scheduled_time is null or p_scheduled_time <= now() then
    raise exception 'Session time must be in the future' using errcode = '22023';
  end if;
  if v_description is not null and char_length(v_description) > 1000 then
    raise exception 'Session description must be 1000 characters or fewer' using errcode = '22023';
  end if;
  if v_spot_name is not null and char_length(v_spot_name) > 160 then
    raise exception 'Session location must be 160 characters or fewer' using errcode = '22023';
  end if;
  if p_max_participants is not null and (p_max_participants < 1 or p_max_participants > 500) then
    raise exception 'Maximum participants must be between 1 and 500' using errcode = '22023';
  end if;

  if p_spot_id is not null then
    select name
    into v_spot_name
    from public.skate_spots
    where id::text = p_spot_id;

    if not found then
      raise exception 'Skate spot not found' using errcode = 'P0002';
    end if;
  end if;

  insert into public.skate_sessions(
    title,
    spot_id,
    spot_name,
    scheduled_time,
    description,
    creator_id,
    max_participants,
    participants
  )
  values (
    v_title,
    p_spot_id,
    v_spot_name,
    p_scheduled_time,
    v_description,
    v_user::text,
    p_max_participants,
    array[v_user::text]
  )
  returning * into v_session;

  return jsonb_build_object(
    'id', v_session.id,
    'title', v_session.title,
    'spot_id', v_session.spot_id,
    'spot_name', v_session.spot_name,
    'scheduled_time', v_session.scheduled_time,
    'description', v_session.description,
    'creator_id', v_session.creator_id,
    'max_participants', v_session.max_participants,
    'participants', v_session.participants
  );
end;
$$;

revoke execute on function public.create_skate_session(text, timestamptz, text, text, text, integer)
  from public, anon;
grant execute on function public.create_skate_session(text, timestamptz, text, text, text, integer)
  to authenticated, service_role;

create or replace function public.set_session_rsvp(
  p_session_id uuid,
  p_attending boolean
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_user_text text;
  v_participants text[];
  v_max integer;
  v_scheduled_time timestamptz;
  v_new text[];
begin
  if v_user is null then
    return jsonb_build_object('error', 'unauthorized');
  end if;
  if p_attending is null then
    return jsonb_build_object('error', 'invalid attendance state');
  end if;

  v_user_text := v_user::text;

  select participants, max_participants, scheduled_time
  into v_participants, v_max, v_scheduled_time
  from public.skate_sessions
  where id = p_session_id
  for update;

  if not found then
    return jsonb_build_object('error', 'session not found');
  end if;

  v_participants := coalesce(v_participants, '{}');

  if p_attending then
    if now() > v_scheduled_time + interval '2 hours' then
      return jsonb_build_object('error', 'session ended');
    end if;

    if v_user_text = any(v_participants) then
      v_new := v_participants;
    elsif v_max is not null and coalesce(array_length(v_participants, 1), 0) >= v_max then
      return jsonb_build_object('error', 'full');
    else
      v_new := array_append(v_participants, v_user_text);
    end if;
  else
    v_new := array_remove(v_participants, v_user_text);
  end if;

  update public.skate_sessions
  set participants = v_new
  where id = p_session_id;

  return jsonb_build_object(
    'is_attending', p_attending,
    'attendee_count', coalesce(array_length(v_new, 1), 0)
  );
end;
$$;

revoke execute on function public.set_session_rsvp(uuid, boolean) from public, anon;
grant execute on function public.set_session_rsvp(uuid, boolean) to authenticated, service_role;

-- Keep installed beta clients compatible while making repeated legacy toggle
-- calls converge on one explicit attendance state.
create or replace function public.toggle_session_rsvp(
  p_session_id uuid,
  p_user_id text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_is_attending boolean;
begin
  if auth.uid() is null or auth.uid()::text <> p_user_id then
    return jsonb_build_object('error', 'unauthorized');
  end if;

  select p_user_id = any(coalesce(participants, '{}'))
  into v_is_attending
  from public.skate_sessions
  where id = p_session_id;

  if not found then
    return jsonb_build_object('error', 'session not found');
  end if;

  return public.set_session_rsvp(p_session_id, not v_is_attending);
end;
$$;

revoke execute on function public.toggle_session_rsvp(uuid, text) from public, anon;
grant execute on function public.toggle_session_rsvp(uuid, text) to authenticated, service_role;
