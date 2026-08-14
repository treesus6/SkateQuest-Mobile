import React, { useEffect, useState, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Animated, RefreshControl, Image
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '../lib/useNavigation';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/useAuthStore';
import {
  Bot, Camera, CloudSun, Compass, Gem, Gift, MapPinned,
  Eye, Heart, MapPin, Target, Timer, Users, Video,
} from 'lucide-react-native';

export default function HomeScreen() {
  const { user } = useAuthStore();
  const navigation = useNavigation<any>();
  const [profile, setProfile] = useState<any>(null);
  const [checkins, setCheckins] = useState<any[]>([]);
  const [quests, setQuests] = useState<any[]>([]);
  const [clips, setClips] = useState<any[]>([]);
  const [bounties, setBounties] = useState<any[]>([]);
  const [refresh, setRefresh] = useState(false);
  const [liveCount, setLiveCount] = useState(0);

  // Animations
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    loadData();
    startAnimations();
    const interval = setInterval(loadLive, 30000);
    return () => clearInterval(interval);
  }, []);

  const startAnimations = () => {
    // Pulse for live dot
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.3, duration: 800, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      ])
    ).start();

    // Slide in content
    Animated.parallel([
      Animated.timing(slideAnim, { toValue: 0, duration: 500, useNativeDriver: true }),
      Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
    ]).start();
  };

  const loadData = async () => {
    if (!user) return;
    await Promise.all([loadProfile(), loadLive(), loadQuests(), loadClips(), loadBounties()]);
  };

  const loadProfile = async () => {
    const { data } = await supabase.from('profiles').select('*').eq('id', user!.id).single();
    setProfile(data);
  };

  const loadLive = async () => {
    const { data } = await supabase
      .from('live_checkins')
      .select('*, profiles(username, avatar_url)')
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(5);
    setCheckins(data || []);
    setLiveCount(data?.length || 0);
  };

  const loadQuests = async () => {
    const { data } = await supabase
      .from('daily_quests')
      .select('*')
      .eq('active', true)
      .order('xp_reward', { ascending: false })
      .limit(3);
    setQuests(data || []);
  };

  const loadClips = async () => {
    const { data } = await supabase
      .from('skatetv_clips')
      .select('*, profiles(username)')
      .eq('featured', true)
      .order('likes', { ascending: false })
      .limit(3);
    setClips(data || []);
  };

  const loadBounties = async () => {
    const { data } = await supabase
      .from('bounties')
      .select('*, crews(name)')
      .eq('status', 'open')
      .order('xp_reward', { ascending: false })
      .limit(3);
    setBounties(data || []);
  };

  const onRefresh = async () => {
    setRefresh(true);
    await loadData();
    setRefresh(false);
  };

  const level = Math.floor(Math.sqrt((profile?.xp || 0) / 100));
  const xpForNext = ((level + 1) * (level + 1)) * 100;
  const xpForCurrent = (level * level) * 100;
  const xpProgress = profile ? (profile.xp - xpForCurrent) / (xpForNext - xpForCurrent) : 0;

  const timeAgo = (date: string) => {
    const mins = Math.floor((Date.now() - new Date(date).getTime()) / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    return `${Math.floor(mins / 60)}h ago`;
  };

  return (
    <SafeAreaView style={s.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refresh} onRefresh={onRefresh} tintColor="#d2673d" />}
      >
        {/* Header */}
        <View style={s.header}>
          <View>
            <Text style={s.greeting}>What's good,</Text>
            <Text style={s.username}>@{profile?.username || 'skater'}</Text>
          </View>
          <TouchableOpacity style={s.notifBtn} onPress={() => navigation.navigate('Profile')}>
            <View style={s.avatarCircle}>
              <Text style={s.avatarEmoji}>SQ</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* XP Bar */}
        <Animated.View style={[s.xpCard, { transform: [{ translateY: slideAnim }], opacity: fadeAnim }]}>
          <View style={s.xpTop}>
            <View style={s.levelBadge}>
              <Text style={s.levelNum}>LVL {level}</Text>
            </View>
            <Text style={s.xpAmount}>{(profile?.xp || 0).toLocaleString()} XP</Text>
            <Text style={s.xpNext}>{xpForNext.toLocaleString()} XP to level {level + 1}</Text>
          </View>
          <View style={s.xpBarBg}>
            <Animated.View style={[s.xpBarFill, { width: `${Math.min(100, xpProgress * 100)}%` as any }]} />
          </View>
          <View style={s.quickStats}>
            {[
              { label: 'Parks', value: profile?.parks_visited || 0 },
              { label: 'Streak', value: `${profile?.streak_days || 0}d` },
              { label: 'Tricks', value: profile?.tricks_landed || 0 },
            ].map((stat, i) => (
              <View key={i} style={s.quickStat}>
                <Text style={s.quickStatVal}>{stat.value}</Text>
                <Text style={s.quickStatLbl}>{stat.label}</Text>
              </View>
            ))}
          </View>
        </Animated.View>

        {/* Live Right Now */}
        <View style={s.section}>
          <View style={s.sectionHeader}>
            <View style={s.liveRow}>
              <Animated.View style={[s.liveDot, { transform: [{ scale: pulseAnim }] }]} />
              <Text style={s.sectionTitle}>Live Right Now</Text>
              <Text style={s.liveCount}>{liveCount} skating</Text>
            </View>
            <TouchableOpacity onPress={() => navigation.navigate('LiveCheckIn')}>
              <Text style={s.seeAll}>Check In +</Text>
            </TouchableOpacity>
          </View>

          {checkins.length > 0 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.liveScroll}>
              {checkins.map(c => (
                <View key={c.id} style={s.liveCard}>
                  <Text style={s.liveAvatar}>🛹</Text>
                  <Text style={s.liveUser}>@{c.profiles?.username || 'skater'}</Text>
                  <Text style={s.livePark}>{c.park_name}</Text>
                  <Text style={s.liveTime}>{timeAgo(c.created_at)}</Text>
                </View>
              ))}
              <TouchableOpacity style={s.liveCardAdd} onPress={() => navigation.navigate('LiveCheckIn')}>
                <Text style={s.liveAddIcon}>+</Text>
                <Text style={s.liveAddTxt}>I'm skating</Text>
              </TouchableOpacity>
            </ScrollView>
          ) : (
            <TouchableOpacity style={s.emptyLive} onPress={() => navigation.navigate('LiveCheckIn')}>
              <Text style={s.emptyLiveTxt}>Nobody is checked in yet — start the first session</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Daily Quests */}
        <View style={s.section}>
          <View style={s.sectionHeader}>
            <Text style={s.sectionTitle}>Daily Quests</Text>
            <TouchableOpacity onPress={() => navigation.navigate('DailyQuests')}>
              <Text style={s.seeAll}>All quests →</Text>
            </TouchableOpacity>
          </View>
          {quests.map(q => (
            <TouchableOpacity key={q.id} style={s.questRow} onPress={() => navigation.navigate('DailyQuests')}>
              <View style={s.questIcon}><Target color="#D2673D" size={20} strokeWidth={2.4} /></View>
              <View style={s.questText}>
                <Text style={s.questTitle}>{q.title}</Text>
                <Text style={s.questDesc}>{q.description}</Text>
              </View>
              <View style={s.questXP}>
                <Text style={s.questXPnum}>+{q.xp_reward}</Text>
                <Text style={s.questXPlbl}>XP</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* SkateTV - Hot Clips */}
        <View style={s.section}>
          <View style={s.sectionHeader}>
            <Text style={s.sectionTitle}>Hot Clips</Text>
            <TouchableOpacity onPress={() => navigation.navigate('SkateTV')}>
              <Text style={s.seeAll}>SkateTV →</Text>
            </TouchableOpacity>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.clipsScroll}>
            {clips.map(clip => (
              <TouchableOpacity key={clip.id} style={s.clipCard} onPress={() => navigation.navigate('SkateTV')}>
                <View style={s.clipThumb}>
                  {clip.thumbnail_url ? (
                    <Image source={{ uri: clip.thumbnail_url }} style={s.clipImg} />
                  ) : (
                    <View style={s.clipImgPlaceholder}><Video color="#D2673D" size={28} strokeWidth={2} /></View>
                  )}
                  <View style={s.clipPlay}><Text style={s.clipPlayTxt}>▶</Text></View>
                </View>
                <Text style={s.clipTitle} numberOfLines={1}>{clip.title || 'Skate clip'}</Text>
                <View style={s.clipStats}>
                  <Heart color="#7B8493" size={12} />
                  <Text style={s.clipStatsText}>{clip.likes || 0}</Text>
                  <Eye color="#7B8493" size={12} />
                  <Text style={s.clipStatsText}>{clip.views || 0}</Text>
                </View>
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={s.clipCardAdd} onPress={() => navigation.navigate('SkateTV')}>
              <Text style={s.clipAddIcon}>+</Text>
              <Text style={s.clipAddTxt}>Post your clip</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>

        {/* Open Bounties */}
        {bounties.length > 0 && (
          <View style={s.section}>
            <View style={s.sectionHeader}>
              <Text style={s.sectionTitle}>Open Bounties</Text>
              <TouchableOpacity onPress={() => navigation.navigate('BountyBoard')}>
                <Text style={s.seeAll}>All bounties →</Text>
              </TouchableOpacity>
            </View>
            {bounties.map(b => (
              <TouchableOpacity key={b.id} style={s.bountyRow} onPress={() => navigation.navigate('BountyBoard')}>
                <View style={s.bountyLeft}>
                  <Text style={s.bountyTrick}>{b.trick_name}</Text>
                  {b.park_name && (
                    <View style={s.bountyParkRow}>
                      <MapPin color="#7B8493" size={12} />
                      <Text style={s.bountyPark}>{b.park_name}</Text>
                    </View>
                  )}
                </View>
                <View style={s.bountyXP}>
                  <Text style={s.bountyXPnum}>{b.xp_reward}</Text>
                  <Text style={s.bountyXPlbl}>XP</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Quick Nav */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Explore</Text>
          <View style={s.quickNav}>
            {[
              { Icon: MapPinned, label: 'Find Parks', screen: 'Map' },
              { Icon: Users, label: 'My Crew', screen: 'Crews' },
              { Icon: Bot, label: 'Coach', screen: 'AiCoach' },
              { Icon: CloudSun, label: 'Forecast', screen: 'SkateForecast' },
              { Icon: Gem, label: 'Hidden Gems', screen: 'HiddenGems' },
              { Icon: Compass, label: 'Passport', screen: 'SkatePassport' },
              { Icon: Gift, label: 'XP Rewards', screen: 'XPRewards' },
              { Icon: Camera, label: 'GoPro Import', screen: 'GoProImport' },
              { Icon: Timer, label: 'Start Session', screen: 'ActiveSession' },
            ].map(({ Icon, label, screen }) => (
              <TouchableOpacity
                key={screen}
                style={s.quickNavItem}
                onPress={() => navigation.navigate(screen)}
                accessibilityRole="button"
                accessibilityLabel={label}
              >
                <View style={s.quickNavIcon}>
                  <Icon color="#D2673D" size={24} strokeWidth={2.2} />
                </View>
                <Text style={s.quickNavLabel}>{label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={{ height: 20 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#07090D' },

  // Header
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, paddingBottom: 12 },
  greeting: { color: '#6B7280', fontSize: 14 },
  username: { color: '#F3F4F6', fontSize: 22, fontWeight: '900' },
  notifBtn: { padding: 4 },
  avatarCircle: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(210,103,61,0.2)', borderWidth: 2, borderColor: '#d2673d', justifyContent: 'center', alignItems: 'center' },
  avatarEmoji: { fontSize: 20 },

  // XP Card
  xpCard: { margin: 16, marginTop: 0, backgroundColor: '#0F1623', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  xpTop: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  levelBadge: { backgroundColor: '#d2673d', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  levelNum: { color: 'white', fontWeight: '900', fontSize: 13, letterSpacing: 1 },
  xpAmount: { color: '#F3F4F6', fontWeight: '900', fontSize: 18, flex: 1 },
  xpNext: { color: '#4B5563', fontSize: 11 },
  xpBarBg: { height: 8, backgroundColor: '#0a0e1a', borderRadius: 4, overflow: 'hidden', marginBottom: 14 },
  xpBarFill: { height: '100%', backgroundColor: '#d2673d', borderRadius: 4 },
  quickStats: { flexDirection: 'row', justifyContent: 'space-around' },
  quickStat: { alignItems: 'center' },
  quickStatVal: { color: '#ff8c42', fontWeight: '900', fontSize: 20 },
  quickStatLbl: { color: '#4B5563', fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 2 },

  // Sections
  section: { paddingHorizontal: 16, marginBottom: 24 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  sectionTitle: { color: '#F7F4EF', fontSize: 19, fontWeight: '900', letterSpacing: -0.3 },
  seeAll: { color: '#d2673d', fontSize: 13, fontWeight: '600' },

  // Live
  liveRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  liveDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#4ade80' },
  liveCount: { color: '#4ade80', fontSize: 12, fontWeight: '600', marginLeft: 4 },
  liveScroll: { gap: 10, paddingRight: 16 },
  liveCard: { backgroundColor: '#0F1623', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)', width: 130 },
  liveAvatar: { fontSize: 28, marginBottom: 6 },
  liveUser: { color: '#d2673d', fontWeight: '700', fontSize: 12, marginBottom: 2 },
  livePark: { color: '#F3F4F6', fontSize: 12, fontWeight: '600', marginBottom: 4 },
  liveTime: { color: '#4B5563', fontSize: 10 },
  liveCardAdd: { backgroundColor: 'rgba(210,103,61,0.08)', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: 'rgba(210,103,61,0.3)', borderStyle: 'dashed', width: 130, alignItems: 'center', justifyContent: 'center' },
  liveAddIcon: { color: '#d2673d', fontSize: 28, fontWeight: '900' },
  liveAddTxt: { color: '#d2673d', fontWeight: '600', fontSize: 12, marginTop: 4 },
  emptyLive: { backgroundColor: 'rgba(210,103,61,0.06)', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: 'rgba(210,103,61,0.2)', alignItems: 'center' },
  emptyLiveTxt: { color: '#d2673d', fontWeight: '600', fontSize: 14 },

  // Quests
  questRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#0F1623', borderRadius: 12, padding: 12, marginBottom: 8, gap: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  questIcon: { width: 38, height: 38, borderRadius: 11, backgroundColor: 'rgba(210,103,61,0.12)', alignItems: 'center', justifyContent: 'center' },
  questText: { flex: 1 },
  questTitle: { color: '#F3F4F6', fontWeight: '700', fontSize: 14 },
  questDesc: { color: '#6B7280', fontSize: 12, marginTop: 1 },
  questXP: { backgroundColor: 'rgba(210,103,61,0.15)', borderRadius: 8, padding: 6, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(210,103,61,0.4)', minWidth: 44 },
  questXPnum: { color: '#d2673d', fontWeight: '900', fontSize: 15 },
  questXPlbl: { color: '#d2673d', fontSize: 8, fontWeight: '600' },

  // Clips
  clipsScroll: { gap: 10, paddingRight: 16 },
  clipCard: { width: 150, backgroundColor: '#0F1623', borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  clipThumb: { height: 100, backgroundColor: '#0a0e1a', justifyContent: 'center', alignItems: 'center', position: 'relative' },
  clipImg: { width: '100%', height: '100%', resizeMode: 'cover' },
  clipImgPlaceholder: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  clipPlay: { position: 'absolute', width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(210,103,61,0.9)', justifyContent: 'center', alignItems: 'center' },
  clipPlayTxt: { color: 'white', fontSize: 12, marginLeft: 2 },
  clipTitle: { color: '#F3F4F6', fontWeight: '600', fontSize: 12, padding: 8, paddingBottom: 2 },
  clipStats: { flexDirection: 'row', alignItems: 'center', gap: 4, padding: 8, paddingTop: 4 },
  clipStatsText: { color: '#7B8493', fontSize: 11, marginRight: 4 },
  clipCardAdd: { width: 150, backgroundColor: 'rgba(210,103,61,0.06)', borderRadius: 12, borderWidth: 1, borderColor: 'rgba(210,103,61,0.3)', borderStyle: 'dashed', justifyContent: 'center', alignItems: 'center', height: 140 },
  clipAddIcon: { color: '#d2673d', fontSize: 28, fontWeight: '900' },
  clipAddTxt: { color: '#d2673d', fontWeight: '600', fontSize: 12, marginTop: 4 },

  // Bounties
  bountyRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#0F1623', borderRadius: 12, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  bountyLeft: { flex: 1 },
  bountyTrick: { color: '#F3F4F6', fontWeight: '700', fontSize: 15 },
  bountyParkRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  bountyPark: { color: '#7B8493', fontSize: 12 },
  bountyXP: { backgroundColor: 'rgba(210,103,61,0.15)', borderRadius: 8, padding: 8, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(210,103,61,0.4)', minWidth: 52 },
  bountyXPnum: { color: '#d2673d', fontWeight: '900', fontSize: 18 },
  bountyXPlbl: { color: '#d2673d', fontSize: 8, fontWeight: '600' },

  // Quick Nav
  quickNav: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 10 },
  quickNavItem: { width: '31.5%', backgroundColor: '#0F1623', borderRadius: 12, padding: 14, alignItems: 'center', gap: 6, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  quickNavIcon: { width: 42, height: 42, borderRadius: 12, backgroundColor: 'rgba(210,103,61,0.12)', alignItems: 'center', justifyContent: 'center' },
  quickNavLabel: { color: '#9CA3AF', fontSize: 11, fontWeight: '600', textAlign: 'center' },
});
