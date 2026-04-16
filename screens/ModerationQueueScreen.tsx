import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  SafeAreaView,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  StatusBar,
  Pressable,
  Alert,
} from 'react-native';
import { CheckCircle, XCircle, Clock, AlertCircle } from 'lucide-react-native';
import { useAuthStore } from '../stores/useAuthStore';
import { moderationService } from '../lib/moderationService';
import Card from '../components/ui/Card';
import { Logger } from '../lib/logger';

interface PendingItem {
  id: string;
  content_type: string;
  reason_flagged: string;
  created_at: string;
}

export default function ModerationQueueScreen({ navigation: _navigation }: any) {
  const { user } = useAuthStore();
  const [queue, setQueue] = useState<PendingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  // Check if user is admin
  useEffect(() => {
    if (!user) return;
    // In a real app, check user.role === 'admin'
    setIsAdmin(true); // For demo, assume admin
  }, [user]);

  const loadQueue = useCallback(async () => {
    if (!isAdmin) return;

    try {
      const items = await moderationService.getModerationQueue(50);
      setQueue(items);
    } catch (error) {
      Logger.error('Failed to load moderation queue', error);
    } finally {
      setLoading(false);
    }
  }, [isAdmin]);

  useEffect(() => {
    loadQueue();

    // Subscribe to new items
    const subscription = moderationService.subscribeToPendingQueue(() => {
      loadQueue();
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [loadQueue]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadQueue();
    } catch (error) {
      Logger.error('Failed to refresh queue', error);
    } finally {
      setRefreshing(false);
    }
  }, [loadQueue]);

  const handleApprove = async (itemId: string) => {
    if (!user?.id) return;

    try {
      await moderationService.approveModerationItem(itemId, user.id);
      Alert.alert('Success', 'Content approved');
      await loadQueue();
    } catch (error) {
      Logger.error('Failed to approve item', error);
      Alert.alert('Error', 'Failed to approve content');
    }
  };

  const handleReject = async (itemId: string) => {
    if (!user?.id) return;

    Alert.prompt(
      'Reject Content',
      'Reason for rejection:',
      async reason => {
        if (!reason.trim()) return;

        try {
          await moderationService.rejectModerationItem(itemId, user.id, reason);
          Alert.alert('Success', 'Content rejected');
          await loadQueue();
        } catch (error) {
          Logger.error('Failed to reject item', error);
          Alert.alert('Error', 'Failed to reject content');
        }
      },
      'plain-text'
    );
  };

  if (!isAdmin) {
    return (
      <SafeAreaView className="flex-1 bg-brand-beige dark:bg-gray-900 items-center justify-center">
        <Card>
          <View className="items-center gap-3 py-6">
            <AlertCircle size={48} color="#EF4444" strokeWidth={1.5} />
            <Text className="text-lg font-semibold text-gray-900 dark:text-white">
              Access Denied
            </Text>
            <Text className="text-sm text-gray-600 dark:text-gray-400 text-center">
              This screen is for moderators only
            </Text>
          </View>
        </Card>
      </SafeAreaView>
    );
  }

  if (loading && queue.length === 0) {
    return (
      <SafeAreaView className="flex-1 bg-brand-beige dark:bg-gray-900 items-center justify-center">
        <ActivityIndicator size="large" color="#d2673d" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-brand-beige dark:bg-gray-900">
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View className="bg-brand-terracotta px-4 py-4 rounded-b-2xl mb-4">
        <Text className="text-2xl font-bold text-white mb-1">Moderation Queue</Text>
        <View className="flex-row items-center gap-2">
          <Clock size={16} color="white" strokeWidth={2} />
          <Text className="text-white/90 text-sm">{queue.length} pending items</Text>
        </View>
      </View>

      {queue.length === 0 ? (
        <View className="flex-1 px-4 items-center justify-center">
          <Card>
            <View className="items-center py-8 gap-2">
              <CheckCircle size={48} color="#22C55E" fill="#22C55E" strokeWidth={1.5} />
              <Text className="text-lg font-semibold text-gray-900 dark:text-white">
                Queue is clear!
              </Text>
              <Text className="text-sm text-gray-600 dark:text-gray-400 text-center">
                All pending content has been reviewed
              </Text>
            </View>
          </Card>
        </View>
      ) : (
        <FlatList
          data={queue}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <View className="px-4 mb-3">
              <Card>
                <View className="gap-3">
                  {/* Item type badge */}
                  <View className="flex-row items-center justify-between">
                    <View className="px-2 py-1 rounded-full bg-yellow-100 dark:bg-yellow-900/30">
                      <Text className="text-xs font-bold text-yellow-800 dark:text-yellow-300 capitalize">
                        {item.content_type}
                      </Text>
                    </View>
                    <Text className="text-xs text-gray-500 dark:text-gray-400">
                      {new Date(item.created_at).toLocaleTimeString()}
                    </Text>
                  </View>

                  {/* Reason */}
                  <View>
                    <Text className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                      Reason Flagged
                    </Text>
                    <Text className="text-sm text-gray-900 dark:text-white font-medium">
                      {item.reason_flagged}
                    </Text>
                  </View>

                  {/* Action buttons */}
                  <View className="flex-row gap-2 pt-2">
                    <Pressable
                      onPress={() => handleReject(item.id)}
                      className="flex-1 px-3 py-2 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 flex-row items-center justify-center gap-2"
                    >
                      <XCircle size={16} color="#EF4444" strokeWidth={2} />
                      <Text className="font-semibold text-red-700 dark:text-red-300">Reject</Text>
                    </Pressable>
                    <Pressable
                      onPress={() => handleApprove(item.id)}
                      className="flex-1 px-3 py-2 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 flex-row items-center justify-center gap-2"
                    >
                      <CheckCircle size={16} color="#22C55E" strokeWidth={2} />
                      <Text className="font-semibold text-green-700 dark:text-green-300">
                        Approve
                      </Text>
                    </Pressable>
                  </View>
                </View>
              </Card>
            </View>
          )}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 20 }}
        />
      )}
    </SafeAreaView>
  );
}
