import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, Alert, TouchableOpacity } from 'react-native';
import { Flame, Award, Bug, Trophy, Bell, Share2, MessageSquare, History, UserCheck, CalendarDays, Map } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
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
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { user, signOut } = useAuthStore();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [levelProgress, setLevelProgress] = useState<LevelProgress | null>(null);
  const [loading, setLoading] = useState(true);

  const targetUserId = route.params?.userId || user?.id;
  const isOwnProfile = targetUserId === user?.id;

  const loadProfile = useCallback(async () => {
    if (!targetUserId) return;
    try {
      const { data, error } = await profilesService.getById(targetUserId);
      if (error && error.code === 'PGRST116') {
        if (isOwnProfile) {
          Alert.alert(
            'Profile Missing',
            'We couldn\'t find your profile. Please try signing out and back in, or contact support.',
            [{ text: 'Sign Out', onPress: () => signOut() }]
          );
        } else {
          Alert.alert('Error', 'User profile not found');
          navigation.goBack();
        }
      } else if (!error && data) {
        setProfile(data);
        if (data.xp !== undefined) {
          const { data: prog, error: progError } = await profilesService.getLevelProgress(data.xp);
          if (progError) {
            console.error('Error fetching level progress:', progError);
          } else if (prog) {
            setLevelProgress(prog);
          }
        }
      }
    } catch (err) {
      console.error('Error loading profile:', err);
    } finally {
      setLoading(false);
    }
  }, [targetUserId, isOwnProfile]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

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
        {isOwnProfile && <Text className="text-sm text-white/80">{user?.email}</Text>}
        {!isOwnProfile && (
          <TouchableOpacity 
            className="mt-4 bg-white/20 px-6 py-2 rounded-full flex-row items-center gap-2"
            onPress={() => navigation.navigate('CallOuts', { targetId: profile?.id, targetUsername: profile?.username })}
          >
            <Crosshair color="white" size={18} />
            <Text className="text-white font-bold">Call Out</Text>
          </TouchableOpacity>
        )}
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
              {levelProgress.xp_progress} /{' '}
              {levelProgress.xp_for_next_level - levelProgress.xp_for_current_level} XP
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

      <Card className="mx-4 p-0 overflow-hidden">
        {[
          { label: 'Achievements', icon: Trophy, screen: 'Achievements', color: '#fbbf24' },
          { label: 'Notifications', icon: Bell, screen: 'Notifications', color: '#3b82f6' },
          { label: 'Messages', icon: MessageSquare, screen: 'Messages', color: '#10b981' },
          { label: 'Live Check-ins', icon: UserCheck, screen: 'LiveCheckIn', color: '#f97316' },
          { label: 'Seasonal Events', icon: CalendarDays, screen: 'SeasonalEvents', color: '#ef4444' },
          { label: 'The Scene', icon: Map, screen: 'Scene', color: '#d2673d' },
          { label: 'Skate Passport', icon: History, screen: 'SkatePassport', color: '#6366f1' },
          { label: 'Invite Friends', icon: Share2, screen: 'Referral', color: '#a855f7' },
          { label: 'What\'s New', icon: History, screen: 'Changelog', color: '#6b7280' },
        ].map((item, i) => (
          <TouchableOpacity
            key={i}
            className={`flex-row items-center p-4 border-b border-gray-100 dark:border-gray-800`}
            onPress={() => navigation.navigate(item.screen)}
          >
            <item.icon color={item.color} size={20} />
            <Text className="flex-1 ml-3 text-base font-semibold text-gray-800 dark:text-gray-100">{item.label}</Text>
            <Text className="text-gray-400">›</Text>
          </TouchableOpacity>
        ))}
      </Card>

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



      <View className="mx-4 mb-8">
        <Button title="Sign Out" onPress={handleSignOut} variant="danger" size="lg" />
      </View>
    </ScrollView>
  );
}
