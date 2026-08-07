-- These policies were written as PERMISSIVE, which under Postgres RLS is always
-- OR'd with other permissive policies -- a PERMISSIVE (false) policy blocks nothing.
-- Their names ("deny_*", "no_*") and crew_territories' own table comment
-- ("RLS enabled and locked down... provide membership table... before allowing
-- app access") make the intent clear: these were meant to actually block the
-- action. RESTRICTIVE policies are AND'd with the permissive set, so this makes
-- them actually enforce the block.

DROP POLICY "no_joining_conversations" ON public.conversation_members;
CREATE POLICY "no_joining_conversations" ON public.conversation_members
    AS RESTRICTIVE FOR INSERT TO authenticated WITH CHECK (false);

DROP POLICY "no_private_messaging" ON public.conversations;
CREATE POLICY "no_private_messaging" ON public.conversations
    AS RESTRICTIVE FOR INSERT TO authenticated WITH CHECK (false);

DROP POLICY "no_sending_messages" ON public.messages;
CREATE POLICY "no_sending_messages" ON public.messages
    AS RESTRICTIVE FOR INSERT TO authenticated WITH CHECK (false);

DROP POLICY "deny_insert_all" ON public.crew_territories;
CREATE POLICY "deny_insert_all" ON public.crew_territories
    AS RESTRICTIVE FOR INSERT TO anon, authenticated WITH CHECK (false);

DROP POLICY "deny_select_all" ON public.crew_territories;
CREATE POLICY "deny_select_all" ON public.crew_territories
    AS RESTRICTIVE FOR SELECT TO anon, authenticated USING (false);

DROP POLICY "deny_update_all" ON public.crew_territories;
CREATE POLICY "deny_update_all" ON public.crew_territories
    AS RESTRICTIVE FOR UPDATE TO anon, authenticated USING (false) WITH CHECK (false);


