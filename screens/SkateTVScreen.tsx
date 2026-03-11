import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  FlatList,
  ActivityIndicator,
  Dimensions,
  ScrollView,
} from 'react-native';
import { Video, ResizeMode, AVPlaybackStatus } from 'expo-av';
import {
  Tv,
  SkipForward,
  SkipBack,
  Play,
  Pause,
  Volume2,
  VolumeX,
  ChevronLeft,
  Radio,
} from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { supabase } from '../lib/supabase';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SHELF_PADDING = 20;
const TV_OUTER = SCREEN_WIDTH - SHELF_PADDING * 2;
const TV_SCREEN_H = TV_OUTER * 0.5;

// ─── Shop Atmosphere Components ─────────────────────────────────────────────

/** A single skate deck mounted on the wall */
function WallDeck({ color, angle = 0, label }: { color: string; angle?: number; label?: string }) {
  return (
    <View style={{ alignItems: 'center', transform: [{ rotate: `${angle}deg` }] }}>
      <View style={{ width: 28, height: 90, backgroundColor: color, borderRadius: 14, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.08)' }} />
      {label ? (
        <Text style={{ color: 'rgba(255,255,255,0.25)', fontSize: 7, marginTop: 3, letterSpacing: 1 }}>{label}</Text>
      ) : null}
    </View>
  );
}

/** A sticker-style badge for the shop walls */
function Sticker({ text, bg, textColor = '#fff' }: { text: string; bg: string; textColor?: string }) {
  return (
    <View style={{ backgroundColor: bg, paddingHorizontal: 6, paddingVertical: 3, borderRadius: 4, transform: [{ rotate: '-3deg' }] }}>
      <Text style={{ color: textColor, fontSize: 9, fontWeight: '900', letterSpacing: 1 }}>{text}</Text>
    </View>
  );
}

/** CRT scanline overlay */
function Scanlines({ height }: { height: number }) {
  return (
    <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} pointerEvents="none">
      {Array.from({ length: Math.floor(height / 4) }).map((_, i) => (
        <View
          key={i}
          style={{ position: 'absolute', top: i * 4, left: 0, right: 0, height: 1, backgroundColor: 'rgba(0,0,0,0.18)' }}
        />
      ))}
      {/* Vignette-like edge darkening */}
      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 30, backgroundColor: 'rgba(0,0,0,0.25)' }} />
      <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 30, backgroundColor: 'rgba(0,0,0,0.25)' }} />
    </View>
  );
}

/** Neon tube letter-by-letter text effect */
function NeonText({ text, color }: { text: string; color: string }) {
  return (
    <View style={{ flexDirection: 'row' }}>
      {text.split('').map((char, i) => (
        <Text
          key={i}
          style={{
            color,
            fontSize: 28,
            fontWeight: '900',
            letterSpacing: 2,
            // Simulate neon glow with a slight shadow
            textShadowColor: color,
            textShadowOffset: { width: 0, height: 0 },
            textShadowRadius: 8,
          }}
        >
          {char}
        </Text>
      ))}
    </View>
  );
}

/** Brick row – simulates a section of brick wall */
function BrickRow({ offset = false }: { offset?: boolean }) {
  const bricks = Array.from({ length: 5 });
  return (
    <View style={{ flexDirection: 'row', marginLeft: offset ? -18 : 0 }}>
      {bricks.map((_, i) => (
        <View
          key={i}
          style={{
            width: 60,
            height: 14,
            backgroundColor: i % 2 === 0 ? '#2c1810' : '#251409',
            marginRight: 3,
            marginBottom: 2,
            borderWidth: 0.5,
            borderColor: '#1a0e07',
            borderRadius: 1,
          }}
        />
      ))}
    </View>
  );
}

// ─── Main Screen ─────────────────────────────────────────────────────────────

interface SkateVideo {
  id: string;
  url: string;
  caption?: string;
  trick_name?: string;
  created_at: string;
  user_id: string;
  profiles?: { username?: string };
}

