import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import * as Location from 'expo-location';
import { Gem, Star, MapPin, Users, CheckCircle } from 'lucide-react-native';
import { supabase } from '../lib/supabase';

// ─── Types ────────────────────────────────────────────────────────────────────

interface GemSpot {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  avg_rating: number;
  checkin_count: number;
  gem_score: number;
  distanceMiles: number;
}

interface SavedGem {
  spot_id: string;
  saved: boolean;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 3958.8;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function checkinLabel(count: number): string {
  if (count === 0) return "Be the first to visit!";
  if (count === 1) return "Only 1 person has been here!";
  return `Only ${count} people have been here!`;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StarRating({ rating }: { rating: number }) {
  return (
    <View className="flex-row items-center gap-1">
      <Star size={14} color="#FF6B35" fill="#FF6B35" />
      <Text className="text-sm font-bold" style={{ color: '#FF6B35' }}>
        {rating.toFixed(1)}
      </Text>
    </View>
  );
}

function GemCard({
  gem,
  saved,
  onSave,
}: {
  gem: GemSpot;
  saved: boolean;
  onSave: (id: string) => void;
}) {
  return (
    <View
      className="rounded-2xl mb-4 p-4"
      style={{ backgroundColor: '#1a1a1a', borderWidth: 1, borderColor: '#2a2a2a' }}
    >
      {/* Top row: gem icon + name + gem score badge */}
      <View className="flex-row items-start justify-between mb-2">
        <View className="flex-row items-center flex-1 mr-2">
          <View
            className="rounded-full p-1.5 mr-2"
            style={{ backgroundColor: '#1A237E' }}
          >
            <Gem size={16} color="#90CAF9" />
          </View>
          <Text className="text-white font-bold text-base flex-1" numberOfLines={2}>
            {gem.name}
          </Text>
        </View>

        <View
          className="rounded-full px-2 py-0.5"
          style={{ backgroundColor: '#FF6B3520' }}
        >
          <Text className="text-xs font-bold" style={{ color: '#FF6B35' }}>
            GEM
          </Text>
        </View>
      </View>

      {/* Stats row */}
      <View className="flex-row items-center gap-4 mb-3">
        <StarRating rating={gem.avg_rating} />

        <View className="flex-row items-center gap-1">
          <MapPin size={13} color="#666" />
          <Text className="text-xs" style={{ color: '#666' }}>
            {gem.distanceMiles.toFixed(1)} mi
          </Text>
        </View>

        <View className="flex-row items-center gap-1">
          <Users size={13} color="#666" />
          <Text className="text-xs" style={{ color: '#666' }}>
            {gem.checkin_count} check-ins
          </Text>
        </View>
      </View>

      {/* Encouragement */}
      <View
        className="rounded-xl px-3 py-2 mb-3"
        style={{ backgroundColor: '#0D47A120' }}
      >
        <Text className="text-xs font-semibold" style={{ color: '#90CAF9' }}>
          {checkinLabel(gem.checkin_count)}
        </Text>
      </View>

      {/* CTA Button */}
      <TouchableOpacity
        onPress={() => onSave(gem.id)}
        className="flex-row items-center justify-center rounded-xl py-3"
        style={{
          backgroundColor: saved ? '#2E7D32' : '#FF6B35',
        }}
        activeOpacity={0.8}
        disabled={saved}
      >
        {saved ? (
          <>
            <CheckCircle size={15} color="#fff" />
            <Text className="text-white font-bold text-sm ml-2">Saved to Your List</Text>
          </>
        ) : (
          <>
            <Gem size={15} color="#fff" />
            <Text className="text-white font-bold text-sm ml-2">I'll Check It Out</Text>
          </>
        )}
      </TouchableOpacity>
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function HiddenGemsScreen() {
  const [gems, setGems] = useState<GemSpot[]>([]);
  const [savedGems, setSavedGems] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  // Fetch current user
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUserId(data.user?.id ?? null);
    });
  }, []);

