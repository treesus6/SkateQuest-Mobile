-- Restore PostgREST embedding for crew_members -> profiles.
-- The existing user_id -> auth.users FK remains intact. No rows are changed.
-- Preflight (2026-11-03): 1 crew member, 0 missing profiles.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.crew_members'::regclass
      AND conname = 'crew_members_user_id_profiles_fkey'
  ) THEN
    ALTER TABLE public.crew_members
      ADD CONSTRAINT crew_members_user_id_profiles_fkey
      FOREIGN KEY (user_id)
      REFERENCES public.profiles(id)
      ON DELETE CASCADE
      NOT VALID;
  END IF;
END
$$;

ALTER TABLE public.crew_members
  VALIDATE CONSTRAINT crew_members_user_id_profiles_fkey;

NOTIFY pgrst, 'reload schema';
