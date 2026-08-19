/** Active skate session with verified server-backed XP. */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, TouchableOpacity, Alert, ScrollView, Linking, Modal, Vibration, StyleSheet, Animated } from 'react-native';
import { Play, Square, Plus, Music, Heart, Zap, MapPin, Clock, Flame, Trophy, Pause, Radio } from 'lucide-react-native';
import { useNavigation, useRoute, RouteProp } from '../lib/useNavigation';
import { NativeStackNavigationProp } from '../lib/useNavigation';
import { useAuthStore } from '../stores/useAuthStore';
import { feedService } from '../lib/feedService';
import { supabase } from '../lib/supabase';
import { SessionTimer, saveSkateSessionToHealth, estimateCalories } from '../lib/healthService';
import { RootStackParamList } from '../types';

const XP_PER_MINUTE = 2;
const MAX_SESSION_XP = 120;
const SKATE_PLAYLISTS = [
  { name: 'Skate Punk Classics', uri: 'spotify:playlist:37i9dQZF1DX9tPFwDMOaN1' },
  { name: 'Hip-Hop Skate Bangers', uri: 'spotify:playlist:37i9dQZF1DXbTxeAdrVG2l' },
  { name: 'Chill Skate Vibes', uri: 'spotify:playlist:37i9dQZF1DX4WYpdgoIcn6' },
  { name: 'Metal & Skate', uri: 'spotify:playlist:37i9dQZF1DWXNFSTtym834' },
];

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}` : `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

type RouteParams = { ActiveSession: { spotId?: string; spotName?: string } };
type StartSessionResult = { session_id?: string; started_at?: string; resumed?: boolean };
type FinishSessionResult = { session_id?: string; duration_minutes?: number; xp_awarded?: number; trick_count?: number; already_completed?: boolean };

