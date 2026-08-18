-- Compatibility overload for older clients that call increment_xp with
-- { user_id, amount } instead of { p_user_id, p_xp_amount }.
-- New code should use the canonical p_* argument names.

create or replace function public.increment_xp(
  user_id uuid,
  amount integer,
  legacy_compat boolean default true
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  perform public.increment_xp(p_user_id => user_id, p_xp_amount => amount);
end;
$$;

revoke all on function public.increment_xp(uuid, integer, boolean) from public;
grant execute on function public.increment_xp(uuid, integer, boolean) to authenticated;
