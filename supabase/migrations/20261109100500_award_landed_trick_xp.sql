begin;

-- Landed-trick XP award (replaces the retired increment_xp path for tricks).
--
-- Background: public.increment_xp(uuid, integer) used to pay 25 XP for a
-- landed trick (migration 20260818150000 checked user_tricks for a landed /
-- consistent trick with first_landed_at inside 15 minutes). Migration
-- 20260818152500 redefined it to pay only for verified live check-ins, and
-- migration 20260819050512 revoked execute on it from authenticated, so the
-- app's awardLandedXp() call can no longer award trick XP at all.
--
-- This function is the dedicated, server-verified replacement: it pays 25 XP
-- exactly once per landed trick, only when the trick belongs to the caller,
-- is landed or consistent, and was first landed inside the last 15 minutes.
-- The award is deduped in public.xp_reward_ledger (reward_key 'trick:<id>'),
-- the same ledger the check-in and session awards use.
create or replace function public.award_landed_trick_xp(p_trick_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user uuid := auth.uid();
  v_trick public.user_tricks%rowtype;
  v_inserted boolean := false;
begin
  if v_user is null then
    raise exception 'Authentication required';
  end if;

  select * into v_trick
  from public.user_tricks
  where id = p_trick_id
  for update;

  if not found then
    raise exception 'Trick not found';
  end if;
  if v_trick.user_id is distinct from v_user then
    raise exception 'Not authorized to modify this user''s XP';
  end if;
  if v_trick.status not in ('landed', 'consistent') then
    raise exception 'Trick is not landed';
  end if;
  if v_trick.first_landed_at is null
    or v_trick.first_landed_at < now() - interval '15 minutes' then
    raise exception 'Landed trick is outside the 15 minute award window';
  end if;

  insert into public.xp_reward_ledger(user_id, reward_key, source, xp_amount)
  values (v_user, 'trick:' || p_trick_id::text, 'trick_landed', 25)
  on conflict (user_id, reward_key) do nothing;
  get diagnostics v_inserted = row_count;

  if not v_inserted then
    return jsonb_build_object('awarded', false, 'reason', 'already_claimed');
  end if;

  perform public.increment_user_xp(v_user, 25);
  return jsonb_build_object('awarded', true, 'xp_amount', 25);
end;
$$;

revoke all on function public.award_landed_trick_xp(uuid) from public, anon;
grant execute on function public.award_landed_trick_xp(uuid) to authenticated;

commit;
