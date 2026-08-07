
CREATE OR REPLACE VIEW public.spot_leaderboard
WITH (security_invoker = on)
AS
SELECT id, crew_war_id, crew_id, total_xp, rank
FROM crew_war_rankings;