export default function SkateTVScreen() {
  const navigation = useNavigation();
  const [videos, setVideos] = useState<SkateVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [channel, setChannel] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [muted, setMuted] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const videoRef = useRef<Video>(null);

  useEffect(() => { fetchVideos(); }, []);

  const fetchVideos = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('media')
      .select('id, url, caption, trick_name, created_at, user_id, profiles:user_id(username)')
      .eq('type', 'video')
      .order('created_at', { ascending: false })
      .limit(50);
    setVideos((data as any) ?? []);
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
    if (playing) await videoRef.current.pauseAsync();
    else await videoRef.current.playAsync();
    setPlaying(p => !p);
  };

  const onPlaybackStatusUpdate = (status: AVPlaybackStatus) => {
    if (!status.isLoaded) return;
    if (status.didJustFinish) nextChannel();
    setIsBuffering(!!status.isBuffering);
  };

  return (
    // Shop floor — very dark charcoal base
    <SafeAreaView style={{ flex: 1, backgroundColor: '#0d0a07' }}>
      <ScrollView showsVerticalScrollIndicator={false} bounces={false}>

        {/* ── SHOP WALL SECTION ─────────────────────────────────────────── */}
        <View style={{ backgroundColor: '#130c06', paddingTop: 0, overflow: 'hidden' }}>

          {/* Brick texture rows at the very top */}
          <View style={{ paddingTop: 6, paddingHorizontal: 4, opacity: 0.7 }}>
            {Array.from({ length: 5 }).map((_, i) => <BrickRow key={i} offset={i % 2 === 1} />)}
          </View>

          {/* Back bar along top — like a pipe along the ceiling */}
          <View style={{ height: 6, backgroundColor: '#1e1208', marginHorizontal: 0, marginBottom: 0 }} />

          {/* Wall shelf — top row: decks, stickers, posters */}
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', paddingHorizontal: 18, paddingTop: 10, paddingBottom: 8 }}>
            {/* Left wall decks */}
            <View style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-end' }}>
              <WallDeck color="#c0392b" angle={-8} label="ZERO" />
              <WallDeck color="#2c3e50" angle={4} label="GIRL" />
              <WallDeck color="#6c3483" angle={-3} />
            </View>

            {/* Center neon sign box */}
            <View style={{
              alignItems: 'center',
              backgroundColor: '#0a0704',
              borderWidth: 1.5,
              borderColor: '#2a1a08',
              borderRadius: 8,
              paddingHorizontal: 12,
              paddingVertical: 8,
              shadowColor: '#FF6B35',
              shadowOpacity: 0.3,
              shadowRadius: 12,
              elevation: 6,
            }}>
              <NeonText text="SK8TV" color="#FF6B35" />
              <View style={{ flexDirection: 'row', gap: 4, marginTop: 3 }}>
                {[0,1,2,3,4,5].map(i => (
                  <View key={i} style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: i < 3 ? '#FF6B35' : '#2a1208' }} />
                ))}
              </View>
            </View>

            {/* Right wall decks */}
            <View style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-end' }}>
              <WallDeck color="#117a65" angle={5} />
              <WallDeck color="#b7950b" angle={-6} label="PLAN B" />
              <WallDeck color="#922b21" angle={2} />
            </View>
          </View>

          {/* Sticker strip below the decks */}
          <View style={{ flexDirection: 'row', gap: 8, paddingHorizontal: 20, paddingBottom: 10, flexWrap: 'wrap' }}>
            <Sticker text="SKATE OR DIE" bg="#FF6B35" />
            <Sticker text="NO COMPLY" bg="#c0392b" />
            <Sticker text="LOCAL SHRED" bg="#1a5276" />
            <Sticker text="DROP IN" bg="#2d6a4f" />
            <Sticker text="SPONSORED" bg="#6c3483" />
          </View>

          {/* Shelf plank below wall section */}
          <View style={{
            height: 14,
            backgroundColor: '#3d2010',
            borderTopWidth: 2,
            borderTopColor: '#5a3018',
            borderBottomWidth: 3,
            borderBottomColor: '#1a0c04',
            shadowColor: '#000',
            shadowOpacity: 0.6,
            shadowRadius: 4,
            elevation: 4,
          }} />
        </View>

        {/* ── TV ON THE SHELF ──────────────────────────────────────────────── */}
        <View style={{ backgroundColor: '#0f0b06', paddingHorizontal: SHELF_PADDING, paddingTop: 16, paddingBottom: 0 }}>

          {/* TV outer cabinet — chunky old plastic look */}
          <View style={{
            backgroundColor: '#1e1a15',
            borderRadius: 16,
            borderWidth: 3,
            borderColor: '#2d2820',
            shadowColor: '#000',
            shadowOpacity: 0.9,
            shadowRadius: 14,
            elevation: 14,
            overflow: 'visible',
          }}>
            {/* Antenna bar */}
            <View style={{ flexDirection: 'row', justifyContent: 'center', paddingTop: 8, gap: 20 }}>
              <View style={{ width: 2, height: 20, backgroundColor: '#3a3530', transform: [{ rotate: '-20deg' }], borderRadius: 2 }} />
              <View style={{ width: 2, height: 20, backgroundColor: '#3a3530', transform: [{ rotate: '20deg' }], borderRadius: 2 }} />
            </View>

            {/* TV screen area — inner bezel + screen */}
            <View style={{ padding: 10 }}>
              <View style={{
                backgroundColor: '#080808',
                borderRadius: 8,
                borderWidth: 3,
                borderColor: '#111',
                overflow: 'hidden',
                height: TV_SCREEN_H,
                // Inset shadow feel with inner border
                shadowColor: '#FF6B35',
                shadowOpacity: loading ? 0 : 0.04,
                shadowRadius: 20,
              }}>
                {loading ? (
                  <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#050505' }}>
                    {/* Static TV noise feel */}
                    <Text style={{ color: '#2a2520', fontSize: 40, letterSpacing: -2 }}>▓▒░▒▓▒░▒▓</Text>
                    <ActivityIndicator color="#FF6B35" size="small" style={{ marginTop: 12 }} />
                    <Text style={{ color: '#333', marginTop: 6, fontSize: 11, letterSpacing: 2 }}>SEARCHING CHANNELS...</Text>
                  </View>
                ) : !currentVideo ? (
                  <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#050505' }}>
                    <Text style={{ color: '#1a1a1a', fontSize: 36, letterSpacing: -2 }}>▓▒░▒▓▒░▒▓</Text>
                    <Tv color="#222" size={32} style={{ marginTop: 8 }} />
                    <Text style={{ color: '#2a2a2a', marginTop: 8, fontSize: 12, letterSpacing: 2 }}>NO SIGNAL</Text>
                    <Text style={{ color: '#1a1a1a', fontSize: 10, marginTop: 4 }}>upload clips to air them here</Text>
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
                    <Scanlines height={TV_SCREEN_H} />
                    {isBuffering && (
                      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.55)' }}>
                        <ActivityIndicator color="#FF6B35" />
                      </View>
                    )}
                    {/* Channel indicator */}
                    <View style={{ position: 'absolute', top: 6, right: 6, backgroundColor: 'rgba(0,0,0,0.75)', paddingHorizontal: 7, paddingVertical: 2, borderRadius: 3 }}>
                      <Text style={{ color: '#FF6B35', fontWeight: '800', fontSize: 10, letterSpacing: 1 }}>
                        CH {String(channelNum).padStart(2, '0')}
                      </Text>
                    </View>
                    {/* REC dot when playing */}
                    {playing && (
                      <View style={{ position: 'absolute', top: 8, left: 8, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#e74c3c' }} />
                        <Text style={{ color: '#e74c3c', fontSize: 8, fontWeight: '800', letterSpacing: 1 }}>LIVE</Text>
                      </View>
                    )}
                  </View>
                )}
              </View>
            </View>

            {/* TV bottom strip — brand, knobs */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 14, paddingBottom: 10, paddingTop: 2 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Radio size={12} color="#3a3530" />
                <Text style={{ color: '#2a2520', fontSize: 9, letterSpacing: 3, fontWeight: '700' }}>SKATEQUEST</Text>
              </View>
              {/* Fake knobs */}
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {[0, 1].map(i => (
                  <View key={i} style={{ width: 16, height: 16, borderRadius: 8, backgroundColor: '#2d2820', borderWidth: 1.5, borderColor: '#3a3530' }} />
                ))}
              </View>
            </View>
          </View>

          {/* Shelf under TV — wooden plank look */}
          <View style={{
            height: 10,
            backgroundColor: '#4a2c10',
            borderTopWidth: 1.5,
            borderTopColor: '#6b3f18',
            borderBottomWidth: 2,
            borderBottomColor: '#1a0a02',
            marginHorizontal: -4,
          }} />
        </View>

        {/* ── SHOP COUNTER AREA — below the TV shelf ───────────────────── */}
        <View style={{ backgroundColor: '#0d0a07', paddingTop: 14 }}>

          {/* Now Playing ticker */}
          {currentVideo && (
            <View style={{
              marginHorizontal: 20,
              backgroundColor: '#100e0b',
              borderRadius: 8,
              borderWidth: 1,
              borderColor: '#2a1e10',
              borderLeftWidth: 3,
              borderLeftColor: '#FF6B35',
              paddingHorizontal: 14,
              paddingVertical: 10,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 10,
            }}>
              <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#e74c3c' }} />
              <View style={{ flex: 1 }}>
                <Text style={{ color: '#5a3520', fontSize: 9, fontWeight: '800', letterSpacing: 2, marginBottom: 2 }}>NOW PLAYING</Text>
                <Text style={{ color: '#e8d5c0', fontSize: 14, fontWeight: '800' }} numberOfLines={1}>
                  {currentVideo.trick_name || currentVideo.caption || 'Untitled Clip'}
                </Text>
                <Text style={{ color: '#7a5030', fontSize: 11, marginTop: 1 }}>
                  {(currentVideo.profiles as any)?.username || 'Unknown Skater'}
                </Text>
              </View>
              <Text style={{ color: '#3a2010', fontSize: 22 }}>🛹</Text>
            </View>
          )}

          {/* ── REMOTE CONTROL ──────────────────────────────────────────── */}
          <View style={{
            marginHorizontal: 40,
            marginTop: 16,
            backgroundColor: '#141210',
            borderRadius: 24,
            borderWidth: 2,
            borderColor: '#2a2018',
            paddingHorizontal: 20,
            paddingVertical: 18,
            shadowColor: '#000',
            shadowOpacity: 0.7,
            shadowRadius: 10,
            elevation: 8,
          }}>
            {/* Remote speaker grille lines */}
            <View style={{ alignItems: 'center', marginBottom: 10 }}>
              {[0,1,2].map(i => (
                <View key={i} style={{ width: 50, height: 1.5, backgroundColor: '#1e1a14', borderRadius: 1, marginBottom: 3 }} />
              ))}
            </View>

            {/* Channel display */}
            <View style={{ alignItems: 'center', marginBottom: 14 }}>
              <View style={{ backgroundColor: '#0a0806', borderWidth: 1, borderColor: '#2a2018', borderRadius: 6, paddingHorizontal: 16, paddingVertical: 6 }}>
                <Text style={{ color: '#FF6B35', fontFamily: undefined, fontSize: 18, fontWeight: '900', letterSpacing: 4 }}>
                  {String(channelNum).padStart(2, '0')} / {String(totalChannels || 0).padStart(2, '0')}
                </Text>
              </View>
            </View>

            {/* Main controls row */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <TouchableOpacity
                onPress={prevChannel}
                style={{ backgroundColor: '#1e1a14', padding: 14, borderRadius: 50, borderWidth: 1.5, borderColor: '#3a3020', shadowColor: '#000', shadowOpacity: 0.5, shadowRadius: 4, elevation: 4 }}
              >
                <SkipBack color="#a07850" size={22} />
              </TouchableOpacity>

              <TouchableOpacity
                onPress={togglePlay}
                style={{
                  width: 70,
                  height: 70,
                  borderRadius: 35,
                  backgroundColor: '#FF6B35',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderWidth: 3,
                  borderColor: '#e05020',
                  shadowColor: '#FF6B35',
                  shadowOpacity: 0.6,
                  shadowRadius: 14,
                  elevation: 10,
                }}
              >
                {playing ? <Pause color="#fff" size={30} /> : <Play color="#fff" size={30} />}
              </TouchableOpacity>

              <TouchableOpacity
                onPress={nextChannel}
                style={{ backgroundColor: '#1e1a14', padding: 14, borderRadius: 50, borderWidth: 1.5, borderColor: '#3a3020', shadowColor: '#000', shadowOpacity: 0.5, shadowRadius: 4, elevation: 4 }}
              >
                <SkipForward color="#a07850" size={22} />
              </TouchableOpacity>
            </View>

            {/* Mute + vol row */}
            <View style={{ flexDirection: 'row', justifyContent: 'center', marginTop: 14, gap: 20 }}>
              <TouchableOpacity
                onPress={() => setMuted(m => !m)}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#1a1610', paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, borderWidth: 1, borderColor: '#2a2018' }}
              >
                {muted ? <VolumeX color="#5a4530" size={14} /> : <Volume2 color="#FF6B35" size={14} />}
                <Text style={{ color: muted ? '#4a3520' : '#a07850', fontSize: 11, fontWeight: '700', letterSpacing: 1 }}>
                  {muted ? 'MUTED' : 'SOUND'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Remote bottom nubs */}
            <View style={{ alignItems: 'center', marginTop: 12 }}>
              <View style={{ width: 30, height: 8, backgroundColor: '#1a1610', borderRadius: 4, borderWidth: 1, borderColor: '#2a2018' }} />
            </View>
          </View>

          {/* ── UP NEXT / CHANNEL GUIDE ─────────────────────────────────── */}
          {videos.length > 1 && (
            <View style={{ marginTop: 20 }}>
              {/* Section label — chalk on board style */}
              <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, marginBottom: 10, gap: 10 }}>
                <View style={{ flex: 1, height: 1, backgroundColor: '#2a1e10' }} />
                <Text style={{ color: '#4a3520', fontSize: 10, fontWeight: '800', letterSpacing: 3 }}>UP NEXT</Text>
                <View style={{ flex: 1, height: 1, backgroundColor: '#2a1e10' }} />
              </View>
              <FlatList
                data={videos.filter((_, i) => i !== channel).slice(0, 10)}
                horizontal
                showsHorizontalScrollIndicator={false}
                keyExtractor={item => item.id}
                contentContainerStyle={{ paddingHorizontal: 20, gap: 10 }}
                renderItem={({ item, index }) => {
                  const realIndex = index >= channel ? index + 1 : index;
                  return (
                    <TouchableOpacity
                      onPress={() => { setChannel(realIndex); setIsBuffering(true); }}
                      style={{
                        width: 110,
                        backgroundColor: '#100e0b',
                        borderRadius: 10,
                        overflow: 'hidden',
                        borderWidth: 1,
                        borderColor: '#2a1e10',
                      }}
                    >
                      {/* Thumbnail placeholder */}
                      <View style={{ height: 62, backgroundColor: '#0a0806', alignItems: 'center', justifyContent: 'center' }}>
                        <Text style={{ color: '#1a1510', fontSize: 22 }}>▓▒░</Text>
                        <Text style={{ color: '#3a2a1a', fontSize: 9, letterSpacing: 1, marginTop: 2 }}>
                          CH {String(realIndex + 1).padStart(2, '0')}
                        </Text>
                      </View>
                      <View style={{ padding: 8 }}>
                        <Text style={{ color: '#c8b090', fontSize: 11, fontWeight: '700' }} numberOfLines={1}>
                          {item.trick_name || item.caption || 'Clip'}
                        </Text>
                        <Text style={{ color: '#5a4030', fontSize: 10, marginTop: 2 }} numberOfLines={1}>
                          {(item.profiles as any)?.username || 'Skater'}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  );
                }}
              />
            </View>
          )}

          {/* Bottom floor strip — worn concrete */}
          <View style={{ height: 40, marginTop: 24, backgroundColor: '#0a0806', borderTopWidth: 2, borderTopColor: '#1a1410', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
            <Text style={{ color: '#1e1810', fontSize: 9, letterSpacing: 3 }}>SKATEQUEST</Text>
            <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: '#1e1810' }} />
            <Text style={{ color: '#1e1810', fontSize: 9, letterSpacing: 3 }}>SK8 FOR THE KIDS</Text>
          </View>
        </View>

      </ScrollView>

      {/* Floating back button */}
      <TouchableOpacity
        onPress={() => navigation.goBack()}
        style={{
          position: 'absolute',
          top: 50,
          left: 16,
          backgroundColor: 'rgba(10,8,6,0.85)',
          padding: 8,
          borderRadius: 20,
          borderWidth: 1,
          borderColor: '#2a1e10',
        }}
      >
        <ChevronLeft color="#a07850" size={20} />
      </TouchableOpacity>
    </SafeAreaView>
  );
}
