import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  Modal,
  Alert,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { Crown, Users, UserPlus, X, Search, Zap, Trophy, LogOut } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Card from '../components/ui/Card';
import { AnimatedListItem, ScreenFadeIn } from '../components/ui';
import { EmptyStates } from '../components/EmptyState';
import { useAuthStore } from '../stores/useAuthStore';
import { supabase } from '../lib/supabase';
import { RootStackParamList } from '../types';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface CrewMember {
  id: string;
  user_id: string;
  role: 'owner' | 'member';
  joined_at: string;
  profiles: {
    username: string;
    xp: number;
    level: number;
  } | null;
}

interface CrewData {
  id: string;
  name: string;
  description: string;
  member_count: number;
  total_xp: number;
  created_by: string;
}

export default function CrewScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { user } = useAuthStore();
  const [crew, setCrew] = useState<CrewData | null>(null);
  const [members, setMembers] = useState<CrewMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [inviteVisible, setInviteVisible] = useState(false);
  const [searchUsername, setSearchUsername] = useState('');
  const [searchResults, setSearchResults] = useState<{ id: string; username: string; xp: number }[]>([]);
  const [searching, setSearching] = useState(false);
  const [inviting, setInviting] = useState<string | null>(null);

  const loadCrew = useCallback(async () => {
    if (!user?.id) return;
    try {
      // Find user's crew membership
      const { data: membership } = await supabase
        .from('crew_members')
        .select('crew_id, role, joined_at')
        .eq('user_id', user.id)
        .single();

      if (!membership) {
        setCrew(null);
        setMembers([]);
        return;
      }

      // Load crew details
      const { data: crewData } = await supabase
        .from('crews')
        .select('*')
        .eq('id', membership.crew_id)
        .single();

      // Load all members with profiles
      const { data: memberData } = await supabase
        .from('crew_members')
        .select('id, user_id, role, joined_at, profiles(username, xp, level)')
        .eq('crew_id', membership.crew_id)
        .order('joined_at', { ascending: true });

      setCrew(crewData ?? null);
      setMembers((memberData as unknown as CrewMember[]) ?? []);
    } catch (err) {
      console.error('loadCrew error', err);
    }
  }, [user?.id]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    await loadCrew();
    setRefreshing(false);
  }, [loadCrew]);

  useEffect(() => {
    setLoading(true);
    loadCrew().finally(() => setLoading(false));
  }, [loadCrew]);

  const searchUsers = async (query: string) => {
    setSearchUsername(query);
    if (query.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    const { data } = await supabase
      .from('profiles')
      .select('id, username, xp')
      .ilike('username', `%${query.trim()}%`)
      .neq('id', user?.id ?? '')
      .limit(10);
    // Filter out existing members
    const existingIds = new Set(members.map(m => m.user_id));
    setSearchResults((data ?? []).filter(p => !existingIds.has(p.id)));
    setSearching(false);
  };

  const inviteUser = async (profileId: string, username: string) => {
    if (!crew) return;
    setInviting(profileId);
    try {
      const { error } = await supabase.from('crew_members').insert({
        crew_id: crew.id,
        user_id: profileId,
        role: 'member',
        joined_at: new Date().toISOString(),
      });
      if (error) throw error;

      // Increment member count
      await supabase
        .from('crews')
        .update({ member_count: (crew.member_count ?? 0) + 1 })
        .eq('id', crew.id);

      Alert.alert('Added!', `${username} has been added to ${crew.name}.`);
      setSearchResults(prev => prev.filter(p => p.id !== profileId));
      await loadCrew();
    } catch (err: any) {
      Alert.alert('Error', err.message ?? 'Could not add member.');
    } finally {
      setInviting(null);
    }
  };

  const removeMember = async (memberId: string, username: string) => {
    if (!crew || !user?.id) return;
    const myRole = members.find(m => m.user_id === user.id)?.role;
    if (myRole !== 'owner') {
      Alert.alert('No permission', 'Only the crew owner can remove members.');
      return;
    }
    Alert.alert('Remove Member', `Remove ${username} from the crew?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          await supabase.from('crew_members').delete().eq('id', memberId);
          await supabase
            .from('crews')
            .update({ member_count: Math.max(0, (crew.member_count ?? 1) - 1) })
            .eq('id', crew.id);
          await loadCrew();
        },
      },
    ]);
  };

  const leaveCrew = async () => {
    if (!user?.id || !crew) return;
    const myMembership = members.find(m => m.user_id === user.id);
    if (!myMembership) return;
    if (myMembership.role === 'owner' && members.length > 1) {
      Alert.alert('Owner cannot leave', 'Transfer ownership or disband the crew first.');
      return;
    }
    Alert.alert('Leave Crew', `Leave ${crew.name}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Leave',
        style: 'destructive',
        onPress: async () => {
          await supabase.from('crew_members').delete().eq('id', myMembership.id);
          setCrew(null);
          setMembers([]);
        },
      },
    ]);
  };

  const isOwner = members.find(m => m.user_id === user?.id)?.role === 'owner';

  const renderMember = ({ item, index }: { item: CrewMember; index: number }) => {
    const username = item.profiles?.username ?? 'Unknown';
    const xp = item.profiles?.xp ?? 0;
    const level = item.profiles?.level ?? 1;
    const isMe = item.user_id === user?.id;

    return (
      <AnimatedListItem index={index}>
        <Card>
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center gap-3 flex-1">
              <View className="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-900 items-center justify-center">
                <Text className="text-purple-700 dark:text-purple-300 font-bold text-sm">
                  {username.slice(0, 2).toUpperCase()}
                </Text>
              </View>
              <View className="flex-1">
                <View className="flex-row items-center gap-2">
                  <Text className="text-base font-bold text-gray-800 dark:text-gray-100">
                    {username}{isMe ? ' (You)' : ''}
                  </Text>
                  {item.role === 'owner' && <Crown color="#FFD700" size={14} />}
                </View>
                <View className="flex-row items-center gap-3 mt-0.5">
                  <View className="flex-row items-center gap-1">
                    <Zap size={12} color="#6B4CE6" />
                    <Text className="text-xs text-gray-500 dark:text-gray-400">{xp.toLocaleString()} XP</Text>
                  </View>
                  <View className="flex-row items-center gap-1">
                    <Trophy size={12} color="#F59E0B" />
                    <Text className="text-xs text-gray-500 dark:text-gray-400">Lvl {level}</Text>
                  </View>
                </View>
              </View>
            </View>
            {isOwner && !isMe && (
              <TouchableOpacity
                onPress={() => removeMember(item.id, username)}
                className="p-2"
              >
                <X size={16} color="#9CA3AF" />
              </TouchableOpacity>
            )}
          </View>
        </Card>
      </AnimatedListItem>
    );
  };

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-brand-beige dark:bg-gray-950">
        <ActivityIndicator size="large" color="#6B4CE6" />
      </View>
    );
  }

  if (!crew) {
    return (
      <ScreenFadeIn>
        <View className="flex-1 p-6 bg-brand-beige dark:bg-gray-950 items-center justify-center gap-4">
          <Users color="#6B4CE6" size={56} />
          <Text className="text-2xl font-extrabold text-gray-800 dark:text-gray-100 text-center">
            You're not in a crew yet
          </Text>
          <Text className="text-base text-gray-500 dark:text-gray-400 text-center">
            Join or create a crew to skate together, battle for spots, and earn XP as a team.
          </Text>
          <TouchableOpacity
            className="bg-purple-600 px-8 py-3 rounded-full"
            onPress={() => navigation.navigate('Crews')}
          >
            <Text className="text-white font-bold text-base">Find a Crew</Text>
          </TouchableOpacity>
        </View>
      </ScreenFadeIn>
    );
  }

  return (
    <ScreenFadeIn>
      <View className="flex-1 bg-brand-beige dark:bg-gray-950">
        {/* Header */}
        <View className="px-4 pt-4 pb-2">
          <View className="flex-row items-center justify-between mb-1">
            <View className="flex-row items-center gap-2 flex-1">
              <Users color="#6B4CE6" size={24} />
              <Text className="text-2xl font-extrabold text-gray-800 dark:text-gray-100" numberOfLines={1}>
                {crew.name}
              </Text>
            </View>
            <TouchableOpacity onPress={leaveCrew} className="p-2">
              <LogOut size={20} color="#9CA3AF" />
            </TouchableOpacity>
          </View>
          {crew.description ? (
            <Text className="text-sm text-gray-500 dark:text-gray-400 mb-2">{crew.description}</Text>
          ) : null}

          {/* Stats row */}
          <View className="flex-row gap-3 mb-4">
            <View className="flex-1 bg-white dark:bg-gray-800 rounded-xl p-3 items-center">
              <Text className="text-xl font-bold text-purple-600">{crew.member_count}</Text>
              <Text className="text-xs text-gray-500 dark:text-gray-400">Members</Text>
            </View>
            <View className="flex-1 bg-white dark:bg-gray-800 rounded-xl p-3 items-center">
              <Text className="text-xl font-bold text-yellow-500">{(crew.total_xp ?? 0).toLocaleString()}</Text>
              <Text className="text-xs text-gray-500 dark:text-gray-400">Crew XP</Text>
            </View>
            <View className="flex-1 bg-white dark:bg-gray-800 rounded-xl p-3 items-center">
              <Text className="text-xl font-bold text-orange-500">{members.length}</Text>
              <Text className="text-xs text-gray-500 dark:text-gray-400">Active</Text>
            </View>
          </View>

          {/* Invite button (owner only) */}
          {isOwner && (
            <TouchableOpacity
              className="flex-row items-center justify-center gap-2 bg-purple-600 rounded-xl py-3 mb-2"
              onPress={() => setInviteVisible(true)}
            >
              <UserPlus size={18} color="white" />
              <Text className="text-white font-bold">Invite a Homie</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Member list */}
        <FlatList
          data={members}
          keyExtractor={item => item.id}
          renderItem={renderMember}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
          ListHeaderComponent={
            <Text className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-2">
              {members.length} member{members.length !== 1 ? 's' : ''}
            </Text>
          }
          ListEmptyComponent={<EmptyStates.NoCrews />}
        />
      </View>

      {/* Invite Modal */}
      <Modal
        visible={inviteVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setInviteVisible(false)}
      >
        <View className="flex-1 justify-end bg-black/50">
          <View className="bg-white dark:bg-gray-900 rounded-t-3xl p-6 max-h-3/4">
            <View className="flex-row items-center justify-between mb-4">
              <Text className="text-xl font-bold text-gray-800 dark:text-gray-100">Invite a Homie</Text>
              <TouchableOpacity onPress={() => { setInviteVisible(false); setSearchUsername(''); setSearchResults([]); }}>
                <X size={22} color="#9CA3AF" />
              </TouchableOpacity>
            </View>

            <View className="flex-row items-center bg-gray-100 dark:bg-gray-800 rounded-xl px-3 mb-4">
              <Search size={16} color="#9CA3AF" />
              <TextInput
                className="flex-1 py-3 px-2 text-gray-800 dark:text-gray-100"
                placeholder="Search by username..."
                placeholderTextColor="#9CA3AF"
                value={searchUsername}
                onChangeText={searchUsers}
                autoFocus
                autoCapitalize="none"
              />
              {searching && <ActivityIndicator size="small" color="#6B4CE6" />}
            </View>

            {searchResults.length === 0 && searchUsername.length >= 2 && !searching && (
              <Text className="text-center text-gray-400 py-4">No users found</Text>
            )}

            <FlatList
              data={searchResults}
              keyExtractor={item => item.id}
              renderItem={({ item }) => (
                <View className="flex-row items-center justify-between py-3 border-b border-gray-100 dark:border-gray-800">
                  <View>
                    <Text className="font-semibold text-gray-800 dark:text-gray-100">{item.username}</Text>
                    <Text className="text-xs text-gray-400">{item.xp.toLocaleString()} XP</Text>
                  </View>
                  <TouchableOpacity
                    className="bg-purple-600 px-4 py-2 rounded-full"
                    onPress={() => inviteUser(item.id, item.username)}
                    disabled={inviting === item.id}
                  >
                    {inviting === item.id
                      ? <ActivityIndicator size="small" color="white" />
                      : <Text className="text-white font-semibold text-sm">Add</Text>
                    }
                  </TouchableOpacity>
                </View>
              )}
            />
          </View>
        </View>
      </Modal>
    </ScreenFadeIn>
  );
}
