import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  ArrowUpRight,
  Award,
  Bell,
  CalendarDays,
  Crosshair,
  Flame,
  History,
  Map,
  MessageSquare,
  Share2,
  Sparkles,
  Trophy,
  UserCheck,
  Zap,
} from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '../lib/useNavigation';
import { useAuthStore } from '../stores/useAuthStore';
import { profilesService } from '../lib/profilesService';
import { UserProfile } from '../types';
import Button from '../components/ui/Button';
import LoadingSkeleton from '../components/ui/LoadingSkeleton';

interface LevelProgress {
  current_level: number;
  current_xp: number;
  xp_for_current_level: number;
  xp_for_next_level: number;
  xp_progress: number;
  xp_needed: number;
  progress_percentage: number;
}

const INK = '#07080B';
const PAPER = '#F5F0E7';
const ORANGE = '#E36D3F';
const ACID = '#D8F04B';
const BLUE = '#63A7FF';
const PURPLE = '#A878FF';
const MUTED = '#929AA7';

export default function ProfileScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { user, signOut, deleteAccount } = useAuthStore();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [levelProgress, setLevelProgress] = useState<LevelProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [deletingAccount, setDeletingAccount] = useState(false);

  const targetUserId = route.params?.userId || user?.id;
  const isOwnProfile = targetUserId === user?.id;

  const loadProfile = useCallback(async () => {
    if (!targetUserId) return;
    try {
      const { data, error } = await profilesService.getById(targetUserId);
      if (error && error.code === 'PGRST116') {
        if (isOwnProfile) {
          Alert.alert('Profile Missing', 'We could not find your profile. Try signing out and back in.', [
            { text: 'Sign Out', onPress: () => signOut() },
          ]);
        } else {
          Alert.alert('Error', 'User profile not found');
          navigation.goBack();
        }
      } else if (!error && data) {
        setProfile(data);
        if (data.xp !== undefined) {
          const { data: progress, error: progressError } = await profilesService.getLevelProgress(data.xp);
          if (!progressError && progress) setLevelProgress(progress);
        }
      }
    } catch (loadError) {
      console.error('Error loading profile:', loadError);
    } finally {
      setLoading(false);
    }
  }, [targetUserId, isOwnProfile, navigation, signOut]);

  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: () => signOut() },
    ]);
  };

  const handleDeleteAccount = () => {
    if (deletingAccount) return;
    Alert.alert('Delete Account', 'This permanently deletes your SkateQuest account and associated account data.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Continue',
        style: 'destructive',
        onPress: () => {
          Alert.alert('Delete Permanently?', 'Your profile, activity, messages, progress, and account-linked data will be removed.', [
            { text: 'Keep Account', style: 'cancel' },
            {
              text: 'Delete Permanently',
              style: 'destructive',
              onPress: async () => {
                setDeletingAccount(true);
                const { error } = await deleteAccount();
                setDeletingAccount(false);
                if (error) Alert.alert('Could Not Delete Account', 'Your account was not deleted. Please try again.');
              },
            },
          ]);
        },
      },
    ]);
  };

  const menuItems = useMemo(
    () => [
      { label: 'ACHIEVEMENTS', caption: 'Badges + milestones', icon: Trophy, screen: 'Achievements', color: '#F7B955' },
      { label: 'NOTIFICATIONS', caption: 'What just happened', icon: Bell, screen: 'Notifications', color: BLUE },
      { label: 'MESSAGES', caption: 'Skaters + crews', icon: MessageSquare, screen: 'Messages', color: '#65D897' },
      { label: 'LIVE SCENE', caption: 'Who is skating', icon: UserCheck, screen: 'LiveCheckIn', color: ORANGE },
      { label: 'EVENTS', caption: 'Sessions + contests', icon: CalendarDays, screen: 'SeasonalEvents', color: '#F87171' },
      { label: 'THE SCENE', caption: 'Local activity', icon: Map, screen: 'Scene', color: ACID },
      { label: 'PASSPORT', caption: 'Spots you hit', icon: History, screen: 'SkatePassport', color: PURPLE },
      { label: 'INVITE', caption: 'Bring homies in', icon: Share2, screen: 'Referral', color: '#D78BFF' },
      { label: "WHAT'S NEW", caption: 'Recent changes', icon: Sparkles, screen: 'Changelog', color: '#9BA5B4' },
    ],
    []
  );

  if (loading) {
    return (
      <View style={s.loading}>
        <LoadingSkeleton height={220} className="mb-4" />
        <LoadingSkeleton height={90} className="mb-4" />
        <LoadingSkeleton height={160} className="mb-4" />
      </View>
    );
  }

  const username = profile?.username || 'Skater';
  const initials = username.slice(0, 2).toUpperCase();
  const level = Number(profile?.level || levelProgress?.current_level || 1);
  const xp = Number(profile?.xp || 0);
  const profileAny = profile as any;
  const streak = Number(profileAny?.current_streak ?? profileAny?.streak ?? 0);
  const tricks = Number(profileAny?.tricks_landed ?? 0);
  const sessions = Number(profileAny?.total_sessions ?? 0);

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.content}>
        <View style={s.topLine}>
          <View>
            <Text style={s.kicker}>{isOwnProfile ? 'YOUR SKATER CARD' : 'SKATER PROFILE'}</Text>
            <Text style={s.screenTitle}>ME // SQ</Text>
          </View>
          <View style={s.onlinePill}><View style={s.onlineDot} /><Text style={s.onlineText}>ACTIVE</Text></View>
        </View>

        <View style={s.hero}>
          <View style={s.heroSlashA} />
          <View style={s.heroSlashB} />
          <View style={s.avatar}>
            <Text style={s.avatarText}>{initials}</Text>
          </View>
          <View style={s.heroBottom}>
            <Text style={s.heroId}>SKATER // {String(targetUserId || '').slice(0, 6).toUpperCase()}</Text>
            <View style={s.nameRow}>
              <Text style={s.username} numberOfLines={1}>@{username}</Text>
              <View style={s.levelSticker}><Zap color={INK} size={14} fill={INK} /><Text style={s.levelStickerText}>LVL {level}</Text></View>
            </View>
            <Text style={s.identityLine}>{isOwnProfile ? user?.email || 'SkateQuest skater' : 'SkateQuest skater'}</Text>
            {streak > 0 ? (
              <View style={s.streakRow}><Flame color={ORANGE} size={17} /><Text style={s.streakText}>{streak} DAY STREAK</Text></View>
            ) : null}
          </View>
          {!isOwnProfile ? (
            <Pressable
              style={s.calloutButton}
              onPress={() => navigation.navigate('CallOuts', { targetId: profile?.id, targetUsername: profile?.username })}
            >
              <Crosshair color={INK} size={17} />
              <Text style={s.calloutText}>CALL OUT</Text>
              <ArrowUpRight color={INK} size={16} />
            </Pressable>
          ) : null}
        </View>

        <View style={s.statRail}>
          <StatSticker color={ORANGE} value={xp.toLocaleString()} label="XP" />
          <StatSticker color={ACID} value={tricks.toLocaleString()} label="TRICKS" />
          <StatSticker color={BLUE} value={sessions.toLocaleString()} label="SESSIONS" />
        </View>

        {levelProgress ? (
          <View style={s.progressPoster}>
            <View style={s.progressTop}>
              <View>
                <Text style={s.progressEyebrow}>NEXT UNLOCK</Text>
                <Text style={s.progressTitle}>LEVEL {levelProgress.current_level + 1}</Text>
              </View>
              <View style={s.progressPercent}><Text style={s.progressPercentText}>{Math.min(100, Math.round(levelProgress.progress_percentage))}%</Text></View>
            </View>
            <View style={s.progressTrack}><View style={[s.progressFill, { width: `${Math.min(100, levelProgress.progress_percentage)}%` }]} /></View>
            <View style={s.progressBottom}>
              <Text style={s.progressXp}>{levelProgress.xp_progress} XP THIS LEVEL</Text>
              <Text style={s.progressHint}>{levelProgress.xp_needed} XP LEFT</Text>
            </View>
          </View>
        ) : null}

        <View style={s.sectionHeader}>
          <Text style={s.sectionEyebrow}>YOUR WORLD</Text>
          <Text style={s.sectionTitle}>Everything around your skating</Text>
        </View>

        <View style={s.menuGrid}>
          {menuItems.map((item, index) => (
            <Pressable
              key={item.screen}
              style={[s.menuTile, index % 3 === 0 && s.menuTileWide]}
              onPress={() => navigation.navigate(item.screen)}
            >
              <View style={[s.menuIcon, { backgroundColor: item.color }]}>
                <item.icon color={INK} size={21} strokeWidth={2.5} />
              </View>
              <ArrowUpRight color={item.color} size={16} style={s.menuArrow} />
              <Text style={s.menuLabel}>{item.label}</Text>
              <Text style={s.menuCaption}>{item.caption}</Text>
            </Pressable>
          ))}
        </View>

        {profile?.badges && Object.keys(profile.badges).length > 0 ? (
          <View style={s.badgesBlock}>
            <View style={s.badgeHeader}><Award color={ORANGE} size={20} /><Text style={s.badgesTitle}>BADGE WALL</Text></View>
            <View style={s.badgeWrap}>
              {Object.entries(profile.badges).map(([badge, unlocked]) =>
                unlocked ? (
                  <View key={badge} style={s.badgePill}><Trophy color={INK} size={14} /><Text style={s.badgeText}>{badge}</Text></View>
                ) : null
              )}
            </View>
          </View>
        ) : null}

        {isOwnProfile ? (
          <View style={s.accountActions}>
            <Text style={s.accountEyebrow}>ACCOUNT</Text>
            <Button title="Sign Out" onPress={handleSignOut} variant="danger" size="lg" />
            <Button
              title={deletingAccount ? 'Deleting Account…' : 'Delete Account Permanently'}
              onPress={handleDeleteAccount}
              variant="danger"
              size="lg"
            />
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function StatSticker({ color, value, label }: { color: string; value: string; label: string }) {
  return (
    <View style={[s.statSticker, { backgroundColor: color }]}>
      <Text style={s.statValue}>{value}</Text>
      <Text style={s.statLabel}>{label}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: INK },
  content: { paddingBottom: 42 },
  loading: { flex: 1, backgroundColor: INK, padding: 16 },
  topLine: { paddingHorizontal: 18, paddingTop: 8, paddingBottom: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  kicker: { color: ORANGE, fontSize: 9, fontWeight: '900', letterSpacing: 1.8 },
  screenTitle: { color: PAPER, fontSize: 24, fontWeight: '900', letterSpacing: -0.8, marginTop: 2 },
  onlinePill: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#151A20', borderRadius: 999, borderWidth: 1, borderColor: '#303641', paddingHorizontal: 10, paddingVertical: 7 },
  onlineDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: ACID },
  onlineText: { color: PAPER, fontSize: 8, fontWeight: '900', letterSpacing: 1 },
  hero: { marginHorizontal: 14, minHeight: 270, borderRadius: 28, backgroundColor: '#15191F', borderWidth: 1, borderColor: '#2E343E', overflow: 'hidden', padding: 20, justifyContent: 'flex-end' },
  heroSlashA: { position: 'absolute', width: 260, height: 80, right: -82, top: 26, backgroundColor: ORANGE, transform: [{ rotate: '30deg' }] },
  heroSlashB: { position: 'absolute', width: 220, height: 22, left: -72, bottom: 42, backgroundColor: ACID, transform: [{ rotate: '-10deg' }] },
  avatar: { position: 'absolute', top: 20, left: 20, width: 76, height: 76, borderRadius: 22, backgroundColor: PAPER, borderWidth: 4, borderColor: INK, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '-5deg' }] },
  avatarText: { color: INK, fontSize: 25, fontWeight: '900', letterSpacing: 1 },
  heroBottom: { maxWidth: 320 },
  heroId: { color: '#8D95A2', fontSize: 8, fontWeight: '900', letterSpacing: 1.4 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 9, marginTop: 5, flexWrap: 'wrap' },
  username: { color: PAPER, fontSize: 29, fontWeight: '900', letterSpacing: -1.2, maxWidth: 235 },
  levelSticker: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: ACID, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 5, transform: [{ rotate: '2deg' }] },
  levelStickerText: { color: INK, fontSize: 9, fontWeight: '900', letterSpacing: 0.6 },
  identityLine: { color: '#B8BEC8', fontSize: 10, marginTop: 5 },
  streakRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10 },
  streakText: { color: '#FFB07C', fontSize: 10, fontWeight: '900', letterSpacing: 0.8 },
  calloutButton: { position: 'absolute', right: 14, bottom: 14, minHeight: 42, flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: ACID, borderRadius: 13, paddingHorizontal: 12 },
  calloutText: { color: INK, fontSize: 9, fontWeight: '900', letterSpacing: 0.9 },
  statRail: { flexDirection: 'row', gap: 9, paddingHorizontal: 14, marginTop: 10 },
  statSticker: { flex: 1, minHeight: 84, borderRadius: 18, padding: 12, justifyContent: 'center' },
  statValue: { color: INK, fontSize: 19, fontWeight: '900' },
  statLabel: { color: 'rgba(7,8,11,0.7)', fontSize: 8, fontWeight: '900', letterSpacing: 1.2, marginTop: 3 },
  progressPoster: { marginHorizontal: 14, marginTop: 10, borderRadius: 20, padding: 15, backgroundColor: '#12161C', borderWidth: 1, borderColor: '#2C323C' },
  progressTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  progressEyebrow: { color: ORANGE, fontSize: 8, fontWeight: '900', letterSpacing: 1.4 },
  progressTitle: { color: PAPER, fontSize: 20, fontWeight: '900', marginTop: 2 },
  progressPercent: { width: 47, height: 40, borderRadius: 12, backgroundColor: '#222832', alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '3deg' }] },
  progressPercentText: { color: ACID, fontSize: 12, fontWeight: '900' },
  progressTrack: { height: 9, borderRadius: 999, backgroundColor: '#2A3039', overflow: 'hidden', marginTop: 14 },
  progressFill: { height: '100%', backgroundColor: ACID, borderRadius: 999 },
  progressBottom: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  progressXp: { color: MUTED, fontSize: 8, fontWeight: '900', letterSpacing: 0.7 },
  progressHint: { color: ORANGE, fontSize: 8, fontWeight: '900', letterSpacing: 0.7 },
  sectionHeader: { paddingHorizontal: 18, marginTop: 28, marginBottom: 10 },
  sectionEyebrow: { color: ORANGE, fontSize: 8, fontWeight: '900', letterSpacing: 1.6 },
  sectionTitle: { color: PAPER, fontSize: 23, fontWeight: '900', letterSpacing: -0.8, marginTop: 2 },
  menuGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 9, paddingHorizontal: 14 },
  menuTile: { width: '48%', minHeight: 132, borderRadius: 19, padding: 13, backgroundColor: '#13171D', borderWidth: 1, borderColor: '#292F39' },
  menuTileWide: { width: '100%', minHeight: 112 },
  menuIcon: { width: 40, height: 40, borderRadius: 13, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '-4deg' }] },
  menuArrow: { position: 'absolute', top: 14, right: 14 },
  menuLabel: { color: PAPER, fontSize: 13, fontWeight: '900', letterSpacing: 0.4, marginTop: 'auto' },
  menuCaption: { color: MUTED, fontSize: 9, fontWeight: '700', marginTop: 3 },
  badgesBlock: { marginHorizontal: 14, marginTop: 24, borderRadius: 20, padding: 15, backgroundColor: '#13171D', borderWidth: 1, borderColor: '#2A3039' },
  badgeHeader: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  badgesTitle: { color: PAPER, fontSize: 15, fontWeight: '900', letterSpacing: 1 },
  badgeWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  badgePill: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: ORANGE, borderRadius: 11, paddingHorizontal: 10, paddingVertical: 7, transform: [{ rotate: '-1deg' }] },
  badgeText: { color: INK, fontSize: 10, fontWeight: '900' },
  accountActions: { marginHorizontal: 14, marginTop: 28, gap: 10 },
  accountEyebrow: { color: '#6D7581', fontSize: 8, fontWeight: '900', letterSpacing: 1.5, marginBottom: 2 },
});
