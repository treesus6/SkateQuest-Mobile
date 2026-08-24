-- Keep rating ownership and identity fields immutable from client table calls.
-- The rate_spot RPC and RLS policies still allow each skater to add, update,
-- or remove their own one-per-spot rating.

REVOKE INSERT, UPDATE ON TABLE public.spot_ratings FROM authenticated;

GRANT INSERT (
  spot_id,
  user_id,
  potential,
  difficulty,
  quality
) ON TABLE public.spot_ratings TO authenticated;

GRANT UPDATE (
  potential,
  difficulty,
  quality,
  updated_at
) ON TABLE public.spot_ratings TO authenticated;
