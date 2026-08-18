-- Trick of the Week has its own submissions/votes tables. Keep voting atomic and
-- idempotent so retries or double taps cannot inflate totals.

create or replace function public.vote_trick_of_week(p_submission_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_vote_count integer;
begin
  if v_user_id is null then
    raise exception 'authentication required';
  end if;

  if not exists (
    select 1 from public.trick_of_week_submissions s where s.id = p_submission_id
  ) then
    raise exception 'submission not found';
  end if;

  insert into public.trick_of_week_votes (user_id, submission_id)
  values (v_user_id, p_submission_id)
  on conflict (user_id, submission_id) do nothing;

  select count(*)::integer
    into v_vote_count
  from public.trick_of_week_votes
  where submission_id = p_submission_id;

  update public.trick_of_week_submissions
  set votes = v_vote_count
  where id = p_submission_id;

  return jsonb_build_object(
    'success', true,
    'submission_id', p_submission_id,
    'votes', v_vote_count
  );
end;
$$;

revoke all on function public.vote_trick_of_week(uuid) from public;
revoke all on function public.vote_trick_of_week(uuid) from anon;
grant execute on function public.vote_trick_of_week(uuid) to authenticated;
