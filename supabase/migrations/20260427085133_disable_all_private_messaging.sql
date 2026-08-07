
-- ============================================================
-- NO PRIVATE MESSAGING IN SKATEQUEST
-- All DMs disabled. Skaters connect at spots, not in DMs.
-- ============================================================

-- Block ALL new conversations from being created
DROP POLICY IF EXISTS "minors_cannot_dm_adults" ON public.conversations;
DROP POLICY IF EXISTS "users_can_create_conversations" ON public.conversations;
CREATE POLICY "no_private_messaging"
  ON public.conversations
  FOR INSERT
  TO authenticated
  WITH CHECK (false);

-- Block all new conversation members from being added
DROP POLICY IF EXISTS "minors_cannot_join_adult_dms" ON public.conversation_members;
DROP POLICY IF EXISTS "users_can_join_conversations" ON public.conversation_members;
CREATE POLICY "no_joining_conversations"
  ON public.conversation_members
  FOR INSERT
  TO authenticated
  WITH CHECK (false);

-- Block all new messages from being sent
DROP POLICY IF EXISTS "minors_cannot_message_adults" ON public.messages;
DROP POLICY IF EXISTS "users_can_send_messages" ON public.messages;
CREATE POLICY "no_sending_messages"
  ON public.messages
  FOR INSERT
  TO authenticated
  WITH CHECK (false);

-- Keep lounge messages open (public skate chat at parks is fine)
-- lounge_messages table is untouched


