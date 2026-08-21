import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import {
  CalendarDays,
  Check,
  ChevronRight,
  MapPin,
  MessageCircle,
  Share2,
  Star,
  Users,
} from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/useAuthStore';
import { useNavigation } from '../lib/useNavigation';

const INK = '#07080B';
const PAPER = '#F6F0E5';
const ORANGE = '#E36D3F';
const ACID = '#D9F34A';
const BLUE = '#72A9FF';

interface Spot {
  id: string;
  name: string;
  rating: number | null;
  image_url: string | null;
  difficulty: string | null;
  spot_type: string | null;
  tricks: string[] | null;
}

interface SpotOfDay {
  id: string;
  spot_id: string;
  date: string;
  spot: Spot;
}

interface CommentRow {
  id: string;
  spot_id: string;
  user_id: string;
  content: string;
  created_at: string;
  username?: string;
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function formatTime(value: string) {
  return new Date(value).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

export default function SpotOfTheDayScreen() {
  const navigation = useNavigation<any>();
  const user = useAuthStore(state => state.user);
  const [pick, setPick] = useState<SpotOfDay | null>(null);
  const [comments, setComments] = useState<CommentRow[]>([]);
  const [rsvpCount, setRsvpCount] = useState(0);
  const [hasRsvp, setHasRsvp] = useState(false);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [savingComment, setSavingComment] = useState(false);
  const [savingRsvp, setSavingRsvp] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const { data: sod, error: sodError } = await supabase
        .from('spot_of_day')
        .select(`
          id,
          spot_id,
          date,
          spot:skate_spots(id, name, rating, image_url, difficulty, spot_type, tricks)
        `)
        .eq('date', todayIso())
        .maybeSingle();
      if (sodError) throw sodError;

      if (!sod) {
        setPick(null);
        setComments([]);
        setRsvpCount(0);
        setHasRsvp(false);
        return;
      }

      const rawSpot = Array.isArray((sod as any).spot) ? (sod as any).spot[0] : (sod as any).spot;
      if (!rawSpot) throw new Error('Today’s pick points to a spot that no longer exists.');
      const nextPick = { ...(sod as any), spot: rawSpot } as SpotOfDay;
      setPick(nextPick);

      const { data: commentRows, error: commentsError } = await supabase
        .from('spot_comments')
        .select('id, spot_id, user_id, content, created_at')
        .eq('spot_id', nextPick.spot_id)
        .order('created_at', { ascending: true })
        .limit(100);
      if (commentsError) throw commentsError;

      const userIds = [...new Set((commentRows ?? []).map(row => row.user_id).filter(Boolean))];
      const usernames = new Map<string, string>();
      if (userIds.length) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, username')
          .in('id', userIds);
        (profiles ?? []).forEach(profile => usernames.set(profile.id, profile.username || 'Skater'));
      }
      setComments(
        (commentRows ?? []).map(row => ({
          ...row,
          username: usernames.get(row.user_id) || 'Skater',
        })) as CommentRow[]
      );

      const { count, error: countError } = await supabase
        .from('spot_of_day_rsvps')
        .select('id', { count: 'exact', head: true })
        .eq('spot_of_day_id', nextPick.id);
      if (countError) throw countError;
      setRsvpCount(count ?? 0);

      if (user?.id) {
        const { data: ownRsvp, error: ownError } = await supabase
          .from('spot_of_day_rsvps')
          .select('id')
          .eq('spot_of_day_id', nextPick.id)
          .eq('user_id', user.id)
          .maybeSingle();
        if (ownError) throw ownError;
        setHasRsvp(Boolean(ownRsvp));
      } else {
        setHasRsvp(false);
      }
    } catch (loadError: any) {
      setError(loadError?.message ?? 'Could not load Spot of the Day.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.id]);

  useEffect(() => {
    void load();
  }, [load]);

  const toggleRsvp = async () => {
    if (!user?.id || !pick) {
      Alert.alert('Sign in required', 'Sign in to say you’re skating today.');
      return;
    }

    try {
      setSavingRsvp(true);
      if (hasRsvp) {
        const { error: deleteError } = await supabase
          .from('spot_of_day_rsvps')
          .delete()
          .eq('spot_of_day_id', pick.id)
          .eq('user_id', user.id);
        if (deleteError) throw deleteError;
        setHasRsvp(false);
        setRsvpCount(value => Math.max(0, value - 1));
      } else {
        const { error: insertError } = await supabase
          .from('spot_of_day_rsvps')
          .insert({ spot_of_day_id: pick.id, user_id: user.id });
        if (insertError) throw insertError;
        setHasRsvp(true);
        setRsvpCount(value => value + 1);
      }
    } catch (rsvpError: any) {
      Alert.alert('RSVP not saved', rsvpError?.message ?? 'Try again.');
    } finally {
      setSavingRsvp(false);
    }
  };

  const postComment = async () => {
    const content = comment.trim();
    if (!content || !pick) return;
    if (!user?.id) {
      Alert.alert('Sign in required', 'Sign in to join the spot discussion.');
      return;
    }

    try {
      setSavingComment(true);
      const { data, error: insertError } = await supabase
        .from('spot_comments')
        .insert({ spot_id: pick.spot_id, user_id: user.id, content })
        .select('id, spot_id, user_id, content, created_at')
        .single();
      if (insertError) throw insertError;
      const { data: profile } = await supabase
        .from('profiles')
        .select('username')
        .eq('id', user.id)
        .maybeSingle();
      setComments(rows => [
        ...rows,
        { ...(data as CommentRow), username: profile?.username || 'Skater' },
      ]);
      setComment('');
    } catch (commentError: any) {
      Alert.alert('Comment not posted', commentError?.message ?? 'Try again.');
    } finally {
      setSavingComment(false);
    }
  };

  const share = async () => {
    if (!pick) return;
    await Share.share({ message: `Today’s SkateQuest spot is ${pick.spot.name}. Who’s skating?` });
  };

  if (loading) {
    return (
      <SafeAreaView style={s.loading} edges={['top']}>
        <View style={s.loadingStamp}><MapPin color={INK} size={30} strokeWidth={2.8} /></View>
        <ActivityIndicator size="large" color={ORANGE} />
        <Text style={s.loadingText}>PULLING TODAY’S REAL SPOT</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <ScrollView
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              void load();
            }}
            tintColor={ORANGE}
          />
        }
        contentContainerStyle={s.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={s.heroIntro}>
          <View style={s.orangeSlash} />
          <View style={s.acidSlash} />
          <View style={s.heroTopRow}>
            <View style={s.heroStamp}>
              <MapPin color={INK} size={27} strokeWidth={2.8} />
            </View>
            <View style={s.todayChip}>
              <CalendarDays color={INK} size={12} strokeWidth={3} />
              <Text style={s.todayChipText}>TODAY ONLY</Text>
            </View>
          </View>
          <Text style={s.eyebrow}>ONE REAL SPOT • ONE DAY • ONE SESSION THREAD</Text>
          <Text style={s.title}>SPOT OF{`\n`}THE DAY.</Text>
          <Text style={s.subtitle}>See the pick, mark that you’re going, and use the live session thread to link up.</Text>
        </View>

        {error ? (
          <View style={s.errorBox}>
            <Text style={s.errorTitle}>TODAY’S PICK COULD NOT LOAD</Text>
            <Text style={s.errorText}>{error}</Text>
          </View>
        ) : null}

        {!pick ? (
          <View style={s.emptyCard}>
            <View style={s.emptyStamp}><MapPin color={INK} size={30} strokeWidth={2.8} /></View>
            <Text style={s.emptyTitle}>NO PICK POSTED TODAY</Text>
            <Text style={s.emptyText}>Nothing is fabricated here. When a real Spot of the Day is selected, it will appear here.</Text>
          </View>
        ) : (
          <>
            <View style={s.featureCard}>
              <View style={s.mediaFrame}>
                {pick.spot.image_url ? (
                  <Image
                    source={{ uri: pick.spot.image_url }}
                    style={s.spotImage}
                    contentFit="cover"
                    transition={180}
                  />
                ) : (
                  <View style={s.noImage}>
                    <MapPin color={PAPER} size={35} strokeWidth={2.5} />
                    <Text style={s.noImageText}>NO PHOTO UPLOADED</Text>
                  </View>
                )}

                <View style={s.featureBadge}>
                  <Text style={s.featureBadgeText}>TODAY’S PICK</Text>
                </View>
                {pick.spot.rating != null ? (
                  <View style={s.ratingSticker}>
                    <Star color={INK} fill={INK} size={14} strokeWidth={1.5} />
                    <Text style={s.ratingText}>{Number(pick.spot.rating).toFixed(1)}</Text>
                  </View>
                ) : null}
              </View>

              <View style={s.spotTicket}>
                <Text style={s.spotKicker}>FEATURED SESSION SPOT</Text>
                <Text style={s.spotName}>{pick.spot.name}</Text>
                <Text style={s.spotMeta}>
                  {[pick.spot.spot_type, pick.spot.difficulty]
                    .filter(Boolean)
                    .join(' • ') || 'Skate spot'}
                </Text>

                {pick.spot.tricks?.length ? (
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={s.tagsRow}
                  >
                    {pick.spot.tricks.slice(0, 8).map(trick => (
                      <View key={trick} style={s.tag}>
                        <Text style={s.tagText}>{trick.toUpperCase()}</Text>
                      </View>
                    ))}
                  </ScrollView>
                ) : null}

                <View style={s.sessionRow}>
                  <View style={s.goingBlock}>
                    <Users color={INK} size={17} strokeWidth={2.8} />
                    <Text style={s.goingValue}>{rsvpCount}</Text>
                    <Text style={s.goingLabel}>GOING</Text>
                  </View>

                  <TouchableOpacity
                    style={[s.rsvpButton, hasRsvp && s.rsvpButtonActive]}
                    disabled={savingRsvp}
                    onPress={() => void toggleRsvp()}
                  >
                    {savingRsvp ? (
                      <ActivityIndicator color={INK} size="small" />
                    ) : hasRsvp ? (
                      <Check color={INK} size={17} strokeWidth={3} />
                    ) : (
                      <MapPin color={INK} size={17} strokeWidth={2.8} />
                    )}
                    <Text style={s.rsvpText}>{hasRsvp ? 'I’M GOING' : 'SKATE TODAY'}</Text>
                  </TouchableOpacity>

                  <TouchableOpacity style={s.shareButton} onPress={() => void share()}>
                    <Share2 color={INK} size={18} strokeWidth={2.8} />
                  </TouchableOpacity>
                </View>

                <Pressable
                  style={s.openButton}
                  onPress={() => navigation.navigate('SpotDetail', { spotId: pick.spot_id })}
                >
                  <Text style={s.openText}>OPEN FULL SPOT</Text>
                  <ChevronRight color={INK} size={17} strokeWidth={3} />
                </Pressable>
              </View>
            </View>

            <View style={s.threadHeader}>
              <View>
                <Text style={s.threadKicker}>LIVE SESSION THREAD</Text>
                <Text style={s.threadTitle}>WHO’S PULLING UP?</Text>
              </View>
              <View style={s.commentCount}>
                <MessageCircle color={INK} size={15} strokeWidth={2.8} />
                <Text style={s.commentCountText}>{comments.length}</Text>
              </View>
            </View>

            <View style={s.commentComposer}>
              <TextInput
                value={comment}
                onChangeText={setComment}
                placeholder="Conditions? Meet-up time? Who’s skating?"
                placeholderTextColor="#777D87"
                style={s.commentInput}
                multiline
                maxLength={500}
              />
              <TouchableOpacity
                style={[s.postButton, (!comment.trim() || savingComment) && s.disabled]}
                disabled={!comment.trim() || savingComment}
                onPress={() => void postComment()}
              >
                {savingComment ? (
                  <ActivityIndicator color={INK} size="small" />
                ) : (
                  <Text style={s.postText}>POST</Text>
                )}
              </TouchableOpacity>
            </View>

            {comments.length === 0 ? (
              <View style={s.noComments}>
                <MessageCircle color={ORANGE} size={24} strokeWidth={2.5} />
                <Text style={s.noCommentsTitle}>NO SESSION TALK YET</Text>
                <Text style={s.noCommentsText}>Be the first to say when you’re heading there.</Text>
              </View>
            ) : null}

            {comments.map((row, index) => (
              <View key={row.id} style={[s.commentCard, index % 2 === 1 && s.commentTilt]}>
                <View style={s.avatar}>
                  <Text style={s.avatarText}>{(row.username || 'S').slice(0, 1).toUpperCase()}</Text>
                </View>
                <View style={s.commentCopy}>
                  <View style={s.commentTop}>
                    <Text style={s.username}>@{row.username || 'Skater'}</Text>
                    <Text style={s.commentTime}>{formatTime(row.created_at)}</Text>
                  </View>
                  <Text style={s.commentText}>{row.content}</Text>
                </View>
              </View>
            ))}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: INK },
  loading: { flex: 1, backgroundColor: INK, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingStamp: { width: 64, height: 64, borderRadius: 19, backgroundColor: ACID, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '-6deg' }] },
  loadingText: { color: PAPER, fontSize: 9, fontWeight: '900', letterSpacing: 1.3 },
  content: { paddingBottom: 118 },

  heroIntro: { minHeight: 288, paddingHorizontal: 18, paddingTop: 20, paddingBottom: 28, overflow: 'hidden', position: 'relative' },
  orangeSlash: { position: 'absolute', width: 305, height: 94, right: -105, top: 53, backgroundColor: ORANGE, transform: [{ rotate: '31deg' }] },
  acidSlash: { position: 'absolute', width: 220, height: 27, left: -70, bottom: 33, backgroundColor: ACID, transform: [{ rotate: '-10deg' }] },
  heroTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  heroStamp: { width: 60, height: 60, borderRadius: 18, backgroundColor: ACID, borderWidth: 3, borderColor: INK, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '-6deg' }] },
  todayChip: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: PAPER, borderRadius: 999, borderWidth: 2, borderColor: INK, paddingHorizontal: 10, paddingVertical: 7 },
  todayChipText: { color: INK, fontSize: 8, fontWeight: '900', letterSpacing: 1 },
  eyebrow: { color: ORANGE, fontSize: 8, fontWeight: '900', letterSpacing: 1.4, marginTop: 27 },
  title: { color: PAPER, fontSize: 48, lineHeight: 44, fontWeight: '900', letterSpacing: -2.8, marginTop: 3 },
  subtitle: { color: '#A3AAB5', fontSize: 12, lineHeight: 18, fontWeight: '700', maxWidth: 305, marginTop: 8 },

  errorBox: { marginHorizontal: 14, marginTop: -7, borderRadius: 16, padding: 13, backgroundColor: '#20110E', borderWidth: 1, borderColor: '#63362A' },
  errorTitle: { color: ORANGE, fontSize: 8, fontWeight: '900', letterSpacing: 1 },
  errorText: { color: '#C6A99F', fontSize: 10, lineHeight: 15, marginTop: 3 },
  emptyCard: { marginHorizontal: 14, marginTop: -8, minHeight: 230, borderRadius: 24, borderWidth: 1.5, borderColor: '#30343D', backgroundColor: '#13161C', alignItems: 'center', justifyContent: 'center', padding: 24 },
  emptyStamp: { width: 64, height: 64, borderRadius: 19, backgroundColor: ACID, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '-5deg' }] },
  emptyTitle: { color: PAPER, fontSize: 15, fontWeight: '900', letterSpacing: 0.8, marginTop: 14 },
  emptyText: { color: '#7F8793', fontSize: 11, textAlign: 'center', lineHeight: 17, marginTop: 6, maxWidth: 280 },

  featureCard: { marginHorizontal: 14, marginTop: -8, borderRadius: 24, overflow: 'hidden', borderWidth: 2, borderColor: INK, backgroundColor: PAPER, shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 12, shadowOffset: { width: 0, height: 8 }, elevation: 7 },
  mediaFrame: { height: 245, backgroundColor: '#171A20', position: 'relative' },
  spotImage: { width: '100%', height: '100%' },
  noImage: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
  noImageText: { color: '#858D99', fontSize: 8, fontWeight: '900', letterSpacing: 1 },
  featureBadge: { position: 'absolute', top: 12, left: 12, backgroundColor: ORANGE, borderRadius: 999, borderWidth: 2, borderColor: INK, paddingHorizontal: 10, paddingVertical: 6 },
  featureBadgeText: { color: INK, fontSize: 7, fontWeight: '900', letterSpacing: 0.9 },
  ratingSticker: { position: 'absolute', right: 12, top: 12, flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: ACID, borderRadius: 12, borderWidth: 2, borderColor: INK, paddingHorizontal: 9, paddingVertical: 7, transform: [{ rotate: '4deg' }] },
  ratingText: { color: INK, fontSize: 9, fontWeight: '900' },
  spotTicket: { padding: 16 },
  spotKicker: { color: ORANGE, fontSize: 7, fontWeight: '900', letterSpacing: 1.1 },
  spotName: { color: INK, fontSize: 26, lineHeight: 29, fontWeight: '900', letterSpacing: -1, marginTop: 3 },
  spotMeta: { color: '#6E736E', fontSize: 9, fontWeight: '800', marginTop: 5, textTransform: 'uppercase' },
  tagsRow: { gap: 6, paddingTop: 13, paddingBottom: 2 },
  tag: { backgroundColor: '#E9E4DA', borderRadius: 999, borderWidth: 1, borderColor: '#CDC5B8', paddingHorizontal: 8, paddingVertical: 5 },
  tagText: { color: INK, fontSize: 6.5, fontWeight: '900', letterSpacing: 0.6 },
  sessionRow: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 14 },
  goingBlock: { minWidth: 72, minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, borderRadius: 13, backgroundColor: '#E9E4DA', borderWidth: 1.5, borderColor: INK, paddingHorizontal: 7 },
  goingValue: { color: INK, fontSize: 14, fontWeight: '900' },
  goingLabel: { color: '#777A74', fontSize: 6, fontWeight: '900' },
  rsvpButton: { flex: 1, minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: ORANGE, borderRadius: 13, borderWidth: 2, borderColor: INK },
  rsvpButtonActive: { backgroundColor: ACID },
  rsvpText: { color: INK, fontSize: 8, fontWeight: '900', letterSpacing: 0.7 },
  shareButton: { width: 48, height: 48, borderRadius: 13, backgroundColor: BLUE, borderWidth: 2, borderColor: INK, alignItems: 'center', justifyContent: 'center' },
  openButton: { minHeight: 47, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, borderTopWidth: 1, borderTopColor: '#D5CEC3', marginTop: 13, paddingTop: 11 },
  openText: { color: INK, fontSize: 8, fontWeight: '900', letterSpacing: 0.8 },

  threadHeader: { marginHorizontal: 14, marginTop: 26, marginBottom: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  threadKicker: { color: ORANGE, fontSize: 7, fontWeight: '900', letterSpacing: 1 },
  threadTitle: { color: PAPER, fontSize: 18, fontWeight: '900', letterSpacing: -0.4, marginTop: 2 },
  commentCount: { minWidth: 47, height: 39, borderRadius: 12, backgroundColor: ACID, borderWidth: 2, borderColor: INK, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4 },
  commentCountText: { color: INK, fontSize: 10, fontWeight: '900' },
  commentComposer: { marginHorizontal: 14, backgroundColor: PAPER, borderRadius: 18, borderWidth: 2, borderColor: INK, padding: 10 },
  commentInput: { minHeight: 72, color: INK, fontSize: 11, lineHeight: 16, fontWeight: '700', textAlignVertical: 'top', padding: 5 },
  postButton: { alignSelf: 'flex-end', minWidth: 76, minHeight: 39, backgroundColor: ORANGE, borderRadius: 11, borderWidth: 1.5, borderColor: INK, alignItems: 'center', justifyContent: 'center', marginTop: 6 },
  postText: { color: INK, fontSize: 8, fontWeight: '900', letterSpacing: 0.8 },
  disabled: { opacity: 0.45 },
  noComments: { marginHorizontal: 14, marginTop: 9, minHeight: 105, borderRadius: 17, borderWidth: 1.5, borderColor: '#30343D', backgroundColor: '#13161C', alignItems: 'center', justifyContent: 'center', padding: 15 },
  noCommentsTitle: { color: PAPER, fontSize: 10, fontWeight: '900', letterSpacing: 0.7, marginTop: 6 },
  noCommentsText: { color: '#7F8793', fontSize: 9.5, marginTop: 3 },
  commentCard: { marginHorizontal: 14, marginTop: 9, minHeight: 82, flexDirection: 'row', gap: 10, backgroundColor: PAPER, borderRadius: 17, borderWidth: 1.5, borderColor: INK, padding: 11 },
  commentTilt: { transform: [{ rotate: '0.3deg' }] },
  avatar: { width: 39, height: 39, borderRadius: 12, backgroundColor: ORANGE, borderWidth: 1.5, borderColor: INK, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '-4deg' }] },
  avatarText: { color: INK, fontSize: 13, fontWeight: '900' },
  commentCopy: { flex: 1 },
  commentTop: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  username: { color: INK, fontSize: 10, fontWeight: '900' },
  commentTime: { color: '#858780', fontSize: 7.5, fontWeight: '700' },
  commentText: { color: '#5F645F', fontSize: 10.5, lineHeight: 16, fontWeight: '600', marginTop: 5 },
});
