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
import { CalendarDays, Check, MapPin, MessageCircle, Share2, Star, Users } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/useAuthStore';
import { useNavigation } from '../lib/useNavigation';

const ACCENT = '#D2673D';
const BG = '#05070B';
const CARD = '#101722';
const BORDER = '#202B3A';

type Spot = {
  id: string;
  name: string;
  rating: number | null;
  image_url: string | null;
  difficulty: string | null;
  spot_type: string | null;
  tricks: string[] | null;
};

type Pick = { id: string; spot_id: string; date: string; spot: Spot };
type CommentRow = { id: string; spot_id: string; user_id: string; content: string; created_at: string; username?: string };

const todayIso = () => new Date().toISOString().slice(0, 10);
const timeText = (value: string) => new Date(value).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

export default function SpotOfTheDayScreenCurrent() {
  const navigation = useNavigation<any>();
  const user = useAuthStore(state => state.user);
  const [pick, setPick] = useState<Pick | null>(null);
  const [comments, setComments] = useState<CommentRow[]>([]);
  const [rsvpCount, setRsvpCount] = useState(0);
  const [hasRsvp, setHasRsvp] = useState(false);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [savingRsvp, setSavingRsvp] = useState(false);
  const [savingComment, setSavingComment] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const { data: rawPick, error: pickError } = await supabase
        .from('spot_of_day')
        .select('id,spot_id,date,spot:skate_spots(id,name,rating,image_url,difficulty,spot_type,tricks)')
        .eq('date', todayIso())
        .maybeSingle();
      if (pickError) throw pickError;
      if (!rawPick) {
        setPick(null);
        setComments([]);
        setRsvpCount(0);
        setHasRsvp(false);
        return;
      }

      const relation = (rawPick as any).spot;
      const spot = Array.isArray(relation) ? relation[0] : relation;
      if (!spot) throw new Error('Today’s pick no longer points to a live skate spot.');
      const nextPick = { ...(rawPick as any), spot } as Pick;
      setPick(nextPick);

      const [commentsResult, countResult, ownResult] = await Promise.all([
        supabase.from('spot_comments').select('id,spot_id,user_id,content,created_at').eq('spot_id', nextPick.spot_id).order('created_at', { ascending: true }).limit(100),
        supabase.from('spot_of_day_rsvps').select('id', { count: 'exact', head: true }).eq('spot_of_day_id', nextPick.id),
        user?.id
          ? supabase.from('spot_of_day_rsvps').select('id').eq('spot_of_day_id', nextPick.id).eq('user_id', user.id).maybeSingle()
          : Promise.resolve({ data: null, error: null } as any),
      ]);
      if (commentsResult.error) throw commentsResult.error;
      if (countResult.error) throw countResult.error;
      if (ownResult.error) throw ownResult.error;

      const rows = (commentsResult.data ?? []) as Omit<CommentRow, 'username'>[];
      const ids = [...new Set(rows.map(row => row.user_id).filter(Boolean))];
      const names = new Map<string, string>();
      if (ids.length) {
        const { data: profiles } = await supabase.from('profiles').select('id,username').in('id', ids);
        (profiles ?? []).forEach(profile => names.set(profile.id, profile.username || 'Skater'));
      }
      setComments(rows.map(row => ({ ...row, username: names.get(row.user_id) || 'Skater' })));
      setRsvpCount(countResult.count ?? 0);
      setHasRsvp(Boolean(ownResult.data));
    } catch (loadError: any) {
      setError(loadError?.message ?? 'Could not load Spot of the Day.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.id]);

  useEffect(() => { void load(); }, [load]);

  const toggleRsvp = async () => {
    if (!user?.id || !pick) {
      Alert.alert('Sign in required', 'Sign in to say you are skating today.');
      return;
    }
    try {
      setSavingRsvp(true);
      if (hasRsvp) {
        const { error: deleteError } = await supabase.from('spot_of_day_rsvps').delete().eq('spot_of_day_id', pick.id).eq('user_id', user.id);
        if (deleteError) throw deleteError;
        setHasRsvp(false);
        setRsvpCount(value => Math.max(0, value - 1));
      } else {
        const { error: insertError } = await supabase.from('spot_of_day_rsvps').insert({ spot_of_day_id: pick.id, user_id: user.id });
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
        .select('id,spot_id,user_id,content,created_at')
        .single();
      if (insertError) throw insertError;
      const { data: profile } = await supabase.from('profiles').select('username').eq('id', user.id).maybeSingle();
      setComments(current => [...current, { ...(data as CommentRow), username: profile?.username || 'Skater' }]);
      setComment('');
    } catch (commentError: any) {
      Alert.alert('Comment not posted', commentError?.message ?? 'Try again.');
    } finally {
      setSavingComment(false);
    }
  };

  if (loading) return <SafeAreaView style={s.center}><ActivityIndicator size="large" color={ACCENT} /></SafeAreaView>;

  return (
    <SafeAreaView style={s.container}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={s.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load(); }} tintColor={ACCENT} />}
      >
        <View style={s.header}>
          <View style={s.eyebrowRow}><CalendarDays color={ACCENT} size={16} /><Text style={s.eyebrow}>TODAY’S REAL PICK</Text></View>
          <Text style={s.title}>Spot of the Day</Text>
          <Text style={s.subtitle}>See the real spot, who is headed there, and what the session is like.</Text>
        </View>

        {error ? <View style={s.error}><Text style={s.errorText}>{error}</Text></View> : null}

        {!pick ? (
          <View style={s.empty}>
            <MapPin color="#465365" size={40} />
            <Text style={s.emptyTitle}>No pick posted today</Text>
            <Text style={s.emptyText}>Nothing is fabricated. A real selected SkateQuest spot will appear here when one is posted.</Text>
          </View>
        ) : (
          <>
            <View style={s.card}>
              {pick.spot.image_url ? <Image source={{ uri: pick.spot.image_url }} style={s.image} contentFit="cover" transition={180} /> : null}
              <View style={s.body}>
                <View style={s.topRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.spotName}>{pick.spot.name}</Text>
                    <Text style={s.meta}>{[pick.spot.spot_type, pick.spot.difficulty].filter(Boolean).join(' • ') || 'Skate spot'}</Text>
                  </View>
                  {pick.spot.rating != null ? <View style={s.rating}><Star color="#F7B955" fill="#F7B955" size={14} /><Text style={s.ratingText}>{Number(pick.spot.rating).toFixed(1)}</Text></View> : null}
                </View>

                {pick.spot.tricks?.length ? (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.tags}>
                    {pick.spot.tricks.slice(0, 8).map(trick => <View key={trick} style={s.tag}><Text style={s.tagText}>{trick}</Text></View>)}
                  </ScrollView>
                ) : null}

                <View style={s.actions}>
                  <View style={s.going}><Users color="#6FC3FF" size={17} /><Text style={s.goingValue}>{rsvpCount}</Text><Text style={s.goingLabel}>going</Text></View>
                  <TouchableOpacity style={[s.rsvp, hasRsvp && s.rsvpActive]} disabled={savingRsvp} onPress={() => void toggleRsvp()}>
                    {savingRsvp ? <ActivityIndicator color="#fff" size="small" /> : hasRsvp ? <Check color="#fff" size={17} /> : <MapPin color="#fff" size={17} />}
                    <Text style={s.rsvpText}>{hasRsvp ? 'I’M GOING' : 'SKATE TODAY'}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={s.share} onPress={() => void Share.share({ message: `Today’s SkateQuest spot is ${pick.spot.name}. Who’s skating?` })}><Share2 color="#CAD2DD" size={18} /></TouchableOpacity>
                </View>

                <Pressable style={s.open} onPress={() => navigation.navigate('SpotDetail', { spotId: pick.spot_id })}><Text style={s.openText}>OPEN FULL SPOT</Text></Pressable>
              </View>
            </View>

            <View style={s.commentsHead}><View><Text style={s.commentsTitle}>Session talk</Text><Text style={s.commentsSub}>{comments.length} comments</Text></View><MessageCircle color={ACCENT} size={21} /></View>
            <View style={s.composer}>
              <TextInput value={comment} onChangeText={setComment} placeholder="Conditions, meet-up time, who’s pulling up?" placeholderTextColor="#596577" style={s.input} multiline maxLength={500} />
              <TouchableOpacity style={[s.post, (!comment.trim() || savingComment) && { opacity: 0.45 }]} disabled={!comment.trim() || savingComment} onPress={() => void postComment()}>
                {savingComment ? <ActivityIndicator color="#fff" size="small" /> : <Text style={s.postText}>POST</Text>}
              </TouchableOpacity>
            </View>

            {comments.map(row => (
              <View key={row.id} style={s.comment}>
                <View style={s.avatar}><Text style={s.avatarText}>{(row.username || 'S').slice(0, 1).toUpperCase()}</Text></View>
                <View style={{ flex: 1 }}><View style={s.commentTop}><Text style={s.username}>{row.username || 'Skater'}</Text><Text style={s.time}>{timeText(row.created_at)}</Text></View><Text style={s.commentText}>{row.content}</Text></View>
              </View>
            ))}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG }, center: { flex: 1, backgroundColor: BG, alignItems: 'center', justifyContent: 'center' }, content: { padding: 16, paddingBottom: 50 },
  header: { paddingTop: 4, paddingBottom: 16 }, eyebrowRow: { flexDirection: 'row', alignItems: 'center', gap: 7 }, eyebrow: { color: ACCENT, fontSize: 9, fontWeight: '900', letterSpacing: 1.3 }, title: { color: '#F7F4EF', fontSize: 28, fontWeight: '900', marginTop: 5 }, subtitle: { color: '#7D8999', fontSize: 12, lineHeight: 18, marginTop: 5 },
  error: { borderRadius: 13, padding: 12, backgroundColor: '#2A1214', borderWidth: 1, borderColor: '#5C262B', marginBottom: 12 }, errorText: { color: '#F4A4AA', fontSize: 12 },
  empty: { minHeight: 220, borderRadius: 22, borderWidth: 1, borderColor: BORDER, backgroundColor: CARD, alignItems: 'center', justifyContent: 'center', padding: 26 }, emptyTitle: { color: '#E8EDF4', fontSize: 18, fontWeight: '900', marginTop: 12 }, emptyText: { color: '#748195', fontSize: 12, textAlign: 'center', lineHeight: 18, marginTop: 7 },
  card: { borderRadius: 22, overflow: 'hidden', backgroundColor: CARD, borderWidth: 1, borderColor: BORDER }, image: { width: '100%', height: 220, backgroundColor: '#0A111A' }, body: { padding: 16 }, topRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 }, spotName: { color: '#F7F4EF', fontSize: 23, fontWeight: '900' }, meta: { color: '#7D8999', fontSize: 11, marginTop: 4, textTransform: 'capitalize' }, rating: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 999, paddingHorizontal: 9, paddingVertical: 6, backgroundColor: '#241E10' }, ratingText: { color: '#F7B955', fontSize: 11, fontWeight: '900' },
  tags: { gap: 7, paddingTop: 13 }, tag: { backgroundColor: '#16202D', borderRadius: 999, paddingHorizontal: 9, paddingVertical: 6 }, tagText: { color: '#A8B3C2', fontSize: 10, fontWeight: '700' },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 9, marginTop: 16 }, going: { minWidth: 72, height: 46, borderRadius: 13, backgroundColor: '#0D151F', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4 }, goingValue: { color: '#E7EDF4', fontWeight: '900' }, goingLabel: { color: '#708094', fontSize: 10 }, rsvp: { flex: 1, minHeight: 46, borderRadius: 13, backgroundColor: ACCENT, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 }, rsvpActive: { backgroundColor: '#2F7D50' }, rsvpText: { color: '#fff', fontSize: 11, fontWeight: '900', letterSpacing: 0.5 }, share: { width: 46, height: 46, borderRadius: 13, backgroundColor: '#172130', alignItems: 'center', justifyContent: 'center' }, open: { minHeight: 42, marginTop: 10, borderRadius: 12, borderWidth: 1, borderColor: '#2B394B', alignItems: 'center', justifyContent: 'center' }, openText: { color: '#C9D2DE', fontSize: 10, fontWeight: '900', letterSpacing: 0.7 },
  commentsHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 24, marginBottom: 10 }, commentsTitle: { color: '#F7F4EF', fontSize: 18, fontWeight: '900' }, commentsSub: { color: '#697789', fontSize: 10, marginTop: 2 }, composer: { borderRadius: 17, borderWidth: 1, borderColor: BORDER, backgroundColor: CARD, padding: 11, marginBottom: 12 }, input: { minHeight: 64, color: '#EEF2F7', fontSize: 13, textAlignVertical: 'top' }, post: { alignSelf: 'flex-end', minWidth: 72, height: 34, borderRadius: 10, backgroundColor: ACCENT, alignItems: 'center', justifyContent: 'center' }, postText: { color: '#fff', fontSize: 10, fontWeight: '900' },
  comment: { flexDirection: 'row', gap: 10, borderRadius: 15, backgroundColor: '#0D141E', borderWidth: 1, borderColor: '#1C2938', padding: 12, marginBottom: 8 }, avatar: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#202A37', alignItems: 'center', justifyContent: 'center' }, avatarText: { color: ACCENT, fontWeight: '900' }, commentTop: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 }, username: { color: '#E3E9F0', fontSize: 11, fontWeight: '900' }, time: { color: '#5F6D80', fontSize: 9 }, commentText: { color: '#A8B2C0', fontSize: 12, lineHeight: 18, marginTop: 4 },
});
