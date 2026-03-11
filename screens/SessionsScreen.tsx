import React, { useState, useEffect, useCallback } from 'react';
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
import {
  CalendarDays,
  MapPin,
  Users,
  Plus,
  X,
  CheckCircle,
  Circle,
} from 'lucide-react-native';
import { useAuthStore } from '../stores/useAuthStore';
import { supabase } from '../lib/supabase';
import { ScreenFadeIn, AnimatedListItem } from '../components/ui';


interface Session {
  id: string;
  title: string;
  spot_id: string | null;
  spot_name: string | null;
  date: string;
  time: string;
  description: string | null;
  created_by: string;
  creator_username: string | null;
  attendee_count: number;
  max_attendees: number | null;
  status: 'upcoming' | 'live' | 'ended';
  is_attending: boolean;
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

function formatTime(timeStr: string): string {
  const [h, m] = timeStr.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 || 12;
  return `${hour}:${String(m).padStart(2, '0')} ${ampm}`;
}

function getStatus(date: string, time: string): 'upcoming' | 'live' | 'ended' {
  const sessionTime = new Date(`${date}T${time}`);
  const now = new Date();
  const diff = sessionTime.getTime() - now.getTime();
  if (diff > 2 * 60 * 60 * 1000) return 'upcoming';
  if (diff > -2 * 60 * 60 * 1000) return 'live';
  return 'ended';
}

export default function SessionsScreen() {
  const { user } = useAuthStore();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tab, setTab] = useState<'all' | 'mine'>('all');
  const [createVisible, setCreateVisible] = useState(false);
  const [creating, setCreating] = useState(false);

