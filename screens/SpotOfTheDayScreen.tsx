import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  Share,
  Switch,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CalendarDays, Star, MessageCircle, Share2, CheckCheck, Bell, BellOff, User } from 'lucide-react-native';
import { supabase } from '../lib/supabase';

// ─── Constants ────────────────────────────────────────────────────────────────

const NOTIFY_PREF_KEY = 'skatequest_spot_of_day_notify';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Spot {
  id: string;
  name: string;
  city: string | null;
  avg_rating: number | null;
}

interface SpotOfDay {
  id: string;
  spot_id: string;
  date: string;
  description: string | null;
  spot: Spot;
}

interface Comment {
  id: string;
  spot_day_id: string;
  user_id: string;
  comment_text: string;
  created_at: string;
  username?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

function todayIso(): string {
  return new Date().toISOString().split('T')[0];
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StarRating({ rating }: { rating: number | null }) {
  const display = rating ?? 0;
  return (
    <View className="flex-row items-center gap-1">
      <Star size={15} color="#FF6B35" fill="#FF6B35" />
      <Text className="font-bold text-sm" style={{ color: '#FF6B35' }}>
        {display > 0 ? display.toFixed(1) : 'No ratings'}
      </Text>
    </View>
  );
}

function CommentBubble({ comment }: { comment: Comment }) {
  return (
    <View className="flex-row mb-4">
      <View
        className="rounded-full items-center justify-center mr-3 mt-0.5"
        style={{ width: 36, height: 36, backgroundColor: '#2a2a2a', flexShrink: 0 }}
      >
        <User size={18} color="#666" />
      </View>
      <View className="flex-1">
        <View className="flex-row items-center gap-2 mb-1">
          <Text className="text-white font-bold text-sm">
            {comment.username ?? 'Skater'}
          </Text>
          <Text className="text-xs" style={{ color: '#666' }}>
            {formatTime(comment.created_at)}
          </Text>
        </View>
        <View className="rounded-2xl rounded-tl-sm px-3 py-2" style={{ backgroundColor: '#1a1a1a' }}>
          <Text className="text-white text-sm leading-5">{comment.comment_text}</Text>
        </View>
      </View>
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function SpotOfTheDayScreen() {
  const [spotOfDay, setSpotOfDay] = useState<SpotOfDay | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [rsvpCount, setRsvpCount] = useState(0);
  const [hasRsvp, setHasRsvp] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [notifyEnabled, setNotifyEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const scrollRef = useRef<ScrollView>(null);

  // Load user + notify preference
  useEffect(() => {
    const init = async () => {
      const { data } = await supabase.auth.getUser();
      setUserId(data.user?.id ?? null);

      const pref = await AsyncStorage.getItem(NOTIFY_PREF_KEY);
      setNotifyEnabled(pref === 'true');
    };
    init();
  }, []);

  const fetchSpotOfDay = useCallback(async () => {
    setError(null);
    try {
      const today = todayIso();

      // 1. Spot of the day
      const { data: sodData, error: sodErr } = await supabase
        .from('spot_of_day')
        .select(
          `
          id,
          spot_id,
          date,
          description,
          spot:spots(id, name, city, avg_rating)
        `,
        )
        .eq('date', today)
        .maybeSingle();

      if (sodErr) throw sodErr;

      if (!sodData) {
        setLoading(false);
        setRefreshing(false);
        return;
      }

      // Flatten the joined spot (Supabase returns it as array or object)
      const spotRaw = Array.isArray(sodData.spot) ? sodData.spot[0] : sodData.spot;
      setSpotOfDay({ ...sodData, spot: spotRaw } as SpotOfDay);

      // 2. Comments
      const { data: commentData, error: commentErr } = await supabase
        .from('spot_day_comments')
        .select('id, spot_day_id, user_id, comment_text, created_at')
        .eq('spot_day_id', sodData.id)
        .order('created_at', { ascending: true });

      if (commentErr) throw commentErr;

      // Enrich with usernames
      const enriched: Comment[] = await Promise.all(
        (commentData ?? []).map(async (c) => {
          const { data: profileData } = await supabase
            .from('profiles')
            .select('username')
            .eq('id', c.user_id)
            .maybeSingle();
          return { ...c, username: profileData?.username ?? 'Skater' };
        }),
      );
      setComments(enriched);

      // 3. RSVP count
      const { count: rsvpTotal } = await supabase
        .from('spot_day_rsvps')
        .select('*', { count: 'exact', head: true })
        .eq('spot_day_id', sodData.id);

      setRsvpCount(rsvpTotal ?? 0);

      // 4. User's RSVP status
      if (userId) {
        const { data: userRsvp } = await supabase
          .from('spot_day_rsvps')
          .select('user_id')
          .eq('spot_day_id', sodData.id)
          .eq('user_id', userId)
          .maybeSingle();

        setHasRsvp(!!userRsvp);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load spot of the day';
      setError(msg);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchSpotOfDay();
  }, [fetchSpotOfDay]);

  // ── Actions ──────────────────────────────────────────────────────────────────

  const handleRsvp = async () => {
    if (!userId) {
      Alert.alert('Sign In Required', 'Sign in to RSVP for today\'s spot.');
      return;
    }
    if (!spotOfDay) return;

    if (hasRsvp) {
      // Remove RSVP
      const { error: delErr } = await supabase
        .from('spot_day_rsvps')
        .delete()
        .eq('spot_day_id', spotOfDay.id)
        .eq('user_id', userId);

      if (!delErr) {
        setHasRsvp(false);
        setRsvpCount((prev) => Math.max(0, prev - 1));
      }
    } else {
      // Add RSVP
      const { error: insertErr } = await supabase
        .from('spot_day_rsvps')
        .upsert({ spot_day_id: spotOfDay.id, user_id: userId }, { onConflict: 'spot_day_id,user_id' });

      if (!insertErr) {
        setHasRsvp(true);
        setRsvpCount((prev) => prev + 1);
      }
    }
  };

  const handleShare = async () => {
    if (!spotOfDay) return;
    try {
      await Share.share({
        title: 'Spot of the Day — SkateQuest',
        message: `Today's spot of the day on SkateQuest is ${spotOfDay.spot.name}${spotOfDay.spot.city ? ` in ${spotOfDay.spot.city}` : ''}! Check it out on SkateQuest.`,
      });
    } catch {
      // Dismissed or failed — no-op
    }
  };

  const handleSubmitComment = async () => {
    const trimmed = newComment.trim();
    if (!trimmed) return;
    if (!userId) {
      Alert.alert('Sign In Required', 'Sign in to join the discussion.');
      return;
    }
    if (!spotOfDay) return;

    setSubmitting(true);
    const { data: inserted, error: insertErr } = await supabase
      .from('spot_day_comments')
      .insert({
        spot_day_id: spotOfDay.id,
        user_id: userId,
        comment_text: trimmed,
      })
      .select('id, spot_day_id, user_id, comment_text, created_at')
      .single();

    setSubmitting(false);

    if (insertErr) {
      Alert.alert('Error', 'Could not post your comment. Please try again.');
      return;
    }

    const { data: profileData } = await supabase
      .from('profiles')
      .select('username')
      .eq('id', userId)
      .maybeSingle();

    setComments((prev) => [
      ...prev,
      { ...inserted, username: profileData?.username ?? 'Skater' },
    ]);
    setNewComment('');

    setTimeout(() => {
      scrollRef.current?.scrollToEnd({ animated: true });
    }, 200);
  };

  const handleNotifyToggle = async (val: boolean) => {
    setNotifyEnabled(val);
    await AsyncStorage.setItem(NOTIFY_PREF_KEY, val ? 'true' : 'false');
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchSpotOfDay();
  };

  // ── Loading ──
  if (loading) {
    return (
      <View className="flex-1 items-center justify-center" style={{ backgroundColor: '#0a0a0a' }}>
        <ActivityIndicator size="large" color="#FF6B35" />
        <Text className="mt-4 text-sm" style={{ color: '#666' }}>
          Loading today's spot...
        </Text>
      </View>
    );
  }

  // ── Error ──
  if (error) {
    return (
      <View className="flex-1 items-center justify-center px-6" style={{ backgroundColor: '#0a0a0a' }}>
        <CalendarDays size={48} color="#666" />
        <Text className="text-white text-lg font-bold mt-4 text-center">Couldn't load today's spot</Text>
        <Text className="mt-2 text-center text-sm" style={{ color: '#666' }}>{error}</Text>
        <TouchableOpacity
          onPress={() => { setLoading(true); fetchSpotOfDay(); }}
          className="mt-6 rounded-xl px-6 py-3"
          style={{ backgroundColor: '#FF6B35' }}
          activeOpacity={0.8}
        >
          <Text className="text-white font-bold">Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ── No spot today ──
  if (!spotOfDay) {
    return (
      <View className="flex-1 items-center justify-center px-6" style={{ backgroundColor: '#0a0a0a' }}>
        <CalendarDays size={48} color="#666" />
        <Text className="text-white text-lg font-bold mt-4 text-center">No Spot Today Yet</Text>
        <Text className="mt-2 text-center text-sm" style={{ color: '#666' }}>
          Check back soon — today's pick will be posted shortly.
        </Text>
      </View>
    );
  }

  const { spot, date, description } = spotOfDay;

  return (
    <KeyboardAvoidingView
      className="flex-1"
      style={{ backgroundColor: '#0a0a0a' }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={80}
    >
      <ScrollView
        ref={scrollRef}
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 40 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#FF6B35"
            colors={['#FF6B35']}
          />
        }
      >
        {/* Header */}
        <View className="px-4 pt-12 pb-4">
          <Text className="text-white text-2xl font-extrabold">Spot of the Day</Text>
          <Text className="text-sm mt-1" style={{ color: '#666' }}>
            {formatDate(date)}
          </Text>
        </View>

        {/* Featured Spot Card */}
        <View className="mx-4 mb-4">
          {/* Photo placeholder */}
          <View
            className="w-full rounded-t-3xl items-center justify-center"
            style={{ height: 180, backgroundColor: '#1a1a1a' }}
          >
            <CalendarDays size={48} color="#333" />
            <Text className="text-sm mt-2" style={{ color: '#444' }}>
              Spot Photo
            </Text>
          </View>

          {/* Info area */}
          <View
            className="rounded-b-3xl px-4 pt-4 pb-5"
            style={{ backgroundColor: '#1a1a1a' }}
          >
            {/* Today's Pick badge */}
            <View className="flex-row items-center mb-3">
              <View
                className="rounded-full px-3 py-1 mr-2"
                style={{ backgroundColor: '#FF6B35' }}
              >
                <Text className="text-white text-xs font-extrabold tracking-wide">
                  TODAY'S PICK
                </Text>
              </View>
              <Text className="text-xs" style={{ color: '#666' }}>
                {formatDate(date)}
              </Text>
            </View>

            <Text className="text-white text-xl font-extrabold">{spot.name}</Text>
            {spot.city && (
              <Text className="text-sm mt-0.5 mb-2" style={{ color: '#666' }}>
                {spot.city}
              </Text>
            )}

            <StarRating rating={spot.avg_rating} />

            {description ? (
              <Text className="text-sm mt-3 leading-5" style={{ color: '#aaa' }}>
                {description}
              </Text>
            ) : null}

            {/* RSVP + Share row */}
            <View className="flex-row mt-4 gap-3">
              <TouchableOpacity
                onPress={handleRsvp}
                className="flex-1 flex-row items-center justify-center rounded-xl py-3"
                style={{ backgroundColor: hasRsvp ? '#2E7D32' : '#FF6B35' }}
                activeOpacity={0.8}
              >
                <CheckCheck size={16} color="#fff" />
                <Text className="text-white font-bold text-sm ml-2">
                  {hasRsvp ? "I'm Going!" : "I'm Going!"}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleShare}
                className="rounded-xl py-3 px-4 items-center justify-center"
                style={{ backgroundColor: '#2a2a2a' }}
                activeOpacity={0.8}
              >
                <Share2 size={18} color="#FF6B35" />
              </TouchableOpacity>
            </View>

            {/* RSVP count */}
            {rsvpCount > 0 && (
              <Text className="text-sm mt-3 text-center font-semibold" style={{ color: '#90CAF9' }}>
                {rsvpCount} {rsvpCount === 1 ? 'skater is' : 'skaters are'} going today
              </Text>
            )}
          </View>
        </View>

        {/* Notify me toggle */}
        <View
          className="mx-4 mb-4 rounded-2xl px-4 py-3 flex-row items-center justify-between"
          style={{ backgroundColor: '#1a1a1a' }}
        >
          <View className="flex-row items-center gap-3">
            {notifyEnabled ? (
              <Bell size={20} color="#FF6B35" />
            ) : (
              <BellOff size={20} color="#666" />
            )}
            <View>
              <Text className="text-white font-semibold text-sm">Notify me daily</Text>
              <Text className="text-xs mt-0.5" style={{ color: '#666' }}>
                Get a push when today's spot drops
              </Text>
            </View>
          </View>
          <Switch
            value={notifyEnabled}
            onValueChange={handleNotifyToggle}
            trackColor={{ false: '#333', true: '#FF6B3580' }}
            thumbColor={notifyEnabled ? '#FF6B35' : '#666'}
          />
        </View>

        {/* Discussion */}
        <View className="px-4 mb-4">
          <View className="flex-row items-center gap-2 mb-4">
            <MessageCircle size={18} color="#FF6B35" />
            <Text className="text-white font-bold text-base">Community Discussion</Text>
            <View
              className="rounded-full px-2 py-0.5 ml-1"
              style={{ backgroundColor: '#FF6B3520' }}
            >
              <Text className="text-xs font-bold" style={{ color: '#FF6B35' }}>
                {comments.length}
              </Text>
            </View>
          </View>

          {comments.length === 0 ? (
            <View
              className="rounded-2xl p-6 items-center mb-4"
              style={{ backgroundColor: '#1a1a1a' }}
            >
              <MessageCircle size={32} color="#333" />
              <Text className="text-white font-semibold mt-3">No comments yet</Text>
              <Text className="text-xs mt-1 text-center" style={{ color: '#666' }}>
                Be the first to share your thoughts!
              </Text>
            </View>
          ) : (
            comments.map((c) => <CommentBubble key={c.id} comment={c} />)
          )}
        </View>
      </ScrollView>

      {/* Add Comment bar */}
      <View
        className="px-4 py-3 flex-row items-center gap-2"
        style={{
          backgroundColor: '#111',
          borderTopWidth: 1,
          borderTopColor: '#222',
        }}
      >
        <TextInput
          className="flex-1 rounded-2xl px-4 py-2.5 text-white text-sm"
          style={{ backgroundColor: '#1a1a1a', maxHeight: 80 }}
          placeholder="Add a comment..."
          placeholderTextColor="#555"
          value={newComment}
          onChangeText={setNewComment}
          multiline
          returnKeyType="default"
          editable={!submitting}
        />
        <TouchableOpacity
          onPress={handleSubmitComment}
          disabled={submitting || !newComment.trim()}
          className="rounded-xl px-4 py-2.5 items-center justify-center"
          style={{
            backgroundColor:
              newComment.trim() && !submitting ? '#FF6B35' : '#333',
          }}
          activeOpacity={0.8}
        >
          {submitting ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text className="text-white font-bold text-sm">Post</Text>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}
