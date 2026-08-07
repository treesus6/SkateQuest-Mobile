CREATE OR REPLACE VIEW public.park_local_legends
WITH (security_invoker = on)
AS
SELECT DISTINCT ON (park_id)
    park_id,
    user_id,
    sum(xp_amount) OVER (PARTITION BY park_id, user_id) AS total_xp
FROM park_xp_log
ORDER BY park_id, (sum(xp_amount) OVER (PARTITION BY park_id, user_id)) DESC;

