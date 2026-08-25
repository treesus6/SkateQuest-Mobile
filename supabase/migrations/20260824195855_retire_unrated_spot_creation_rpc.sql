-- Retire the legacy spot-creation RPC because it does not collect the
-- required potential, difficulty, and quality ratings. Spot creation now uses
-- create_spot_with_rating; optional photos attach through add_spot_photo.

REVOKE EXECUTE ON FUNCTION public.create_spot_with_photo(
  text,
  double precision,
  double precision,
  text,
  text[],
  text[],
  text,
  text,
  text,
  integer
) FROM authenticated;
