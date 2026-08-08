import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  RefreshControl,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { CalendarDays, MapPin, Users, Plus, X, CheckCircle, Circle } from 'lucide-react-native';
import { useRoute, RouteProp } from '../lib/useNavigation';
import { useAuthStore } from '../stores/useAuthStore';
import { supabase } from '../lib/supabase';
import { RootStackParamList } from '../types';
import { ScreenFadeIn, AnimatedListItem } from '../components/ui';

interface Session {
  id: string;
  title: string;
  spot_id: string | null;
  spot_name: string | null;
  scheduled_time: string;
  description: string | null;
  created_by: string;
  creator_username: string | null;
  attendee_count: number;
  max_attendees: number | null;
  status: 'upcoming' | 'live' | 'ended';
  is_attending: boolean;
}

interface RawSession {
  id: string;
  title: string;
  spot_id: string | null;
  scheduled_time: string;
  description: string | null;
  creator_id: string;
  max_participants: number | null;
  participants: string[] | null;
}

const STATUS_COLORS: Record<string, string> = {
  upcoming: '#6B4CE6',
  live: '#10B981',
  ended: '#9CA3AF',
};

const STATUS_LABELS: Record<string, string> = {
  upcoming: 'Upcoming',
  live: 'LIVE NOW',
  ended: 'Ended',
};

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

function getStatus(scheduledTime: string): 'upcoming' | 'live' | 'ended' {
  const sessionTime = new Date(scheduledTime);
  const now = new Date();
  const diff = sessionTime.getTime() - now.getTime();
  if (diff > 2 * 60 * 60 * 1000) return 'upcoming';
  if (diff > -2 * 60 * 60 * 1000) return 'live';
  return 'ended';
}

