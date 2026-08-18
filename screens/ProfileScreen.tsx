import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  Award,
  Bell,
  CalendarDays,
  ChevronRight,
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

const ACCENT = '#D2673D';
const BG = '#05070B';
const CARD = '#101722';

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
          Alert.alert(
            'Profile Missing',
            'We couldn\'t find your profile. Please try signing out and back in, or contact support.',
            [{ text: 'Sign Out', onPress: () => signOut() }]
          );
        } else {
          Alert.alert('Error', 'User profile not found');
          navigation.goBack();
        }
      } else if (!error && data) {
        setProfile(data);
        if (data.xp !== undefined) {
          const { data: prog, error: progError } = await profilesService.getLevelProgress(data.xp);
          if (progError) {
            console.error('Error fetching level progress:', progError);
          } else if (prog) {
            setLevelProgress(prog);
          }
        }
      }
    } catch (err) {
      console.error('Error loading profile:', err);
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
    Alert.alert(
      'Delete Account',
      'This permanently deletes your SkateQuest account and associated account data. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Continue',
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              'Delete Permanently?',
              'Your profile, activity, messages, progress, and other account-linked data will be removed.',
              [
                { text: 'Keep Account', style: 'cancel' },
                {
                  text: 'Delete Permanently',
                  style: 'destructive',
                  onPress: async () => {
                    setDeletingAccount(true);
                    const { error } = await deleteAccount();
                    setDeletingAccount(false);
                    if (error) {
                      Alert.alert(
                        'Could Not Delete Account',
                        'Your account was not deleted. Please try again or use the account-deletion request link in the Play Store listing.'
                      );
                    }
                  },
                },
              ]
            );
          },
        },
      ]
    );
  };

  const menuItems = useMemo(
    () => [
      { label: 'Achievements', caption: 'Badges, milestones, unlocks', icon: Trophy, screen: 'Achievements', color: '#F7B955' },
      { label: 'Notifications', caption: 'Activity and challenge updates', icon: Bell, screen: 'Notifications', color: '#6FC3FF' },
      { label: 'Messages', caption: 'Talk with skaters and crews', icon: MessageSquare, screen: 'Messages', color: '#4ADE80' },
      { label: 'Live Check-ins', caption: 'See who is skating now', icon: UserCheck, screen: 'LiveCheckIn', color: '#FF8C42' },
      { label: 'Seasonal Events', caption: 'Limited-time sessions and contests', icon: CalendarDays, screen: 'SeasonalEvents', color: '#F87171' },
      { label: 'The Scene', caption: 'Local skate activity', icon: Map, screen: 'Scene', color: ACCENT },
      { label: 'Skate Passport', caption: 'Places you have hit', icon: History, screen: 'SkatePassport', color: '#A78BFA' },
      { label: 'Invite Friends', caption: 'Bring your people in', icon: Share2, screen: 'Referral', color: '#C084FC' },
      { label: "What's New", caption: 'Recent SkateQuest changes', icon: Sparkles, screen: 'Changelog', color: '#94A3B8' },
    ],
    []
  );

  if (loading) {
    return (
      <View style={s.loading}>
        <LoadingSkeleton height={150} className="mb-4" />
        <LoadingSkeleton height={100} className="mb-4" />
        <LoadingSkeleton height={70} className="mb-4" />
      </View>
    );
  }

  const username = profile?.username || 'Skater';
  const initials = username.slice(0, 2).toUpperCase();

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.content}>
        <View style={s.hero}>
          <View style={s.heroGlow} />
          <View style={s.avatar}>
            <Text style={s.avatarText}>{initials}</Text>
          </View>
          <View style={s.heroCopy}>
            <View style={s.nameRow}>
              <Text style={s.username} numberOfLines={1}>@{username}</Text>
              <View style={s.levelPill}>
                <Zap color="#fff" size={12} fill="#fff" />
                <Text style={s.levelPillText}>LVL {profile?.level || levelProgress?.current_level || 1}</Text>
              </View>
            </View>
            {isOwnProfile ? <Text style={s.email}>{user?.email}</Text> : <Text style={s.email}>SkateQuest skater</Text>}
            {profile?.streak && profile.streak > 0 ? (
              <View style={s.streakRow}>
                <Flame color="#FF8C42" size={16} />
                <Text style={s.streakText}>{profile.streak} day streak</Text>
              </View>
            ) : null}
          </View>
          {!isOwnProfile ? (
            <TouchableOpacity
              style={s.calloutButton}
              onPress={() => navigation.navigate('CallOuts', { targetId: profile?.id, targetUsername: profile?.username })}
            >
              <Crosshair color="#fff" size={18} />
              <Text style={s.calloutText}>CALL OUT</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        <View style={s.statGrid}>
          {[
            { value: profile?.xp || 0, label: 'XP', icon: Zap, color: ACCENT },
            { value: profile?.spots_added || 0, label: 'Spots', icon: Map, color: '#6FC3FF' },
            { value: profile?.challenges_completed?.length || 0, label: 'Challenges', icon: Trophy, color: '#F7B955' },
          ].map(stat => (
            <View key={stat.label} style={s.statCard}>
              <stat.icon color={stat.color} size={18} />
              <Text style={s.statValue}>{Number(stat.value).toLocaleString()}</Text>
              <Text style={s.statLabel}>{stat.label}</Text>
            </View>
          ))}
        </View>

        {levelProgress ? (
          <View style={s.progressCard}>
            <View style={s.progressTop}>
              <View>
                <Text style={s.progressEyebrow}>NEXT LEVEL</Text>
                <Text style={s.progressTitle}>Level {levelProgress.current_level + 1}</Text>
              </View>
              <Text style={s.progressXp}>{levelProgress.xp_progress} / {levelProgress.xp_for_next_level - levelProgress.xp_for_current_level} XP</Text>
            </View>
            <View style={s.progressTrack}>
              <View style={[s.progressFill, { width: `${Math.min(100, levelProgress.progress_percentage)}%` }]} />
            </View>
            <Text style={s.progressHint}>{levelProgress.xp_needed} XP left — keep skating.</Text>
          </View>
        ) : null}

        <View style={s.sectionHeader}>
          <Text style={s.sectionTitle}>Your SkateQuest</Text>
          <Text style={s.sectionCaption}>Everything around your sessions</Text>
        </View>

        <View style={s.menuCard}>
          {menuItems.map((item, index) => (
            <TouchableOpacity
              key={item.screen}
              style={[s.menuRow, index === menuItems.length - 1 && s.menuRowLast]}
              onPress={() => navigation.navigate(item.screen)}
              activeOpacity={0.75}
            >
              <View style={[s.menuIcon, { backgroundColor: `${item.color}18` }]}>
                <item.icon color={item.color} size={20} />
              </View>
              <View style={s.menuCopy}>
                <Text style={s.menuLabel}>{item.label}</Text>
                <Text style={s.menuCaption}>{item.caption}</Text>
              </View>
              <ChevronRight color="#596577" size={20} />
            </TouchableOpacity>
          ))}
        </View>

        {profile?.badges && Object.keys(profile.badges).length > 0 ? (
          <View style={s.badgesCard}>
            <View style={s.badgeHeader}>
              <Award color={ACCENT} size={19} />
              <Text style={s.badgesTitle}>Unlocked badges</Text>
            </View>
            <View style={s.badgeWrap}>
              {Object.entries(profile.badges).map(([badge, unlocked]) =>
                unlocked ? (
                  <View key={badge} style={s.badgePill}>
                    <Trophy color="#F7B955" size={14} />
                    <Text style={s.badgeText}>{badge}</Text>
                  </View>
                ) : null
              )}
            </View>
          </View>
        ) : null}

        {isOwnProfile ? (
          <View style={s.accountActions}>
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

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  content: { paddingBottom: 44 },
  loading: { flex: 1, backgroundColor: BG, padding: 16 },
  hero: { margin: 16, marginTop: 8, minHeight: 150, borderRadius: 24, backgroundColor: '#11151D', borderWidth: 1, borderColor: 'rgba(210,103,61,0.38)', padding: 18, flexDirection: 'row', alignItems: 'center', overflow: 'hidden' },
  heroGlow: { position: 'absolute', width: 180, height: 180, borderRadius: 90, right: -60, top: -80, backgroundColor: 'rgba(210,103,61,0.13)' },
  avatar: { width: 68, height: 68, borderRadius: 22, backgroundColor: ACCENT, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: '#1B2028' },
  avatarText: { color: '#fff', fontSize: 23, fontWeight: '900', letterSpacing: 1 },
  heroCopy: { flex: 1, marginLeft: 14 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 7, flexWrap: 'wrap' },
  username: { color: '#F7F4EF', fontSize: 22, fontWeight: '900', maxWidth: 190 },
  levelPill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 7, paddingVertical: 4, backgroundColor: ACCENT, borderRadius: 999 },
  levelPillText: { color: '#fff', fontSize: 9, fontWeight: '900', letterSpacing: 0.6 },
  email: { color: '#8B95A5', fontSize: 11, marginTop: 5 },
  streakRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 9 },
  streakText: { color: '#FFB17A', fontSize: 12, fontWeight: '800' },
  calloutButton: { position: 'absolute', right: 14, bottom: 14, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: ACCENT, borderRadius: 11, paddingHorizontal: 11, paddingVertical: 8 },
  calloutText: { color: '#fff', fontSize: 10, fontWeight: '900', letterSpacing: 0.7 },
  statGrid: { flexDirection: 'row', gap: 10, paddingHorizontal: 16 },
  statCard: { flex: 1, backgroundColor: CARD, borderWidth: 1, borderColor: '#1F2937', borderRadius: 16, padding: 13 },
  statValue: { color: '#F7F4EF', fontSize: 18, fontWeight: '900', marginTop: 8 },
  statLabel: { color: '#6F7A8B', fontSize: 9, fontWeight: '800', textTransform: 'uppercase', marginTop: 2 },
  progressCard: { margin: 16, backgroundColor: '#0D131D', borderRadius: 18, padding: 16, borderWidth: 1, borderColor: '#1F2937' },
  progressTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', gap: 12 },
  progressEyebrow: { color: ACCENT, fontSize: 9, fontWeight: '900', letterSpacing: 1.2 },
  progressTitle: { color: '#F7F4EF', fontSize: 20, fontWeight: '900', marginTop: 3 },
  progressXp: { color: '#A7B0BE', fontSize: 11, fontWeight: '700' },
  progressTrack: { height: 10, backgroundColor: '#202938', borderRadius: 999, overflow: 'hidden', marginTop: 14 },
  progressFill: { height: '100%', backgroundColor: ACCENT, borderRadius: 999 },
  progressHint: { color: '#687587', fontSize: 11, marginTop: 8 },
  sectionHeader: { paddingHorizontal: 20, marginTop: 4, marginBottom: 10 },
  sectionTitle: { color: '#F7F4EF', fontSize: 20, fontWeight: '900' },
  sectionCaption: { color: '#667085', fontSize: 11, marginTop: 2 },
  menuCard: { marginHorizontal: 16, backgroundColor: CARD, borderRadius: 20, borderWidth: 1, borderColor: '#1F2937', overflow: 'hidden' },
  menuRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: '#1C2635' },
  menuRowLast: { borderBottomWidth: 0 },
  menuIcon: { width: 40, height: 40, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  menuCopy: { flex: 1, marginLeft: 11 },
  menuLabel: { color: '#F7F4EF', fontSize: 14, fontWeight: '800' },
  menuCaption: { color: '#687587', fontSize: 10, marginTop: 2 },
  badgesCard: { margin: 16, backgroundColor: CARD, borderRadius: 18, padding: 16, borderWidth: 1, borderColor: '#1F2937' },
  badgeHeader: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  badgesTitle: { color: '#F7F4EF', fontSize: 17, fontWeight: '900' },
  badgeWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  badgePill: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#181F2B', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 7, borderWidth: 1, borderColor: '#283346' },
  badgeText: { color: '#C8D0DB', fontSize: 11, fontWeight: '700' },
  accountActions: { marginHorizontal: 16, marginTop: 4, gap: 10 },
});