export default function ActiveSessionScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RouteParams, 'ActiveSession'>>();
  const { user } = useAuthStore();
  const spotId = route.params?.spotId;
  const spotName = route.params?.spotName || 'Unknown Spot';
  const timerRef = useRef(new SessionTimer());
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pulse = useRef(new Animated.Value(1)).current;

  const [isRunning, setIsRunning] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [trickCount, setTrickCount] = useState(0);
  const [sessionStarted, setSessionStarted] = useState(false);
  const [serverSessionId, setServerSessionId] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const [showEndModal, setShowEndModal] = useState(false);
  const [showPlaylistModal, setShowPlaylistModal] = useState(false);
  const [healthSynced, setHealthSynced] = useState(false);
  const [saving, setSaving] = useState(false);

  const calories = estimateCalories(Math.floor(elapsedSeconds / 60));
  const estimatedXp = Math.min(Math.floor(elapsedSeconds / 60) * XP_PER_MINUTE, MAX_SESSION_XP);

  useEffect(() => {
    const anim = Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 1.35, duration: 700, useNativeDriver: true }),
      Animated.timing(pulse, { toValue: 1, duration: 700, useNativeDriver: true }),
    ]));
    if (isRunning) anim.start(); else { anim.stop(); pulse.setValue(1); }
    return () => anim.stop();
  }, [isRunning, pulse]);

  useEffect(() => () => { if (intervalRef.current) clearInterval(intervalRef.current); }, []);

  const startSession = useCallback(async () => {
    if (!user?.id || starting) return;
    setStarting(true);
    try {
      const { data, error } = await supabase.rpc('start_skate_activity_session', { p_spot_id: spotId || null, p_spot_name: spotName });
      if (error) throw error;
      const result = (data ?? {}) as StartSessionResult;
      if (!result.session_id) throw new Error('The server did not create a session.');
      setServerSessionId(result.session_id);
      timerRef.current.start();
      setElapsedSeconds(0);
      setIsRunning(true);
      setSessionStarted(true);
      intervalRef.current = setInterval(() => setElapsedSeconds(timerRef.current.getDurationSeconds()), 1000);
    } catch (error: any) {
      Alert.alert('Could not start session', error?.message || 'Check your connection and try again.');
    } finally { setStarting(false); }
  }, [spotId, spotName, starting, user?.id]);

  const pauseSession = useCallback(() => { if (intervalRef.current) clearInterval(intervalRef.current); setIsRunning(false); }, []);
  const resumeSession = useCallback(() => { intervalRef.current = setInterval(() => setElapsedSeconds(timerRef.current.getDurationSeconds()), 1000); setIsRunning(true); }, []);
  const logTrick = useCallback(() => { if (!isRunning) return; Vibration.vibrate(50); setTrickCount(prev => prev + 1); }, [isRunning]);
  const handleEndSession = () => { if (intervalRef.current) clearInterval(intervalRef.current); timerRef.current.stop(); setIsRunning(false); setShowEndModal(true); };

  const saveSession = async () => {
    if (!user?.id || !serverSessionId) { Alert.alert('Session not saved', 'This session is missing its verified server record.'); return; }
    setSaving(true);
    try {
      const { data, error } = await supabase.rpc('finish_skate_activity_session', { p_session_id: serverSessionId, p_trick_count: trickCount });
      if (error) throw error;
      const result = (data ?? {}) as FinishSessionResult;
      const durationMinutes = Math.max(0, Number(result.duration_minutes ?? 0));
      const xpAwarded = Math.max(0, Number(result.xp_awarded ?? 0));
      const verifiedCalories = estimateCalories(durationMinutes);
      const { error: feedError } = await feedService.create({ user_id: user.id, activity_type: 'skate_session', title: `Skated ${spotName} for ${durationMinutes} min`, description: `${trickCount} tricks logged · ~${verifiedCalories} cal burned`, xp_earned: xpAwarded });
      if (feedError) console.warn('Verified session saved, but feed activity failed:', feedError.message);
      const healthResult = await saveSkateSessionToHealth({ startTime: timerRef.current.getStartTime() || new Date(), endTime: timerRef.current.getEndTime() || new Date(), durationMinutes, caloriesBurned: verifiedCalories, spotName });
      if (healthResult.success) setHealthSynced(true);
      setShowEndModal(false);
      Alert.alert('Session complete', `${durationMinutes} min · ${trickCount} tricks · +${xpAwarded} XP${healthResult.success ? '\nSaved to Health app' : ''}`, [{ text: 'Done', onPress: () => navigation.goBack() }]);
    } catch (error: any) { Alert.alert('Error', error?.message || 'Could not save the verified session.'); }
    finally { setSaving(false); }
  };

  const openSpotifyPlaylist = (uri: string) => {
    Linking.openURL(uri).catch(() => Linking.openURL('https://open.spotify.com').catch(() => Alert.alert('Spotify not installed', 'Install Spotify to use this feature.')));
    setShowPlaylistModal(false);
  };

  return (
    <View style={s.container}>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        <View style={s.header}>
          <View style={s.locationRow}><MapPin size={14} color="#D2673D" /><Text style={s.location}>{spotName}</Text></View>
          <View style={s.headerTitleRow}><View><Text style={s.kicker}>SESSION MODE</Text><Text style={s.title}>Active Session</Text></View>{sessionStarted ? <View style={s.verifiedBadge}><Radio size={13} color="#4ADE80" /><Text style={s.verifiedText}>SERVER LINKED</Text></View> : null}</View>
        </View>

        <View style={[s.timerCard, isRunning && s.timerCardLive]}>
          <View style={s.timerLabelRow}><Clock size={14} color="#8E97A4" /><Text style={s.timerLabel}>SESSION TIME</Text></View>
          <Text style={s.timer}>{formatTime(elapsedSeconds)}</Text>
          <View style={s.statusRow}>
            <Animated.View style={[s.liveDot, { transform: [{ scale: pulse }], backgroundColor: isRunning ? '#4ADE80' : '#596273' }]} />
            <Text style={[s.statusText, isRunning && { color: '#4ADE80' }]}>{isRunning ? 'LIVE SESSION' : sessionStarted ? 'PAUSED' : 'READY TO SKATE'}</Text>
          </View>
        </View>

        <View style={s.metricsRow}>
          <View style={s.metricCard}><Flame size={21} color="#FF6B35" /><Text style={s.metricValue}>{calories}</Text><Text style={s.metricLabel}>CALORIES</Text></View>
          <View style={s.metricCard}><Zap size={21} color="#F7C948" /><Text style={s.metricValue}>+{estimatedXp}</Text><Text style={s.metricLabel}>XP EST.</Text></View>
          <View style={s.metricCard}><Trophy size={21} color="#B56CFF" /><Text style={s.metricValue}>{trickCount}</Text><Text style={s.metricLabel}>TRICKS</Text></View>
        </View>

        <TouchableOpacity style={[s.trickButton, !isRunning && s.disabled]} onPress={logTrick} disabled={!isRunning} activeOpacity={0.86}>
          <View style={s.trickIcon}><Plus size={28} color="#fff" strokeWidth={3} /></View>
          <View style={{ flex: 1 }}><Text style={s.trickTitle}>Landed one?</Text><Text style={s.trickSub}>Tap to log a trick in this session</Text></View>
          <Text style={s.trickCount}>+1</Text>
        </TouchableOpacity>

        <TouchableOpacity style={s.musicButton} onPress={() => setShowPlaylistModal(true)}>
          <View style={s.spotifyIcon}><Music size={20} color="#fff" /></View><View style={{ flex: 1 }}><Text style={s.musicTitle}>Skate soundtrack</Text><Text style={s.musicSub}>Open a playlist in Spotify</Text></View><Text style={s.arrow}>›</Text>
        </TouchableOpacity>

        <View style={s.healthCard}><Heart size={17} color={healthSynced ? '#4ADE80' : '#EF6666'} /><Text style={s.healthText}>{healthSynced ? 'Session synced to your Health app.' : 'Final duration and verified XP are saved when you end the session.'}</Text></View>

        {!sessionStarted ? (
          <TouchableOpacity style={[s.primaryButton, starting && s.disabled]} onPress={() => void startSession()} disabled={starting}>
            <Play size={22} color="#fff" fill="#fff" /><Text style={s.primaryText}>{starting ? 'Starting verified session…' : 'Start session'}</Text>
          </TouchableOpacity>
        ) : (
          <View style={s.controlsRow}>
            <TouchableOpacity style={[s.controlButton, isRunning ? s.pauseButton : s.resumeButton]} onPress={isRunning ? pauseSession : resumeSession}>{isRunning ? <Pause size={19} color="#fff" fill="#fff" /> : <Play size={19} color="#fff" fill="#fff" />}<Text style={s.controlText}>{isRunning ? 'Pause' : 'Resume'}</Text></TouchableOpacity>
            <TouchableOpacity style={[s.controlButton, s.endButton]} onPress={handleEndSession}><Square size={18} color="#fff" fill="#fff" /><Text style={s.controlText}>End</Text></TouchableOpacity>
          </View>
        )}
      </ScrollView>

      <Modal visible={showEndModal} transparent animationType="fade" onRequestClose={() => setShowEndModal(false)}>
        <View style={s.modalOverlay}><View style={s.modalCard}><Text style={s.modalKicker}>SESSION SUMMARY</Text><Text style={s.modalTitle}>End this session?</Text><Text style={s.modalSummary}>{Math.floor(elapsedSeconds / 60)} min · {trickCount} tricks · up to +{estimatedXp} XP</Text><View style={s.verifyNote}><Zap size={16} color="#D2673D" /><Text style={s.verifyText}>SkateQuest verifies final duration and XP on the server when you save.</Text></View><View style={s.controlsRow}><TouchableOpacity style={[s.controlButton, s.cancelButton]} onPress={() => setShowEndModal(false)} disabled={saving}><Text style={s.cancelText}>Keep skating</Text></TouchableOpacity><TouchableOpacity style={[s.controlButton, s.primarySmall]} onPress={() => void saveSession()} disabled={saving}><Text style={s.controlText}>{saving ? 'Saving…' : 'Save & end'}</Text></TouchableOpacity></View></View></View>
      </Modal>

      <Modal visible={showPlaylistModal} transparent animationType="slide" onRequestClose={() => setShowPlaylistModal(false)}>
        <View style={s.sheetOverlay}><View style={s.sheet}><View style={s.sheetHandle} /><Text style={s.modalKicker}>SKATE SOUNDTRACK</Text><Text style={s.sheetTitle}>Pick a playlist</Text>{SKATE_PLAYLISTS.map(playlist => <TouchableOpacity key={playlist.uri} style={s.playlistRow} onPress={() => openSpotifyPlaylist(playlist.uri)}><View style={s.spotifyIcon}><Music size={17} color="#fff" /></View><Text style={s.playlistText}>{playlist.name}</Text><Text style={s.arrow}>›</Text></TouchableOpacity>)}<TouchableOpacity style={s.sheetCancel} onPress={() => setShowPlaylistModal(false)}><Text style={s.cancelText}>Cancel</Text></TouchableOpacity></View></View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#07090D' },
  scroll: { padding: 18, paddingTop: 52, paddingBottom: 40 },
  header: { marginBottom: 18 },
  locationRow: { flexDirection: 'row', gap: 6, alignItems: 'center' },
  location: { color: '#D2673D', fontSize: 13, fontWeight: '800' },
  headerTitleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 5, gap: 12 },
  kicker: { color: '#6E7785', fontSize: 9, fontWeight: '900', letterSpacing: 1.8 },
  title: { color: '#F7F4EF', fontSize: 30, fontWeight: '900', letterSpacing: -0.8, marginTop: 3 },
  verifiedBadge: { flexDirection: 'row', gap: 5, alignItems: 'center', borderRadius: 10, paddingHorizontal: 9, paddingVertical: 6, backgroundColor: 'rgba(74,222,128,0.08)', borderWidth: 1, borderColor: 'rgba(74,222,128,0.22)' },
  verifiedText: { color: '#4ADE80', fontSize: 8, fontWeight: '900', letterSpacing: 0.8 },
  timerCard: { alignItems: 'center', backgroundColor: '#0F1623', borderRadius: 26, padding: 28, borderWidth: 1, borderColor: '#1C2430', marginBottom: 14 },
  timerCardLive: { borderColor: 'rgba(74,222,128,0.35)' },
  timerLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  timerLabel: { color: '#8E97A4', fontSize: 10, fontWeight: '900', letterSpacing: 1.5 },
  timer: { color: '#fff', fontSize: 64, fontWeight: '900', letterSpacing: -2.5, marginVertical: 8 },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  liveDot: { width: 8, height: 8, borderRadius: 4 },
  statusText: { color: '#596273', fontSize: 10, fontWeight: '900', letterSpacing: 1.2 },
  metricsRow: { flexDirection: 'row', gap: 9, marginBottom: 14 },
  metricCard: { flex: 1, alignItems: 'center', backgroundColor: '#0F1623', borderRadius: 17, paddingVertical: 15, borderWidth: 1, borderColor: '#1C2430' },
  metricValue: { color: '#F7F4EF', fontSize: 20, fontWeight: '900', marginTop: 5 },
  metricLabel: { color: '#596273', fontSize: 8, fontWeight: '900', letterSpacing: 1, marginTop: 2 },
  trickButton: { flexDirection: 'row', alignItems: 'center', gap: 13, backgroundColor: '#D2673D', borderRadius: 19, padding: 15, marginBottom: 10 },
  trickIcon: { width: 48, height: 48, borderRadius: 15, backgroundColor: 'rgba(0,0,0,0.14)', alignItems: 'center', justifyContent: 'center' },
  trickTitle: { color: '#fff', fontSize: 17, fontWeight: '900' },
  trickSub: { color: 'rgba(255,255,255,0.75)', fontSize: 11, marginTop: 2 },
  trickCount: { color: '#fff', fontWeight: '900', fontSize: 18 },
  musicButton: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#0F1623', borderRadius: 17, padding: 14, borderWidth: 1, borderColor: '#1C2430', marginBottom: 10 },
  spotifyIcon: { width: 38, height: 38, borderRadius: 12, backgroundColor: '#1DB954', alignItems: 'center', justifyContent: 'center' },
  musicTitle: { color: '#F7F4EF', fontWeight: '900', fontSize: 14 },
  musicSub: { color: '#7B8493', fontSize: 11, marginTop: 2 },
  arrow: { color: '#7B8493', fontSize: 25 },
  healthCard: { flexDirection: 'row', alignItems: 'center', gap: 9, backgroundColor: '#0B1018', borderRadius: 14, padding: 13, borderWidth: 1, borderColor: '#1A2230', marginBottom: 18 },
  healthText: { color: '#8E97A4', fontSize: 11, lineHeight: 17, flex: 1 },
  primaryButton: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 9, backgroundColor: '#2F9D62', borderRadius: 17, paddingVertical: 17 },
  primaryText: { color: '#fff', fontWeight: '900', fontSize: 16 },
  controlsRow: { flexDirection: 'row', gap: 10 },
  controlButton: { flex: 1, flexDirection: 'row', gap: 7, alignItems: 'center', justifyContent: 'center', borderRadius: 15, paddingVertical: 14 },
  pauseButton: { backgroundColor: '#C88A2D' },
  resumeButton: { backgroundColor: '#2F9D62' },
  endButton: { backgroundColor: '#C94A4A' },
  controlText: { color: '#fff', fontSize: 14, fontWeight: '900' },
  disabled: { opacity: 0.42 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.82)', alignItems: 'center', justifyContent: 'center', padding: 22 },
  modalCard: { width: '100%', backgroundColor: '#0F1623', borderRadius: 24, padding: 21, borderWidth: 1, borderColor: '#243041' },
  modalKicker: { color: '#D2673D', fontSize: 9, fontWeight: '900', letterSpacing: 1.6 },
  modalTitle: { color: '#F7F4EF', fontSize: 24, fontWeight: '900', marginTop: 5 },
  modalSummary: { color: '#8E97A4', fontSize: 13, marginTop: 5, marginBottom: 16 },
  verifyNote: { flexDirection: 'row', gap: 9, backgroundColor: 'rgba(210,103,61,0.08)', borderRadius: 14, padding: 13, marginBottom: 17, borderWidth: 1, borderColor: 'rgba(210,103,61,0.18)' },
  verifyText: { color: '#B7BEC8', fontSize: 11, lineHeight: 17, flex: 1 },
  cancelButton: { backgroundColor: '#1B2431' },
  cancelText: { color: '#A9B1BC', fontWeight: '800' },
  primarySmall: { backgroundColor: '#D2673D' },
  sheetOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.72)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#0F1623', padding: 20, paddingBottom: 30, borderTopLeftRadius: 26, borderTopRightRadius: 26, borderWidth: 1, borderColor: '#243041' },
  sheetHandle: { width: 42, height: 4, backgroundColor: '#3A4351', borderRadius: 2, alignSelf: 'center', marginBottom: 18 },
  sheetTitle: { color: '#F7F4EF', fontSize: 23, fontWeight: '900', marginTop: 4, marginBottom: 15 },
  playlistRow: { flexDirection: 'row', gap: 12, alignItems: 'center', backgroundColor: '#151D28', padding: 12, borderRadius: 15, marginBottom: 8, borderWidth: 1, borderColor: '#222D3B' },
  playlistText: { flex: 1, color: '#E8EBEF', fontWeight: '800', fontSize: 13 },
  sheetCancel: { alignItems: 'center', paddingTop: 11 },
});