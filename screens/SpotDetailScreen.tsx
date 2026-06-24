import React, { useState, useEffect, memo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Dimensions,
  Image,
  Modal,
  Linking,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import Mapbox from '@rnmapbox/maps';
import { Camera, MapPin, Star, Target, AlertTriangle, CalendarDays, Users } from 'lucide-react-native';
import { useAuthStore } from '../stores/useAuthStore';
import { useNetworkStore } from '../stores/useNetworkStore';
import { useMutationQueueStore } from '../stores/useMutationQueueStore';
import { supabase } from '../lib/supabase';
import { spotsService } from '../lib/spotsService';
import { challengesService } from '../lib/challengesService';
import { SkateSpot, SpotPhoto, SpotCondition, Challenge, SpotComment } from '../types';
import { pickImage, uploadImage, saveMediaToDatabase } from '../lib/mediaUpload';
import PortalDimensionLogo from '../components/PortalDimensionLogo';
import KingOfTheHill from '../components/KingOfTheHill';
import TerritoryControl from '../components/TerritoryControl';
import GhostClipViewer from '../components/GhostClipViewer';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import LoadingSkeleton from '../components/ui/LoadingSkeleton';

const { width } = Dimensions.get('window');

const CONDITION_OPTIONS = [
  { value: 'dry', label: 'Dry' },
  { value: 'wet', label: 'Wet' },
  { value: 'crowded', label: 'Crowded' },
  { value: 'empty', label: 'Empty' },
  { value: 'cops', label: 'Cops' },
  { value: 'clear', label: 'Clear' },
  { value: 'under_construction', label: 'Construction' },
];

const SESSION_STATUS_COLORS: Record<string, string> = {
  upcoming: '#6B4CE6',
  live: '#10B981',
  ended: '#9CA3AF',
};

const SESSION_STATUS_LABELS: Record<string, string> = {
  upcoming: 'Upcoming',
  live: 'LIVE NOW',
  ended: 'Ended',
};

interface SpotSession {
  id: string;
  title: string;
  date: string;
  time: string;
  creator_username: string | null;
  attendee_count: number;
  max_attendees: number | null;
  status: 'upcoming' | 'live' | 'ended';
  is_attending: boolean;
}

const SpotDetailScreen = memo(({ route, navigation }: any) => {
  const { spotId } = route.params;
  const { user } = useAuthStore();
  const [spot, setSpot] = useState<SkateSpot | null>(null);
  const [photos, setPhotos] = useState<SpotPhoto[]>([]);
  const [conditions, setConditions] = useState<SpotCondition[]>([]);
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [loading, setLoading] = useState(true);
  const [activePhotoIndex, setActivePhotoIndex] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [showConditionsModal, setShowConditionsModal] = useState(false);
  const [comments, setComments] = useState<SpotComment[]>([]);
  const [commentText, setCommentText] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [sessions, setSessions] = useState<SpotSession[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [rsvpingId, setRsvpingId] = useState<string | null>(null);

  useEffect(() => {
    loadSpotData();
  }, [spotId]);

  const loadSpotData = async () => {
    try {
      const { data: spotData, error: spotError } = await spotsService.getById(spotId);
      if (spotError) throw spotError;
      setSpot(spotData);
      setPhotos(spotData?.spot_photos || []);
      setConditions(
        spotData?.spot_conditions?.filter((c: any) => new Date(c.expires_at) > new Date()) || []
      );

      const { data: challengesData } = await challengesService.getForSpot(spotId);
      setChallenges(challengesData || []);

      const { data: commentsData } = await supabase
        .from('spot_comments')
        .select('*, author:profiles(id, username)')
        .eq('spot_id', spotId)
        .order('created_at', { ascending: false })
        .limit(50);
      setComments(commentsData || []);

      loadSpotSessions(spotData?.name);
    } catch (error: any) {
      console.error('Error loading spot:', error);
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const loadSpotSessions = async (spotName?: string) => {
    if (!user?.id) return;
    setLoadingSessions(true);
    try {
      const orParts = [`spot_id.eq.${spotId}`];
      if (spotName) {
        orParts.push(`spot_name.eq."${spotName.replace(/"/g, '')}"`);
      }

      const { data: rawSessions } = await supabase
        .from('skate_sessions')
        .select(`
          id, title, spot_id, spot_name, date, time,
          created_by, max_attendees,
          profiles!skate_sessions_created_by_fkey(username)
        `)
        .or(orParts.join(','))
        .gte('date', new Date().toISOString().split('T')[0])
        .order('date', { ascending: true })
        .order('time', { ascending: true })
        .limit(5);

      if (!rawSessions || rawSessions.length === 0) {
        setSessions([]);
        return;
      }

      const sessionIds = rawSessions.map((s: any) => s.id);
      const [attendeesRes, myRsvpsRes] = await Promise.all([
        supabase.from('session_attendees').select('session_id').in('session_id', sessionIds),
        supabase
          .from('session_attendees')
          .select('session_id')
          .eq('user_id', user.id)
          .in('session_id', sessionIds),
      ]);

      const attendeeMap: Record<string, number> = {};
      (attendeesRes.data ?? []).forEach(({ session_id }: { session_id: string }) => {
        attendeeMap[session_id] = (attendeeMap[session_id] ?? 0) + 1;
      });
      const mySessionIds = new Set(
        (myRsvpsRes.data ?? []).map((r: { session_id: string }) => r.session_id)
      );

      setSessions(
        rawSessions.map((s: any) => ({
          id: s.id,
          title: s.title,
          date: s.date,
          time: s.time,
          creator_username: s.profiles?.username ?? null,
          attendee_count: attendeeMap[s.id] ?? 0,
          max_attendees: s.max_attendees,
          status: getSessionStatus(s.date, s.time),
          is_attending: mySessionIds.has(s.id),
        }))
      );
    } catch {
      // sessions are supplemental — don't surface load errors
    } finally {
      setLoadingSessions(false);
    }
  };

  const toggleSessionRSVP = async (session: SpotSession) => {
    if (!user?.id || session.status === 'ended') return;
    setRsvpingId(session.id);

    // Optimistic update first
    setSessions(prev =>
      prev.map(s =>
        s.id === session.id
          ? {
              ...s,
              is_attending: !session.is_attending,
              attendee_count: session.is_attending
                ? s.attendee_count - 1
                : s.attendee_count + 1,
            }
          : s
      )
    );

    try {
      const { isConnected } = useNetworkStore.getState();
      const { enqueue } = useMutationQueueStore.getState();

      if (isConnected) {
        if (session.is_attending) {
          const { error } = await supabase
            .from('session_attendees')
            .delete()
            .eq('session_id', session.id)
            .eq('user_id', user.id);
          if (error) throw error;
        } else {
          const { error } = await supabase
            .from('session_attendees')
            .insert({ session_id: session.id, user_id: user.id });
          if (error) throw error;
        }
      } else {
        await enqueue(
          session.is_attending ? 'delete' : 'create',
          'session_attendees',
          { session_id: session.id, user_id: user.id }
        );
      }
    } catch {
      // Revert optimistic update on failure
      setSessions(prev =>
        prev.map(s =>
          s.id === session.id
            ? {
                ...s,
                is_attending: session.is_attending,
                attendee_count: session.attendee_count,
              }
            : s
        )
      );
      Alert.alert('Error', 'Could not update RSVP');
    } finally {
      setRsvpingId(null);
    }
  };

  const uploadSpotPhoto = async () => {
    if (!user) return;
    try {
      setUploading(true);
      const result = await pickImage();
      if (!result) return;
      const photoResult = await uploadImage(result.uri, 'spot_photos', user.id);
      const media = await saveMediaToDatabase(user.id, photoResult, {
        caption: `Photo of ${spot?.name}`,
        spotId,
      });
      await spotsService.uploadPhoto(spotId, media.id, user.id, photos.length === 0);
      Alert.alert('Success', 'Photo uploaded!');
      loadSpotData();
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setUploading(false);
    }
  };

  const reportCondition = async (condition: string) => {
    if (!user) return;
    try {
      const { error } = await spotsService.reportCondition(spotId, user.id, condition);
      if (error) throw error;
      Alert.alert('Success', 'Condition reported!');
      setShowConditionsModal(false);
      loadSpotData();
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  };

  const submitComment = async () => {
    if (!user || !commentText.trim()) return;
    try {
      setSubmittingComment(true);
      const { error } = await supabase.from('spot_comments').insert([{
        spot_id: spotId,
        user_id: user.id,
        content: commentText.trim(),
      }]);
      if (error) throw error;
      setCommentText('');
      loadSpotData();
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setSubmittingComment(false);
    }
  };

  const getDifficultyColor = (difficulty?: string) => {
    switch (difficulty) {
      case 'Beginner':
        return '#4CAF50';
      case 'Intermediate':
        return '#FF9800';
      case 'Advanced':
        return '#f44336';
      default:
        return '#999';
    }
  };

  const getConditionLabel = (condition: string) => condition.replace('_', ' ').toUpperCase();

  if (loading) {
    return (
      <View className="flex-1 bg-brand-beige dark:bg-gray-900 p-4">
        <LoadingSkeleton height={300} className="mb-4" />
        <LoadingSkeleton height={100} className="mb-4" />
        <LoadingSkeleton height={80} className="mb-4" />
      </View>
    );
  }

  if (!spot) {
    return (
      <View className="flex-1 bg-brand-beige dark:bg-gray-900 justify-center items-center">
        <Text className="text-lg text-gray-400">Spot not found</Text>
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-brand-beige dark:bg-gray-900">
      <View style={{ height: 300 }} className="bg-black relative">
        {photos.length > 0 ? (
          <>
            <ScrollView
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onMomentumScrollEnd={e =>
                setActivePhotoIndex(Math.round(e.nativeEvent.contentOffset.x / width))
              }
            >
              {photos.map(photo => (
                <Image
                  key={photo.id}
                  source={{ uri: photo.media?.url }}
                  style={{ width, height: 300 }}
                  resizeMode="cover"
                />
              ))}
            </ScrollView>
            <View className="absolute bottom-[60px] left-0 right-0 flex-row justify-center gap-1.5">
              {photos.map((_, index) => (
                <View
                  key={index}
                  className={`w-2 h-2 rounded-full ${index === activePhotoIndex ? 'bg-white' : 'bg-white/50'}`}
                />
              ))}
            </View>
          </>
        ) : (
          <View className="flex-1 justify-center items-center bg-gray-800">
            <Text className="text-lg font-bold text-white">No photos yet</Text>
            <Text className="text-sm text-gray-400 mt-1">Be the first to add one!</Text>
          </View>
        )}
        <TouchableOpacity
          className="absolute bottom-4 right-4 bg-brand-terracotta px-5 py-2.5 rounded-full shadow-lg flex-row items-center gap-1.5"
          onPress={uploadSpotPhoto}
          disabled={uploading}
        >
          {uploading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <>
              <Camera color="#fff" size={14} />
              <Text className="text-white text-sm font-bold">Add Photo</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      <View className="bg-white dark:bg-gray-800 p-5 -mt-5 rounded-t-2xl">
        <Text className="text-[28px] font-bold text-gray-800 dark:text-gray-100 mb-3">
          {spot.name}
        </Text>
        <View className="flex-row items-center gap-3 mb-4">
          <View
            className="px-3 py-1.5 rounded-xl"
            style={{ backgroundColor: getDifficultyColor(spot.difficulty) }}
          >
            <Text className="text-white text-xs font-bold">{spot.difficulty || 'Unknown'}</Text>
          </View>
          <TouchableOpacity
            className="flex-row items-center gap-1"
            onPress={() => navigation.navigate('SpotReviews', { spotId, spotName: spot.name })}
          >
            <Star color="#FFD700" size={16} fill="#FFD700" />
            <Text className="text-sm font-bold text-gray-800 dark:text-gray-100">
              {spot.rating ? spot.rating.toFixed(1) : '—'}
            </Text>
            <Text className="text-xs text-brand-terracotta font-semibold ml-0.5">Reviews →</Text>
          </TouchableOpacity>
        </View>
        {spot.tricks && spot.tricks.length > 0 && (
          <View className="mt-2.5">
            <Text className="text-sm font-bold text-gray-500 dark:text-gray-400 mb-2">
              Popular Tricks:
            </Text>
            <View className="flex-row flex-wrap gap-2">
              {spot.tricks.map((trick, index) => (
                <View
                  key={index}
                  className="bg-brand-beige dark:bg-gray-700 px-3 py-1.5 rounded-xl"
                >
                  <Text className="text-sm text-brand-terracotta font-semibold">{trick}</Text>
                </View>
              ))}
            </View>
          </View>
        )}
        {spot.sponsor_name && spot.sponsor_url && (
          <TouchableOpacity
            className="mt-4 p-4 bg-brand-terracotta rounded-xl flex-row items-center justify-between"
            onPress={() => Linking.openURL(spot.sponsor_url!)}
          >
            <View className="flex-1">
              <Text className="text-[11px] text-white/80 font-semibold mb-1">Supported by</Text>
              <Text className="text-base text-white font-bold">{spot.sponsor_name}</Text>
            </View>
            <Text className="text-2xl text-white ml-2.5">→</Text>
          </TouchableOpacity>
        )}
      </View>

      <Card className="mx-4">
        <View className="flex-row items-center gap-2 mb-2.5">
          <MapPin color="#d2673d" size={18} />
          <Text className="text-lg font-bold text-gray-800 dark:text-gray-100">Location</Text>
        </View>
        <TouchableOpacity
          style={{ height: 200, borderRadius: 10, overflow: 'hidden' }}
          onPress={() => navigation.navigate('Map')}
        >
          <Mapbox.MapView
            style={{ flex: 1 }}
            styleURL={Mapbox.StyleURL.Street}
            scrollEnabled={false}
            pitchEnabled={false}
            rotateEnabled={false}
            zoomEnabled={false}
          >
            <Mapbox.Camera zoomLevel={14} centerCoordinate={[spot.longitude, spot.latitude]} />
            <Mapbox.PointAnnotation id="spot-location" coordinate={[spot.longitude, spot.latitude]}>
              <View className="items-center justify-center">
                <MapPin color="#d2673d" size={32} />
              </View>
            </Mapbox.PointAnnotation>
          </Mapbox.MapView>
          <View className="absolute bottom-0 left-0 right-0 bg-black/60 p-2.5 items-center">
            <Text className="text-white text-sm font-semibold">Tap to view on map</Text>
          </View>
        </TouchableOpacity>
        <View className="mt-2.5 p-2.5 bg-brand-beige dark:bg-gray-700 rounded-lg">
          <Text className="text-xs text-gray-500 dark:text-gray-400 font-mono">
            {spot.latitude.toFixed(6)}, {spot.longitude.toFixed(6)}
          </Text>
        </View>
      </Card>

      <PortalDimensionLogo skateparkName={spot.name} />

      <KingOfTheHill spotId={spotId} />

      <TerritoryControl spotId={spotId} />

      <GhostClipViewer spotId={spotId} />

      <Card className="mx-4">
        <View className="flex-row items-center gap-2 mb-3">
          <AlertTriangle color="#ef4444" size={18} />
          <Text className="text-lg font-bold text-gray-800 dark:text-gray-100">
            Live Conditions
          </Text>
        </View>
        {conditions.length > 0 ? (
          conditions.map(c => (
            <View
              key={c.id}
              className="flex-row items-center py-2.5 border-b border-gray-100 dark:border-gray-700"
            >
              <View className="flex-1 ml-3">
                <Text className="text-[15px] font-bold text-gray-800 dark:text-gray-100">
                  {getConditionLabel(c.condition)}
                </Text>
                <Text className="text-xs text-gray-400 mt-0.5">
                  by {c.reporter?.username} · {getTimeAgo(c.created_at)}
                </Text>
              </View>
            </View>
          ))
        ) : (
          <Text className="text-sm text-gray-400 text-center mb-3">
            No recent conditions reported
          </Text>
        )}
        <Button
          title="+ Report Condition"
          onPress={() => setShowConditionsModal(true)}
          variant="primary"
          size="sm"
          className="bg-brand-green mt-2.5"
        />
      </Card>

      {challenges.length > 0 && (
        <Card className="mx-4">
          <View className="flex-row items-center gap-2 mb-3">
            <Target color="#d2673d" size={18} />
            <Text className="text-lg font-bold text-gray-800 dark:text-gray-100">
              Active Challenges
            </Text>
          </View>
          {challenges.map(ch => (
            <TouchableOpacity
              key={ch.id}
              className="flex-row justify-between items-center py-3 border-b border-gray-100 dark:border-gray-700"
              onPress={() => navigation.navigate('ChallengesTab')}
            >
              <Text className="text-[15px] font-semibold text-gray-800 dark:text-gray-100">
                {ch.trick}
              </Text>
              <Text className="text-sm font-bold text-brand-terracotta">+{ch.xp_reward} XP</Text>
            </TouchableOpacity>
          ))}
        </Card>
      )}

      {/* Sessions at this spot */}
      <Card className="mx-4">
        <View className="flex-row items-center justify-between mb-3">
          <View className="flex-row items-center gap-2">
            <CalendarDays color="#6B4CE6" size={18} />
            <Text className="text-lg font-bold text-gray-800 dark:text-gray-100">
              Sessions Here
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => navigation.navigate('Sessions', { spotId, spotName: spot.name })}
          >
            <Text className="text-sm font-bold text-brand-terracotta">See all →</Text>
          </TouchableOpacity>
        </View>

        {loadingSessions ? (
          <ActivityIndicator color="#6B4CE6" size="small" style={{ marginBottom: 12 }} />
        ) : sessions.length === 0 ? (
          <Text className="text-sm text-gray-400 text-center mb-3">
            No upcoming sessions — be the first to plan one!
          </Text>
        ) : (
          sessions.map(s => (
            <View
              key={s.id}
              className="py-2.5 border-b border-gray-100 dark:border-gray-700"
            >
              <View className="flex-row items-start justify-between">
                <View className="flex-1 mr-3">
                  <Text className="text-[15px] font-bold text-gray-800 dark:text-gray-100">
                    {s.title}
                  </Text>
                  <Text className="text-xs text-gray-400 mt-0.5">
                    {formatSessionDate(s.date, s.time)}
                  </Text>
                  <View className="flex-row items-center gap-2 mt-1">
                    <View
                      className="px-2 py-0.5 rounded-full"
                      style={{ backgroundColor: SESSION_STATUS_COLORS[s.status] + '22' }}
                    >
                      <Text
                        style={{ color: SESSION_STATUS_COLORS[s.status] }}
                        className="text-[11px] font-bold"
                      >
                        {SESSION_STATUS_LABELS[s.status]}
                      </Text>
                    </View>
                    <View className="flex-row items-center gap-1">
                      <Users size={11} color="#9CA3AF" />
                      <Text className="text-xs text-gray-400">
                        {s.attendee_count}
                        {s.max_attendees ? `/${s.max_attendees}` : ''} going
                      </Text>
                    </View>
                  </View>
                </View>
                {s.status !== 'ended' && (
                  <TouchableOpacity
                    className={`px-3 py-1.5 rounded-full ${s.is_attending ? 'bg-brand-green' : 'border border-[#6B4CE6]'}`}
                    onPress={() => toggleSessionRSVP(s)}
                    disabled={rsvpingId === s.id}
                  >
                    {rsvpingId === s.id ? (
                      <ActivityIndicator
                        size="small"
                        color={s.is_attending ? '#fff' : '#6B4CE6'}
                      />
                    ) : (
                      <Text
                        className={`text-xs font-bold ${s.is_attending ? 'text-white' : 'text-[#6B4CE6]'}`}
                      >
                        {s.is_attending ? 'Going ✓' : 'RSVP'}
                      </Text>
                    )}
                  </TouchableOpacity>
                )}
              </View>
            </View>
          ))
        )}

        <Button
          title="+ Plan a Session Here"
          onPress={() =>
            navigation.navigate('Sessions', {
              spotId,
              spotName: spot.name,
              autoCreate: true,
            })
          }
          variant="primary"
          size="sm"
          className="bg-[#6B4CE6] mt-3"
        />
      </Card>

      <Card className="mx-4">
        <View className="flex-row items-center gap-2 mb-3">
          <Text className="text-lg font-bold text-gray-800 dark:text-gray-100">
            💬 Comments ({comments.length})
          </Text>
        </View>

        {comments.length === 0 && (
          <Text className="text-sm text-gray-400 text-center mb-3">
            No comments yet — be the first!
          </Text>
        )}

        {comments.slice(0, 10).map(c => (
          <View key={c.id} className="py-3 border-b border-gray-100 dark:border-gray-700">
            <View className="flex-row items-center justify-between mb-1">
              <Text className="text-xs font-bold text-brand-terracotta">
                {c.author?.username ?? 'Skater'}
              </Text>
              <Text className="text-xs text-gray-400">{getTimeAgo(c.created_at)}</Text>
            </View>
            <Text className="text-sm text-gray-700 dark:text-gray-300">{c.content}</Text>
          </View>
        ))}

        {user && (
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <View className="flex-row items-center gap-2 mt-3">
              <TextInput
                className="flex-1 bg-gray-100 dark:bg-gray-700 rounded-xl px-4 py-2.5 text-sm text-gray-800 dark:text-gray-100"
                placeholder="Drop a comment..."
                placeholderTextColor="#9CA3AF"
                value={commentText}
                onChangeText={setCommentText}
                maxLength={280}
                returnKeyType="send"
                onSubmitEditing={submitComment}
              />
              <TouchableOpacity
                className="bg-brand-terracotta px-4 py-2.5 rounded-xl"
                onPress={submitComment}
                disabled={submittingComment || !commentText.trim()}
              >
                {submittingComment
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <Text className="text-white font-bold text-sm">Post</Text>
                }
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        )}
      </Card>

      <View className="px-4 pb-8">
        <Button
          title="View All Challenges"
          onPress={() => navigation.navigate('ChallengesTab')}
          variant="primary"
          size="lg"
        />
      </View>

      <Modal
        visible={showConditionsModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowConditionsModal(false)}
      >
        <View className="flex-1 bg-black/50 justify-end">
          <View className="bg-white dark:bg-gray-800 rounded-t-2xl p-5 pb-10">
            <Text className="text-[22px] font-bold text-gray-800 dark:text-gray-100 mb-1">
              Report Condition
            </Text>
            <Text className="text-sm text-gray-500 mb-5">What's the spot like right now?</Text>
            <View className="flex-row flex-wrap gap-2.5 mb-5">
              {CONDITION_OPTIONS.map(option => (
                <TouchableOpacity
                  key={option.value}
                  className="w-[31%] bg-gray-100 dark:bg-gray-700 p-4 rounded-xl items-center"
                  onPress={() => reportCondition(option.value)}
                >
                  <Text className="text-[11px] text-gray-800 dark:text-gray-100 font-semibold text-center mt-1">
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <Button
              title="Cancel"
              onPress={() => setShowConditionsModal(false)}
              variant="secondary"
              size="lg"
            />
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
});

function getTimeAgo(dateString: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateString).getTime()) / 1000);
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

function getSessionStatus(date: string, time: string): 'upcoming' | 'live' | 'ended' {
  const sessionTime = new Date(`${date}T${time}`);
  const now = new Date();
  const diff = sessionTime.getTime() - now.getTime();
  if (diff > 2 * 60 * 60 * 1000) return 'upcoming';
  if (diff > -2 * 60 * 60 * 1000) return 'live';
  return 'ended';
}

function formatSessionDate(dateStr: string, timeStr: string): string {
  const d = new Date(`${dateStr}T${timeStr}`);
  return (
    d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) +
    ' · ' +
    d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  );
}

export default SpotDetailScreen;
