-- Phase 3: Messaging + Crew Chat (DIRECT MESSAGING)

CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL CHECK (type IN ('direct', 'crew')),
  name TEXT,
  crew_id UUID,
  created_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  last_message_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS conversation_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  joined_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(conversation_id, user_id)
);

CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  read_at TIMESTAMP DEFAULT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  deleted_at TIMESTAMP DEFAULT NULL
);

CREATE INDEX IF NOT EXISTS idx_conversations_crew_id ON conversations(crew_id);
CREATE INDEX IF NOT EXISTS idx_conversations_created_by ON conversations(created_by);
CREATE INDEX IF NOT EXISTS idx_conversations_last_message ON conversations(last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversation_members_conversation ON conversation_members(conversation_id);
CREATE INDEX IF NOT EXISTS idx_conversation_members_user ON conversation_members(user_id);
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_user ON messages(user_id);
CREATE INDEX IF NOT EXISTS idx_messages_read_at ON messages(read_at) WHERE read_at IS NULL;

ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view conversations they're in" ON conversations FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM conversation_members cm WHERE cm.conversation_id = conversations.id AND cm.user_id = auth.uid()));

CREATE POLICY "Users can create conversations" ON conversations FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can view conversation members" ON conversation_members FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR EXISTS (SELECT 1 FROM conversation_members cm2 WHERE cm2.conversation_id = conversation_members.conversation_id AND cm2.user_id = auth.uid()));

CREATE POLICY "Users can add members to conversations" ON conversation_members FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can view messages in their conversations" ON messages FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM conversation_members cm WHERE cm.conversation_id = messages.conversation_id AND cm.user_id = auth.uid()));

CREATE POLICY "Users can insert messages" ON messages FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND EXISTS (SELECT 1 FROM conversation_members cm WHERE cm.conversation_id = messages.conversation_id AND cm.user_id = auth.uid()) AND deleted_at IS NULL);

CREATE POLICY "Users can update their own messages" ON messages FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their own messages" ON messages FOR DELETE TO authenticated
  USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION mark_messages_read(p_conversation_id UUID, p_user_id UUID) RETURNS int
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE messages SET read_at = NOW() WHERE conversation_id = p_conversation_id AND user_id != p_user_id AND read_at IS NULL AND deleted_at IS NULL;
  SELECT 1;
$$;

CREATE OR REPLACE FUNCTION get_unread_message_count(p_user_id UUID) RETURNS int
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT COUNT(DISTINCT m.conversation_id) FROM messages m INNER JOIN conversation_members cm ON m.conversation_id = cm.conversation_id WHERE cm.user_id = p_user_id AND m.user_id != p_user_id AND m.read_at IS NULL AND m.deleted_at IS NULL;
$$;

CREATE OR REPLACE FUNCTION create_or_get_direct_conversation(p_user1_id UUID, p_user2_id UUID) RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_conversation_id UUID;
BEGIN
  SELECT c.id INTO v_conversation_id FROM conversations c WHERE c.type = 'direct' AND EXISTS (SELECT 1 FROM conversation_members cm1 WHERE cm1.conversation_id = c.id AND cm1.user_id = p_user1_id) AND EXISTS (SELECT 1 FROM conversation_members cm2 WHERE cm2.conversation_id = c.id AND cm2.user_id = p_user2_id) LIMIT 1;
  IF v_conversation_id IS NOT NULL THEN RETURN v_conversation_id; END IF;
  INSERT INTO conversations (type, created_by) VALUES ('direct', p_user1_id) RETURNING id INTO v_conversation_id;
  INSERT INTO conversation_members (conversation_id, user_id) VALUES (v_conversation_id, p_user1_id), (v_conversation_id, p_user2_id);
  RETURN v_conversation_id;
END;
$$;

CREATE OR REPLACE FUNCTION update_conversation_timestamp() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN UPDATE conversations SET last_message_at = NOW(), updated_at = NOW() WHERE id = NEW.conversation_id; RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS tr_message_update_conversation_timestamp ON messages;
CREATE TRIGGER tr_message_update_conversation_timestamp AFTER INSERT ON messages FOR EACH ROW EXECUTE FUNCTION update_conversation_timestamp();
