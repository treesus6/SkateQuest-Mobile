-- Legacy direct reward/claim RPCs must not remain callable by app users.
-- Verified workflows call protected helpers as SECURITY DEFINER owners.

do $$
declare
  r record;
begin
  for r in
    select p.oid::regprocedure as signature
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname in (
        'increment_user_xp',
        'claim_bounty',
        'claim_spot',
        'claim_spot_verified',
        'update_user_streak'
      )
  loop
    execute 'revoke all on function ' || r.signature || ' from public, anon, authenticated';
  end loop;
end $$;
