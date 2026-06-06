/**
 * ActiveSessionScreen.tsx
 * The "I'm skating right now" screen.
 *
 * Features:
 *  - Live session timer
 *  - Trick counter (tap to log tricks during the session)
 *  - Spotify mini-player (opens Spotify to a playlist)
 *  - End session → saves to Apple Health / Google Fit
 *  - Awards XP based on session duration
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  ScrollView,
  Linking,
  Modal,
  Vibration,
} from 'react-native';
import {
  Play,
  Square,
  Plus,
  Music,
  Heart,
  Zap,
  MapPin,
  Clock,
  Flame,
  Trophy,
} from 'lucide-react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuthStore } from '../stores/useAuthStore';
import { feedService } from '../lib/feedService';
import { profilesService } from '../lib/profilesService';
import {
  SessionTimer,
  saveSkateSessionToHealth,
  estimateCalories,
} from '../lib/healthService';
import { RootStackParamList } from '../types';

// XP awarded per minute of skating (capped at 60 min = 120 XP per session)
const XP_PER_MINUTE = 2;
const MAX_SESSION_XP = 120;

// Spotify skate playlists (curated — users can also open their own)
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
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

type RouteParams = {
  ActiveSession: {
    spotId?: string;
    spotName?: string;
  };
};

export default function ActiveSessionScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RouteParams, 'ActiveSession'>>();
  const { user } = useAuthStore();

  const spotName = route.params?.spotName || 'Unknown Spot';
  const spotId = route.params?.spotId;

  const timerRef = useRef(new SessionTimer());
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [isRunning, setIsRunning] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [trickCount, setTrickCount] = useState(0);
  const [sessionStarted, setSessionStarted] = useState(false);
  const [showEndModal, setShowEndModal] = useState(false);
  const [showPlaylistModal, setShowPlaylistModal] = useState(false);
  const [healthSynced, setHealthSynced] = useState(false);
  const [saving, setSaving] = useState(false);

  const calories = estimateCalories(Math.floor(elapsedSeconds / 60));
  const xpEarned = Math.min(Math.floor(elapsedSeconds / 60) * XP_PER_MINUTE, MAX_SESSION_XP);

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const startSession = useCallback(() => {
    timerRef.current.start();
    setIsRunning(true);
    setSessionStarted(true);
    intervalRef.current = setInterval(() => {
      setElapsedSeconds(timerRef.current.getDurationSeconds());
    }, 1000);
  }, []);

  const pauseSession = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setIsRunning(false);
  }, []);

  const resumeSession = useCallback(() => {
    intervalRef.current = setInterval(() => {
      setElapsedSeconds(timerRef.current.getDurationSeconds());
    }, 1000);
    setIsRunning(true);
  }, []);

  const logTrick = useCallback(() => {
    Vibration.vibrate(50);
    setTrickCount(prev => prev + 1);
  }, []);

  const handleEndSession = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    timerRef.current.stop();
    setIsRunning(false);
    setShowEndModal(true);
  };

  const saveSession = async () => {
    if (!user) return;
    setSaving(true);

    const durationMinutes = timerRef.current.getDurationMinutes();

    try {
      // Award XP
      if (xpEarned > 0) {
        await profilesService.incrementXp(user.id, xpEarned).catch(() => {});
      }

      // Log to activity feed
      await feedService.create({
        user_id: user.id,
        activity_type: 'skate_session',
        title: `Skated ${spotName} for ${durationMinutes} min`,
        description: `${trickCount} tricks logged · ~${calories} cal burned`,
        xp_earned: xpEarned,
      }).catch(() => {});

      // Sync to Apple Health / Google Fit
      const startTime = timerRef.current.getStartTime() || new Date();
      const endTime = timerRef.current.getEndTime() || new Date();

      const healthResult = await saveSkateSessionToHealth({
        startTime,
        endTime,
        durationMinutes,
        caloriesBurned: calories,
        spotName,
      });

      if (healthResult.success) setHealthSynced(true);

      setShowEndModal(false);
      Alert.alert(
        'Session Complete!',
        `${durationMinutes} min · ${trickCount} tricks · +${xpEarned} XP${healthResult.success ? '\n✓ Saved to Health app' : ''}`,
        [{ text: 'Awesome!', onPress: () => navigation.goBack() }]
      );
    } catch (err) {
      Alert.alert('Error', 'Could not save session. Your XP may not have been updated.');
    } finally {
      setSaving(false);
    }
  };

  const openSpotifyPlaylist = (uri: string) => {
    Linking.openURL(uri).catch(() => {
      Linking.openURL('https://open.spotify.com').catch(() => {
        Alert.alert('Spotify not installed', 'Install Spotify to use this feature.');
      });
    });
    setShowPlaylistModal(false);
  };

  return (
    <View className="flex-1 bg-gray-900">
      {/* Header */}
      <View className="bg-gray-800 px-4 pt-12 pb-4">
        <View className="flex-row items-center gap-2 mb-1">
          <MapPin size={14} color="#d2673d" />
          <Text className="text-brand-terracotta text-sm font-semibold">{spotName}</Text>
        </View>
        <Text className="text-white text-2xl font-black">Active Session</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20 }}>
        {/* Timer Display */}
        <View className="bg-gray-800 rounded-3xl p-8 items-center mb-5">
          <View className="flex-row items-center gap-2 mb-2">
            <Clock size={14} color="#9CA3AF" />
            <Text className="text-gray-400 text-xs uppercase tracking-widest">Session Time</Text>
          </View>
          <Text className="text-7xl font-black text-white tracking-tight mb-1">
            {formatTime(elapsedSeconds)}
          </Text>
          {isRunning && (
            <View className="flex-row items-center gap-1.5 bg-brand-green/20 px-3 py-1 rounded-full">
              <View className="w-2 h-2 bg-brand-green rounded-full" />
              <Text className="text-brand-green text-xs font-bold">LIVE</Text>
            </View>
          )}
        </View>

        {/* Stats Row */}
        <View className="flex-row gap-3 mb-5">
          <View className="flex-1 bg-gray-800 rounded-2xl p-4 items-center">
            <Flame size={20} color="#FF6B35" />
            <Text className="text-white text-xl font-black mt-1">{calories}</Text>
            <Text className="text-gray-400 text-xs">cal burned</Text>
          </View>
          <View className="flex-1 bg-gray-800 rounded-2xl p-4 items-center">
            <Zap size={20} color="#FFD700" />
            <Text className="text-white text-xl font-black mt-1">+{xpEarned}</Text>
            <Text className="text-gray-400 text-xs">XP earned</Text>
          </View>
          <View className="flex-1 bg-gray-800 rounded-2xl p-4 items-center">
            <Trophy size={20} color="#9333EA" />
            <Text className="text-white text-xl font-black mt-1">{trickCount}</Text>
            <Text className="text-gray-400 text-xs">tricks</Text>
          </View>
        </View>

        {/* Trick Counter */}
        <TouchableOpacity
          className="bg-brand-terracotta rounded-2xl p-5 items-center mb-3 active:opacity-80"
          onPress={logTrick}
          disabled={!isRunning}
        >
          <Plus size={32} color="#fff" />
          <Text className="text-white font-black text-lg mt-1">Log a Trick</Text>
          <Text className="text-white/70 text-xs">Tap every time you land one</Text>
        </TouchableOpacity>

        {/* Spotify Button */}
        <TouchableOpacity
          className="bg-[#1DB954] rounded-2xl p-4 flex-row items-center justify-center gap-3 mb-3"
          onPress={() => setShowPlaylistModal(true)}
        >
          <Music size={20} color="#fff" />
          <Text className="text-white font-bold text-base">Open Skate Playlist</Text>
        </TouchableOpacity>

        {/* Health Sync Note */}
        {!healthSynced && (
          <View className="flex-row items-center gap-2 bg-gray-800 rounded-xl px-4 py-3 mb-5">
            <Heart size={14} color="#EF4444" />
            <Text className="text-gray-400 text-xs flex-1">
              Session will sync to Apple Health / Google Fit when you end it.
            </Text>
          </View>
        )}

        {/* Start / Pause / End Controls */}
        {!sessionStarted ? (
          <TouchableOpacity
            className="bg-brand-green rounded-2xl py-5 items-center"
            onPress={startSession}
          >
            <Play size={28} color="#fff" fill="#fff" />
            <Text className="text-white font-black text-lg mt-1">Start Session</Text>
          </TouchableOpacity>
        ) : (
          <View className="flex-row gap-3">
            <TouchableOpacity
              className={`flex-1 rounded-2xl py-4 items-center ${isRunning ? 'bg-amber-500' : 'bg-brand-green'}`}
              onPress={isRunning ? pauseSession : resumeSession}
            >
              <Text className="text-white font-black text-base">
                {isRunning ? 'Pause' : 'Resume'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              className="flex-1 bg-red-500 rounded-2xl py-4 items-center"
              onPress={handleEndSession}
            >
              <Square size={18} color="#fff" fill="#fff" />
              <Text className="text-white font-black text-base mt-0.5">End Session</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* End Session Confirmation Modal */}
      <Modal visible={showEndModal} transparent animationType="fade" onRequestClose={() => setShowEndModal(false)}>
        <View className="flex-1 bg-black/70 items-center justify-center px-6">
          <View className="bg-gray-800 rounded-3xl p-6 w-full">
            <Text className="text-white text-xl font-black text-center mb-1">End Session?</Text>
            <Text className="text-gray-400 text-sm text-center mb-5">
              {Math.floor(elapsedSeconds / 60)} min · {trickCount} tricks · +{xpEarned} XP
            </Text>

            <View className="bg-gray-700 rounded-2xl p-4 mb-5">
              <View className="flex-row items-center gap-2 mb-2">
                <Heart size={14} color="#EF4444" />
                <Text className="text-white text-sm font-bold">Health Sync</Text>
              </View>
              <Text className="text-gray-400 text-xs">
                This session will be saved to Apple Health / Google Fit as a Skateboarding workout.
              </Text>
            </View>

            <View className="flex-row gap-3">
              <TouchableOpacity
                className="flex-1 bg-gray-700 rounded-xl py-3 items-center"
                onPress={() => setShowEndModal(false)}
                disabled={saving}
              >
                <Text className="text-gray-300 font-bold">Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                className="flex-1 bg-brand-terracotta rounded-xl py-3 items-center"
                onPress={saveSession}
                disabled={saving}
              >
                <Text className="text-white font-bold">{saving ? 'Saving...' : 'Save & End'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Spotify Playlist Modal */}
      <Modal visible={showPlaylistModal} transparent animationType="slide" onRequestClose={() => setShowPlaylistModal(false)}>
        <View className="flex-1 bg-black/60 justify-end">
          <View className="bg-gray-800 rounded-t-3xl p-6">
            <Text className="text-white text-xl font-black mb-1">Skate Playlists</Text>
            <Text className="text-gray-400 text-sm mb-4">Opens in Spotify</Text>
            {SKATE_PLAYLISTS.map(playlist => (
              <TouchableOpacity
                key={playlist.uri}
                className="flex-row items-center gap-3 bg-gray-700 rounded-xl px-4 py-3 mb-2"
                onPress={() => openSpotifyPlaylist(playlist.uri)}
              >
                <Music size={16} color="#1DB954" />
                <Text className="text-white font-semibold flex-1">{playlist.name}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              className="mt-2 py-3 items-center"
              onPress={() => setShowPlaylistModal(false)}
            >
              <Text className="text-gray-400">Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}
