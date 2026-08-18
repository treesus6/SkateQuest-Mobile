import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  Linking,
  Modal,
  ScrollView,
  Text,
  TouchableOpacity,
  Vibration,
  View,
} from 'react-native';
import { Clock, Flame, Heart, MapPin, Music, Play, Plus, Square, Trophy, Zap } from 'lucide-react-native';
import { useRoute } from '../lib/useNavigation';
import { useAuthStore } from '../stores/useAuthStore';
import { supabase } from '../lib/supabase';
import { estimateCalories, saveSkateSessionToHealth } from '../lib/healthService';
import { feedService } from '../lib/feedService';

const SKATE_PLAYLISTS = [
  { name: 'Skate Punk Classics', uri: 'spotify:playlist:37i9dQZF1DX9tPFwDMOaN1' },
  { name: 'Hip-Hop Skate Bangers', uri: 'spotify:playlist:37i9dQZF1DXbTxeAdrVG2l' },
  { name: 'Chill Skate Vibes', uri: 'spotify:playlist:37i9dQZF1DX4WYpdgoIcn6' },
  { name: 'Metal & Skate', uri: 'spotify:playlist:37i9dQZF1DWXNFSTtym834' },
];

function formatTime(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return h > 0
    ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
    : `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export default function ActiveSessionScreenVerified() {
  const route = useRoute<any>();
  const { user } = useAuthStore();
  const spotId = route.params?.spotId ?? null;
  const spotName = route.params?.spotName || 'Unknown Spot';

  const [sessionId, setSessionId] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [started, setStarted] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [trickCount, setTrickCount] = useState(0);
  const [showEndModal, setShowEndModal] = useState(false);
  const [showPlaylistModal, setShowPlaylistModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [healthMessage, setHealthMessage] = useState<string | null>(null);
  const localStartMs = useRef<number | null>(null);
  const accumulatedBeforePause = useRef(0);

  useEffect(() => {
    if (!running) return;
    const interval = setInterval(() => {
      if (!localStartMs.current) return;
      const currentRun = Math.floor((Date.now() - localStartMs.current) / 1000);
      setElapsedSeconds(accumulatedBeforePause.current + currentRun);
    }, 1000);
    return () => clearInterval(interval);
  }, [running]);

  const startSession = useCallback(async () => {
    if (!user) {
      Alert.alert('Login required', 'Sign in before starting a session.');
      return;
    }
    try {
      const { data, error } = await supabase.rpc('start_skate_session', {
        p_spot_id: spotId,
        p_spot_name: spotName,
      });
      if (error) throw error;
      setSessionId(String(data));
      accumulatedBeforePause.current = 0;
      localStartMs.current = Date.now();
      setElapsedSeconds(0);
      setStarted(true);
      setRunning(true);
    } catch (error: any) {
      Alert.alert('Could not start session', error?.message || 'Please try again.');
    }
  }, [spotId, spotName, user]);

  const pauseSession = useCallback(() => {
    if (localStartMs.current) {
      accumulatedBeforePause.current += Math.floor((Date.now() - localStartMs.current) / 1000);
    }
    localStartMs.current = null;
    setRunning(false);
  }, []);

  const resumeSession = useCallback(() => {
    localStartMs.current = Date.now();
    setRunning(true);
  }, []);

  const handleEndSession = () => {
    if (running) pauseSession();
    setShowEndModal(true);
  };

  const saveSession = async () => {
    if (!user || !sessionId) return;
    setSaving(true);
    try {
      const { data, error } = await supabase.rpc('finish_skate_session', {
        p_session_id: sessionId,
      });
      if (error) throw error;
      const result = (data || {}) as {
        duration_minutes?: number;
        xp_awarded?: number;
      };
      const durationMinutes = Number(result.duration_minutes || 0);
      const xpAwarded = Number(result.xp_awarded || 0);
      const calories = estimateCalories(durationMinutes);

      await feedService.create({
        user_id: user.id,
        activity_type: 'skate_session',
        title: `Skated ${spotName} for ${durationMinutes} min`,
        description: `${trickCount} tricks logged · ~${calories} cal burned`,
        xp_earned: xpAwarded,
      }).catch(() => undefined);

      const healthResult = await saveSkateSessionToHealth({
        startTime: new Date(Date.now() - durationMinutes * 60_000),
        endTime: new Date(),
        durationMinutes,
        caloriesBurned: calories,
        spotName,
      });
      setHealthMessage(healthResult.message);
      setShowEndModal(false);
      Alert.alert(
        'Session Complete!',
        `${durationMinutes} min · ${trickCount} tricks · +${xpAwarded} XP${healthResult.success ? '\n✓ Saved to Health app' : ''}`
      );
    } catch (error: any) {
      Alert.alert('Could not finish session', error?.message || 'Your session was not awarded yet.');
    } finally {
      setSaving(false);
    }
  };

  const openSpotifyPlaylist = (uri: string) => {
    Linking.openURL(uri).catch(() => Linking.openURL('https://open.spotify.com').catch(() => undefined));
    setShowPlaylistModal(false);
  };

  const projectedXp = Math.min(Math.floor(elapsedSeconds / 60) * 2, 120);
  const calories = estimateCalories(Math.floor(elapsedSeconds / 60));

  return (
    <View className="flex-1 bg-gray-900">
      <View className="bg-gray-800 px-4 pt-12 pb-4">
        <View className="flex-row items-center gap-2 mb-1">
          <MapPin size={14} color="#d2673d" />
          <Text className="text-brand-terracotta text-sm font-semibold">{spotName}</Text>
        </View>
        <Text className="text-white text-2xl font-black">Active Session</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20 }}>
        <View className="bg-gray-800 rounded-3xl p-8 items-center mb-5">
          <View className="flex-row items-center gap-2 mb-2">
            <Clock size={14} color="#9CA3AF" />
            <Text className="text-gray-400 text-xs uppercase tracking-widest">Session Time</Text>
          </View>
          <Text className="text-7xl font-black text-white tracking-tight mb-1">{formatTime(elapsedSeconds)}</Text>
          {running ? <Text className="text-brand-green text-xs font-bold">● LIVE</Text> : null}
        </View>

        <View className="flex-row gap-3 mb-5">
          <View className="flex-1 bg-gray-800 rounded-2xl p-4 items-center">
            <Flame size={20} color="#FF6B35" />
            <Text className="text-white text-xl font-black mt-1">{calories}</Text>
            <Text className="text-gray-400 text-xs">cal burned</Text>
          </View>
          <View className="flex-1 bg-gray-800 rounded-2xl p-4 items-center">
            <Zap size={20} color="#FFD700" />
            <Text className="text-white text-xl font-black mt-1">+{projectedXp}</Text>
            <Text className="text-gray-400 text-xs">server XP</Text>
          </View>
          <View className="flex-1 bg-gray-800 rounded-2xl p-4 items-center">
            <Trophy size={20} color="#9333EA" />
            <Text className="text-white text-xl font-black mt-1">{trickCount}</Text>
            <Text className="text-gray-400 text-xs">tricks</Text>
          </View>
        </View>

        <TouchableOpacity
          className="bg-brand-terracotta rounded-2xl p-5 items-center mb-3"
          onPress={() => {
            if (!running) return;
            Vibration.vibrate(50);
            setTrickCount(v => v + 1);
          }}
          disabled={!running}
        >
          <Plus size={32} color="#fff" />
          <Text className="text-white font-black text-lg mt-1">Log a Trick</Text>
        </TouchableOpacity>

        <TouchableOpacity className="bg-[#1DB954] rounded-2xl p-4 items-center mb-3" onPress={() => setShowPlaylistModal(true)}>
          <View className="flex-row items-center gap-3">
            <Music size={20} color="#fff" />
            <Text className="text-white font-bold text-base">Open Skate Playlist</Text>
          </View>
        </TouchableOpacity>

        {healthMessage ? (
          <View className="flex-row items-center gap-2 bg-gray-800 rounded-xl px-4 py-3 mb-5">
            <Heart size={14} color="#EF4444" />
            <Text className="text-gray-400 text-xs flex-1">{healthMessage}</Text>
          </View>
        ) : null}

        {!started ? (
          <TouchableOpacity className="bg-brand-green rounded-2xl py-5 items-center" onPress={startSession}>
            <Play size={28} color="#fff" fill="#fff" />
            <Text className="text-white font-black text-lg mt-1">Start Session</Text>
          </TouchableOpacity>
        ) : (
          <View className="flex-row gap-3">
            <TouchableOpacity className={`flex-1 rounded-2xl py-4 items-center ${running ? 'bg-amber-500' : 'bg-brand-green'}`} onPress={running ? pauseSession : resumeSession}>
              <Text className="text-white font-black text-base">{running ? 'Pause' : 'Resume'}</Text>
            </TouchableOpacity>
            <TouchableOpacity className="flex-1 bg-red-500 rounded-2xl py-4 items-center" onPress={handleEndSession}>
              <Square size={18} color="#fff" fill="#fff" />
              <Text className="text-white font-black text-base mt-0.5">End Session</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      <Modal visible={showEndModal} transparent animationType="fade" onRequestClose={() => setShowEndModal(false)}>
        <View className="flex-1 bg-black/70 items-center justify-center px-6">
          <View className="bg-gray-800 rounded-3xl p-6 w-full">
            <Text className="text-white text-xl font-black text-center mb-2">End Session?</Text>
            <Text className="text-gray-400 text-sm text-center mb-5">Supabase will calculate the final duration and XP from server time.</Text>
            <View className="flex-row gap-3">
              <TouchableOpacity className="flex-1 bg-gray-700 rounded-xl py-3 items-center" onPress={() => setShowEndModal(false)} disabled={saving}>
                <Text className="text-gray-300 font-bold">Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity className="flex-1 bg-brand-terracotta rounded-xl py-3 items-center" onPress={saveSession} disabled={saving}>
                <Text className="text-white font-bold">{saving ? 'Saving...' : 'Save & End'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={showPlaylistModal} transparent animationType="slide" onRequestClose={() => setShowPlaylistModal(false)}>
        <View className="flex-1 bg-black/60 justify-end">
          <View className="bg-gray-800 rounded-t-3xl p-6">
            <Text className="text-white text-xl font-black mb-4">Skate Playlists</Text>
            {SKATE_PLAYLISTS.map(p => (
              <TouchableOpacity key={p.uri} className="bg-gray-700 rounded-xl px-4 py-3 mb-2" onPress={() => openSpotifyPlaylist(p.uri)}>
                <Text className="text-white font-semibold">{p.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>
    </View>
  );
}