  const fetchGems = useCallback(async () => {
    setError(null);
    try {
      // Get location
      const { status } = await Location.requestForegroundPermissionsAsync();
      let userLat = 0;
      let userLon = 0;

      if (status === 'granted') {
        const loc = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        userLat = loc.coords.latitude;
        userLon = loc.coords.longitude;
      }

      // Fetch spots with check-in count and avg rating
      // Using a join: spots + check_ins aggregate + spot_reviews aggregate
      const { data, error: dbErr } = await supabase
        .from('spots')
        .select(
          `
          id,
          name,
          latitude,
          longitude,
          avg_rating,
          check_ins(count),
          spot_reviews(rating)
        `,
        )
        .not('latitude', 'is', null)
        .not('longitude', 'is', null)
        .limit(200);

      if (dbErr) throw dbErr;

      const processed: GemSpot[] = [];

      for (const row of data ?? []) {
        const checkinCount: number =
          Array.isArray(row.check_ins)
            ? (row.check_ins as { count: number }[])[0]?.count ?? row.check_ins.length
            : 0;

        // Compute avg rating from spot_reviews if avg_rating is null
        let rating: number = row.avg_rating ?? 0;
        if (!rating && Array.isArray(row.spot_reviews) && row.spot_reviews.length > 0) {
          const sum = (row.spot_reviews as { rating: number }[]).reduce(
            (acc, r) => acc + (r.rating ?? 0),
            0,
          );
          rating = sum / row.spot_reviews.length;
        }

        // Hidden gem criteria: < 10 check-ins AND rating > 4.0
        if (checkinCount < 10 && rating > 4.0) {
          const distanceMiles =
            userLat !== 0
              ? haversineDistance(userLat, userLon, row.latitude, row.longitude)
              : 0;

          // gem_score = rating × (1 / (checkinCount + 1))  — lower check-ins = higher score
          const gem_score = rating * (1 / (checkinCount + 1));

          processed.push({
            id: row.id,
            name: row.name,
            latitude: row.latitude,
            longitude: row.longitude,
            avg_rating: Math.round(rating * 10) / 10,
            checkin_count: checkinCount,
            gem_score,
            distanceMiles,
          });
        }
      }

      // Sort by gem_score descending
      processed.sort((a, b) => b.gem_score - a.gem_score);
      setGems(processed.slice(0, 25));

      // Fetch user's saved gems to sync button state
      if (userId) {
        const { data: savedData } = await supabase
          .from('user_saved_spots')
          .select('spot_id')
          .eq('user_id', userId);

        const savedMap: Record<string, boolean> = {};
        (savedData ?? []).forEach((s: { spot_id: string }) => {
          savedMap[s.spot_id] = true;
        });
        setSavedGems(savedMap);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load gems';
      setError(msg);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchGems();
  }, [fetchGems]);

  const handleSave = async (spotId: string) => {
    if (!userId) {
      Alert.alert('Sign In Required', 'Please sign in to save spots to your list.');
      return;
    }

    // Optimistic update
    setSavedGems((prev) => ({ ...prev, [spotId]: true }));

    const { error: saveErr } = await supabase.from('user_saved_spots').upsert(
      { user_id: userId, spot_id: spotId },
      { onConflict: 'user_id,spot_id' },
    );

    if (saveErr) {
      // Revert optimistic update
      setSavedGems((prev) => {
        const copy = { ...prev };
        delete copy[spotId];
        return copy;
      });
      Alert.alert('Error', 'Could not save this spot. Please try again.');
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchGems();
  };

  // ── Loading ──
  if (loading) {
    return (
      <View className="flex-1 items-center justify-center" style={{ backgroundColor: '#0a0a0a' }}>
        <ActivityIndicator size="large" color="#FF6B35" />
        <Text className="mt-4 text-sm" style={{ color: '#666' }}>
          Finding hidden gems...
        </Text>
      </View>
    );
  }

  // ── Error ──
  if (error) {
    return (
      <View
        className="flex-1 items-center justify-center px-6"
        style={{ backgroundColor: '#0a0a0a' }}
      >
        <Gem size={48} color="#666" />
        <Text className="text-white text-lg font-bold mt-4 text-center">Couldn't load gems</Text>
        <Text className="mt-2 text-center text-sm" style={{ color: '#666' }}>
          {error}
        </Text>
        <TouchableOpacity
          onPress={() => { setLoading(true); fetchGems(); }}
          className="mt-6 rounded-xl px-6 py-3"
          style={{ backgroundColor: '#FF6B35' }}
          activeOpacity={0.8}
        >
          <Text className="text-white font-bold">Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView
      className="flex-1"
      style={{ backgroundColor: '#0a0a0a' }}
      contentContainerStyle={{ paddingBottom: 40 }}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor="#FF6B35"
          colors={['#FF6B35']}
        />
      }
    >
      {/* Header */}
      <View className="px-4 pt-12 pb-2">
        <View className="flex-row items-center gap-2 mb-1">
          <Gem size={28} color="#90CAF9" />
          <Text className="text-white text-2xl font-extrabold">Hidden Gems</Text>
        </View>
        <Text className="text-sm" style={{ color: '#666' }}>
          Go beyond the famous parks. Find something new.
        </Text>
      </View>

      {/* Algorithm badge */}
      <View className="mx-4 mt-4 mb-2">
        <View
          className="flex-row items-center rounded-2xl px-4 py-3"
          style={{ backgroundColor: '#1a1a1a' }}
        >
          <View
            className="rounded-full p-1.5 mr-3"
            style={{ backgroundColor: '#1A237E' }}
          >
            <Gem size={16} color="#90CAF9" />
          </View>
          <View className="flex-1">
            <Text className="text-white font-bold text-sm">Algorithm Picks</Text>
            <Text className="text-xs mt-0.5" style={{ color: '#666' }}>
              High-rated spots with fewer than 10 check-ins
            </Text>
          </View>
          <View
            className="rounded-full px-2 py-0.5"
            style={{ backgroundColor: '#FF6B3520' }}
          >
            <Text className="text-xs font-bold" style={{ color: '#FF6B35' }}>
              {gems.length}
            </Text>
          </View>
        </View>
      </View>

      {/* Gems list */}
      <View className="px-4 mt-4">
        {gems.length === 0 ? (
          <View
            className="rounded-2xl p-8 items-center"
            style={{ backgroundColor: '#1a1a1a' }}
          >
            <Gem size={40} color="#666" />
            <Text className="text-white font-bold text-base mt-4 text-center">
              No hidden gems nearby
            </Text>
            <Text className="text-sm mt-2 text-center" style={{ color: '#666' }}>
              All nearby spots are already well-known. Check back later!
            </Text>
          </View>
        ) : (
          gems.map((gem) => (
            <GemCard
              key={gem.id}
              gem={gem}
              saved={!!savedGems[gem.id]}
              onSave={handleSave}
            />
          ))
        )}
      </View>
    </ScrollView>
  );
}
