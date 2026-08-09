-- Lock down check_rate_limit so anonymous callers cannot spoof arbitrary user/IP identities.
-- The mobile app currently has no unauthenticated call sites for this RPC.

revoke execute on function public.check_rate_limit(uuid, inet, text, integer, integer) from public, anon;
grant execute on function public.check_rate_limit(uuid, inet, text, integer, integer) to authenticated, service_role;
