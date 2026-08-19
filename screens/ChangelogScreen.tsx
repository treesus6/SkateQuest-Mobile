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
import { BookOpen, Sparkles, Wrench, AlertTriangle } from 'lucide-react-native';
import { changelogService } from '../lib/changelogService';
import ChangelogItem from '../components/ChangelogItem';
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
    const subscription = changelogService.subscribeToChangelogs(() => loadChangelogs());
    return () => subscription.unsubscribe();
  }, [loadChangelogs]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try { await loadChangelogs(); }
    catch (error) { Logger.error('Failed to refresh changelogs', error); }
    finally { setRefreshing(false); }
  }, [loadChangelogs]);

  const featureCount = changelogs.reduce((sum, item) => sum + (item.features?.length ?? 0), 0);
  const fixCount = changelogs.reduce((sum, item) => sum + (item.bug_fixes?.length ?? 0), 0);
  const issueCount = changelogs.reduce((sum, item) => sum + (item.known_issues?.length ?? 0), 0);

  if (loading && changelogs.length === 0) {
    return (
      <SafeAreaView className="flex-1 bg-[#07090D] items-center justify-center">
        <ActivityIndicator size="large" color="#D2673D" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-[#07090D]">
      <StatusBar barStyle="light-content" />
      <View className="px-5 pt-4 pb-5">
        <Text className="text-[#D2673D] text-[11px] font-black tracking-[2px]">WHAT CHANGED</Text>
        <View className="flex-row items-center gap-2 mt-1">
          <BookOpen size={22} color="#D2673D" />
          <Text className="text-white text-[30px] font-black">Changelog</Text>
        </View>
        <Text className="text-[#7B8493] text-sm mt-1">New features, fixes and known issues across SkateQuest releases.</Text>

        <View className="flex-row gap-2 mt-4">
          <View className="flex-1 bg-[#10151D] border border-[#252D39] rounded-2xl p-3">
            <Sparkles size={16} color="#C084FC" />
            <Text className="text-white text-xl font-black mt-1">{featureCount}</Text>
            <Text className="text-[#697383] text-[11px]">features</Text>
          </View>
          <View className="flex-1 bg-[#10151D] border border-[#252D39] rounded-2xl p-3">
            <Wrench size={16} color="#4ADE80" />
            <Text className="text-white text-xl font-black mt-1">{fixCount}</Text>
            <Text className="text-[#697383] text-[11px]">fixes</Text>
          </View>
          <View className="flex-1 bg-[#10151D] border border-[#252D39] rounded-2xl p-3">
            <AlertTriangle size={16} color="#FBBF24" />
            <Text className="text-white text-xl font-black mt-1">{issueCount}</Text>
            <Text className="text-[#697383] text-[11px]">known issues</Text>
          </View>
        </View>
      </View>

      {changelogs.length === 0 ? (
        <View className="flex-1 items-center justify-center px-8">
          <View className="w-16 h-16 rounded-2xl bg-[#10151D] border border-[#252D39] items-center justify-center">
            <BookOpen size={28} color="#596271" />
          </View>
          <Text className="text-white text-lg font-black mt-4">No release notes yet</Text>
          <Text className="text-[#697383] text-sm text-center mt-2">New SkateQuest releases will show here when they’re published.</Text>
        </View>
      ) : (
        <FlatList
          data={changelogs}
          keyExtractor={item => item.id}
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
          refreshControl={<RefreshControl tintColor="#D2673D" refreshing={refreshing} onRefresh={handleRefresh} />}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 28 }}
        />
      )}
    </SafeAreaView>
  );
}
