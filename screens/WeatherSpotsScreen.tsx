import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
  RefreshControl,
} from 'react-native';
import * as Location from 'expo-location';
import { CloudSun, CloudRain, Cloud, MapPin, Star, Navigation } from 'lucide-react-native';
import { supabase } from '../lib/supabase';

// ─── Types ────────────────────────────────────────────────────────────────────

type WeatherCondition = 'sunny' | 'cloudy' | 'rainy';

interface WeatherData {
  condition: WeatherCondition;
  temperature: number;
  precipitation: number;
  weathercode: number;
}

interface Spot {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  has_covered_area: boolean;
  spot_type: string;
  avg_rating: number | null;
}

interface SpotWithDistance extends Spot {
  distanceMiles: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function resolveCondition(weathercode: number): WeatherCondition {
  if (weathercode < 3) return 'sunny';
  if (weathercode < 50) return 'cloudy';
  return 'rainy';
}

function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 3958.8; // miles
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function conditionLabel(condition: WeatherCondition): string {
  if (condition === 'sunny') return 'Sunny';
  if (condition === 'cloudy') return 'Cloudy';
  return 'Rainy';
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function WeatherIcon({ condition, size = 36 }: { condition: WeatherCondition; size?: number }) {
  if (condition === 'sunny') return <CloudSun size={size} color="#FFC107" />;
  if (condition === 'rainy') return <CloudRain size={size} color="#2196F3" />;
  return <Cloud size={size} color="#90CAF9" />;
}

function StarRating({ rating }: { rating: number | null }) {
  const display = rating ?? 0;
  return (
    <View className="flex-row items-center gap-1">
      <Star size={14} color="#FF6B35" fill="#FF6B35" />
      <Text className="text-sm font-semibold" style={{ color: '#FF6B35' }}>
        {display > 0 ? display.toFixed(1) : 'No rating'}
      </Text>
    </View>
  );
}

function TypeBadge({ covered }: { covered: boolean }) {
  return (
    <View
      className="rounded-full px-2 py-0.5"
      style={{ backgroundColor: covered ? '#1565C0' : '#2E7D32' }}
    >
      <Text className="text-xs font-bold text-white">
        {covered ? 'Covered' : 'Outdoor'}
      </Text>
    </View>
  );
}

function SpotCard({
  spot,
}: {
  spot: SpotWithDistance;
  userLat: number;
  userLon: number;
}) {
  const handleDirections = () => {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${spot.latitude},${spot.longitude}`;
    Linking.openURL(url);
  };

  return (
    <View
      className="rounded-2xl mb-3 p-4"
      style={{ backgroundColor: '#1a1a1a' }}
    >
      <View className="flex-row items-start justify-between mb-2">
        <View className="flex-1 mr-2">
          <Text className="text-white font-bold text-base" numberOfLines={1}>
            {spot.name}
          </Text>
          <View className="flex-row items-center mt-1 gap-2">
            <TypeBadge covered={spot.has_covered_area} />
            <View className="flex-row items-center gap-1">
              <MapPin size={12} color="#666" />
              <Text className="text-xs" style={{ color: '#666' }}>
                {spot.distanceMiles.toFixed(1)} mi away
              </Text>
            </View>
          </View>
        </View>
        <StarRating rating={spot.avg_rating} />
      </View>

      <TouchableOpacity
        onPress={handleDirections}
        className="flex-row items-center justify-center rounded-xl py-2 mt-2"
        style={{ backgroundColor: '#FF6B35' }}
        activeOpacity={0.8}
      >
        <Navigation size={14} color="#fff" />
        <Text className="text-white font-bold text-sm ml-2">Get Directions</Text>
      </TouchableOpacity>
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function WeatherSpotsScreen() {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [spots, setSpots] = useState<SpotWithDistance[]>([]);
  const [userCoords, setUserCoords] = useState<{ lat: number; lon: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    setError(null);
    try {
      // 1. Location
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setError('Location permission denied. Please enable it in settings.');
        setLoading(false);
        setRefreshing(false);
        return;
      }

      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const { latitude: lat, longitude: lon } = loc.coords;
      setUserCoords({ lat, lon });

      // 2. Weather
      const weatherUrl =
        `https://api.open-meteo.com/v1/forecast` +
        `?latitude=${lat}&longitude=${lon}` +
        `&current=temperature_2m,precipitation,weathercode` +
        `&temperature_unit=fahrenheit`;

      const weatherRes = await fetch(weatherUrl);
      if (!weatherRes.ok) throw new Error('Weather API error');
      const weatherJson = await weatherRes.json();
      const current = weatherJson.current;
      const condition = resolveCondition(current.weathercode);

      const weatherData: WeatherData = {
        condition,
        temperature: Math.round(current.temperature_2m),
        precipitation: current.precipitation,
        weathercode: current.weathercode,
      };
      setWeather(weatherData);

      // 3. Spots
      let query = supabase
        .from('skate_spots')
        .select('id, name, latitude, longitude, has_covered_area, spot_type, avg_rating')
        .not('latitude', 'is', null)
        .not('longitude', 'is', null)
        .limit(50);

      if (condition === 'rainy') {
        query = query.eq('has_covered_area', true);
      }

      const { data, error: dbError } = await query;
      if (dbError) throw dbError;

      const spotsWithDist: SpotWithDistance[] = (data ?? []).map((s: Spot) => ({
        ...s,
        distanceMiles: haversineDistance(lat, lon, s.latitude, s.longitude),
      }));

      spotsWithDist.sort((a, b) => a.distanceMiles - b.distanceMiles);
      setSpots(spotsWithDist.slice(0, 20));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Something went wrong';
      setError(msg);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchAll();
  };

  // ── Render: loading ──
  if (loading) {
    return (
      <View className="flex-1 items-center justify-center" style={{ backgroundColor: '#0a0a0a' }}>
        <ActivityIndicator size="large" color="#FF6B35" />
        <Text className="mt-4 text-base" style={{ color: '#666' }}>
          Checking the weather...
        </Text>
      </View>
    );
  }

  // ── Render: error ──
  if (error) {
    return (
      <View className="flex-1 items-center justify-center px-6" style={{ backgroundColor: '#0a0a0a' }}>
        <CloudRain size={48} color="#666" />
        <Text className="text-white text-lg font-bold mt-4 text-center">Couldn't load data</Text>
        <Text className="mt-2 text-center text-sm" style={{ color: '#666' }}>
          {error}
        </Text>
        <TouchableOpacity
          onPress={() => { setLoading(true); fetchAll(); }}
          className="mt-6 rounded-xl px-6 py-3"
          style={{ backgroundColor: '#FF6B35' }}
          activeOpacity={0.8}
        >
          <Text className="text-white font-bold">Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const condition = weather?.condition ?? 'sunny';
  const weatherBg =
    condition === 'sunny'
      ? '#1A237E'
      : condition === 'rainy'
      ? '#0D47A1'
      : '#1565C0';

  return (
    <ScrollView
      className="flex-1"
      style={{ backgroundColor: '#0a0a0a' }}
      contentContainerStyle={{ paddingBottom: 32 }}
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
      <View className="px-4 pt-12 pb-4">
        <Text className="text-white text-2xl font-extrabold">Weather Spots</Text>
        <Text className="text-sm mt-1" style={{ color: '#666' }}>
          Best parks for right now
        </Text>
      </View>

      {/* Weather Card */}
      {weather && (
        <View className="mx-4 rounded-3xl p-5 mb-6" style={{ backgroundColor: weatherBg }}>
          <View className="flex-row items-center justify-between">
            <View>
              <Text className="text-white text-4xl font-extrabold">
                {weather.temperature}°F
              </Text>
              <Text className="text-white text-lg font-semibold mt-1">
                {conditionLabel(condition)}
              </Text>
              {condition === 'rainy' && (
                <Text className="text-blue-200 text-sm mt-1">
                  Showing covered & indoor spots
                </Text>
              )}
              {condition === 'sunny' && (
                <Text className="text-yellow-200 text-sm mt-1">
                  Showing all outdoor parks
                </Text>
              )}
              {condition === 'cloudy' && (
                <Text className="text-blue-100 text-sm mt-1">
                  Showing all nearby spots
                </Text>
              )}
            </View>
            <WeatherIcon condition={condition} size={64} />
          </View>
        </View>
      )}

      {/* Spots List */}
      <View className="px-4">
        <Text className="text-white text-lg font-bold mb-3">Best Spots Right Now</Text>

        {spots.length === 0 ? (
          <View
            className="rounded-2xl p-8 items-center"
            style={{ backgroundColor: '#1a1a1a' }}
          >
            <CloudRain size={36} color="#666" />
            <Text className="text-white font-semibold mt-3 text-center">
              No spots found nearby
            </Text>
            <Text className="text-sm mt-1 text-center" style={{ color: '#666' }}>
              {condition === 'rainy'
                ? 'No covered spots found in your area.'
                : 'No spots found near you yet.'}
            </Text>
          </View>
        ) : (
          spots.map((spot) => (
            <SpotCard
              key={spot.id}
              spot={spot}
              userLat={userCoords?.lat ?? 0}
              userLon={userCoords?.lon ?? 0}
            />
          ))
        )}
      </View>
    </ScrollView>
  );
}
