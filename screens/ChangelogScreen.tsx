import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  SafeAreaView,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  StatusBar,
} from 'react-native';
import { BookOpen } from 'lucide-react-native';
import { changelogService } from '../lib/changelogService';
import ChangelogItem from '../components/ChangelogItem';
import Card from '../components/ui/Card';
import { Logger } from '../lib/logger';

interface ChangelogData {
  id: string;
  version: string;
  title: string;
  description?: string;
  release_notes?: string;
  features?: string[];
  bug_fixes?: string[];
  known_issues?: string[];
  release_date: string;
  is_critical: boolean;
}

export default function ChangelogScreen() {
  const [changelogs, setChangelogs] = useState<ChangelogData[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const loadChangelogs = useCallback(async () => {
    try {
      const data = await changelogService.getMostRecentChangelogs(20);
      setChangelogs(data);
    } catch (error) {
      Logger.error('Failed to load changelogs', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadChangelogs();

    const subscription = changelogService.subscribeToChangelogs(() => {
      loadChangelogs();
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [loadChangelogs]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadChangelogs();
    } catch (error) {
      Logger.error('Failed to refresh changelogs', error);
    } finally {
      setRefreshing(false);
    }
  }, [loadChangelogs]);

  if (loading && changelogs.length === 0) {
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
        <View className="flex-row items-center gap-2 mb-2">
          <BookOpen size={28} color="white" fill="white" strokeWidth={1.5} />
          <Text className="text-2xl font-bold text-white">Changelog</Text>
        </View>
        <Text className="text-white/90 text-sm">What's new in SkateQuest</Text>
      </View>

      {changelogs.length === 0 ? (
        <View className="flex-1 px-4 items-center justify-center">
          <Card>
            <View className="items-center py-8 gap-2">
              <Text className="text-lg font-semibold text-gray-900 dark:text-white">
                No releases yet
              </Text>
              <Text className="text-sm text-gray-600 dark:text-gray-400 text-center">
                Stay tuned for the first release of SkateQuest!
              </Text>
            </View>
          </Card>
        </View>
      ) : (
        <FlatList
          data={changelogs}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View className="px-4 mb-3">
              <ChangelogItem
                version={item.version}
                title={item.title}
                releaseDate={item.release_date}
                description={item.description}
                features={item.features}
                bugFixes={item.bug_fixes}
                knownIssues={item.known_issues}
                isCritical={item.is_critical}
                expanded={expandedId === item.id}
                onToggle={() => setExpandedId(expandedId === item.id ? null : item.id)}
              />
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
