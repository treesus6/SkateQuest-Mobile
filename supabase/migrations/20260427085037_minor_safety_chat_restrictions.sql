
-- Auto-update is_minor when birthdate is set
CREATE OR REPLACE FUNCTION public.update_is_minor()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.birthdate IS NOT NULL THEN
    NEW.is_minor := (EXTRACT(YEAR FROM AGE(NEW.birthdate)) < 18);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_update_is_minor ON public.profiles;
CREATE TRIGGER trg_update_is_minor
  BEFORE INSERT OR UPDATE OF birthdate ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_is_minor();

-- Helper: check if a specific user is a minor
CREATE OR REPLACE FUNCTION public.is_user_minor(user_id uuid)
RETURNS boolean AS $$
  SELECT COALESCE(is_minor, false) FROM public.profiles WHERE id = user_id;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Helper: check if current logged-in user is a minor
CREATE OR REPLACE FUNCTION public.current_user_is_minor()
RETURNS boolean AS $$
  SELECT COALESCE(is_minor, false) FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Block minors from creating direct message conversations
DROP POLICY IF EXISTS "minors_cannot_dm_adults" ON public.conversations;
CREATE POLICY "minors_cannot_dm_adults"
  ON public.conversations
  FOR INSERT
  TO authenticated
  WITH CHECK (
    type != 'direct'
    OR NOT public.current_user_is_minor()
  );

-- Block minors from being added to DMs with adults
DROP POLICY IF EXISTS "minors_cannot_join_adult_dms" ON public.conversation_members;
CREATE POLICY "minors_cannot_join_adult_dms"
  ON public.conversation_members
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (SELECT type FROM public.conversations WHERE id = conversation_id) != 'direct'
    OR NOT public.current_user_is_minor()
    OR (public.is_user_minor(user_id) = true)
  );

-- Block minors from messaging adults in DMs
DROP POLICY IF EXISTS "minors_cannot_message_adults" ON public.messages;
CREATE POLICY "minors_cannot_message_adults"
  ON public.messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (SELECT c.type FROM public.conversations c WHERE c.id = conversation_id) != 'direct'
    OR NOT public.current_user_is_minor()
    OR NOT EXISTS (
      SELECT 1 FROM public.conversation_members cm
      JOIN public.profiles p ON p.id = cm.user_id
      WHERE cm.conversation_id = messages.conversation_id
      AND COALESCE(p.is_minor, false) = false
      AND cm.user_id != auth.uid()
    )
  );

-- Performance index
CREATE INDEX IF NOT EXISTS idx_profiles_is_minor ON public.profiles(is_minor) WHERE is_minor = true;


