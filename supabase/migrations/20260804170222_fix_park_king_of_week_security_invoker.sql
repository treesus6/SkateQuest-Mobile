CREATE OR REPLACE VIEW public.park_king_of_week
WITH (security_invoker = on)
AS
SELECT DISTINCT ON (park_id)
    park_id,
    user_id,
    sum(xp_amount) OVER (PARTITION BY park_id, user_id) AS weekly_xp
FROM park_xp_log
WHERE created_at > (now() - '7 days'::interval)
ORDER BY park_id, (sum(xp_amount) OVER (PARTITION BY park_id, user_id)) DESC;

