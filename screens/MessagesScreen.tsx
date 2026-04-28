import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  Alert,
  SafeAreaView,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TextInput,
  StatusBar,
} from 'react-native';
import { Plus, Send, ArrowLeft } from 'lucide-react-native';
import { useAuthStore } from '../stores/useAuthStore';
import { useMessagingStore } from '../stores/useMessagingStore';
import { messagesService } from '../lib/messagesService';
import ConversationItem from '../components/ConversationItem';
import MessageBubble from '../components/MessageBubble';
import Card from '../components/ui/Card';
import { Logger } from '../lib/logger';

interface DetailViewProps {
  conversationId: string;
  conversationName: string;
  onBack: () => void;
}

function ConversationDetailView({ conversationId, conversationName, onBack }: DetailViewProps) {
  const { user } = useAuthStore();
  const { messages, loading, sending, markAsRead } = useMessagingStore();
  const [messageText, setMessageText] = useState('');
  const [localMessages, setLocalMessages] = useState(messages);

  useEffect(() => {
    if (!user?.id) return;
    messagesService
      .getMessages(conversationId)
      .then(setLocalMessages)
      .catch(error => {
        Logger.error('Failed to load messages', error);
      });
    markAsRead(conversationId, user.id).catch(error => {
      Logger.error('Failed to mark as read', error);
    });
  }, [conversationId, user?.id]);

  useEffect(() => {
    const subscription = messagesService.subscribeToMessages(conversationId, () => {
      messagesService
        .getMessages(conversationId)
        .then(setLocalMessages)
        .catch(error => {
          Logger.error('Real-time message update failed', error);
        });
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [conversationId]);

  const handleSendMessage = async () => {
    if (!messageText.trim() || !user?.id) return;

    const content = messageText;
    setMessageText('');

    try {
      await messagesService.sendMessage(conversationId, user.id, content);
    } catch (error) {
      Logger.error('Failed to send message', error);
      setMessageText(content); // Restore text on error
    }
  };

  return (
    <View className="flex-1 bg-white dark:bg-gray-900">
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View className="bg-brand-terracotta px-4 py-3 flex-row items-center gap-3">
        <Pressable onPress={onBack} hitSlop={8}>
          <ArrowLeft size={24} color="white" strokeWidth={2} />
        </Pressable>
        <Text className="text-lg font-bold text-white flex-1">{conversationName}</Text>
      </View>

      {/* Messages List */}
      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#d2673d" />
        </View>
      ) : localMessages.length === 0 ? (
        <View className="flex-1 items-center justify-center px-4">
          <Text className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            No messages yet
          </Text>
          <Text className="text-sm text-gray-600 dark:text-gray-400 text-center">
            Start the conversation by sending a message
          </Text>
        </View>
      ) : (
        <ScrollView
          className="flex-1 px-4 py-3"
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => {
            /* Scroll to bottom on new messages */
          }}
        >
          {localMessages.map(message => (
            <MessageBubble
              key={message.id}
              content={message.content}
              isSender={message.user_id === user?.id}
              timestamp={message.created_at}
              isRead={!!message.read_at}
            />
          ))}
        </ScrollView>
      )}

      {/* Message Input */}
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View className="flex-row items-center gap-2 px-4 py-3 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
          <TextInput
            className="flex-1 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2 rounded-full text-base"
            placeholder="Type a message..."
            placeholderTextColor="#999"
            value={messageText}
            onChangeText={setMessageText}
            multiline
            maxLength={1000}
            editable={!sending}
          />
          <Pressable
            onPress={handleSendMessage}
            disabled={!messageText.trim() || sending}
            className={`p-2 rounded-full ${
              messageText.trim() && !sending
                ? 'bg-brand-terracotta'
                : 'bg-gray-300 dark:bg-gray-600'
            }`}
            hitSlop={8}
          >
            <Send size={20} color="white" strokeWidth={2} />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

export default function MessagesScreen({ navigation }: any) {
  const { user } = useAuthStore();
  const {
    conversations,
    currentConversation,
    loading,
    setCurrentConversation,
    loadConversations,
    initialize,
  } = useMessagingStore();
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (!user?.id) return;

    const cleanup = initialize(user.id);
    return cleanup;
  }, [user?.id, initialize]);

  const handleRefresh = useCallback(async () => {
    if (!user?.id) return;
    setRefreshing(true);
    try {
      await loadConversations(user.id);
    } catch (error) {
      Logger.error('Failed to refresh conversations', error);
    } finally {
      setRefreshing(false);
    }
  }, [user?.id, loadConversations]);

  const handleCreateConversation = async () => {
    // TODO: navigate to user search/select screen
    // For now, show a coming-soon message
    Alert.alert('Start Conversation', 'Search for a skater to message:\n\nThis feature is coming soon — for now use crew chat or find skaters on the map.', [{ text: 'OK' }]);
  };

  if (currentConversation) {
    return (
      <ConversationDetailView
        conversationId={currentConversation.id}
        conversationName={currentConversation.name || 'Direct Message'}
        onBack={() => setCurrentConversation(null)}
      />
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-brand-beige dark:bg-gray-900">
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View className="bg-brand-terracotta px-4 py-4 rounded-b-2xl mb-4 flex-row items-center justify-between">
        <View>
          <Text className="text-2xl font-bold text-white">Messages</Text>
          <Text className="text-white/90 text-sm">Your conversations</Text>
        </View>
        <Pressable
          onPress={handleCreateConversation}
          className="w-10 h-10 rounded-full bg-white/20 items-center justify-center"
          hitSlop={8}
        >
          <Plus size={20} color="white" strokeWidth={2} />
        </Pressable>
      </View>

      {loading && conversations.length === 0 ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#d2673d" />
        </View>
      ) : conversations.length === 0 ? (
        <View className="flex-1 px-4 items-center justify-center">
          <Card>
            <View className="items-center py-8 gap-3">
              <Text className="text-lg font-semibold text-gray-900 dark:text-white">
                No conversations yet
              </Text>
              <Text className="text-sm text-gray-600 dark:text-gray-400 text-center">
                Start a direct message or join a crew to chat with other skaters
              </Text>
              <Pressable
                onPress={handleCreateConversation}
                className="mt-4 px-4 py-2 bg-brand-terracotta rounded-full"
              >
                <Text className="text-white font-semibold">Start a conversation</Text>
              </Pressable>
            </View>
          </Card>
        </View>
      ) : (
        <FlatList
          data={conversations}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <ConversationItem
              id={item.id}
              type={item.type}
              displayName={item.name || 'Direct Message'}
              lastMessageTime={item.last_message_at}
              onPress={() => setCurrentConversation(item)}
            />
          )}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}
