-- Keep older Android clients working without duplicating check-in data.
-- live_checkins remains the single source of truth; this view exposes the old
-- spot_id name expected by existing CheckInScreen builds.

create or replace view public.check_ins
with (security_invoker = true)
as
select
  id,
  park_id as spot_id,
  user_id,
  latitude,
  longitude,
  created_at
from public.live_checkins;

grant select, insert, update, delete on public.check_ins to authenticated;
grant select on public.check_ins to anon;
