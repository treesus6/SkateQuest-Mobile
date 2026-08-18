begin;

create table if not exists public.xp_reward_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  reward_key text not null,
  source text not null,
  xp_amount integer not null check (xp_amount > 0 and xp_amount <= 500),
  created_at timestamptz not null default now(),
  unique (user_id, reward_key)
);

alter table public.xp_reward_ledger enable row level security;
drop policy if exists "users_view_own_xp_rewards" on public.xp_reward_ledger;
create policy "users_view_own_xp_rewards" on public.xp_reward_ledger
for select to authenticated using (user_id = auth.uid());
revoke all on public.xp_reward_ledger from anon;
revoke insert, update, delete on public.xp_reward_ledger from authenticated;
grant select on public.xp_reward_ledger to authenticated;

create or replace function public.guard_profile_progression_fields()
returns trigger language plpgsql security invoker set search_path = public, pg_temp as $$
begin
  if current_user not in ('postgres', 'service_role', 'supabase_admin') then
    if tg_op = 'INSERT' then
      new.xp := 0;
      new.level := 1;
    elsif tg_op = 'UPDATE' then
      if new.xp is distinct from old.xp or new.level is distinct from old.level then
        raise exception 'XP and level are server-managed and cannot be edited directly';
      end if;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_guard_profile_progression_fields on public.profiles;
create trigger trg_guard_profile_progression_fields
before insert or update on public.profiles
for each row execute function public.guard_profile_progression_fields();
revoke all on function public.guard_profile_progression_fields() from public, anon, authenticated;

commit;
