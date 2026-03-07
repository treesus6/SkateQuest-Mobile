import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  FlatList,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { Video, ResizeMode, AVPlaybackStatus } from 'expo-av';
import { Tv, SkipForward, SkipBack, Play, Pause, Volume2, VolumeX, Tv2 } from 'lucide-react-native';
import { supabase } from '../lib/supabase';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const TV_WIDTH = SCREEN_WIDTH - 32;
const TV_HEIGHT = TV_WIDTH * 0.56; // 16:9 aspect ratio

interface SkateVideo {
  id: string;
  url: string;
  caption?: string;
  trick_name?: string;
  created_at: string;
  user_id: string;
  profiles?: { username?: string };
}

// Scanline overlay — thin stripes for that CRT feel
function Scanlines() {
  const lines = Array.from({ length: 40 });
  return (
    <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, pointerEvents: 'none' }}>
      {lines.map((_, i) => (
        <View
          key={i}
          style={{
            position: 'absolute',
            top: i * (TV_HEIGHT / 40),
            left: 0,
            right: 0,
            height: 1,
            backgroundColor: 'rgba(0,0,0,0.12)',
          }}
        />
      ))}
    </View>
  );
}

export default function SkateTVScreen() {
  const [videos, setVideos] = useState<SkateVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [channel, setChannel] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [muted, setMuted] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const videoRef = useRef<Video>(null);

  useEffect(() => {
    fetchVideos();
  }, []);

  const fetchVideos = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('media')
      .select('id, url, caption, trick_name, created_at, user_id, profiles:user_id(username)')
      .eq('type', 'video')
      .order('created_at', { ascending: false })
      .limit(50);
    setVideos(data ?? []);
    setLoading(false);
  };

  const currentVideo = videos[channel] ?? null;
  const channelNum = channel + 1;
  const totalChannels = videos.length;

  const nextChannel = useCallback(() => {
    setChannel(c => (c + 1) % Math.max(videos.length, 1));
    setIsBuffering(true);
  }, [videos.length]);

  const prevChannel = useCallback(() => {
    setChannel(c => (c - 1 + Math.max(videos.length, 1)) % Math.max(videos.length, 1));
    setIsBuffering(true);
  }, [videos.length]);

  const togglePlay = async () => {
    if (!videoRef.current) return;
    if (playing) {
      await videoRef.current.pauseAsync();
    } else {
      await videoRef.current.playAsync();
    }
    setPlaying(p => !p);
  };

  const onPlaybackStatusUpdate = (status: AVPlaybackStatus) => {
    if (!status.isLoaded) return;
    if (status.didJustFinish) nextChannel();
    setIsBuffering(!!status.isBuffering);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#1c0f07' }}>
      {/* Shop header sign */}
      <View className="items-center pt-4 pb-2">
        <View className="flex-row items-center gap-2">
          <Tv2 color="#FF6B35" size={22} />
          <Text
            style={{
              color: '#FF6B35',
              fontSize: 22,
              fontWeight: '900',
              letterSpacing: 4,
              textTransform: 'uppercase',
            }}
          >
            SKATE TV
          </Text>
          <Tv2 color="#FF6B35" size={22} />
        </View>
        <Text style={{ color: '#a0714f', fontSize: 11, letterSpacing: 2, marginTop: 2 }}>
          COMMUNITY CLIPS CHANNEL
        </Text>
      </View>

      {/* TV cabinet */}
      <View
        style={{
          marginHorizontal: 16,
          marginTop: 8,
          backgroundColor: '#2d1a0e',
          borderRadius: 20,
          padding: 14,
          shadowColor: '#000',
          shadowOpacity: 0.8,
          shadowRadius: 12,
          elevation: 12,
          borderWidth: 3,
          borderColor: '#4a2c1a',
        }}
      >
        {/* TV bezel */}
        <View
          style={{
            backgroundColor: '#111',
            borderRadius: 10,
            overflow: 'hidden',
            borderWidth: 4,
            borderColor: '#222',
            width: TV_WIDTH - 28,
            height: TV_HEIGHT,
          }}
        >
          {loading ? (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#111' }}>
              <ActivityIndicator color="#FF6B35" size="large" />
              <Text style={{ color: '#555', marginTop: 8, fontSize: 12 }}>Loading channels...</Text>
            </View>
          ) : !currentVideo ? (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#111' }}>
              <Tv color="#333" size={48} />
              <Text style={{ color: '#444', marginTop: 12, fontSize: 14 }}>No videos yet</Text>
              <Text style={{ color: '#333', fontSize: 11, marginTop: 4 }}>Upload clips to air them here</Text>
            </View>
          ) : (
            <View style={{ flex: 1 }}>
              <Video
                ref={videoRef}
                source={{ uri: currentVideo.url }}
                style={{ width: '100%', height: '100%' }}
                resizeMode={ResizeMode.COVER}
                shouldPlay={playing}
                isMuted={muted}
                isLooping={false}
                onPlaybackStatusUpdate={onPlaybackStatusUpdate}
              />
              <Scanlines />
              {/* Buffering spinner */}
              {isBuffering && (
                <View
                  style={{
                    position: 'absolute',
                    top: 0, left: 0, right: 0, bottom: 0,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: 'rgba(0,0,0,0.4)',
                  }}
                >
                  <ActivityIndicator color="#FF6B35" />
                </View>
              )}
              {/* Channel badge */}
              <View
                style={{
                  position: 'absolute',
                  top: 8,
                  right: 8,
                  backgroundColor: 'rgba(0,0,0,0.7)',
                  paddingHorizontal: 8,
                  paddingVertical: 3,
                  borderRadius: 4,
                }}
              >
                <Text style={{ color: '#FF6B35', fontWeight: 'bold', fontSize: 11 }}>
                  CH {String(channelNum).padStart(2, '0')}
                </Text>
              </View>
            </View>
          )}
        </View>

        {/* TV brand strip */}
        <View className="flex-row justify-between items-center mt-3 px-1">
          <Text style={{ color: '#a0714f', fontSize: 10, letterSpacing: 3 }}>SK8TV</Text>
          <View className="flex-row gap-1">
            {[0, 1, 2].map(i => (
              <View key={i} style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: i === 0 ? '#FF6B35' : '#333' }} />
            ))}
          </View>
        </View>
      </View>

      {/* Now Playing info */}
      {currentVideo && (
        <View className="mx-4 mt-3 px-3 py-2" style={{ backgroundColor: 'rgba(255,107,53,0.1)', borderRadius: 10, borderLeftWidth: 3, borderLeftColor: '#FF6B35' }}>
          <Text style={{ color: '#FF6B35', fontSize: 10, fontWeight: '700', letterSpacing: 1 }}>NOW PLAYING</Text>
          <Text style={{ color: '#f5ddc8', fontSize: 15, fontWeight: '700', marginTop: 2 }} numberOfLines={1}>
            {currentVideo.trick_name || currentVideo.caption || 'Untitled Clip'}
          </Text>
          <Text style={{ color: '#a0714f', fontSize: 12, marginTop: 1 }}>
            by {(currentVideo.profiles as any)?.username || 'Unknown Skater'}
          </Text>
        </View>
      )}

      {/* Remote control */}
      <View
        style={{
          marginHorizontal: 16,
          marginTop: 16,
          backgroundColor: '#1a0c05',
          borderRadius: 20,
          padding: 16,
          borderWidth: 2,
          borderColor: '#3a2010',
        }}
      >
        <Text style={{ color: '#5a3520', fontSize: 10, letterSpacing: 3, textAlign: 'center', marginBottom: 12 }}>
          REMOTE
        </Text>
        <View className="flex-row justify-between items-center">
          {/* Prev channel */}
          <TouchableOpacity
            onPress={prevChannel}
            style={{ backgroundColor: '#2d1a0e', padding: 14, borderRadius: 40, borderWidth: 1, borderColor: '#4a2c1a' }}
          >
            <SkipBack color="#FF6B35" size={22} />
          </TouchableOpacity>

          {/* Play/Pause */}
          <TouchableOpacity
            onPress={togglePlay}
            style={{
              backgroundColor: '#FF6B35',
              padding: 18,
              borderRadius: 50,
              shadowColor: '#FF6B35',
              shadowOpacity: 0.5,
              shadowRadius: 10,
              elevation: 8,
            }}
          >
            {playing ? <Pause color="#fff" size={28} /> : <Play color="#fff" size={28} />}
          </TouchableOpacity>

          {/* Next channel */}
          <TouchableOpacity
            onPress={nextChannel}
            style={{ backgroundColor: '#2d1a0e', padding: 14, borderRadius: 40, borderWidth: 1, borderColor: '#4a2c1a' }}
          >
            <SkipForward color="#FF6B35" size={22} />
          </TouchableOpacity>
        </View>

        {/* Mute + channel count row */}
        <View className="flex-row justify-between items-center mt-4">
          <TouchableOpacity
            onPress={() => setMuted(m => !m)}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}
          >
            {muted ? <VolumeX color="#a0714f" size={16} /> : <Volume2 color="#FF6B35" size={16} />}
            <Text style={{ color: muted ? '#5a3520' : '#a0714f', fontSize: 12 }}>
              {muted ? 'MUTED' : 'SOUND ON'}
            </Text>
          </TouchableOpacity>
          <Text style={{ color: '#5a3520', fontSize: 11 }}>
            {channelNum} / {totalChannels || '—'} channels
          </Text>
        </View>
      </View>

      {/* Up next - horizontal clip list */}
      {videos.length > 1 && (
        <View style={{ marginTop: 16 }}>
          <Text style={{ color: '#a0714f', fontSize: 11, letterSpacing: 2, marginLeft: 16, marginBottom: 8 }}>
            UP NEXT
          </Text>
          <FlatList
            data={videos.filter((_, i) => i !== channel).slice(0, 8)}
            horizontal
            showsHorizontalScrollIndicator={false}
            keyExtractor={item => item.id}
            contentContainerStyle={{ paddingHorizontal: 16, gap: 10 }}
            renderItem={({ item, index }) => {
              const realIndex = index >= channel ? index + 1 : index;
              return (
                <TouchableOpacity
                  onPress={() => { setChannel(realIndex); setIsBuffering(true); }}
                  style={{
                    backgroundColor: '#2d1a0e',
                    borderRadius: 10,
                    padding: 10,
                    width: 120,
                    borderWidth: 1,
                    borderColor: '#4a2c1a',
                  }}
                >
                  <View style={{ width: '100%', height: 60, backgroundColor: '#111', borderRadius: 6, alignItems: 'center', justifyContent: 'center', marginBottom: 6 }}>
                    <Tv color="#333" size={20} />
                  </View>
                  <Text style={{ color: '#f5ddc8', fontSize: 11, fontWeight: '600' }} numberOfLines={1}>
                    {item.trick_name || item.caption || 'Clip'}
                  </Text>
                  <Text style={{ color: '#5a3520', fontSize: 10, marginTop: 2 }} numberOfLines={1}>
                    {(item.profiles as any)?.username || 'Skater'}
                  </Text>
                </TouchableOpacity>
              );
            }}
          />
        </View>
      )}
    </SafeAreaView>
  );
}
