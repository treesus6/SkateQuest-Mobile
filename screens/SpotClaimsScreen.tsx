import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, SafeAreaView, ScrollView, RefreshControl, ActivityIndicator, Pressable, Alert } from 'react-native';
import * as Location from 'expo-location';
import { Trophy, Crown, Flame, TrendingUp, MapPin } from 'lucide-react-native';
import { useAuthStore } from '../stores/useAuthStore';
import { spotClaimsService } from '../lib/spotClaimsService';
import Card from '../components/ui/Card';
import { Logger } from '../lib/logger';
import { supabase } from '../lib/supabase';

interface LeaderboardEntry {
  rank: number;
  user_id: string;
  display_name: string;
  claimed_spots: number;
  total_claim_strength: number;
  pro_athlete: boolean;
  pro_tier?: string;
}

interface UserSpot {
  claim_id: string;
  spot_id: string;
  spot_name: string;
  latitude: number;
  longitude: number;
  claimed_at: string;
  claim_strength: number;
}

interface NearbySpot {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  distance_meters?: number;
}

export default function SpotClaimsScreen() {
  const { user } = useAuthStore();
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [userClaims, setUserClaims] = useState<UserSpot[]>([]);
  const [nearbySpots, setNearbySpots] = useState<NearbySpot[]>([]);
  const [userRank, setUserRank] = useState<LeaderboardEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [claimingId, setClaimingId] = useState<string | null>(null);

  const loadNearby = useCallback(async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setNearbySpots([]);
        return;
      }
      const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const { data, error } = await supabase.rpc('get_nearby_spots', {
        lat: position.coords.latitude,
        lng: position.coords.longitude,
        radius_meters: 5000,
      });
      if (error) throw error;
      setNearbySpots(((data ?? []) as NearbySpot[]).slice(0, 12));
    } catch (error) {
      Logger.error('Failed to load nearby claimable spots', error);
      setNearbySpots([]);
    }
  }, []);

  const loadData = useCallback(async () => {
    if (!user?.id) return;
    try {
      const [leaderboardData, userClaimsData] = await Promise.all([
        spotClaimsService.getClaimsLeaderboard(100),
        spotClaimsService.getUserClaimedSpots(user.id),
      ]);
      setLeaderboard(leaderboardData);
      setUserClaims(userClaimsData);
      setUserRank(leaderboardData.find(entry => entry.user_id === user.id) || null);
      await loadNearby();
    } catch (error) {
      Logger.error('Failed to load claims data', error);
    } finally {
      setLoading(false);
    }
  }, [user?.id, loadNearby]);

  useEffect(() => {
    void loadData();
    const subscription = spotClaimsService.subscribeToUserClaims(user?.id || '', () => void loadData());
    return () => subscription.unsubscribe();
  }, [user?.id, loadData]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  const handleClaim = async (spot: NearbySpot) => {
    if (!user?.id || claimingId) return;
    setClaimingId(spot.id);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') throw new Error('Location permission is required to claim a spot.');
      const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      const result = await spotClaimsService.claimSpot(spot.id, position.coords.latitude, position.coords.longitude);
      if (result.action === 'already_owned') {
        Alert.alert('Already yours', 'You already hold this spot. No extra XP is awarded for re-claiming it.');
      } else {
        Alert.alert(result.action === 'challenged' ? 'Spot taken!' : 'Spot claimed!', `+${result.xp_reward} XP — verified within ${Math.round(result.distance_meters ?? 0)}m.`);
      }
      await loadData();
    } catch (error: any) {
      Alert.alert('Claim failed', error?.message || 'Move closer to the spot and try again.');
    } finally {
      setClaimingId(null);
    }
  };

  if (loading) {
    return <SafeAreaView className="flex-1 bg-brand-beige dark:bg-gray-900 items-center justify-center"><ActivityIndicator size="large" color="#d2673d" /></SafeAreaView>;
  }

  return <SafeAreaView className="flex-1 bg-brand-beige dark:bg-gray-900">
    <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />} contentContainerStyle={{ paddingBottom: 30 }}>
      <View className="bg-brand-terracotta px-4 py-4 rounded-b-2xl mb-4"><View className="flex-row items-center gap-2 mb-2"><Crown size={28} color="white" fill="white" /><Text className="text-2xl font-bold text-white">King of the Hill</Text></View><Text className="text-white/90 text-sm">Be physically at the spot, take it, and hold it.</Text></View>

      <View className="px-4">
        <Card className="mb-4 border-l-4 border-brand-terracotta">
          <View className="flex-row justify-between items-center"><View><Text className="text-lg font-bold text-gray-900 dark:text-white">Your Ranking</Text><Text className="text-sm text-gray-500 dark:text-gray-400 mt-1">{userRank ? `${userRank.claimed_spots} claimed spots · ${userRank.total_claim_strength} strength` : 'Claim a nearby spot to enter the board'}</Text></View><Text className="text-2xl font-black text-brand-terracotta">{userRank ? `#${userRank.rank}` : '—'}</Text></View>
        </Card>

        <View className="flex-row items-center gap-2 mb-3"><MapPin size={20} color="#d2673d" /><Text className="text-lg font-bold text-gray-900 dark:text-white">Nearby Claimable Spots</Text></View>
        {nearbySpots.length === 0 ? <Card className="mb-4"><Text className="text-gray-500 dark:text-gray-400">Allow location to find spots within 5 km. You must be within 150m to claim one.</Text></Card> : nearbySpots.map(spot => {
          const owned = userClaims.some(claim => claim.spot_id === spot.id);
          return <Card key={spot.id} className="mb-2"><View className="flex-row items-center justify-between gap-3"><View className="flex-1"><Text className="font-bold text-gray-900 dark:text-white">{spot.name}</Text><Text className="text-xs text-gray-500 mt-1">Server verifies you are within 150m before any XP pays.</Text></View><Pressable disabled={claimingId === spot.id || owned} onPress={() => void handleClaim(spot)} className={`px-4 py-2 rounded-full ${owned ? 'bg-gray-300 dark:bg-gray-700' : 'bg-brand-terracotta'}`}><Text className={owned ? 'text-gray-500 font-bold' : 'text-white font-bold'}>{claimingId === spot.id ? 'Checking…' : owned ? 'Yours' : 'Claim'}</Text></Pressable></View></Card>;
        })}

        {userClaims.length > 0 && <><View className="flex-row items-center gap-2 mt-4 mb-3"><Flame size={20} color="#F59E0B" fill="#F59E0B" /><Text className="text-lg font-bold text-gray-900 dark:text-white">Your Claims</Text></View>{userClaims.map(item => <Card key={item.claim_id} className="mb-2"><Text className="font-semibold text-gray-900 dark:text-white">{item.spot_name}</Text><Text className="text-xs text-gray-500 mt-1">Strength {item.claim_strength} · held since {new Date(item.claimed_at).toLocaleDateString()}</Text></Card>)}</>}

        <View className="flex-row items-center gap-2 mt-4 mb-3"><TrendingUp size={20} color="#d2673d" /><Text className="text-lg font-bold text-gray-900 dark:text-white">Global Leaderboard</Text></View>
        <Card className="p-0 overflow-hidden">{leaderboard.slice(0,20).map((item,index) => <View key={item.user_id} className={`flex-row items-center px-4 py-3 border-b border-gray-100 dark:border-gray-700 ${item.user_id === user?.id ? 'bg-brand-terracotta/10' : ''}`}><View className="w-9 items-center">{index < 3 ? <Trophy size={18} color={index === 0 ? '#FFD700' : index === 1 ? '#C0C0C0' : '#CD7F32'} /> : <Text className="font-bold text-gray-500">#{item.rank}</Text>}</View><View className="flex-1 ml-2"><Text className="font-semibold text-gray-900 dark:text-white">{item.display_name}</Text><Text className="text-xs text-gray-500">{item.claimed_spots} spots · {item.total_claim_strength} strength</Text></View></View>)}</Card>
      </View>
    </ScrollView>
  </SafeAreaView>;
}
