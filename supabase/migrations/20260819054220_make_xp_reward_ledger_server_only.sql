begin;

revoke insert,update,delete on public.xp_reward_ledger from anon,authenticated;
grant select on public.xp_reward_ledger to authenticated;

drop policy if exists "users_insert_own_xp_rewards" on public.xp_reward_ledger;
drop policy if exists "users_update_own_xp_rewards" on public.xp_reward_ledger;
drop policy if exists "users_delete_own_xp_rewards" on public.xp_reward_ledger;

commit;
