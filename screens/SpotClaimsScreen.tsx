import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, SafeAreaView, ScrollView, RefreshControl, ActivityIndicator, Pressable, Alert } from 'react-native';
import * as Location from 'expo-location';
import { Trophy, Crown, Flame, TrendingUp, MapPin, Camera, ShieldCheck, Crosshair } from 'lucide-react-native';
import { useAuthStore } from '../stores/useAuthStore';
import { spotClaimsService } from '../lib/spotClaimsService';
import { Logger } from '../lib/logger';
import { supabase } from '../lib/supabase';
import { useNavigation } from '../lib/useNavigation';

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

function distanceMeters(lat1: number, lng1: number, lat2: number, lng2: number) {
  const toRad = (degrees: number) => (degrees * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 6371000 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export default function SpotClaimsScreen() {
  const navigation = useNavigation<any>();
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
    return () => { void subscription.unsubscribe(); };
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
      if (status !== 'granted') throw new Error('Location permission is required for King of the Hill.');
      const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      const distance = distanceMeters(position.coords.latitude, position.coords.longitude, spot.latitude, spot.longitude);
      if (distance > 150) {
        throw new Error(`Move closer to ${spot.name}. You are about ${Math.round(distance)}m away and must be within 150m.`);
      }
      navigation.navigate('UploadMedia', { spotId: spot.id, spotName: spot.name, challengeType: 'king_of_hill' });
    } catch (error: any) {
      Alert.alert('Cannot submit claim yet', error?.message || 'Move closer to the spot and try again.');
    } finally {
      setClaimingId(null);
    }
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-[#07090D] items-center justify-center">
        <ActivityIndicator size="large" color="#D2673D" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-[#07090D]">
      <ScrollView refreshControl={<RefreshControl tintColor="#D2673D" refreshing={refreshing} onRefresh={handleRefresh} />} contentContainerStyle={{ paddingBottom: 36 }}>
        <View className="px-5 pt-4 pb-5">
          <Text className="text-[#D2673D] text-[11px] font-black tracking-[2px]">TERRITORY GAME</Text>
          <View className="flex-row items-center gap-2 mt-1">
            <Crown size={23} color="#FFD166" fill="#FFD166" />
            <Text className="text-white text-[30px] font-black">King of the Hill</Text>
          </View>
          <Text className="text-[#7B8493] text-sm mt-1">Be at the spot, land it on video, and earn the takeover through verification.</Text>

          <View className="flex-row gap-2 mt-4">
            <View className="flex-1 bg-[#10151D] border border-[#252D39] rounded-2xl p-3">
              <Trophy size={16} color="#FFD166" />
              <Text className="text-white text-xl font-black mt-1">{userRank ? `#${userRank.rank}` : '—'}</Text>
              <Text className="text-[#697383] text-[11px]">your rank</Text>
            </View>
            <View className="flex-1 bg-[#10151D] border border-[#252D39] rounded-2xl p-3">
              <Crown size={16} color="#D2673D" />
              <Text className="text-white text-xl font-black mt-1">{userClaims.length}</Text>
              <Text className="text-[#697383] text-[11px]">held spots</Text>
            </View>
            <View className="flex-1 bg-[#10151D] border border-[#252D39] rounded-2xl p-3">
              <MapPin size={16} color="#38BDF8" />
              <Text className="text-white text-xl font-black mt-1">{nearbySpots.length}</Text>
              <Text className="text-[#697383] text-[11px]">nearby</Text>
            </View>
          </View>

          <View className="bg-[#0B1017] border border-[#202733] rounded-2xl p-4 mt-4">
            <View className="flex-row gap-3">
              <Crosshair size={18} color="#D2673D" />
              <View className="flex-1">
                <Text className="text-white text-sm font-black">Real-world claim rules</Text>
                <Text className="text-[#7B8493] text-xs leading-5 mt-1">Within 150m of the spot + real video submission + verification before a takeover counts.</Text>
              </View>
            </View>
          </View>
        </View>

        <View className="px-4">
          <Text className="text-white text-lg font-black mb-3">Nearby Claimable Spots</Text>
          {nearbySpots.length === 0 ? (
            <View className="bg-[#10151D] border border-[#252D39] rounded-[20px] p-5 mb-4">
              <MapPin size={24} color="#596271" />
              <Text className="text-white font-black mt-3">No nearby spots loaded</Text>
              <Text className="text-[#697383] text-sm leading-5 mt-1">Allow location access to find spots within 5 km. A claim still requires you to get within 150m.</Text>
            </View>
          ) : nearbySpots.map(spot => {
            const owned = userClaims.some(claim => claim.spot_id === spot.id);
            return (
              <View key={spot.id} className="bg-[#10151D] border border-[#252D39] rounded-[18px] p-4 mb-3">
                <View className="flex-row items-center justify-between gap-3">
                  <View className="flex-1">
                    <Text className="text-white text-[16px] font-black">{spot.name}</Text>
                    <Text className="text-[#697383] text-xs mt-1">Real video and approval required.</Text>
                  </View>
                  <Pressable
                    disabled={claimingId === spot.id || owned}
                    onPress={() => void handleClaim(spot)}
                    className={`px-4 py-3 rounded-xl border ${owned ? 'bg-[#0C1118] border-[#252D39]' : 'bg-[#D2673D] border-[#D2673D]'}`}
                  >
                    <View className="flex-row items-center gap-1.5">
                      {owned ? <ShieldCheck size={14} color="#4ADE80" /> : <Camera size={14} color="#fff" />}
                      <Text className={owned ? 'text-[#4ADE80] text-xs font-black' : 'text-white text-xs font-black'}>
                        {claimingId === spot.id ? 'CHECKING…' : owned ? 'YOURS' : 'CHALLENGE'}
                      </Text>
                    </View>
                  </Pressable>
                </View>
              </View>
            );
          })}

          {userClaims.length > 0 ? (
            <View className="mt-3">
              <View className="flex-row items-center gap-2 mb-3">
                <Flame size={18} color="#F59E0B" fill="#F59E0B" />
                <Text className="text-white text-lg font-black">Your Verified Claims</Text>
              </View>
              {userClaims.map(item => (
                <View key={item.claim_id} className="bg-[#10151D] border border-[#252D39] rounded-[18px] p-4 mb-3">
                  <Text className="text-white font-black">{item.spot_name}</Text>
                  <Text className="text-[#7B8493] text-xs mt-1">Strength {item.claim_strength} · held since {new Date(item.claimed_at).toLocaleDateString()}</Text>
                </View>
              ))}
            </View>
          ) : null}

          <View className="flex-row items-center gap-2 mt-3 mb-3">
            <TrendingUp size={18} color="#D2673D" />
            <Text className="text-white text-lg font-black">Global Leaderboard</Text>
          </View>
          <View className="bg-[#10151D] border border-[#252D39] rounded-[20px] overflow-hidden">
            {leaderboard.slice(0, 20).map((item, index) => (
              <View key={item.user_id} className={`flex-row items-center px-4 py-3 border-b border-[#252D39] ${item.user_id === user?.id ? 'bg-[#1B1110]' : ''}`}>
                <View className="w-9 items-center">
                  {index < 3 ? (
                    <Trophy size={18} color={index === 0 ? '#FFD700' : index === 1 ? '#C0C0C0' : '#CD7F32'} />
                  ) : (
                    <Text className="text-[#7B8493] font-black">#{item.rank}</Text>
                  )}
                </View>
                <View className="flex-1 ml-2">
                  <Text className="text-white font-black">{item.display_name}</Text>
                  <Text className="text-[#697383] text-xs mt-0.5">{item.claimed_spots} spots · {item.total_claim_strength} strength</Text>
                </View>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
