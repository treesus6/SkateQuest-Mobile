begin;

alter table public.xp_reward_ledger
  add column if not exists applied_at timestamptz;

update public.xp_reward_ledger
set applied_at = coalesce(applied_at, created_at)
where applied_at is null;

create index if not exists xp_reward_ledger_pending_lookup
  on public.xp_reward_ledger(user_id, xp_amount, created_at)
  where applied_at is null;

create or replace function private.enforce_ledgered_profile_xp()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op='UPDATE'
     and coalesce(new.xp,0) > coalesce(old.xp,0)
     and auth.uid() is not null
     and coalesce(current_setting('skatequest.allow_xp_increase', true),'') <> '1' then
    raise exception 'XP increases must be applied through the reward ledger';
  end if;
  return new;
end;
$$;
revoke all on function private.enforce_ledgered_profile_xp() from public,anon,authenticated;
grant execute on function private.enforce_ledgered_profile_xp() to service_role;

drop trigger if exists trg_enforce_ledgered_profile_xp on public.profiles;
create trigger trg_enforce_ledgered_profile_xp
before update of xp on public.profiles
for each row execute function private.enforce_ledgered_profile_xp();

create or replace function public.increment_user_xp(p_user_id uuid, p_xp_amount integer)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_ledger_id uuid;
begin
  if p_user_id is null then raise exception 'User is required'; end if;
  if p_xp_amount is null or p_xp_amount <= 0 or p_xp_amount > 500 then
    raise exception 'XP increment must be between 1 and 500';
  end if;

  select x.id into v_ledger_id
  from public.xp_reward_ledger x
  where x.user_id=p_user_id
    and x.xp_amount=p_xp_amount
    and x.applied_at is null
  order by x.created_at desc
  limit 1
  for update skip locked;

  if v_ledger_id is null then
    raise exception 'No unapplied reward-ledger entry matches this XP increment';
  end if;

  update public.xp_reward_ledger
  set applied_at=now()
  where id=v_ledger_id and applied_at is null;
  if not found then raise exception 'Reward-ledger entry was already consumed'; end if;

  perform set_config('skatequest.allow_xp_increase','1',true);
  update public.profiles
  set xp=coalesce(xp,0)+p_xp_amount,
      level=public.calculate_level(coalesce(xp,0)+p_xp_amount),
      updated_at=now()
  where id=p_user_id;
  if not found then raise exception 'Profile not found'; end if;
  perform set_config('skatequest.allow_xp_increase','0',true);
end;
$$;
revoke all on function public.increment_user_xp(uuid,integer) from public,anon,authenticated;
grant execute on function public.increment_user_xp(uuid,integer) to service_role;

commit;
