import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  Share,
  Alert,
  Animated,
  Clipboard,
} from 'react-native';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

// Types for crew war stats
interface CrewWarStats {
  crew_id: string;
  crew_name: string;
  color_hex: string;
  spots_owned: number;
  total_members: number;
  total_xp: number;
  rank?: number;
}

interface UserCrewInfo {
  crew_id: string;
  crew_name: string;
  color_hex: string;
  role: 'leader' | 'member';
  invite_code: string;
}

export default function CrewLeaderboardScreen() {
  const { user } = useAuth();
  const [crews, setCrews] = useState<CrewWarStats[]>([]);
  const [userCrew, setUserCrew] = useState<UserCrewInfo | null>(null);
  const [userCrewStats, setUserCrewStats] = useState<CrewWarStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [copiedCode, setCopiedCode] = useState(false);

  const loadLeaderboard = useCallback(async () => {
    try {
      setLoading(true);

      // Fetch crew war stats from the view
      const { data: statsData, error: statsError } = await supabase
        .from('city_war_stats')
        .select('*')
        .order('spots_owned', { ascending: false });

      if (statsError) {
        console.error('Error fetching city_war_stats:', statsError);
        // Fallback: fetch directly from crews table with spot counts
        const { data: fallbackData, error: fallbackError } = await supabase.from('crews').select(`
            id,
            name,
            color_hex,
            invite_code,
            spots:spots(count)
          `);

        if (fallbackError) {
          console.error('Fallback error:', fallbackError);
        } else {
          const crewStats: CrewWarStats[] = (fallbackData || []).map(
            (crew: any, index: number) => ({
              crew_id: crew.id,
              crew_name: crew.name,
              color_hex: crew.color_hex || '#666666',
              spots_owned: crew.spots?.[0]?.count || 0,
              total_members: 0,
              total_xp: 0,
              rank: index + 1,
            })
          );
          crewStats.sort((a, b) => b.spots_owned - a.spots_owned);
          crewStats.forEach((c, i) => (c.rank = i + 1));
          setCrews(crewStats);
        }
      } else {
        const rankedCrews = (statsData || []).map((crew: any, index: number) => ({
          ...crew,
          rank: index + 1,
        }));
        setCrews(rankedCrews);
      }

      // Fetch user's crew info if logged in
      if (user) {
        const { data: memberData, error: memberError } = await supabase
          .from('crew_members')
          .select(
            `
            role,
            crews (
              id,
              name,
              color_hex,
              invite_code
            )
          `
          )
          .eq('user_id', user.id)
          .single();

        if (!memberError && memberData?.crews) {
          const crewData = Array.isArray(memberData.crews) ? memberData.crews[0] : memberData.crews;

          setUserCrew({
            crew_id: crewData.id,
            crew_name: crewData.name,
            color_hex: crewData.color_hex || '#666666',
            role: memberData.role as 'leader' | 'member',
            invite_code: crewData.invite_code || generateInviteCode(),
          });

          // Find user's crew in the stats
          const userCrewInStats = (statsData || crews).find(
            (c: CrewWarStats) => c.crew_id === crewData.id
          );
          setUserCrewStats(userCrewInStats || null);
        }
      }
    } catch (error) {
      console.error('Error loading leaderboard:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadLeaderboard();

    // Real-time subscription for crew changes
    const subscription = supabase
      .channel('crew-leaderboard-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'spots' }, () =>
        loadLeaderboard()
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'crews' }, () =>
        loadLeaderboard()
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [loadLeaderboard]);

  const generateInviteCode = () => {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  };

  const handleCopyInviteCode = async () => {
    if (userCrew?.invite_code) {
      Clipboard.setString(userCrew.invite_code);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  const handleShareInvite = async () => {
    if (!userCrew) {
      Alert.alert('Join a Crew', 'You need to join a crew before you can invite others.');
      return;
    }

    try {
      const message = `Join my crew "${userCrew.crew_name}" on SkateQuest! Use invite code: ${userCrew.invite_code}\n\nDownload the app: https://skatequest.app`;

      await Share.share({
        message,
        title: `Join ${userCrew.crew_name} on SkateQuest!`,
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const getRankDisplay = (rank: number) => {
    if (rank === 1) return { emoji: '🥇', color: '#FFD700' };
    if (rank === 2) return { emoji: '🥈', color: '#C0C0C0' };
    if (rank === 3) return { emoji: '🥉', color: '#CD7F32' };
    return { emoji: `#${rank}`, color: '#666' };
  };

  const renderMyCrewSection = () => {
    if (!user) {
      return (
        <View style={styles.myCrewSection}>
          <Text style={styles.sectionTitle}>My Crew</Text>
          <View style={styles.noCrewCard}>
            <Text style={styles.noCrewText}>Log in to see your crew stats</Text>
          </View>
        </View>
      );
    }

    if (!userCrew) {
      return (
        <View style={styles.myCrewSection}>
          <Text style={styles.sectionTitle}>My Crew</Text>
          <View style={styles.noCrewCard}>
            <Text style={styles.noCrewEmoji}>🛹</Text>
            <Text style={styles.noCrewText}>You're not in a crew yet</Text>
            <Text style={styles.noCrewSubtext}>Join or create a crew to compete!</Text>
            <TouchableOpacity style={styles.joinCrewButton}>
              <Text style={styles.joinCrewButtonText}>Find a Crew</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    const rank =
      userCrewStats?.rank || crews.findIndex(c => c.crew_id === userCrew.crew_id) + 1 || '-';
    const spotsOwned = userCrewStats?.spots_owned || 0;

    return (
      <View style={styles.myCrewSection}>
        <Text style={styles.sectionTitle}>My Crew</Text>
        <View style={[styles.myCrewCard, { borderColor: userCrew.color_hex }]}>
          <View style={styles.myCrewHeader}>
            <View style={[styles.crewColorCircle, { backgroundColor: userCrew.color_hex }]} />
            <View style={styles.myCrewInfo}>
              <Text style={styles.myCrewName}>{userCrew.crew_name}</Text>
              <Text style={styles.myCrewRole}>
                {userCrew.role === 'leader' ? '👑 Leader' : 'Member'}
              </Text>
            </View>
            <View style={styles.myCrewRank}>
              <Text style={styles.myCrewRankNumber}>#{rank}</Text>
              <Text style={styles.myCrewRankLabel}>Rank</Text>
            </View>
          </View>

          <View style={styles.myCrewStats}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{spotsOwned}</Text>
              <Text style={styles.statLabel}>Spots Owned</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{userCrewStats?.total_members || 0}</Text>
              <Text style={styles.statLabel}>Members</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{userCrewStats?.total_xp || 0}</Text>
              <Text style={styles.statLabel}>Total XP</Text>
            </View>
          </View>

          {/* Invite Code Section */}
          <View style={styles.inviteSection}>
            <Text style={styles.inviteLabel}>Invite Code</Text>
            <TouchableOpacity style={styles.inviteCodeBox} onPress={handleCopyInviteCode}>
              <Text style={styles.inviteCode}>{userCrew.invite_code}</Text>
              <Text style={styles.copyIcon}>{copiedCode ? '✓' : '📋'}</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[styles.recruitButton, { backgroundColor: userCrew.color_hex }]}
            onPress={handleShareInvite}
          >
            <Text style={styles.recruitButtonText}>📨 Recruit New Members</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderCrewItem = ({ item, index }: { item: CrewWarStats; index: number }) => {
    const rank = item.rank || index + 1;
    const rankDisplay = getRankDisplay(rank);
    const isUserCrew = userCrew?.crew_id === item.crew_id;

    return (
      <View
        style={[
          styles.crewCard,
          isUserCrew && styles.highlightedCrewCard,
          rank <= 3 && styles.topThreeCard,
        ]}
      >
        <View style={styles.rankContainer}>
          <Text style={[styles.rankText, { color: rankDisplay.color }]}>{rankDisplay.emoji}</Text>
        </View>

        <View style={[styles.crewColorCircle, { backgroundColor: item.color_hex }]} />

        <View style={styles.crewInfo}>
          <View style={styles.crewNameRow}>
            <Text style={styles.crewName}>{item.crew_name}</Text>
            {isUserCrew && (
              <View style={styles.youBadge}>
                <Text style={styles.youBadgeText}>YOU</Text>
              </View>
            )}
          </View>
          <Text style={styles.crewMemberCount}>
            {item.total_members} member{item.total_members !== 1 ? 's' : ''}
          </Text>
        </View>

        <View style={styles.spotsContainer}>
          <Text style={styles.spotsCount}>{item.spots_owned}</Text>
          <Text style={styles.spotsLabel}>spots</Text>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>⚔️ City War</Text>
        <Text style={styles.headerSubtitle}>Crew Territory Leaderboard</Text>
      </View>

      <FlatList
        data={crews}
        renderItem={renderCrewItem}
        keyExtractor={item => item.crew_id}
        contentContainerStyle={styles.listContainer}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={loadLeaderboard} />}
        ListHeaderComponent={renderMyCrewSection}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyEmoji}>🏴‍☠️</Text>
            <Text style={styles.emptyText}>No crews competing yet</Text>
            <Text style={styles.emptySubtext}>Start a crew and claim some spots!</Text>
          </View>
        }
        stickyHeaderIndices={[]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f0ea',
  },
  header: {
    backgroundColor: '#9b59b6',
    padding: 20,
    paddingTop: 15,
    paddingBottom: 25,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#fff',
    opacity: 0.9,
    textAlign: 'center',
    marginTop: 5,
  },
  listContainer: {
    padding: 15,
    paddingBottom: 30,
  },
  // My Crew Section
  myCrewSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  myCrewCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  myCrewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  myCrewInfo: {
    flex: 1,
    marginLeft: 12,
  },
  myCrewName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  myCrewRole: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  myCrewRank: {
    alignItems: 'center',
    backgroundColor: '#f5f0ea',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
  },
  myCrewRankNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#9b59b6',
  },
  myCrewRankLabel: {
    fontSize: 11,
    color: '#666',
  },
  myCrewStats: {
    flexDirection: 'row',
    backgroundColor: '#f5f0ea',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  statLabel: {
    fontSize: 11,
    color: '#666',
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    backgroundColor: '#ddd',
    marginHorizontal: 8,
  },
  inviteSection: {
    marginBottom: 12,
  },
  inviteLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 6,
  },
  inviteCodeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f0ea',
    borderRadius: 8,
    padding: 12,
  },
  inviteCode: {
    flex: 1,
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    letterSpacing: 2,
    fontFamily: 'monospace',
  },
  copyIcon: {
    fontSize: 18,
  },
  recruitButton: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  recruitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  // No Crew Card
  noCrewCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#ddd',
    borderStyle: 'dashed',
  },
  noCrewEmoji: {
    fontSize: 40,
    marginBottom: 12,
  },
  noCrewText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  noCrewSubtext: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
    marginBottom: 16,
  },
  joinCrewButton: {
    backgroundColor: '#9b59b6',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
  },
  joinCrewButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  // Crew List Items
  crewCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  highlightedCrewCard: {
    borderWidth: 2,
    borderColor: '#9b59b6',
    backgroundColor: '#faf5fc',
  },
  topThreeCard: {
    borderWidth: 2,
    borderColor: '#FFD700',
    backgroundColor: '#FFFEF0',
  },
  rankContainer: {
    width: 40,
    alignItems: 'center',
  },
  rankText: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  crewColorCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  crewInfo: {
    flex: 1,
    marginLeft: 12,
  },
  crewNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  crewName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  youBadge: {
    backgroundColor: '#9b59b6',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  youBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  crewMemberCount: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  spotsContainer: {
    alignItems: 'center',
    minWidth: 50,
  },
  spotsCount: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#9b59b6',
  },
  spotsLabel: {
    fontSize: 11,
    color: '#666',
  },
  // Empty State
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyEmoji: {
    fontSize: 50,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#999',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#aaa',
    marginTop: 5,
  },
});
