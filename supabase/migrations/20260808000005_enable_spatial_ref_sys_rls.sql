-- Enable RLS on PostGIS spatial_ref_sys and allow public read.
-- This closes the remaining Security Advisor item documented in
-- 20260719000001_security_hardening.sql.

ALTER TABLE public.spatial_ref_sys ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public read spatial_ref_sys" ON public.spatial_ref_sys;

CREATE POLICY "public read spatial_ref_sys"
  ON public.spatial_ref_sys
  FOR SELECT
  TO public
  USING (true);
