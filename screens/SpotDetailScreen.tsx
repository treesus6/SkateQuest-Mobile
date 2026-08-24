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
import {
  Camera,
  MapPin,
  Star,
  Target,
  AlertTriangle,
  CalendarDays,
  Users,
  MessageCircle,
  Navigation,
  ExternalLink,
  Activity as ActivityIcon,
  ChevronRight,
} from 'lucide-react-native';
import { useAuthStore } from '../stores/useAuthStore';
import { supabase } from '../lib/supabase';
import { spotsService } from '../lib/spotsService';
import { challengesService } from '../lib/challengesService';
import { SkateSpot, SpotPhoto, SpotCondition, Challenge, SpotComment } from '../types';
import { deleteFromStorage, pickImage, uploadImage } from '../lib/mediaUpload';
import { getSpotSubmissionErrorMessage } from '../lib/spotSubmission';
import { Logger } from '../lib/logger';
import KingOfTheHill from '../components/KingOfTheHill';
import TerritoryControl from '../components/TerritoryControl';
import GhostClipViewer from '../components/GhostClipViewer';
import LoadingSkeleton from '../components/ui/LoadingSkeleton';
import SpotMiniMap from '../components/SpotMiniMap';
import { getSessionStatus, sessionsService, SessionRsvpResult } from '../lib/sessionsService';

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
  upcoming: '#8B5CF6',
  live: '#22C55E',
  ended: '#7B8493',
};

const SESSION_STATUS_LABELS: Record<string, string> = {
  upcoming: 'Upcoming',
  live: 'LIVE NOW',
  ended: 'Ended',
};

interface SpotSession {
  id: string;
  title: string;
  scheduled_time: string;
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
    void loadSpotData();
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

