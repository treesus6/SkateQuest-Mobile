import { supabase } from './supabase';
import { Logger } from './logger';
import { ServiceError } from './serviceError';

interface Conversation {
  id: string;
  type: 'direct' | 'crew';
  name?: string;
  crew_id?: string;
  created_by: string;
  last_message_at: string;
  created_at: string;
  updated_at: string;
}

interface Message {
  id: string;
  conversation_id: string;
  user_id: string;
  content: string;
  read_at?: string;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
}

interface ConversationMember {
  id: string;
  conversation_id: string;
  user_id: string;
  joined_at: string;
}

export const messagesService = {
  // =========================================================================
  // CONVERSATIONS
  // =========================================================================

  async getConversations(userId: string): Promise<Conversation[]> {
    try {
      const { data, error } = await supabase
        .from('conversations')
        .select('*')
        .order('last_message_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      Logger.error('messagesService.getConversations failed', error);
      throw new ServiceError('Failed to load conversations', 'CONVERSATIONS_FETCH_FAILED', error);
    }
  },

  async getConversationById(conversationId: string): Promise<Conversation> {
    try {
      const { data, error } = await supabase
        .from('conversations')
        .select('*')
        .eq('id', conversationId)
        .single();

      if (error) throw error;
      if (!data) throw new Error('Conversation not found');
      return data;
    } catch (error) {
      Logger.error('messagesService.getConversationById failed', error);
      throw new ServiceError('Failed to load conversation', 'CONVERSATION_FETCH_FAILED', error);
    }
  },

  async createDirectConversation(userId: string, recipientId: string): Promise<string> {
    try {
      const { data, error } = await supabase.rpc('create_or_get_direct_conversation', {
        p_user1_id: userId,
        p_user2_id: recipientId,
      });

      if (error) throw error;
      if (!data) throw new Error('Failed to create conversation');
      return data;
    } catch (error) {
      Logger.error('messagesService.createDirectConversation failed', error);
      throw new ServiceError(
        'Failed to create conversation',
        'DIRECT_CONVERSATION_CREATE_FAILED',
        error
      );
    }
  },

  async createCrewConversation(
    crewId: string,
    name: string,
    userId: string
  ): Promise<Conversation> {
    try {
      const { data, error } = await supabase
        .from('conversations')
        .insert({
          type: 'crew',
          name,
          crew_id: crewId,
          created_by: userId,
        })
        .select('*')
        .single();

      if (error) throw error;
      if (!data) throw new Error('Failed to create conversation');

      // Add crew members to conversation
      const crewMembers = await supabase
        .from('crew_members')
        .select('user_id')
        .eq('crew_id', crewId);

      if (crewMembers.data) {
        await supabase
          .from('conversation_members')
          .insert(
            crewMembers.data.map((member) => ({
              conversation_id: data.id,
              user_id: member.user_id,
            }))
          );
      }

      return data;
    } catch (error) {
      Logger.error('messagesService.createCrewConversation failed', error);
      throw new ServiceError(
        'Failed to create crew conversation',
        'CREW_CONVERSATION_CREATE_FAILED',
        error
      );
    }
  },

  async getConversationMembers(conversationId: string): Promise<ConversationMember[]> {
    try {
      const { data, error } = await supabase
        .from('conversation_members')
        .select('*')
        .eq('conversation_id', conversationId);

      if (error) throw error;
      return data || [];
    } catch (error) {
      Logger.error('messagesService.getConversationMembers failed', error);
      throw new ServiceError(
        'Failed to load conversation members',
        'CONVERSATION_MEMBERS_FETCH_FAILED',
        error
      );
    }
  },

  // =========================================================================
  // MESSAGES
  // =========================================================================

  async getMessages(
    conversationId: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<Message[]> {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) throw error;
      return (data || []).reverse(); // Reverse to show oldest first
    } catch (error) {
      Logger.error('messagesService.getMessages failed', error);
      throw new ServiceError('Failed to load messages', 'MESSAGES_FETCH_FAILED', error);
    }
  },

  async sendMessage(conversationId: string, userId: string, content: string): Promise<Message> {
    try {
      const { data, error } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          user_id: userId,
          content,
        })
        .select('*')
        .single();

      if (error) throw error;
      if (!data) throw new Error('Failed to send message');
      return data;
    } catch (error) {
      Logger.error('messagesService.sendMessage failed', error);
      throw new ServiceError('Failed to send message', 'MESSAGE_SEND_FAILED', error);
    }
  },

  async updateMessage(messageId: string, content: string): Promise<Message> {
    try {
      const { data, error } = await supabase
        .from('messages')
        .update({ content, updated_at: new Date().toISOString() })
        .eq('id', messageId)
        .select('*')
        .single();

      if (error) throw error;
      if (!data) throw new Error('Failed to update message');
      return data;
    } catch (error) {
      Logger.error('messagesService.updateMessage failed', error);
      throw new ServiceError('Failed to update message', 'MESSAGE_UPDATE_FAILED', error);
    }
  },

  async deleteMessage(messageId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('messages')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', messageId);

      if (error) throw error;
    } catch (error) {
      Logger.error('messagesService.deleteMessage failed', error);
      throw new ServiceError('Failed to delete message', 'MESSAGE_DELETE_FAILED', error);
    }
  },

  async markMessagesAsRead(conversationId: string, userId: string): Promise<void> {
    try {
      const { error } = await supabase.rpc('mark_messages_read', {
        p_conversation_id: conversationId,
        p_user_id: userId,
      });

      if (error) throw error;
    } catch (error) {
      Logger.error('messagesService.markMessagesAsRead failed', error);
      throw new ServiceError('Failed to mark messages as read', 'MARK_READ_FAILED', error);
    }
  },

  async getUnreadCount(userId: string): Promise<number> {
    try {
      const { data, error } = await supabase.rpc('get_unread_message_count', {
        p_user_id: userId,
      });

      if (error) throw error;
      return data || 0;
    } catch (error) {
      Logger.error('messagesService.getUnreadCount failed', error);
      throw new ServiceError('Failed to get unread count', 'UNREAD_COUNT_FAILED', error);
    }
  },

  // =========================================================================
  // REAL-TIME SUBSCRIPTIONS
  // =========================================================================

  subscribeToConversations(
    userId: string,
    onUpdate: (payload: any) => void
  ): { unsubscribe: () => void } {
    const subscription = supabase
      .channel(`user_conversations:${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'conversations',
        },
        onUpdate
      )
      .subscribe();

    return {
      unsubscribe: () => {
        subscription.unsubscribe();
      },
    };
  },

  subscribeToMessages(
    conversationId: string,
    onUpdate: (payload: any) => void
  ): { unsubscribe: () => void } {
    const subscription = supabase
      .channel(`conversation_messages:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        onUpdate
      )
      .subscribe();

    return {
      unsubscribe: () => {
        subscription.unsubscribe();
      },
    };
  },

  subscribeToConversationMembers(
    conversationId: string,
    onUpdate: (payload: any) => void
  ): { unsubscribe: () => void } {
    const subscription = supabase
      .channel(`conversation_members:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'conversation_members',
          filter: `conversation_id=eq.${conversationId}`,
        },
        onUpdate
      )
      .subscribe();

    return {
      unsubscribe: () => {
        subscription.unsubscribe();
      },
    };
  },
};
