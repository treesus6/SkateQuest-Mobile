import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Crown, Trophy, UserPlus, Users, Zap } from 'lucide-react-native';
import { useLocalSearchParams } from 'expo-router';
import { useAuthStore } from '../stores/useAuthStore';
import { crewsService, Crew } from '../lib/crewsService';
import { supabase } from '../lib/supabase';

const ACCENT = '#D2673D';
const BG = '#05070B';
const CARD = '#101722';

interface CrewMember {
  id: string;
  user_id: string;
  role: 'owner' | 'member';
  joined_at: string;
  profiles: {
    username: string;
    xp: number;
    level: number;
  } | null;
}

export default function CrewDetailsScreen() {
  const params = useLocalSearchParams<{ crewId?: string | string[] }>();
  const crewId = Array.isArray(params.crewId) ? params.crewId[0] : params.crewId;
  const user = useAuthStore(s => s.user);
  const [crew, setCrew] = useState<Crew | null>(null);
  const [members, setMembers] = useState<CrewMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);

  const loadCrew = useCallback(async () => {
    if (!crewId) {
      setCrew(null);
      setMembers([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const [{ data: crewData, error: crewError }, { data: memberData, error: memberError }] = await Promise.all([
        supabase.from('crews').select('*').eq('id', crewId).single(),
        supabase
          .from('crew_members')
          .select('id, user_id, role, joined_at, profiles(username, xp, level)')
          .eq('crew_id', crewId)
          .order('joined_at', { ascending: true }),
      ]);

      if (crewError) throw crewError;
      if (memberError) throw memberError;
      setCrew(crewData as Crew);
      setMembers((memberData as unknown as CrewMember[]) ?? []);
    } catch (error: any) {
      console.error('CrewDetailsScreen load failed', error);
      Alert.alert('Could not load crew', error.message ?? 'Try again.');
    } finally {
      setLoading(false);
    }
  }, [crewId]);

  useEffect(() => {
    void loadCrew();
  }, [loadCrew]);

  const isMember = Boolean(user?.id && members.some(member => member.user_id === user.id));

  const joinCrew = async () => {
    if (!user?.id || !crew || isMember || joining) return;
    setJoining(true);
    try {
      const { error } = await crewsService.join(crew.id, user.id);
      if (error) throw error;
      Alert.alert('You joined', `You're now in ${crew.name}.`);
      await loadCrew();
    } catch (error: any) {
      Alert.alert('Could not join crew', error.message ?? 'Try again.');
    } finally {
      setJoining(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator color={ACCENT} size="large" />
      </SafeAreaView>
    );
  }

  if (!crew) {
    return (
      <SafeAreaView style={styles.centered}>
        <Users color="#596577" size={36} />
        <Text style={styles.emptyTitle}>Crew not found</Text>
        <Text style={styles.emptyText}>This crew may have been removed.</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.hero}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{crew.name?.slice(0, 2).toUpperCase() || 'SQ'}</Text>
          </View>
          <Text style={styles.name}>{crew.name}</Text>
          <Text style={crew.description ? styles.description : styles.descriptionMuted}>
            {crew.description || 'No crew bio yet.'}
          </Text>

          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Users color="#6FC3FF" size={18} />
              <Text style={styles.statValue}>{members.length || crew.member_count || 0}</Text>
              <Text style={styles.statLabel}>SKATERS</Text>
            </View>
            <View style={styles.statCard}>
              <Zap color={ACCENT} size={18} />
              <Text style={styles.statValue}>{(crew.total_xp || 0).toLocaleString()}</Text>
              <Text style={styles.statLabel}>CREW XP</Text>
            </View>
          </View>

          {user ? (
            <TouchableOpacity
              style={[styles.joinButton, isMember && styles.memberButton]}
              onPress={() => void joinCrew()}
              disabled={isMember || joining}
            >
              {joining ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : isMember ? (
                <Users color="#B9F6CA" size={18} />
              ) : (
                <UserPlus color="#fff" size={18} />
              )}
              <Text style={[styles.joinText, isMember && styles.memberText]}>
                {isMember ? 'YOU ARE IN THIS CREW' : 'JOIN CREW'}
              </Text>
            </TouchableOpacity>
          ) : null}
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Crew roster</Text>
          <Text style={styles.sectionMeta}>{members.length} skaters</Text>
        </View>

        {members.map(member => {
          const username = member.profiles?.username || 'Skater';
          return (
            <View key={member.id} style={styles.memberCard}>
              <View style={styles.memberAvatar}>
                <Text style={styles.memberInitial}>{username.slice(0, 2).toUpperCase()}</Text>
              </View>
              <View style={styles.memberInfo}>
                <View style={styles.memberNameRow}>
                  <Text style={styles.memberName}>{username}</Text>
                  {member.role === 'owner' ? <Crown color="#F7B955" size={15} /> : null}
                </View>
                <Text style={styles.memberMeta}>Level {member.profiles?.level ?? 1}</Text>
              </View>
              <View style={styles.memberXp}>
                <Trophy color="#F7B955" size={14} />
                <Text style={styles.memberXpText}>{(member.profiles?.xp ?? 0).toLocaleString()} XP</Text>
              </View>
            </View>
          );
        })}

        {members.length === 0 ? (
          <View style={styles.noMembers}>
            <Users color="#596577" size={28} />
            <Text style={styles.noMembersText}>No roster entries yet.</Text>
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  centered: { flex: 1, backgroundColor: BG, alignItems: 'center', justifyContent: 'center', padding: 28 },
  content: { padding: 18, paddingBottom: 44 },
  hero: { backgroundColor: CARD, borderWidth: 1, borderColor: '#1F2937', borderRadius: 22, padding: 20, alignItems: 'center' },
  avatar: { width: 76, height: 76, borderRadius: 24, backgroundColor: 'rgba(210,103,61,0.16)', borderWidth: 1, borderColor: 'rgba(210,103,61,0.5)', alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#F7F4EF', fontSize: 22, fontWeight: '900', letterSpacing: 1 },
  name: { color: '#F7F4EF', fontSize: 28, fontWeight: '900', marginTop: 14, textAlign: 'center' },
  description: { color: '#A7B0BE', fontSize: 14, lineHeight: 21, textAlign: 'center', marginTop: 8 },
  descriptionMuted: { color: '#667085', fontSize: 14, fontStyle: 'italic', marginTop: 8 },
  statsRow: { flexDirection: 'row', gap: 10, width: '100%', marginTop: 20 },
  statCard: { flex: 1, backgroundColor: '#0D131D', borderRadius: 14, borderWidth: 1, borderColor: '#1C2635', padding: 13, alignItems: 'center' },
  statValue: { color: '#F7F4EF', fontSize: 18, fontWeight: '900', marginTop: 7 },
  statLabel: { color: '#697587', fontSize: 9, fontWeight: '800', letterSpacing: 0.8, marginTop: 2 },
  joinButton: { width: '100%', minHeight: 48, borderRadius: 14, backgroundColor: ACCENT, flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center', marginTop: 16 },
  memberButton: { backgroundColor: '#11291F', borderWidth: 1, borderColor: '#245B40' },
  joinText: { color: '#fff', fontSize: 12, fontWeight: '900', letterSpacing: 0.9 },
  memberText: { color: '#B9F6CA' },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 24, marginBottom: 10, paddingHorizontal: 2 },
  sectionTitle: { color: '#F7F4EF', fontSize: 19, fontWeight: '900' },
  sectionMeta: { color: '#697587', fontSize: 11, fontWeight: '700' },
  memberCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: CARD, borderWidth: 1, borderColor: '#1F2937', borderRadius: 16, padding: 13, marginBottom: 9 },
  memberAvatar: { width: 42, height: 42, borderRadius: 14, backgroundColor: '#192332', alignItems: 'center', justifyContent: 'center', marginRight: 11 },
  memberInitial: { color: '#F7F4EF', fontSize: 12, fontWeight: '900' },
  memberInfo: { flex: 1 },
  memberNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  memberName: { color: '#F7F4EF', fontSize: 15, fontWeight: '800' },
  memberMeta: { color: '#697587', fontSize: 11, marginTop: 3 },
  memberXp: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  memberXpText: { color: '#D4D9E2', fontSize: 11, fontWeight: '800' },
  emptyTitle: { color: '#F7F4EF', fontSize: 20, fontWeight: '900', marginTop: 12 },
  emptyText: { color: '#697587', fontSize: 13, marginTop: 5, textAlign: 'center' },
  noMembers: { alignItems: 'center', paddingVertical: 34 },
  noMembersText: { color: '#697587', fontSize: 13, marginTop: 8 },
});