  // Create form state
  const [title, setTitle] = useState('');
  const [spotName, setSpotName] = useState('');
  const [date, setDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  });
  const [time, setTime] = useState('14:00');
  const [description, setDescription] = useState('');
  const [maxAttendees, setMaxAttendees] = useState('');

  const loadSessions = useCallback(async () => {
    if (!user?.id) return;
    try {
      // Fetch sessions with attendee counts
      const { data: rawSessions } = await supabase
        .from('skate_sessions')
        .select(`
          id, title, spot_id, spot_name, date, time, description,
          created_by, max_attendees,
          profiles!skate_sessions_created_by_fkey(username)
        `)
        .order('date', { ascending: true })
        .order('time', { ascending: true });

      if (!rawSessions) return;

      // Fetch attendee counts and user's RSVPs in parallel
      const [attendeesRes, myRsvpsRes] = await Promise.all([
        supabase
          .from('session_attendees')
          .select('session_id')
          .in('session_id', rawSessions.map(s => s.id)),
        supabase
          .from('session_attendees')
          .select('session_id')
          .eq('user_id', user.id),
      ]);

      const attendeeMap: Record<string, number> = {};
      (attendeesRes.data ?? []).forEach(({ session_id }) => {
        attendeeMap[session_id] = (attendeeMap[session_id] ?? 0) + 1;
      });
      const mySessionIds = new Set((myRsvpsRes.data ?? []).map(r => r.session_id));

      const mapped: Session[] = rawSessions.map((s: any) => ({
        id: s.id,
        title: s.title,
        spot_id: s.spot_id,
        spot_name: s.spot_name,
        date: s.date,
        time: s.time,
        description: s.description,
        created_by: s.created_by,
        creator_username: s.profiles?.username ?? null,
        attendee_count: attendeeMap[s.id] ?? 0,
        max_attendees: s.max_attendees,
        status: getStatus(s.date, s.time),
        is_attending: mySessionIds.has(s.id),
      }));

      setSessions(mapped);
    } catch (err) {
      console.error('loadSessions error', err);
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
    if (!session.is_attending && session.max_attendees !== null && session.attendee_count >= session.max_attendees) {
      Alert.alert('Full', 'This session is full.');
      return;
    }

    // Optimistic update
    setSessions(prev => prev.map(s =>
      s.id === session.id
        ? { ...s, is_attending: !s.is_attending, attendee_count: s.is_attending ? s.attendee_count - 1 : s.attendee_count + 1 }
        : s
    ));

    if (session.is_attending) {
      await supabase
        .from('session_attendees')
        .delete()
        .eq('session_id', session.id)
        .eq('user_id', user.id);
    } else {
      await supabase
        .from('session_attendees')
        .insert({ session_id: session.id, user_id: user.id });
    }
  };

  const createSession = async () => {
    if (!user?.id) return;
    if (!title.trim()) { Alert.alert('Required', 'Enter a session title.'); return; }
    if (!date) { Alert.alert('Required', 'Enter a date.'); return; }
    if (!time) { Alert.alert('Required', 'Enter a time.'); return; }

    setCreating(true);
    try {
      const { data, error } = await supabase.from('skate_sessions').insert({
        title: title.trim(),
        spot_name: spotName.trim() || null,
        date,
        time,
        description: description.trim() || null,
        created_by: user.id,
        max_attendees: maxAttendees ? parseInt(maxAttendees, 10) : null,
      }).select().single();

      if (error) throw error;

      // Auto-RSVP creator
      await supabase.from('session_attendees').insert({ session_id: data.id, user_id: user.id });

      setCreateVisible(false);
      setTitle(''); setSpotName(''); setDescription(''); setMaxAttendees('');
      await loadSessions();
    } catch (err: any) {
      Alert.alert('Error', err.message ?? 'Could not create session.');
    } finally {
      setCreating(false);
    }
  };

  const displayedSessions = tab === 'mine'
    ? sessions.filter(s => s.created_by === user?.id || s.is_attending)
    : sessions;

  const renderSession = ({ item, index }: { item: Session; index: number }) => {
    const statusColor = STATUS_COLORS[item.status];
    const isFull = item.max_attendees !== null && item.attendee_count >= item.max_attendees;

    return (
      <AnimatedListItem index={index}>
        <View className="bg-white dark:bg-gray-800 rounded-2xl mx-4 mb-3 overflow-hidden shadow-sm">
          {/* Status bar */}
          <View style={{ backgroundColor: statusColor }} className="h-1" />
          <View className="p-4">
            <View className="flex-row items-start justify-between mb-2">
              <View className="flex-1 mr-3">
                <Text className="text-lg font-bold text-gray-800 dark:text-gray-100" numberOfLines={1}>
                  {item.title}
                </Text>
                <Text className="text-xs text-gray-400 mt-0.5">
                  by @{item.creator_username ?? 'unknown'}
                </Text>
              </View>
              <View style={{ backgroundColor: statusColor + '20' }} className="px-2 py-1 rounded-full">
                <Text style={{ color: statusColor }} className="text-xs font-bold">
                  {STATUS_LABELS[item.status]}
                </Text>
              </View>
            </View>

            {/* Meta info */}
            <View className="gap-1.5 mb-3">
              <View className="flex-row items-center gap-2">
                <CalendarDays size={14} color="#9CA3AF" />
                <Text className="text-sm text-gray-500 dark:text-gray-400">
                  {formatDate(item.date)} · {formatTime(item.time)}
                </Text>
              </View>
              {item.spot_name ? (
                <View className="flex-row items-center gap-2">
                  <MapPin size={14} color="#9CA3AF" />
                  <Text className="text-sm text-gray-500 dark:text-gray-400" numberOfLines={1}>{item.spot_name}</Text>
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

            {/* RSVP button */}
            {item.status !== 'ended' && (
              <TouchableOpacity
                onPress={() => toggleRSVP(item)}
                className="flex-row items-center justify-center gap-2 rounded-xl py-2.5"
                style={{ backgroundColor: item.is_attending ? '#10B98120' : isFull ? '#F3F4F6' : '#6B4CE620' }}
              >
                {item.is_attending
                  ? <CheckCircle size={16} color="#10B981" />
                  : <Circle size={16} color={isFull ? '#9CA3AF' : '#6B4CE6'} />
                }
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
              <Text className="text-3xl font-extrabold text-gray-800 dark:text-gray-100">Sessions</Text>
              <Text className="text-sm text-gray-500 dark:text-gray-400">Organise meetups at spots</Text>
            </View>
            <TouchableOpacity
              className="bg-purple-600 w-11 h-11 rounded-full items-center justify-center"
              onPress={() => setCreateVisible(true)}
            >
              <Plus size={22} color="white" />
            </TouchableOpacity>
          </View>

          {/* Tabs */}
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
                  {tab === 'mine' ? 'Create one or RSVP to join a sesh' : 'Be the first to organise a sesh!'}
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
            {/* Handle */}
            <View className="items-center pt-3 pb-1">
              <View className="w-10 h-1 rounded-full bg-gray-300 dark:bg-gray-600" />
            </View>

            <ScrollView className="px-6" contentContainerStyle={{ paddingBottom: 40 }}>
              <View className="flex-row items-center justify-between py-4">
                <Text className="text-xl font-bold text-gray-800 dark:text-gray-100">New Session</Text>
                <TouchableOpacity onPress={() => setCreateVisible(false)}>
                  <X size={22} color="#9CA3AF" />
                </TouchableOpacity>
              </View>

              <Text className="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-1">Session Title *</Text>
              <TextInput
                className="bg-gray-100 dark:bg-gray-800 rounded-xl px-4 py-3 text-gray-800 dark:text-gray-100 mb-4"
                placeholder="e.g. Saturday Ledge Session"
                placeholderTextColor="#9CA3AF"
                value={title}
                onChangeText={setTitle}
              />

              <Text className="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-1">Spot / Location</Text>
              <TextInput
                className="bg-gray-100 dark:bg-gray-800 rounded-xl px-4 py-3 text-gray-800 dark:text-gray-100 mb-4"
                placeholder="e.g. Downtown Plaza, Venice Beach"
                placeholderTextColor="#9CA3AF"
                value={spotName}
                onChangeText={setSpotName}
              />

              <View className="flex-row gap-3 mb-4">
                <View className="flex-1">
                  <Text className="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-1">Date *</Text>
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
                  <Text className="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-1">Time *</Text>
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

              <Text className="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-1">Description</Text>
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

              <Text className="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-1">Max Attendees (optional)</Text>
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
                {creating
                  ? <ActivityIndicator color="white" />
                  : <Text className="text-white font-bold text-base">Create Session</Text>
                }
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </ScreenFadeIn>
  );
}
