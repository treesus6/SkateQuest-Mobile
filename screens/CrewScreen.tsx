import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {
  ArrowUpRight,
  Crown,
  Flame,
  MapPinned,
  MessageCircle,
  Search,
  Shield,
  Trophy,
  UserPlus,
  Users,
  X,
  Zap,
} from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '../lib/useNavigation';
import { useAuthStore } from '../stores/useAuthStore';
import { supabase } from '../lib/supabase';

const INK = '#07080B';
const PAPER = '#F5F0E7';
const ORANGE = '#E36D3F';
const ACID = '#D8F04B';
const BLUE = '#63A7FF';
const PURPLE = '#A878FF';
const MUTED = '#9098A6';

type CrewMember = {
  id: string;
  user_id: string;
  role: 'owner' | 'member';
  joined_at: string;
  profiles: { username: string | null; xp: number | null; level: number | null; avatar_url?: string | null } | null;
};

type CrewData = {
  id: string;
  name: string;
  description: string | null;
  member_count: number | null;
  total_xp: number | null;
  created_by: string;
};

type CrewInvite = {
  id: string;
  crew_id: string;
  created_at: string;
  crews: { name: string; description: string | null; total_xp: number | null; member_count: number | null } | null;
};

export default function CrewScreen() {
  const navigation = useNavigation<any>();
  const { user } = useAuthStore();
  const [crew, setCrew] = useState<CrewData | null>(null);
  const [members, setMembers] = useState<CrewMember[]>([]);
  const [invites, setInvites] = useState<CrewInvite[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [inviteVisible, setInviteVisible] = useState(false);
  const [searchUsername, setSearchUsername] = useState('');
  const [searchResults, setSearchResults] = useState<{ id: string; username: string; xp: number }[]>([]);
  const [searching, setSearching] = useState(false);
  const [inviting, setInviting] = useState<string | null>(null);
  const [respondingInvite, setRespondingInvite] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user?.id) {
      setCrew(null);
      setMembers([]);
      setInvites([]);
      setLoading(false);
      return;
    }

    const [{ data: membership }, { data: inviteRows }] = await Promise.all([
      supabase
        .from('crew_members')
        .select('crew_id,role,joined_at')
        .eq('user_id', user.id)
        .maybeSingle(),
      supabase
        .from('crew_invites')
        .select('id,crew_id,created_at,crews(name,description,total_xp,member_count)')
        .eq('invitee_id', user.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false }),
    ]);

    setInvites((inviteRows as unknown as CrewInvite[]) ?? []);

    if (!membership?.crew_id) {
      setCrew(null);
      setMembers([]);
      return;
    }

    const [{ data: crewData }, { data: memberRows }] = await Promise.all([
      supabase.from('crews').select('*').eq('id', membership.crew_id).single(),
      supabase
        .from('crew_members')
        .select('id,user_id,role,joined_at,profiles(username,xp,level,avatar_url)')
        .eq('crew_id', membership.crew_id)
        .order('role', { ascending: false })
        .order('joined_at', { ascending: true }),
    ]);

    setCrew((crewData as CrewData | null) ?? null);
    setMembers((memberRows as unknown as CrewMember[]) ?? []);
  }, [user?.id]);

  useEffect(() => {
    setLoading(true);
    void load().finally(() => setLoading(false));
  }, [load]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const myMembership = useMemo(() => members.find(member => member.user_id === user?.id), [members, user?.id]);
  const isOwner = myMembership?.role === 'owner';
  const crewXp = Math.max(0, Number(crew?.total_xp ?? 0));
  const averageLevel = members.length
    ? Math.round(members.reduce((sum, member) => sum + Number(member.profiles?.level ?? 1), 0) / members.length)
    : 1;

  const searchUsers = async (query: string) => {
    setSearchUsername(query);
    if (query.trim().length < 2) {
      setSearchResults([]);
      return;
    }

    setSearching(true);
    const { data } = await supabase
      .from('profiles')
      .select('id,username,xp')
      .ilike('username', `%${query.trim()}%`)
      .neq('id', user?.id ?? '')
      .limit(12);

    const memberIds = new Set(members.map(member => member.user_id));
    setSearchResults(
      (data ?? [])
        .filter(row => row.username && !memberIds.has(row.id))
        .map(row => ({ id: row.id, username: row.username as string, xp: Number(row.xp ?? 0) }))
    );
    setSearching(false);
  };

  const inviteUser = async (profileId: string, username: string) => {
    if (!crew?.id || inviting) return;
    setInviting(profileId);
    try {
      const { error } = await supabase.rpc('invite_to_crew', {
        p_crew_id: crew.id,
        p_user_id: profileId,
      });
      if (error) throw error;
      Alert.alert('Invite sent', `@${username} got a crew invite.`);
      setSearchResults(current => current.filter(item => item.id !== profileId));
    } catch (error) {
      Alert.alert('Could not invite', error instanceof Error ? error.message : 'Try again.');
    } finally {
      setInviting(null);
    }
  };

  const respondInvite = async (inviteId: string, accept: boolean) => {
    if (respondingInvite) return;
    setRespondingInvite(inviteId);
    try {
      const { error } = await supabase.rpc('respond_crew_invite', {
        p_invite_id: inviteId,
        p_accept: accept,
      });
      if (error) throw error;
      await load();
    } catch (error) {
      Alert.alert('Crew invite failed', error instanceof Error ? error.message : 'Try again.');
    } finally {
      setRespondingInvite(null);
    }
  };

  const removeMember = (member: CrewMember) => {
    if (!crew?.id || !isOwner) return;
    const username = member.profiles?.username || 'this skater';
    Alert.alert('Remove from crew?', `Remove @${username} from ${crew.name}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          const { error } = await supabase.rpc('remove_crew_member', {
            p_crew_id: crew.id,
            p_user_id: member.user_id,
          });
          if (error) {
            Alert.alert('Could not remove member', error.message);
            return;
          }
          await load();
        },
      },
    ]);
  };

  const leaveCrew = () => {
    if (!crew?.id) return;
    Alert.alert('Leave crew?', `Leave ${crew.name}?`, [
      { text: 'Stay', style: 'cancel' },
      {
        text: 'Leave',
        style: 'destructive',
        onPress: async () => {
          const { error } = await supabase.rpc('leave_crew', { p_crew_id: crew.id });
          if (error) {
            Alert.alert('Could not leave crew', error.message);
            return;
          }
          await load();
        },
      },
    ]);
  };

  if (loading) {
    return (
      <View style={s.loading}>
        <View style={s.loadingMark}><Users color={INK} size={30} strokeWidth={2.8} /></View>
        <ActivityIndicator color={ORANGE} style={{ marginTop: 14 }} />
        <Text style={s.loadingText}>Loading your crew…</Text>
      </View>
    );
  }

  if (!crew) {
    return (
      <SafeAreaView style={s.container} edges={['top']}>
        <ScrollView
          contentContainerStyle={s.noCrewContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={ORANGE} />}
        >
          <Text style={s.kicker}>CREW MODE</Text>
          <Text style={s.noCrewTitle}>FIND YOUR{`\n`}PEOPLE.</Text>
          <Text style={s.noCrewSub}>Crews are where sessions turn into battles, territory, chat, and team XP.</Text>

          <View style={s.noCrewPoster}>
            <View style={s.posterSlashA} />
            <View style={s.posterSlashB} />
            <Users color={PAPER} size={62} strokeWidth={1.8} />
            <Text style={s.posterBig}>SKATE TOGETHER.</Text>
            <Text style={s.posterSmall}>BUILD A CREW // TAKE SPOTS // RUN BATTLES</Text>
          </View>

          {invites.length > 0 ? (
            <View style={s.invitesBlock}>
              <Text style={s.sectionEyebrow}>PENDING INVITES</Text>
              <Text style={s.sectionTitle}>Somebody wants you in</Text>
              {invites.map(invite => (
                <View key={invite.id} style={s.inviteCard}>
                  <View style={s.inviteCrewMark}><Shield color={INK} size={24} /></View>
                  <View style={s.inviteCopy}>
                    <Text style={s.inviteName}>{invite.crews?.name || 'Crew invite'}</Text>
                    <Text style={s.inviteMeta}>{invite.crews?.member_count ?? 0} members • {(invite.crews?.total_xp ?? 0).toLocaleString()} XP</Text>
                  </View>
                  <View style={s.inviteActions}>
                    <Pressable
                      disabled={respondingInvite === invite.id}
                      onPress={() => void respondInvite(invite.id, false)}
                      style={s.inviteDecline}
                    >
                      <X color={PAPER} size={17} />
                    </Pressable>
                    <Pressable
                      disabled={respondingInvite === invite.id}
                      onPress={() => void respondInvite(invite.id, true)}
                      style={s.inviteAccept}
                    >
                      {respondingInvite === invite.id ? <ActivityIndicator color={INK} /> : <Text style={s.inviteAcceptText}>JOIN</Text>}
                    </Pressable>
                  </View>
                </View>
              ))}
            </View>
          ) : null}

          <Pressable style={s.findCrewBtn} onPress={() => navigation.navigate('Crews')}>
            <Search color={INK} size={19} strokeWidth={2.6} />
            <Text style={s.findCrewText}>FIND OR CREATE A CREW</Text>
            <ArrowUpRight color={INK} size={18} />
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <FlatList
        data={members}
        keyExtractor={item => item.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={ORANGE} />}
        contentContainerStyle={s.listContent}
        ListHeaderComponent={
          <View>
            <View style={s.headerTop}>
              <View>
                <Text style={s.kicker}>YOUR CREW</Text>
                <Text style={s.crewName}>{crew.name.toUpperCase()}</Text>
              </View>
              <Pressable onPress={leaveCrew} style={s.leaveChip}><Text style={s.leaveText}>LEAVE</Text></Pressable>
            </View>

            <View style={s.crewHero}>
              <View style={s.heroSlashA} />
              <View style={s.heroSlashB} />
              <View style={s.crewBadge}>
                <Crown color={INK} size={29} strokeWidth={2.6} />
              </View>
              <Text style={s.crewHeroKicker}>CREW ID // {crew.id.slice(0, 6).toUpperCase()}</Text>
              <Text style={s.crewHeroTitle}>{crew.name}</Text>
              <Text style={s.crewHeroDesc}>{crew.description || 'No bio. Just show up and skate.'}</Text>
            </View>

            <View style={s.statsRail}>
              <StatBlock accent={ORANGE} value={String(members.length)} label="HOMIES" />
              <StatBlock accent={ACID} value={crewXp.toLocaleString()} label="CREW XP" />
              <StatBlock accent={BLUE} value={`LVL ${averageLevel}`} label="AVG LEVEL" />
            </View>

            <View style={s.modeRail}>
              <ModeTile
                color={ORANGE}
                icon={<Trophy color={INK} size={23} />}
                label="BATTLES"
                sub="Crew vs crew"
                onPress={() => navigation.navigate('CrewBattles')}
              />
              <ModeTile
                color={ACID}
                icon={<MapPinned color={INK} size={23} />}
                label="TERRITORY"
                sub="Take real spots"
                onPress={() => navigation.navigate('Map')}
              />
              <ModeTile
                color={PURPLE}
                icon={<MessageCircle color={INK} size={23} />}
                label="CHAT"
                sub="Crew messages"
                onPress={() => navigation.navigate('Messages')}
              />
            </View>

            <View style={s.memberHeader}>
              <View>
                <Text style={s.sectionEyebrow}>THE LINEUP</Text>
                <Text style={s.sectionTitle}>{members.length} deep</Text>
              </View>
              {isOwner ? (
                <Pressable style={s.inviteBtn} onPress={() => setInviteVisible(true)}>
                  <UserPlus color={INK} size={17} />
                  <Text style={s.inviteBtnText}>INVITE</Text>
                </Pressable>
              ) : null}
            </View>
          </View>
        }
        renderItem={({ item, index }) => {
          const username = item.profiles?.username || 'Skater';
          const isMe = item.user_id === user?.id;
          return (
            <Pressable
              onLongPress={() => isOwner && !isMe && removeMember(item)}
              style={[s.memberTicket, item.role === 'owner' && s.memberTicketOwner]}
            >
              <View style={s.memberRank}><Text style={s.memberRankText}>{String(index + 1).padStart(2, '0')}</Text></View>
              <View style={[s.memberAvatar, item.role === 'owner' && s.memberAvatarOwner]}>
                <Text style={s.memberAvatarText}>{username.slice(0, 2).toUpperCase()}</Text>
              </View>
              <View style={s.memberCopy}>
                <View style={s.memberNameRow}>
                  <Text style={s.memberName}>@{username}{isMe ? ' • YOU' : ''}</Text>
                  {item.role === 'owner' ? <Crown color={ORANGE} size={14} /> : null}
                </View>
                <View style={s.memberStats}>
                  <Zap color={ACID} size={13} />
                  <Text style={s.memberStatText}>{Number(item.profiles?.xp ?? 0).toLocaleString()} XP</Text>
                  <Flame color={ORANGE} size={13} />
                  <Text style={s.memberStatText}>LVL {item.profiles?.level ?? 1}</Text>
                </View>
              </View>
              {isOwner && !isMe ? <Text style={s.holdHint}>HOLD{`\n`}TO REMOVE</Text> : null}
            </Pressable>
          );
        }}
      />

      <Modal visible={inviteVisible} transparent animationType="slide" onRequestClose={() => setInviteVisible(false)}>
        <View style={s.modalShade}>
          <View style={s.modalSheet}>
            <View style={s.modalHeader}>
              <View>
                <Text style={s.sectionEyebrow}>RECRUIT</Text>
                <Text style={s.modalTitle}>Invite a homie</Text>
              </View>
              <Pressable onPress={() => setInviteVisible(false)} style={s.modalClose}><X color={PAPER} size={19} /></Pressable>
            </View>

            <View style={s.searchBox}>
              <Search color={MUTED} size={18} />
              <TextInput
                value={searchUsername}
                onChangeText={text => void searchUsers(text)}
                placeholder="Search username"
                placeholderTextColor="#6D7582"
                autoCapitalize="none"
                autoCorrect={false}
                style={s.searchInput}
              />
              {searching ? <ActivityIndicator color={ORANGE} /> : null}
            </View>

            <ScrollView style={s.results} keyboardShouldPersistTaps="handled">
              {searchResults.map(result => (
                <View key={result.id} style={s.resultRow}>
                  <View style={s.resultAvatar}><Text style={s.resultAvatarText}>{result.username.slice(0, 2).toUpperCase()}</Text></View>
                  <View style={s.resultCopy}>
                    <Text style={s.resultName}>@{result.username}</Text>
                    <Text style={s.resultXp}>{result.xp.toLocaleString()} XP</Text>
                  </View>
                  <Pressable
                    onPress={() => void inviteUser(result.id, result.username)}
                    disabled={inviting === result.id}
                    style={s.sendInvite}
                  >
                    {inviting === result.id ? <ActivityIndicator color={INK} /> : <Text style={s.sendInviteText}>SEND</Text>}
                  </Pressable>
                </View>
              ))}
              {searchUsername.trim().length >= 2 && !searching && searchResults.length === 0 ? (
                <Text style={s.noResults}>No available skaters found.</Text>
              ) : null}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function StatBlock({ accent, value, label }: { accent: string; value: string; label: string }) {
  return (
    <View style={[s.statBlock, { borderBottomColor: accent }]}> 
      <Text style={s.statValue}>{value}</Text>
      <Text style={[s.statLabel, { color: accent }]}>{label}</Text>
    </View>
  );
}

function ModeTile({ color, icon, label, sub, onPress }: { color: string; icon: React.ReactNode; label: string; sub: string; onPress: () => void }) {
  return (
    <Pressable style={[s.modeTile, { backgroundColor: color }]} onPress={onPress}>
      <View style={s.modeIconRow}>{icon}<ArrowUpRight color={INK} size={16} /></View>
      <Text style={s.modeLabel}>{label}</Text>
      <Text style={s.modeSub}>{sub}</Text>
    </Pressable>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: INK },
  loading: { flex: 1, backgroundColor: INK, alignItems: 'center', justifyContent: 'center' },
  loadingMark: { width: 66, height: 66, borderRadius: 18, backgroundColor: ACID, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '-5deg' }] },
  loadingText: { color: MUTED, fontWeight: '700', marginTop: 10 },
  listContent: { paddingBottom: 34 },
  kicker: { color: ORANGE, fontSize: 10, fontWeight: '900', letterSpacing: 2 },
  headerTop: { paddingHorizontal: 18, paddingTop: 8, paddingBottom: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  crewName: { color: PAPER, fontSize: 28, fontWeight: '900', letterSpacing: -1, marginTop: 3 },
  leaveChip: { borderWidth: 1, borderColor: '#343A44', paddingHorizontal: 10, paddingVertical: 7, borderRadius: 999 },
  leaveText: { color: MUTED, fontSize: 9, fontWeight: '900', letterSpacing: 1.1 },
  crewHero: { marginHorizontal: 14, minHeight: 228, borderRadius: 26, padding: 20, overflow: 'hidden', backgroundColor: '#171B22', borderWidth: 1, borderColor: '#2E343E', justifyContent: 'flex-end' },
  heroSlashA: { position: 'absolute', width: 220, height: 66, backgroundColor: ORANGE, right: -76, top: 26, transform: [{ rotate: '29deg' }] },
  heroSlashB: { position: 'absolute', width: 180, height: 18, backgroundColor: ACID, left: -52, bottom: 36, transform: [{ rotate: '-12deg' }] },
  crewBadge: { position: 'absolute', top: 18, left: 18, width: 52, height: 52, borderRadius: 16, backgroundColor: ACID, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '-5deg' }] },
  crewHeroKicker: { color: '#8B93A0', fontSize: 9, fontWeight: '900', letterSpacing: 1.5 },
  crewHeroTitle: { color: PAPER, fontSize: 34, fontWeight: '900', letterSpacing: -1.4, marginTop: 6 },
  crewHeroDesc: { color: '#C2C7D0', fontSize: 12, lineHeight: 18, maxWidth: 280, marginTop: 5 },
  statsRail: { flexDirection: 'row', gap: 8, paddingHorizontal: 14, marginTop: 10 },
  statBlock: { flex: 1, minHeight: 76, borderRadius: 17, backgroundColor: '#12161C', borderWidth: 1, borderColor: '#292F39', borderBottomWidth: 4, padding: 12, justifyContent: 'center' },
  statValue: { color: PAPER, fontSize: 18, fontWeight: '900' },
  statLabel: { fontSize: 8, fontWeight: '900', letterSpacing: 1.2, marginTop: 3 },
  modeRail: { flexDirection: 'row', gap: 8, paddingHorizontal: 14, marginTop: 10 },
  modeTile: { flex: 1, minHeight: 126, borderRadius: 19, padding: 12, justifyContent: 'flex-end' },
  modeIconRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 'auto' },
  modeLabel: { color: INK, fontSize: 15, fontWeight: '900' },
  modeSub: { color: 'rgba(7,8,11,0.68)', fontSize: 9, fontWeight: '800', marginTop: 2 },
  memberHeader: { paddingHorizontal: 18, marginTop: 28, marginBottom: 11, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
  sectionEyebrow: { color: ORANGE, fontSize: 9, fontWeight: '900', letterSpacing: 1.7 },
  sectionTitle: { color: PAPER, fontSize: 23, fontWeight: '900', letterSpacing: -0.8, marginTop: 2 },
  inviteBtn: { flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: ACID, borderRadius: 12, paddingHorizontal: 12, minHeight: 38 },
  inviteBtnText: { color: INK, fontSize: 9, fontWeight: '900', letterSpacing: 1.2 },
  memberTicket: { marginHorizontal: 14, marginBottom: 9, minHeight: 78, flexDirection: 'row', alignItems: 'center', borderRadius: 17, overflow: 'hidden', backgroundColor: '#13171E', borderWidth: 1, borderColor: '#2A303A' },
  memberTicketOwner: { borderColor: 'rgba(227,109,63,0.55)' },
  memberRank: { width: 44, alignSelf: 'stretch', alignItems: 'center', justifyContent: 'center', backgroundColor: '#202631' },
  memberRankText: { color: '#69717D', fontSize: 15, fontWeight: '900' },
  memberAvatar: { width: 46, height: 46, borderRadius: 14, marginLeft: 12, backgroundColor: BLUE, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '-3deg' }] },
  memberAvatarOwner: { backgroundColor: ORANGE },
  memberAvatarText: { color: INK, fontSize: 13, fontWeight: '900' },
  memberCopy: { flex: 1, paddingHorizontal: 12 },
  memberNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  memberName: { color: PAPER, fontSize: 14, fontWeight: '900' },
  memberStats: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 5 },
  memberStatText: { color: MUTED, fontSize: 9, fontWeight: '800', marginRight: 6 },
  holdHint: { color: '#68707C', fontSize: 7, fontWeight: '900', letterSpacing: 0.8, textAlign: 'center', marginRight: 10 },
  noCrewContent: { paddingHorizontal: 14, paddingTop: 16, paddingBottom: 40 },
  noCrewTitle: { color: PAPER, fontSize: 46, lineHeight: 43, fontWeight: '900', letterSpacing: -2.4, marginTop: 8 },
  noCrewSub: { color: MUTED, fontSize: 13, lineHeight: 19, maxWidth: 340, marginTop: 10 },
  noCrewPoster: { minHeight: 248, marginTop: 22, borderRadius: 27, backgroundColor: '#161A21', borderWidth: 1, borderColor: '#2C323C', overflow: 'hidden', padding: 20, justifyContent: 'flex-end' },
  posterSlashA: { position: 'absolute', width: 250, height: 80, right: -80, top: 20, backgroundColor: ORANGE, transform: [{ rotate: '27deg' }] },
  posterSlashB: { position: 'absolute', width: 210, height: 24, left: -80, bottom: 32, backgroundColor: ACID, transform: [{ rotate: '-9deg' }] },
  posterBig: { color: PAPER, fontSize: 25, fontWeight: '900', marginTop: 16 },
  posterSmall: { color: '#A8AFBA', fontSize: 9, fontWeight: '900', letterSpacing: 1.2, marginTop: 5 },
  invitesBlock: { marginTop: 28 },
  inviteCard: { marginTop: 10, minHeight: 88, flexDirection: 'row', alignItems: 'center', borderRadius: 18, backgroundColor: '#13171E', borderWidth: 1, borderColor: '#2B313B', overflow: 'hidden' },
  inviteCrewMark: { width: 60, alignSelf: 'stretch', backgroundColor: ACID, alignItems: 'center', justifyContent: 'center' },
  inviteCopy: { flex: 1, paddingHorizontal: 12 },
  inviteName: { color: PAPER, fontSize: 15, fontWeight: '900' },
  inviteMeta: { color: MUTED, fontSize: 9, fontWeight: '700', marginTop: 4 },
  inviteActions: { flexDirection: 'row', gap: 7, paddingRight: 10 },
  inviteDecline: { width: 38, height: 38, borderRadius: 12, borderWidth: 1, borderColor: '#39404B', alignItems: 'center', justifyContent: 'center' },
  inviteAccept: { minWidth: 62, height: 38, borderRadius: 12, backgroundColor: ACID, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 10 },
  inviteAcceptText: { color: INK, fontSize: 9, fontWeight: '900', letterSpacing: 1 },
  findCrewBtn: { marginTop: 22, minHeight: 56, borderRadius: 16, backgroundColor: ORANGE, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  findCrewText: { color: INK, fontSize: 11, fontWeight: '900', letterSpacing: 1 },
  modalShade: { flex: 1, backgroundColor: 'rgba(2,3,5,0.72)', justifyContent: 'flex-end' },
  modalSheet: { maxHeight: '78%', backgroundColor: '#11151B', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 18, borderTopWidth: 1, borderColor: '#343A44' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  modalTitle: { color: PAPER, fontSize: 25, fontWeight: '900', letterSpacing: -0.8, marginTop: 2 },
  modalClose: { width: 38, height: 38, borderRadius: 12, backgroundColor: '#222832', alignItems: 'center', justifyContent: 'center' },
  searchBox: { marginTop: 16, minHeight: 52, borderRadius: 15, backgroundColor: '#1B2028', borderWidth: 1, borderColor: '#303743', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 13, gap: 9 },
  searchInput: { flex: 1, color: PAPER, fontSize: 14, fontWeight: '700' },
  results: { marginTop: 10 },
  resultRow: { minHeight: 68, flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#272D36' },
  resultAvatar: { width: 40, height: 40, borderRadius: 12, backgroundColor: BLUE, alignItems: 'center', justifyContent: 'center' },
  resultAvatarText: { color: INK, fontWeight: '900', fontSize: 11 },
  resultCopy: { flex: 1, paddingHorizontal: 11 },
  resultName: { color: PAPER, fontSize: 13, fontWeight: '900' },
  resultXp: { color: MUTED, fontSize: 9, marginTop: 3 },
  sendInvite: { minWidth: 62, minHeight: 36, borderRadius: 11, backgroundColor: ACID, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 10 },
  sendInviteText: { color: INK, fontSize: 9, fontWeight: '900', letterSpacing: 1 },
  noResults: { color: MUTED, textAlign: 'center', paddingVertical: 26, fontWeight: '700' },
});
