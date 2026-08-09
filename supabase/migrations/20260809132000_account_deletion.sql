-- Google Play account-deletion support.
-- Deletes account-owned public data for the currently authenticated user.
-- Auth user deletion is completed by the authenticated delete-account Edge Function.

create or replace function public.delete_my_account_data(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  r record;
begin
  if auth.uid() is null or auth.uid() <> p_user_id then
    raise exception 'not authorized';
  end if;

  -- Preserve shared/community records while removing the deleted user's identity.
  update public.bounties set claimed_by = null where claimed_by = p_user_id;
  update public.challenge_completions set verified_by = null where verified_by = p_user_id;
  update public.hidden_gems set added_by = null where added_by = p_user_id;
  update public.reported_content set reviewed_by = null where reviewed_by = p_user_id;
  update public.skate_game_tricks set responder_id = null where responder_id = p_user_id;
  update public.trick_of_week set winner_id = null where winner_id = p_user_id;

  -- Delete direct account-owned rows, including legacy tables that do not have
  -- a foreign key to profiles. Identifiers come from information_schema and are
  -- safely quoted; values stay parameterized.
  for r in
    select table_name, column_name
    from information_schema.columns
    where table_schema = 'public'
      and column_name in ('user_id','created_by','uploaded_by','reported_by','purchased_by','found_by')
      and table_name <> 'profiles'
  loop
    execute format('delete from public.%I where %I::text = $1::text', r.table_name, r.column_name)
    using p_user_id;
  end loop;

  delete from public.profiles where id = p_user_id;
end;
$$;

revoke all on function public.delete_my_account_data(uuid) from public, anon;
grant execute on function public.delete_my_account_data(uuid) to authenticated;
