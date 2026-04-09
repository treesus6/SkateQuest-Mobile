import { create } from 'zustand';
import { messagesService } from '../lib/messagesService';
import { Logger } from '../lib/logger';

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

interface MessagingState {
  // Data
  conversations: Conversation[];
  currentConversation: Conversation | null;
  messages: Message[];
  unreadCount: number;
  loading: boolean;
  sending: boolean;

  // Actions
  initialize: (userId: string) => () => void;
  setCurrentConversation: (conversation: Conversation | null) => void;
  loadConversations: (userId: string) => Promise<void>;
  loadMessages: (conversationId: string) => Promise<void>;
  sendMessage: (conversationId: string, userId: string, content: string) => Promise<void>;
  markAsRead: (conversationId: string, userId: string) => Promise<void>;
  updateUnreadCount: (userId: string) => Promise<void>;
  addMessage: (message: Message) => void;
  updateConversations: (conversations: Conversation[]) => void;
}

export const useMessagingStore = create<MessagingState>((set, get) => ({
  conversations: [],
  currentConversation: null,
  messages: [],
  unreadCount: 0,
  loading: false,
  sending: false,

  setCurrentConversation: (conversation) => {
    set({ currentConversation: conversation });
  },

  loadConversations: async (userId: string) => {
    set({ loading: true });
    try {
      const conversations = await messagesService.getConversations(userId);
      set({ conversations });
    } catch (error) {
      Logger.error('useMessagingStore.loadConversations failed', error);
    } finally {
      set({ loading: false });
    }
  },

  loadMessages: async (conversationId: string) => {
    set({ loading: true });
    try {
      const messages = await messagesService.getMessages(conversationId);
      set({ messages });
    } catch (error) {
      Logger.error('useMessagingStore.loadMessages failed', error);
    } finally {
      set({ loading: false });
    }
  },

  sendMessage: async (conversationId: string, userId: string, content: string) => {
    set({ sending: true });
    try {
      const message = await messagesService.sendMessage(conversationId, userId, content);
      set((state) => ({
        messages: [...state.messages, message],
      }));
    } catch (error) {
      Logger.error('useMessagingStore.sendMessage failed', error);
    } finally {
      set({ sending: false });
    }
  },

  markAsRead: async (conversationId: string, userId: string) => {
    try {
      await messagesService.markMessagesAsRead(conversationId, userId);
      await get().updateUnreadCount(userId);
    } catch (error) {
      Logger.error('useMessagingStore.markAsRead failed', error);
    }
  },

  updateUnreadCount: async (userId: string) => {
    try {
      const unreadCount = await messagesService.getUnreadCount(userId);
      set({ unreadCount });
    } catch (error) {
      Logger.error('useMessagingStore.updateUnreadCount failed', error);
    }
  },

  addMessage: (message: Message) => {
    set((state) => ({
      messages: [...state.messages, message],
    }));
  },

  updateConversations: (conversations: Conversation[]) => {
    set({ conversations });
  },

  initialize: (userId: string) => {
    return (() => {
      // Load initial data
      get().loadConversations(userId).catch((error) => {
        Logger.error('Failed to load conversations on init', error);
      });

      get().updateUnreadCount(userId).catch((error) => {
        Logger.error('Failed to update unread count on init', error);
      });

      // Subscribe to conversation changes
      const conversationSub = messagesService.subscribeToConversations(userId, () => {
        get().loadConversations(userId).catch((error) => {
          Logger.error('Real-time conversation update failed', error);
        });
      });

      // Cleanup function
      return () => {
        conversationSub.unsubscribe();
      };
    })();
  },
}));
