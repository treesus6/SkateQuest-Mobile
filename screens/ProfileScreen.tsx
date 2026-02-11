import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { Flame, Award, LogOut, Bug } from 'lucide-react-native';
import * as Sentry from '@sentry/react-native';
import { useAuthStore } from '../stores/useAuthStore';
import { profilesService } from '../lib/profilesService';
import { UserProfile } from '../types';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import LoadingSkeleton from '../components/ui/LoadingSkeleton';

interface LevelProgress {
  current_level: number;
  current_xp: number;
  xp_for_current_level: number;
  xp_for_next_level: number;
  xp_progress: number;
  xp_needed: number;
  progress_percentage: number;
}

export default function ProfileScreen() {
  const { user, signOut } = useAuthStore();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [levelProgress, setLevelProgress] = useState<LevelProgress | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = useCallback(async () => {
    if (!user) return;
    try {
      const { data, error } = await profilesService.getById(user.id);
      if (error && error.code === 'PGRST116') {
        const newProfile = {
          id: user.id,
          username: `Skater${Math.floor(Math.random() * 10000)}`,
          level: 1, xp: 0, spots_added: 0,
          challenges_completed: [], streak: 0, badges: {},
        };
        const { data: created } = await profilesService.create(newProfile);
        if (created) setProfile(created);
      } else if (!error && data) {
        setProfile(data);
        if (data.xp !== undefined) {
          const { data: prog } = await profilesService.getLevelProgress(data.xp);
          if (prog) setLevelProgress(prog);
        }
      }
    } catch (err) {
      console.error('Error loading profile:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { loadProfile(); }, [loadProfile]);

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: () => signOut() },
    ]);
  };

  if (loading) {
    return (
      <View className="flex-1 bg-brand-beige dark:bg-gray-900 p-4">
        <LoadingSkeleton height={120} className="mb-4" />
        <LoadingSkeleton height={80} className="mb-4" />
        <LoadingSkeleton height={60} className="mb-4" />
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-brand-beige dark:bg-gray-900">
      <View className="bg-brand-terracotta p-8 items-center">
        <Text className="text-3xl font-bold text-white mb-1">{profile?.username || 'Skater'}</Text>
        <Text className="text-sm text-white/80">{user?.email}</Text>
      </View>

      <Card className="flex-row mx-4 mt-4">
        {[
          { value: profile?.xp || 0, label: 'XP' },
          { value: profile?.level || 1, label: 'Level' },
          { value: profile?.spots_added || 0, label: 'Spots' },
          { value: profile?.challenges_completed?.length || 0, label: 'Challenges' },
        ].map(stat => (
          <View key={stat.label} className="flex-1 items-center">
            <Text className="text-2xl font-bold text-brand-terracotta">{stat.value}</Text>
            <Text className="text-xs text-gray-500 dark:text-gray-400 mt-1">{stat.label}</Text>
          </View>
        ))}
      </Card>

      {levelProgress && (
        <Card className="mx-4">
          <View className="flex-row justify-between items-center mb-2">
            <Text className="text-base font-bold text-gray-800 dark:text-gray-100">
              Level {levelProgress.current_level} → {levelProgress.current_level + 1}
            </Text>
            <Text className="text-sm font-semibold text-brand-terracotta">
              {levelProgress.xp_progress} / {levelProgress.xp_for_next_level - levelProgress.xp_for_current_level} XP
            </Text>
          </View>
          <View className="h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden mb-2">
            <View
              className="h-full bg-brand-green rounded-full"
              style={{ width: `${Math.min(100, levelProgress.progress_percentage)}%` }}
            />
          </View>
          <Text className="text-xs text-gray-500 dark:text-gray-400 text-center">
            {levelProgress.xp_needed} XP needed for next level
          </Text>
        </Card>
      )}

      {profile?.streak && profile.streak > 0 ? (
        <Card className="mx-4 items-center flex-row justify-center gap-2">
          <Flame color="#FF6B35" size={22} />
          <Text className="text-lg font-bold text-brand-orange">{profile.streak} Day Streak</Text>
        </Card>
      ) : null}

      {profile?.badges && Object.keys(profile.badges).length > 0 ? (
        <Card className="mx-4">
          <Text className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-2">Badges</Text>
          {Object.entries(profile.badges).map(([badge, unlocked]) =>
            unlocked ? (
              <View key={badge} className="flex-row items-center gap-2 my-1">
                <Award color="#d2673d" size={18} />
                <Text className="text-base text-gray-600 dark:text-gray-300">{badge}</Text>
              </View>
            ) : null
          )}
        </Card>
      ) : null}

      {__DEV__ && (
        <Card className="mx-4 border-2 border-yellow-400 bg-yellow-50 dark:bg-yellow-900/20">
          <View className="flex-row items-center justify-center gap-2 mb-3">
            <Bug color="#856404" size={18} />
            <Text className="text-base font-bold text-yellow-700">Sentry Debug (Dev Only)</Text>
          </View>
          <Button title="Test JS Crash" variant="ghost" size="sm" className="mb-2"
            onPress={() => { throw new Error('Sentry Test Crash'); }} />
          <Button title="Test Native Crash" variant="ghost" size="sm" className="mb-2"
            onPress={() => Sentry.nativeCrash()} />
          <Button title="Send Test Message" variant="ghost" size="sm"
            onPress={() => { Sentry.captureMessage('Test from ProfileScreen', 'info'); Alert.alert('Sent!'); }} />
        </Card>
      )}

      <View className="mx-4 mb-8">
        <Button title="Sign Out" onPress={handleSignOut} variant="danger" size="lg" />
      </View>
    </ScrollView>
  );
}