      void loadSpotSessions();
    } catch (error: any) {
      console.error('Error loading spot:', error);
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const loadSpotSessions = async () => {
    if (!user?.id) return;
    setLoadingSessions(true);
    try {
      const { data: rawSessions } = await supabase
        .from('skate_sessions')
        .select('id, title, spot_id, scheduled_time, creator_id, max_participants, participants')
        .eq('spot_id', spotId)
        .gte('scheduled_time', new Date().toISOString())
        .order('scheduled_time', { ascending: true })
        .limit(5);

      if (!rawSessions || rawSessions.length === 0) {
        setSessions([]);
        return;
      }

      const creatorIds = [...new Set(rawSessions.map((s: any) => s.creator_id).filter(Boolean))];
      const profilesRes = creatorIds.length
        ? await supabase.from('profiles').select('id, username').in('id', creatorIds)
        : { data: [], error: null };
      const profileMap = new Map((profilesRes.data ?? []).map((p: any) => [p.id, p.username]));

      setSessions(
        rawSessions.map((s: any) => {
          const participants: string[] = s.participants ?? [];
          return {
            id: s.id,
            title: s.title,
            scheduled_time: s.scheduled_time,
            creator_username: profileMap.get(s.creator_id) ?? null,
            attendee_count: participants.length,
            max_attendees: s.max_participants,
            status: getSessionStatus(s.scheduled_time),
            is_attending: participants.includes(user.id),
          };
        })
      );
    } catch {
      // Sessions are supplemental to the spot page.
    } finally {
      setLoadingSessions(false);
    }
  };

  const toggleSessionRSVP = async (session: SpotSession) => {
    if (!user?.id || session.status === 'ended' || rsvpingId) return;
    const attending = !session.is_attending;
    if (
      attending &&
      session.max_attendees !== null &&
      session.attendee_count >= session.max_attendees
    ) {
      Alert.alert('Session Full', 'This session has reached its maximum participants.');
      return;
    }
    setRsvpingId(session.id);

    try {
      const { data, error } = await sessionsService.setRsvp(session.id, attending);
      if (error) throw error;
      const result = data as SessionRsvpResult | null;
      if (result?.error === 'full') {
        Alert.alert('Session Full', 'This session has reached its maximum participants.');
        return;
      }
      if (result?.error === 'session ended') {
        Alert.alert('Session Ended', 'This session has already happened.');
        return;
      }
      if (result?.error) throw new Error(result.error);
      if (result?.attendee_count !== undefined) {
        setSessions(prev =>
          prev.map(s =>
            s.id === session.id
              ? {
                  ...s,
                  is_attending: result.is_attending ?? attending,
                  attendee_count: result.attendee_count!,
                }
              : s
          )
        );
      }
    } catch {
      Alert.alert('Error', 'Could not update RSVP');
    } finally {
      setRsvpingId(null);
    }
  };

  const uploadSpotPhoto = async () => {
    if (!user) return;
    let uploadedUrl: string | null = null;
    let attached = false;
    let safeToCleanupUploadedPhoto = false;
    try {
      setUploading(true);
      const result = await pickImage();
      if (!result) return;
      const photoResult = await uploadImage(result.uri, 'spot_photos', user.id);
      uploadedUrl = photoResult.url;
      const { data, error } = await spotsService.addPhoto(
        spotId,
        photoResult.url,
        photoResult.fileSize,
        `Photo of ${spot?.name ?? 'skate spot'}`
      );
      if (error) {
        safeToCleanupUploadedPhoto = true;
        throw error;
      }
      if (!data) throw new Error('The spot photo did not return a saved record.');
      attached = true;
      await loadSpotData();
      Alert.alert('Photo saved', 'The photo is attached to this spot for every skater.');
    } catch (error) {
      Logger.error('Spot photo upload failed', error);
      if (uploadedUrl && !attached && safeToCleanupUploadedPhoto) {
        try {
          await deleteFromStorage(uploadedUrl, 'spot-photos');
        } catch (cleanupError) {
          Logger.warn('Orphan spot photo cleanup failed', cleanupError);
        }
      }
      Alert.alert('Photo not saved', getSpotSubmissionErrorMessage(error));
    } finally {
      setUploading(false);
    }
  };

  const reportCondition = async (condition: string) => {
    if (!user) return;
    try {
      await spotsService.reportCondition(spotId, user.id, condition);
      Alert.alert('Success', 'Condition reported!');
      setShowConditionsModal(false);
      await loadSpotData();
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  };

  const submitComment = async () => {
    if (!user || !commentText.trim()) return;
    try {
      setSubmittingComment(true);
      const { error } = await supabase
        .from('spot_comments')
        .insert([{ spot_id: spotId, user_id: user.id, content: commentText.trim() }]);
      if (error) throw error;
      setCommentText('');
      await loadSpotData();
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setSubmittingComment(false);
    }
  };

  const getDifficultyColor = (difficulty?: string) => {
    switch (difficulty) {
      case 'Beginner':
        return '#22C55E';
      case 'Intermediate':
        return '#F59E0B';
      case 'Advanced':
        return '#EF4444';
      default:
        return '#7B8493';
    }
  };

  const getConditionLabel = (condition: string) => condition.replace('_', ' ').toUpperCase();

  if (loading) {
    return (
      <View className="flex-1 bg-[#07090D] p-4 pt-8">
        <LoadingSkeleton height={300} className="mb-4" />
        <LoadingSkeleton height={120} className="mb-4" />
        <LoadingSkeleton height={100} className="mb-4" />
      </View>
    );
  }

  if (!spot) {
    return (
      <View className="flex-1 bg-[#07090D] justify-center items-center px-8">
        <MapPin size={34} color="#596271" />
        <Text className="text-white text-lg font-black mt-3">Spot not found</Text>
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-[#07090D]" contentContainerStyle={{ paddingBottom: 36 }}>
      <View style={{ height: 320 }} className="bg-black relative">
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
                  style={{ width, height: 320 }}
                  resizeMode="cover"
                />
              ))}
            </ScrollView>
            <View className="absolute bottom-[74px] left-0 right-0 flex-row justify-center gap-1.5">
              {photos.map((_, index) => (
                <View
                  key={index}
                  className={`w-2 h-2 rounded-full ${index === activePhotoIndex ? 'bg-white' : 'bg-white/40'}`}
                />
              ))}
            </View>
          </>
        ) : (
          <View className="flex-1 justify-center items-center bg-[#0B1017]">
            <Camera size={38} color="#596271" />
            <Text className="text-lg font-black text-white mt-3">No photos yet</Text>
            <Text className="text-sm text-[#697383] mt-1">
              Be the first skater to show the spot.
            </Text>
          </View>
        )}
        <View className="absolute left-0 right-0 bottom-0 h-24 bg-black/45" />
        <TouchableOpacity
          className="absolute bottom-5 right-5 bg-[#D2673D] px-4 py-3 rounded-2xl flex-row items-center gap-2"
          onPress={uploadSpotPhoto}
          disabled={uploading}
        >
          {uploading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Camera color="#fff" size={15} />
          )}
          <Text className="text-white text-sm font-black">
            {uploading ? 'Uploading' : 'Add Photo'}
          </Text>
        </TouchableOpacity>
      </View>

      <View className="px-5 pt-5 pb-4">
        <Text className="text-[#D2673D] text-[10px] font-black tracking-[1.7px]">SPOT INTEL</Text>
        <Text className="text-white text-[30px] font-black mt-1">{spot.name}</Text>
        <View className="flex-row flex-wrap items-center gap-2 mt-3">
          <View
            className="px-3 py-1.5 rounded-full border"
            style={{
              backgroundColor: `${getDifficultyColor(spot.difficulty)}18`,
              borderColor: `${getDifficultyColor(spot.difficulty)}55`,
            }}
          >
            <Text
              className="text-[10px] font-black uppercase"
              style={{ color: getDifficultyColor(spot.difficulty) }}
            >
              {spot.difficulty || 'Unknown'}
            </Text>
          </View>
          <TouchableOpacity
            className="flex-row items-center gap-1.5 bg-[#10151D] border border-[#252D39] px-3 py-1.5 rounded-full"
            onPress={() => navigation.navigate('SpotReviews', { spotId, spotName: spot.name })}
          >
            <Star color="#FFD166" size={14} fill="#FFD166" />
            <Text className="text-white text-xs font-black">
              {spot.rating ? spot.rating.toFixed(1) : '—'}
            </Text>
            <Text className="text-[#D2673D] text-[10px] font-black">REVIEWS</Text>
          </TouchableOpacity>
        </View>

        <View className="flex-row gap-2 mt-4">
          <SpotMetric label="POTENTIAL" value={spot.potential_rating} color="#D9F34A" />
          <SpotMetric label="HOW HARD" value={spot.difficulty_rating} color="#72A9FF" />
          <SpotMetric label="HOW GOOD" value={spot.rating} color="#E36D3F" />
        </View>
        <Text className="text-[#697383] text-[11px] mt-2">
          {spot.rating_count
            ? `${spot.rating_count} skater${spot.rating_count === 1 ? '' : 's'} rated this spot`
            : 'Not rated yet'}
        </Text>

        {spot.tricks && spot.tricks.length > 0 ? (
          <View className="mt-4">
            <Text className="text-[#7B8493] text-[10px] font-black tracking-[1.4px]">
              POPULAR TRICKS
            </Text>
            <View className="flex-row flex-wrap gap-2 mt-2">
              {spot.tricks.map((trick, index) => (
                <View
                  key={`${trick}-${index}`}
                  className="bg-[#10151D] border border-[#252D39] px-3 py-2 rounded-full"
                >
                  <Text className="text-[#D4D8DE] text-xs font-bold">{trick}</Text>
                </View>
              ))}
            </View>
          </View>
        ) : null}

        {spot.sponsor_name && spot.sponsor_url ? (
          <TouchableOpacity
            className="mt-4 bg-[#1B1110] border border-[#5B2D22] rounded-2xl p-4 flex-row items-center gap-3"
            onPress={() => Linking.openURL(spot.sponsor_url!)}
          >
            <ExternalLink size={18} color="#D2673D" />
            <View className="flex-1">
              <Text className="text-[#A96C59] text-[10px] font-black tracking-wider">
                SUPPORTED BY
              </Text>
              <Text className="text-white text-base font-black mt-0.5">{spot.sponsor_name}</Text>
            </View>
            <ChevronRight size={18} color="#D2673D" />
          </TouchableOpacity>
        ) : null}
      </View>

      <View className="mx-4 bg-[#10151D] border border-[#252D39] rounded-[22px] p-4 mb-4">
        <View className="flex-row items-center justify-between mb-3">
          <View className="flex-row items-center gap-2">
            <MapPin color="#D2673D" size={18} />
            <Text className="text-white text-lg font-black">Location</Text>
          </View>
          <Navigation size={16} color="#697383" />
        </View>
        <TouchableOpacity
          style={{ height: 205, borderRadius: 16, overflow: 'hidden' }}
          onPress={() => navigation.navigate('Map')}
        >
          <SpotMiniMap latitude={spot.latitude} longitude={spot.longitude} />
          <View className="absolute bottom-0 left-0 right-0 bg-black/70 p-3 items-center">
            <Text className="text-white text-xs font-black">OPEN ON MAP</Text>
          </View>
        </TouchableOpacity>
        <Text className="text-[#596271] text-[11px] font-mono mt-3">
          {spot.latitude.toFixed(6)}, {spot.longitude.toFixed(6)}
        </Text>
      </View>

      <View className="mx-4 mb-4">
        <KingOfTheHill spotId={spotId} />
      </View>
      <View className="mx-4 mb-4">
        <TerritoryControl spotId={spotId} />
      </View>
      <View className="mx-4 mb-4">
        <GhostClipViewer spotId={spotId} />
      </View>

      <View className="mx-4 bg-[#10151D] border border-[#252D39] rounded-[22px] p-4 mb-4">
        <View className="flex-row items-center justify-between mb-3">
          <View className="flex-row items-center gap-2">
            <ActivityIcon color="#F87171" size={18} />
            <Text className="text-white text-lg font-black">Live Conditions</Text>
          </View>
          <TouchableOpacity
            onPress={() => setShowConditionsModal(true)}
            className="bg-[#251112] border border-[#532326] px-3 py-2 rounded-xl"
          >
            <Text className="text-[#FCA5A5] text-[10px] font-black">REPORT</Text>
          </TouchableOpacity>
        </View>
        {conditions.length > 0 ? (
          conditions.map(c => (
            <View
              key={c.id}
              className="flex-row items-center py-3 border-b border-[#252D39] last:border-0"
            >
              <AlertTriangle size={15} color="#F59E0B" />
              <View className="flex-1 ml-3">
                <Text className="text-white text-sm font-black">
                  {getConditionLabel(c.condition)}
                </Text>
                <Text className="text-[#697383] text-xs mt-0.5">
                  by {c.reporter?.username || 'skater'} · {getTimeAgo(c.created_at)}
                </Text>
              </View>
            </View>
          ))
        ) : (
          <Text className="text-[#697383] text-sm text-center py-4">
            No recent conditions reported.
          </Text>
        )}
      </View>

      {challenges.length > 0 ? (
        <View className="mx-4 bg-[#10151D] border border-[#252D39] rounded-[22px] p-4 mb-4">
          <View className="flex-row items-center gap-2 mb-3">
            <Target color="#D2673D" size={18} />
            <Text className="text-white text-lg font-black">Active Challenges</Text>
          </View>
          {challenges.map(ch => (
            <TouchableOpacity
              key={ch.id}
              className="flex-row justify-between items-center py-3 border-b border-[#252D39] last:border-0"
              onPress={() => navigation.navigate('ChallengesTab')}
            >
              <Text className="text-[#D4D8DE] text-sm font-bold flex-1">{ch.trick}</Text>
              <Text className="text-[#4ADE80] text-xs font-black">+{ch.xp_reward} XP</Text>
            </TouchableOpacity>
          ))}
        </View>
      ) : null}

      <View className="mx-4 bg-[#10151D] border border-[#252D39] rounded-[22px] p-4 mb-4">
        <View className="flex-row items-center justify-between mb-3">
          <View className="flex-row items-center gap-2">
            <CalendarDays color="#A78BFA" size={18} />
            <Text className="text-white text-lg font-black">Sessions Here</Text>
          </View>
          <TouchableOpacity
            onPress={() => navigation.navigate('Sessions', { spotId, spotName: spot.name })}
          >
            <Text className="text-[#A78BFA] text-xs font-black">SEE ALL</Text>
          </TouchableOpacity>
        </View>

        {loadingSessions ? (
          <ActivityIndicator color="#A78BFA" size="small" style={{ marginVertical: 12 }} />
        ) : sessions.length === 0 ? (
          <Text className="text-[#697383] text-sm text-center py-4">
            No upcoming sessions — be the first to plan one.
          </Text>
        ) : (
          sessions.map(s => (
            <View key={s.id} className="py-3 border-b border-[#252D39] last:border-0">
              <View className="flex-row items-start justify-between gap-3">
                <View className="flex-1">
                  <Text className="text-white text-sm font-black">{s.title}</Text>
                  <Text className="text-[#7B8493] text-xs mt-1">
                    {formatSessionDate(s.scheduled_time)}
                  </Text>
                  <View className="flex-row items-center gap-2 mt-2">
                    <View
                      className="px-2 py-1 rounded-full"
                      style={{
                        backgroundColor: `${SESSION_STATUS_COLORS[s.status]}20`,
                        borderWidth: 1,
                        borderColor: `${SESSION_STATUS_COLORS[s.status]}55`,
                      }}
                    >
                      <Text
                        style={{ color: SESSION_STATUS_COLORS[s.status] }}
                        className="text-[9px] font-black"
                      >
                        {SESSION_STATUS_LABELS[s.status]}
                      </Text>
                    </View>
                    <View className="flex-row items-center gap-1">
                      <Users size={11} color="#7B8493" />
                      <Text className="text-[#7B8493] text-xs">
                        {s.attendee_count}
                        {s.max_attendees ? `/${s.max_attendees}` : ''} going
                      </Text>
                    </View>
                  </View>
                </View>
                {s.status !== 'ended' ? (
                  <TouchableOpacity
                    className={`px-3 py-2 rounded-xl border ${s.is_attending ? 'bg-[#12331F] border-[#285D39]' : 'bg-[#171020] border-[#4A3562]'}`}
                    onPress={() => toggleSessionRSVP(s)}
                    disabled={rsvpingId === s.id}
                  >
                    {rsvpingId === s.id ? (
                      <ActivityIndicator size="small" color="#A78BFA" />
                    ) : (
                      <Text
                        className={`text-[10px] font-black ${s.is_attending ? 'text-[#4ADE80]' : 'text-[#C4B5FD]'}`}
                      >
                        {s.is_attending ? 'GOING ✓' : 'RSVP'}
                      </Text>
                    )}
                  </TouchableOpacity>
                ) : null}
              </View>
            </View>
          ))
        )}

        <TouchableOpacity
          className="bg-[#7C3AED] rounded-xl py-3.5 items-center mt-3"
          onPress={() =>
            navigation.navigate('Sessions', { spotId, spotName: spot.name, autoCreate: true })
          }
        >
          <Text className="text-white text-xs font-black">+ PLAN A SESSION HERE</Text>
        </TouchableOpacity>
      </View>

      <View className="mx-4 bg-[#10151D] border border-[#252D39] rounded-[22px] p-4 mb-4">
        <View className="flex-row items-center gap-2 mb-3">
          <MessageCircle size={18} color="#38BDF8" />
          <Text className="text-white text-lg font-black">Comments</Text>
          <View className="bg-[#102334] border border-[#214967] rounded-full px-2 py-0.5">
            <Text className="text-[#7DD3FC] text-[10px] font-black">{comments.length}</Text>
          </View>
        </View>

        {comments.length === 0 ? (
          <Text className="text-[#697383] text-sm text-center py-4">
            No comments yet — start the spot talk.
          </Text>
        ) : null}
        {comments.slice(0, 10).map(c => (
          <View key={c.id} className="py-3 border-b border-[#252D39] last:border-0">
            <View className="flex-row items-center justify-between mb-1">
              <Text className="text-[#D2673D] text-xs font-black">
                @{c.author?.username ?? 'skater'}
              </Text>
              <Text className="text-[#596271] text-[10px]">{getTimeAgo(c.created_at)}</Text>
            </View>
            <Text className="text-[#C5CAD2] text-sm leading-5">{c.content}</Text>
          </View>
        ))}

        {user ? (
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <View className="flex-row items-center gap-2 mt-3">
              <TextInput
                className="flex-1 bg-[#090D13] border border-[#252D39] rounded-xl px-4 py-3 text-sm text-white"
                placeholder="Drop useful spot intel..."
                placeholderTextColor="#596271"
                value={commentText}
                onChangeText={setCommentText}
                maxLength={280}
                returnKeyType="send"
                onSubmitEditing={submitComment}
              />
              <TouchableOpacity
                className={`px-4 py-3 rounded-xl ${commentText.trim() ? 'bg-[#D2673D]' : 'bg-[#353B45]'}`}
                onPress={submitComment}
                disabled={submittingComment || !commentText.trim()}
              >
                {submittingComment ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text className="text-white font-black text-xs">POST</Text>
                )}
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        ) : null}
      </View>

      <TouchableOpacity
        className="mx-4 bg-[#D2673D] rounded-2xl py-4 flex-row items-center justify-center gap-2"
        onPress={() => navigation.navigate('ChallengesTab')}
      >
        <Target size={17} color="#fff" />
        <Text className="text-white font-black">VIEW ALL CHALLENGES</Text>
      </TouchableOpacity>

      <Modal
        visible={showConditionsModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowConditionsModal(false)}
      >
        <View className="flex-1 bg-black/70 justify-end">
          <View className="bg-[#10151D] border border-[#2A303A] rounded-t-[28px] p-5 pb-9">
            <View className="w-10 h-1 bg-[#343B47] rounded-full self-center mb-4" />
            <Text className="text-[#F87171] text-[10px] font-black tracking-[1.5px]">
              LIVE SPOT INTEL
            </Text>
            <Text className="text-white text-[22px] font-black mt-1">Report Condition</Text>
            <Text className="text-[#7B8493] text-sm mt-1 mb-5">
              What is the spot like right now?
            </Text>
            <View className="flex-row flex-wrap gap-2.5">
              {CONDITION_OPTIONS.map(option => (
                <TouchableOpacity
                  key={option.value}
                  className="w-[31%] bg-[#0B1017] border border-[#252D39] p-4 rounded-xl items-center"
                  onPress={() => reportCondition(option.value)}
                >
                  <Text className="text-[#D4D8DE] text-[10px] font-black text-center">
                    {option.label.toUpperCase()}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity
              className="bg-[#0B1017] border border-[#252D39] rounded-xl py-4 items-center mt-5"
              onPress={() => setShowConditionsModal(false)}
            >
              <Text className="text-[#AEB5C0] font-black">Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
});

function SpotMetric({ label, value, color }: { label: string; value?: number; color: string }) {
  return (
    <View className="flex-1 bg-[#10151D] border border-[#252D39] rounded-xl px-3 py-3">
      <Text className="text-[9px] font-black tracking-[0.8px]" style={{ color }}>
        {label}
      </Text>
      <Text className="text-white text-xl font-black mt-1">
        {typeof value === 'number' ? value.toFixed(1) : '—'}
      </Text>
      <Text className="text-[#596271] text-[9px]">OUT OF 5</Text>
    </View>
  );
}

function getTimeAgo(dateString: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateString).getTime()) / 1000);
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

function formatSessionDate(scheduledTime: string): string {
  const d = new Date(scheduledTime);
  return (
    d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) +
    ' · ' +
    d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  );
}

export default SpotDetailScreen;
