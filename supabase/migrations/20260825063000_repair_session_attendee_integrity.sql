-- Repair attendee synchronization for existing sessions and future account deletion.
-- Keep participant arrays canonical so capacity checks and RSVP writes cannot be
-- blocked by malformed or deleted profile IDs.

drop trigger if exists sync_session_attendees_from_session on public.skate_sessions;
drop trigger if exists normalize_session_participants_before_write on public.skate_sessions;

create or replace function public.normalize_session_participants()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  select coalesce(
    array_agg(valid.user_id order by valid.first_position),
    '{}'::text[]
  )
  into new.participants
  from (
    select
      profile.id::text as user_id,
      min(participant.ordinality) as first_position
    from unnest(coalesce(new.participants, '{}')) with ordinality
      as participant(user_id, ordinality)
    join public.profiles as profile
      on profile.id::text = lower(participant.user_id)
    where participant.user_id ~*
      '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
    group by profile.id
  ) as valid;

  return new;
end;
$$;

revoke execute on function public.normalize_session_participants()
  from public, anon, authenticated;

create trigger normalize_session_participants_before_write
before insert or update of participants on public.skate_sessions
for each row execute function public.normalize_session_participants();

-- Run every existing row through the canonicalizer before rebuilding the
-- relational attendee table.
update public.skate_sessions
set participants = participants;

delete from public.session_attendees as attendee
using public.skate_sessions as session
where attendee.session_id = session.id
  and not (attendee.user_id::text = any(session.participants));

insert into public.session_attendees(session_id, user_id)
select session.id, participant.user_id::uuid
from public.skate_sessions as session
cross join lateral unnest(session.participants) as participant(user_id)
on conflict (session_id, user_id) do nothing;

create or replace function public.sync_session_attendees()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.session_attendees(session_id, user_id)
  select new.id, participant.user_id::uuid
  from unnest(new.participants) as participant(user_id)
  on conflict (session_id, user_id) do nothing;

  delete from public.session_attendees
  where session_id = new.id
    and not (user_id::text = any(new.participants));

  return new;
end;
$$;

revoke execute on function public.sync_session_attendees()
  from public, anon, authenticated;

create trigger sync_session_attendees_from_session
after insert or update of participants on public.skate_sessions
for each row execute function public.sync_session_attendees();

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

  select coalesce(
    array_agg(valid.user_id order by valid.first_position),
    '{}'::text[]
  )
  into v_participants
  from (
    select
      profile.id::text as user_id,
      min(participant.ordinality) as first_position
    from unnest(coalesce(v_participants, '{}')) with ordinality
      as participant(user_id, ordinality)
    join public.profiles as profile
      on profile.id::text = lower(participant.user_id)
    where participant.user_id ~*
      '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
    group by profile.id
  ) as valid;

  if p_attending then
    if now() > v_scheduled_time + interval '2 hours' then
      return jsonb_build_object('error', 'session ended');
    end if;

    if v_user_text = any(v_participants) then
      v_new := v_participants;
    elsif v_max is not null
      and coalesce(array_length(v_participants, 1), 0) >= v_max then
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

revoke execute on function public.set_session_rsvp(uuid, boolean)
  from public, anon;
grant execute on function public.set_session_rsvp(uuid, boolean)
  to authenticated, service_role;

create or replace function public.delete_my_account_data(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  r record;
begin
  if auth.uid() is null or auth.uid() <> p_user_id then
    raise exception 'not authorized' using errcode = '42501';
  end if;

  -- Remove the account from shared session attendance before deleting its
  -- profile. The participant trigger keeps session_attendees synchronized.
  update public.skate_sessions
  set participants = array_remove(participants, p_user_id::text)
  where p_user_id::text = any(participants);

  -- Preserve shared/community records while removing the deleted user's identity.
  update public.bounties set claimed_by = null where claimed_by = p_user_id;
  update public.challenge_completions set verified_by = null where verified_by = p_user_id;
  update public.hidden_gems set added_by = null where added_by = p_user_id;
  update public.reported_content set reviewed_by = null where reviewed_by = p_user_id;
  update public.skate_game_tricks set responder_id = null where responder_id = p_user_id;
  update public.trick_of_week set winner_id = null where winner_id = p_user_id;

  for r in
    select table_name, column_name
    from information_schema.columns
    where table_schema = 'public'
      and column_name in (
        'user_id',
        'created_by',
        'uploaded_by',
        'reported_by',
        'purchased_by',
        'found_by'
      )
      and table_name <> 'profiles'
  loop
    execute pg_catalog.format(
      'delete from public.%I where %I::text = $1::text',
      r.table_name,
      r.column_name
    )
    using p_user_id;
  end loop;

  delete from public.profiles where id = p_user_id;
end;
$$;

revoke all on function public.delete_my_account_data(uuid)
  from public, anon;
grant execute on function public.delete_my_account_data(uuid)
  to authenticated;
