-- These SECURITY DEFINER functions mutate XP, achievements, referrals, messaging, etc.
-- and were callable by the anonymous (unauthenticated) role. Every real caller in the
-- app code invokes them only after auth (user.id from an authenticated session), so
-- revoking anon execute closes the door on unauthenticated abuse without touching any
-- legitimate app flow. handle_new_user (auth trigger) and st_estimatedextent (postgis
-- internal) are intentionally excluded.
do $$
declare
  r record;
  fn_names text[] := array[
    'apply_referral_code','award_xp','bump_mission_progress',
    'create_or_get_direct_conversation','current_user_is_minor','get_level_progress',
    'get_mentorship_stats','get_referral_stats','get_sponsor_stats',
    'get_unread_message_count','increment_crew_xp','increment_fields',
    'increment_mission_progress','increment_trick_attempts','increment_user_xp',
    'increment_xp','is_shop_member','is_user_minor','mark_messages_read',
    'redeem_shop_deal','update_is_minor','update_seasonal_progress'
  ];
begin
  for r in
    select p.oid::regprocedure::text as sig
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = any(fn_names)
      and not exists (select 1 from pg_depend d where d.objid = p.oid and d.deptype = 'e')
  loop
    begin
      execute format('revoke execute on function %s from anon', r.sig);
      execute format('grant execute on function %s to authenticated', r.sig);
    exception when insufficient_privilege then
      raise notice 'skipped % (not owner)', r.sig;
    end;
  end loop;
end $$;