export default function SessionsScreen() {
  const { user } = useAuthStore();
  const route = useRoute<RouteProp<RootStackParamList, 'Sessions'>>();
  const routeParams = route.params;

  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tab, setTab] = useState<'all' | 'mine'>('all');
  const [createVisible, setCreateVisible] = useState(false);
  const [creating, setCreating] = useState(false);

  // Create form state — pre-filled from route params when coming from CheckInScreen
  const [title, setTitle] = useState('');
  const [spotName, setSpotName] = useState(routeParams?.spotName ?? '');
  const [date, setDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  });
  const [time, setTime] = useState('14:00');
  const [description, setDescription] = useState('');
  const [maxAttendees, setMaxAttendees] = useState('');

  // Open create modal once on mount if autoCreate was requested
  const initDone = useRef(false);
  useEffect(() => {
    if (initDone.current) return;
    initDone.current = true;
    if (routeParams?.autoCreate) {
      setCreateVisible(true);
    }
  }, []);

  const loadSessions = useCallback(async () => {
    if (!user?.id) return;
    try {
      const { data: rawSessions, error: sessionsError } = await supabase
        .from('skate_sessions')
        .select(
          'id, title, spot_id, scheduled_time, description, creator_id, max_participants, participants'
        )
        .order('scheduled_time', { ascending: true });

      if (sessionsError) throw sessionsError;
      if (!rawSessions?.length) {
        setSessions([]);
        return;
      }

      const typedSessions = rawSessions as RawSession[];
      const creatorIds = [...new Set(typedSessions.map(s => s.creator_id).filter(Boolean))];
      const spotIds = [
        ...new Set(typedSessions.map(s => s.spot_id).filter((v): v is string => !!v)),
      ];
      const [profilesRes, spotsRes] = await Promise.all([
        creatorIds.length
          ? supabase.from('profiles').select('id, username').in('id', creatorIds)
          : Promise.resolve({ data: [], error: null }),
        spotIds.length
          ? supabase.from('skate_spots').select('id, name').in('id', spotIds)
          : Promise.resolve({ data: [], error: null }),
      ]);

      const profileMap = new Map(
        (profilesRes.data ?? []).map((p: { id: string; username: string }) => [p.id, p.username])
      );
      const spotMap = new Map(
        (spotsRes.data ?? []).map((s: { id: string; name: string }) => [s.id, s.name])
      );

      const mapped: Session[] = typedSessions.map(s => ({
        id: s.id,
        title: s.title,
        spot_id: s.spot_id,
        spot_name: s.spot_id ? (spotMap.get(s.spot_id) ?? null) : null,
        scheduled_time: s.scheduled_time,
        description: s.description,
        created_by: s.creator_id,
        creator_username: profileMap.get(s.creator_id) ?? null,
        attendee_count: s.participants?.length ?? 0,
        max_attendees: s.max_participants,
        status: getStatus(s.scheduled_time),
        is_attending: (s.participants ?? []).includes(user.id),
      }));

      setSessions(mapped);
    } catch (err) {
      console.error('loadSessions error', err);
      Alert.alert('Could not load sessions', 'Check your connection and try again.');
    }
  }, [user?.id]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    await loadSessions();
    setRefreshing(false);
  }, [loadSessions]);

  useEffect(() => {
    setLoading(true);
    loadSessions().finally(() => setLoading(false));
  }, [loadSessions]);

  const toggleRSVP = async (session: Session) => {
    if (!user?.id) return;
    if (session.status === 'ended') {
      Alert.alert('Session ended', 'This session has already happened.');
      return;
    }
    if (
      !session.is_attending &&
      session.max_attendees !== null &&
      session.attendee_count >= session.max_attendees
    ) {
      Alert.alert('Full', 'This session is full.');
      return;
    }

    const wasAttending = session.is_attending;
    setSessions(prev =>
      prev.map(s =>
        s.id === session.id
          ? {
              ...s,
              is_attending: !wasAttending,
              attendee_count: Math.max(0, s.attendee_count + (wasAttending ? -1 : 1)),
            }
          : s
      )
    );

    try {
      const { data: rpcData, error: rpcError } = await supabase.rpc('toggle_session_rsvp', {
        p_session_id: session.id,
        p_user_id: user.id,
      });
      const result = rpcData as {
        error?: string;
        is_attending?: boolean;
        attendee_count?: number;
      } | null;
      if (rpcError || result?.error) {
        throw new Error(result?.error ?? rpcError?.message ?? 'RSVP failed');
      }
      if (result) {
        setSessions(prev =>
          prev.map(s =>
            s.id === session.id
              ? {
                  ...s,
                  is_attending: !!result.is_attending,
                  attendee_count: result.attendee_count ?? s.attendee_count,
                }
              : s
          )
        );
      }
    } catch (err) {
      console.error('toggleRSVP error', err);
      setSessions(prev =>
        prev.map(s =>
          s.id === session.id
            ? {
                ...s,
                is_attending: wasAttending,
                attendee_count: Math.max(0, s.attendee_count + (wasAttending ? 1 : -1)),
              }
            : s
        )
      );
      const msg = err instanceof Error ? err.message : '';
      if (msg === 'full') {
        Alert.alert('Full', 'This session is now full.');
      } else {
        Alert.alert('RSVP failed', 'Your RSVP was not saved. Please try again.');
      }
    }
  };

  const createSession = async () => {
    if (!user?.id) return;
    if (!title.trim()) {
      Alert.alert('Required', 'Enter a session title.');
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(new Date(`${date}T00:00:00`).getTime())) {
      Alert.alert('Invalid date', 'Use YYYY-MM-DD, for example 2026-08-08.');
      return;
    }
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) {
      Alert.alert('Invalid time', 'Use 24-hour HH:MM, for example 14:30.');
      return;
    }

    const parsedMaxAttendees = maxAttendees.trim() ? Number(maxAttendees) : null;
    if (
      parsedMaxAttendees !== null &&
      (!Number.isInteger(parsedMaxAttendees) || parsedMaxAttendees < 1)
    ) {
      Alert.alert(
        'Invalid max attendees',
        'Enter a whole number greater than 0, or leave it blank.'
      );
      return;
    }

    setCreating(true);
    try {
      let resolvedSpotId = routeParams?.spotId ?? null;
      if (!resolvedSpotId && spotName.trim()) {
        const { data: matchedSpot, error: spotError } = await supabase
          .from('skate_spots')
          .select('id')
          .ilike('name', spotName.trim())
          .limit(1)
          .maybeSingle();
        if (spotError) throw spotError;
        if (!matchedSpot) throw new Error(`No skate spot found named "${spotName.trim()}".`);
        resolvedSpotId = matchedSpot.id;
      }

      const { error } = await supabase
        .from('skate_sessions')
        .insert({
          title: title.trim(),
          spot_id: resolvedSpotId,
          scheduled_time: new Date(`${date}T${time}:00`).toISOString(),
          description: description.trim() || null,
          creator_id: user.id,
          max_participants: parsedMaxAttendees,
          participants: [user.id],
        })
        .select()
        .single();

      if (error) throw error;

      setCreateVisible(false);
      setTitle('');
      setSpotName('');
      setDescription('');
      setMaxAttendees('');
      await loadSessions();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Could not create session.';
      Alert.alert('Error', msg);
    } finally {
      setCreating(false);
    }
  };

  const displayedSessions =
    tab === 'mine' ? sessions.filter(s => s.created_by === user?.id || s.is_attending) : sessions;

  const renderSession = ({ item, index }: { item: Session; index: number }) => {
    const statusColor = STATUS_COLORS[item.status];
    const isFull = item.max_attendees !== null && item.attendee_count >= item.max_attendees;

    return (
      <AnimatedListItem index={index}>
        <View className="bg-white dark:bg-gray-800 rounded-2xl mx-4 mb-3 overflow-hidden shadow-sm">
          <View style={{ backgroundColor: statusColor }} className="h-1" />
          <View className="p-4">
            <View className="flex-row items-start justify-between mb-2">
              <View className="flex-1 mr-3">
                <Text
                  className="text-lg font-bold text-gray-800 dark:text-gray-100"
                  numberOfLines={1}
                >
                  {item.title}
                </Text>
                <Text className="text-xs text-gray-400 mt-0.5">
                  by @{item.creator_username ?? 'unknown'}
                </Text>
              </View>
              <View
                style={{ backgroundColor: statusColor + '20' }}
                className="px-2 py-1 rounded-full"
              >
                <Text style={{ color: statusColor }} className="text-xs font-bold">
                  {STATUS_LABELS[item.status]}
                </Text>
              </View>
            </View>

            <View className="gap-1.5 mb-3">
              <View className="flex-row items-center gap-2">
                <CalendarDays size={14} color="#9CA3AF" />
                <Text className="text-sm text-gray-500 dark:text-gray-400">
                  {formatDate(item.scheduled_time)} · {formatTime(item.scheduled_time)}
                </Text>
              </View>
              {item.spot_name ? (
                <View className="flex-row items-center gap-2">
                  <MapPin size={14} color="#9CA3AF" />
                  <Text className="text-sm text-gray-500 dark:text-gray-400" numberOfLines={1}>
                    {item.spot_name}
                  </Text>
                </View>
              ) : null}
              <View className="flex-row items-center gap-2">
                <Users size={14} color="#9CA3AF" />
                <Text className="text-sm text-gray-500 dark:text-gray-400">
                  {item.attendee_count} going
                  {item.max_attendees ? ` · max ${item.max_attendees}` : ''}
                  {isFull ? ' · FULL' : ''}
                </Text>
              </View>
            </View>

            {item.description ? (
              <Text className="text-sm text-gray-500 dark:text-gray-400 mb-3" numberOfLines={2}>
                {item.description}
              </Text>
            ) : null}

            {item.status !== 'ended' && (
              <TouchableOpacity
                onPress={() => toggleRSVP(item)}
                className="flex-row items-center justify-center gap-2 rounded-xl py-2.5"
                style={{
                  backgroundColor: item.is_attending
                    ? '#10B98120'
                    : isFull
                      ? '#F3F4F6'
                      : '#6B4CE620',
                }}
              >
                {item.is_attending ? (
                  <CheckCircle size={16} color="#10B981" />
                ) : (
                  <Circle size={16} color={isFull ? '#9CA3AF' : '#6B4CE6'} />
                )}
                <Text
                  className="font-semibold text-sm"
                  style={{ color: item.is_attending ? '#10B981' : isFull ? '#9CA3AF' : '#6B4CE6' }}
                >
                  {item.is_attending ? "I'm Going" : isFull ? 'Full' : "I'm In"}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </AnimatedListItem>
    );
  };

  return (
    <ScreenFadeIn>
      <View className="flex-1 bg-brand-beige dark:bg-gray-950">
        {/* Header */}
        <View className="px-4 pt-4 pb-2">
          <View className="flex-row items-center justify-between mb-3">
            <View>
              <Text className="text-3xl font-extrabold text-gray-800 dark:text-gray-100">
                Sessions
              </Text>
              <Text className="text-sm text-gray-500 dark:text-gray-400">
                Organise meetups at spots
              </Text>
            </View>
            <TouchableOpacity
              className="bg-purple-600 w-11 h-11 rounded-full items-center justify-center"
              onPress={() => setCreateVisible(true)}
            >
              <Plus size={22} color="white" />
            </TouchableOpacity>
          </View>

          <View className="flex-row bg-gray-100 dark:bg-gray-800 rounded-xl p-1 mb-3">
            {(['all', 'mine'] as const).map(t => (
              <TouchableOpacity
                key={t}
                className="flex-1 py-2 rounded-lg items-center"
                style={{ backgroundColor: tab === t ? '#6B4CE6' : 'transparent' }}
                onPress={() => setTab(t)}
              >
                <Text
                  className="font-semibold text-sm"
                  style={{ color: tab === t ? 'white' : '#9CA3AF' }}
                >
                  {t === 'all' ? 'All Sessions' : 'My Sessions'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {loading ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" color="#6B4CE6" />
          </View>
        ) : (
          <FlatList
            data={displayedSessions}
            keyExtractor={s => s.id}
            renderItem={renderSession}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
            contentContainerStyle={{ paddingBottom: 24 }}
            ListEmptyComponent={
              <View className="items-center justify-center py-16 px-6">
                <CalendarDays size={48} color="#6B4CE680" />
                <Text className="text-lg font-bold text-gray-500 dark:text-gray-400 mt-4 text-center">
                  {tab === 'mine' ? 'No sessions yet' : 'No sessions scheduled'}
                </Text>
                <Text className="text-sm text-gray-400 text-center mt-1">
                  {tab === 'mine'
                    ? 'Create one or RSVP to join a sesh'
                    : 'Be the first to organise a sesh!'}
                </Text>
                <TouchableOpacity
                  className="mt-4 bg-purple-600 px-6 py-3 rounded-full"
                  onPress={() => setCreateVisible(true)}
                >
                  <Text className="text-white font-bold">Create Session</Text>
                </TouchableOpacity>
              </View>
            }
          />
        )}
      </View>

      {/* Create Session Modal */}
      <Modal
        visible={createVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setCreateVisible(false)}
      >
        <View className="flex-1 justify-end bg-black/50">
          <View className="bg-white dark:bg-gray-900 rounded-t-3xl">
            <View className="items-center pt-3 pb-1">
              <View className="w-10 h-1 rounded-full bg-gray-300 dark:bg-gray-600" />
            </View>

            <ScrollView className="px-6" contentContainerStyle={{ paddingBottom: 40 }}>
              <View className="flex-row items-center justify-between py-4">
                <Text className="text-xl font-bold text-gray-800 dark:text-gray-100">
                  New Session
                </Text>
                <TouchableOpacity onPress={() => setCreateVisible(false)}>
                  <X size={22} color="#9CA3AF" />
                </TouchableOpacity>
              </View>

              <Text className="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-1">
                Session Title *
              </Text>
              <TextInput
                className="bg-gray-100 dark:bg-gray-800 rounded-xl px-4 py-3 text-gray-800 dark:text-gray-100 mb-4"
                placeholder="e.g. Saturday Ledge Session"
                placeholderTextColor="#9CA3AF"
                value={title}
                onChangeText={setTitle}
              />

              <Text className="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-1">
                Spot / Location
              </Text>
              <TextInput
                className="bg-gray-100 dark:bg-gray-800 rounded-xl px-4 py-3 text-gray-800 dark:text-gray-100 mb-4"
                placeholder="e.g. Downtown Plaza, Venice Beach"
                placeholderTextColor="#9CA3AF"
                value={spotName}
                onChangeText={setSpotName}
              />

              <View className="flex-row gap-3 mb-4">
                <View className="flex-1">
                  <Text className="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-1">
                    Date *
                  </Text>
                  <TextInput
                    className="bg-gray-100 dark:bg-gray-800 rounded-xl px-4 py-3 text-gray-800 dark:text-gray-100"
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor="#9CA3AF"
                    value={date}
                    onChangeText={setDate}
                    keyboardType="numeric"
                  />
                </View>
                <View className="flex-1">
                  <Text className="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-1">
                    Time *
                  </Text>
                  <TextInput
                    className="bg-gray-100 dark:bg-gray-800 rounded-xl px-4 py-3 text-gray-800 dark:text-gray-100"
                    placeholder="HH:MM"
                    placeholderTextColor="#9CA3AF"
                    value={time}
                    onChangeText={setTime}
                    keyboardType="numeric"
                  />
                </View>
              </View>

              <Text className="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-1">
                Description
              </Text>
              <TextInput
                className="bg-gray-100 dark:bg-gray-800 rounded-xl px-4 py-3 text-gray-800 dark:text-gray-100 mb-4"
                placeholder="What's the plan? Tricks to work on, vibe, etc."
                placeholderTextColor="#9CA3AF"
                value={description}
                onChangeText={setDescription}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />

              <Text className="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-1">
                Max Attendees (optional)
              </Text>
              <TextInput
                className="bg-gray-100 dark:bg-gray-800 rounded-xl px-4 py-3 text-gray-800 dark:text-gray-100 mb-6"
                placeholder="Leave blank for unlimited"
                placeholderTextColor="#9CA3AF"
                value={maxAttendees}
                onChangeText={setMaxAttendees}
                keyboardType="numeric"
              />

              <TouchableOpacity
                className="bg-purple-600 rounded-2xl py-4 items-center"
                onPress={createSession}
                disabled={creating}
              >
                {creating ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text className="text-white font-bold text-base">Create Session</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </ScreenFadeIn>
  );
}
