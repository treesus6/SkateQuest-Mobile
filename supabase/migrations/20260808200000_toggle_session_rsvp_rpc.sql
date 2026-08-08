-- Atomic RSVP toggle using FOR UPDATE row lock to prevent concurrent RSVP races.
-- SECURITY DEFINER bypasses the creator-only UPDATE policy on skate_sessions
-- while still validating that the caller is the target user via auth.uid() check.
create or replace function public.toggle_session_rsvp(
  p_session_id uuid,
  p_user_id text
) returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_participants    text[];
  v_max_participants integer;
  v_is_attending    boolean;
  v_new_participants text[];
  v_new_count       integer;
begin
  if auth.uid()::text != p_user_id then
    return jsonb_build_object('error', 'unauthorized');
  end if;

  select participants, max_participants
    into v_participants, v_max_participants
    from public.skate_sessions
   where id = p_session_id
     for update;

  if not found then
    return jsonb_build_object('error', 'session not found');
  end if;

  v_participants := coalesce(v_participants, '{}');
  v_is_attending := p_user_id = any(v_participants);

  if v_is_attending then
    v_new_participants := array_remove(v_participants, p_user_id);
  else
    if v_max_participants is not null
       and coalesce(array_length(v_participants, 1), 0) >= v_max_participants then
      return jsonb_build_object('error', 'full');
    end if;
    v_new_participants := v_participants || p_user_id;
  end if;

  update public.skate_sessions
     set participants = v_new_participants
   where id = p_session_id;

  v_new_count := coalesce(array_length(v_new_participants, 1), 0);
  return jsonb_build_object('is_attending', not v_is_attending, 'attendee_count', v_new_count);
end;
$$;

revoke execute on function public.toggle_session_rsvp(uuid, text) from public;
grant execute on function public.toggle_session_rsvp(uuid, text) to authenticated;
grant execute on function public.toggle_session_rsvp(uuid, text) to service_role;
