import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';
import { weatherService } from '../lib/weatherService';
import { spotsService } from '../lib/spotsService';
import * as Location from 'expo-location';

interface ForecastItem {
  park_name: string;
  temp: number;
  rain: number;
  bust: number;
  score: number;
  condition: string;
  rec: string;
}

export default function SkateForecastScreen() {
  const [forecasts, setForecasts] = useState<ForecastItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadForecasts = async () => {
    try {
      setLoading(true);
      const { status } = await Location.requestForegroundPermissionsAsync();
      let lat = 37.78825; // Default SF
      let lon = -122.4324;

      if (status === 'granted') {
        const loc = await Location.getCurrentPositionAsync({});
        lat = loc.coords.latitude;
        lon = loc.coords.longitude;
      }

      // Get nearby spots
      const { data: spots } = await supabase.rpc('get_nearby_spots', {
        lat: lat,
        lng: lon,
        radius_meters: 50000, // 50km
      });

      if (!spots || spots.length === 0) {
        setForecasts([]);
        return;
      }

      const results: ForecastItem[] = [];
      
      for (const spot of spots.slice(0, 5)) {
        const weather = await weatherService.getWeatherForSpot(spot.id, spot.latitude, spot.longitude);
        
        // Get bust risk from spot_conditions
        const { data: conditions } = await supabase
          .from('spot_conditions')
          .select('bust_risk')
          .eq('spot_id', spot.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        const bustRisk = conditions?.bust_risk ?? 20; // Default 20%
        const score = weatherService.getSkateabilityScore(weather || {});
        
        results.push({
          park_name: spot.name,
          temp: Math.round(weather?.temperature ?? 70),
          rain: Math.round((weather?.precipitation ?? 0) * 100),
          bust: bustRisk,
          score: score,
          condition: `${weatherService.getWeatherEmoji(weather?.weather_main)} ${weather?.weather_main || 'Clear'}`,
          rec: score >= 80 ? 'Perfect day to skate. Low bust risk, no rain.' : 
               score >= 60 ? 'Decent conditions. Watch for afternoon showers.' : 
               'Not ideal. Better find an indoor spot or work on flatground.'
        });
      }

      setForecasts(results);
    } catch (err) {
      console.error('Error loading forecast:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadForecasts();
  }, []);

  const getScoreColor = (score: number) => {
    if (score >= 80) return '#4ade80';
    if (score >= 60) return '#fbbf24';
    return '#ef4444';
  };

  const getScoreLabel = (score: number) => {
    if (score >= 80) return 'SKATE IT';
    if (score >= 60) return 'MAYBE';
    return 'SKIP IT';
  };

  if (loading && !refreshing) {
    return (
      <View style={[s.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#d2673d" />
        <Text style={{ color: '#6B7280', marginTop: 12 }}>Checking conditions...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={s.container}>
      <ScrollView 
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadForecasts(); }} tintColor="#d2673d" />}
      >
        <View style={s.header}>
          <Text style={s.title}>⛅ Skate Forecast</Text>
          <Text style={s.sub}>Weather + bust risk combined. Best spots to skate today.</Text>
          <Text style={s.date}>{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</Text>
        </View>

        <View style={s.cards}>
          {forecasts.length > 0 ? forecasts.map((item, i) => (
            <View key={i} style={s.card}>
              <View style={s.cardHeader}>
                <Text style={s.parkName}>{item.park_name}</Text>
                <View style={[s.scoreBadge, { backgroundColor: getScoreColor(item.score) + '30', borderColor: getScoreColor(item.score) }]}>
                  <Text style={[s.scoreLabel, { color: getScoreColor(item.score) }]}>{getScoreLabel(item.score)}</Text>
                </View>
              </View>

              <Text style={s.condition}>{item.condition} · {item.temp}°F</Text>

              <View style={s.metrics}>
                <View style={s.metric}>
                  <Text style={s.metricIcon}>🌧</Text>
                  <Text style={s.metricLabel}>Rain</Text>
                  <Text style={[s.metricValue, { color: item.rain > 40 ? '#ef4444' : '#4ade80' }]}>{item.rain}%</Text>
                </View>
                <View style={s.metric}>
                  <Text style={s.metricIcon}>👮</Text>
                  <Text style={s.metricLabel}>Bust Risk</Text>
                  <Text style={[s.metricValue, { color: item.bust > 50 ? '#ef4444' : item.bust > 30 ? '#fbbf24' : '#4ade80' }]}>{item.bust}%</Text>
                </View>
                <View style={s.metric}>
                  <Text style={s.metricIcon}>🛹</Text>
                  <Text style={s.metricLabel}>Score</Text>
                  <Text style={[s.metricValue, { color: getScoreColor(item.score) }]}>{item.score}</Text>
                </View>
              </View>

              <Text style={s.rec}>{item.rec}</Text>
            </View>
          )) : (
            <View style={s.empty}>
              <Text style={s.emptyText}>No spots found nearby. Try adding some spots to the map!</Text>
            </View>
          )}
        </View>

        <View style={s.legend}>
          <Text style={s.legendTitle}>How the score works</Text>
          <Text style={s.legendText}>We combine weather conditions, chance of rain, reported bust risk, and time of day to give each park a daily score. Higher = better day to skate.</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#05070B' },
  header: { padding: 20 },
  title: { fontSize: 24, fontWeight: '900', color: '#F3F4F6' },
  sub: { fontSize: 13, color: '#6B7280', marginTop: 4 },
  date: { color: '#d2673d', fontSize: 13, fontWeight: '600', marginTop: 8 },
  cards: { padding: 16, gap: 12 },
  card: { backgroundColor: '#111827', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#1a2030' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  parkName: { color: '#F3F4F6', fontSize: 16, fontWeight: '700', flex: 1 },
  scoreBadge: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1 },
  scoreLabel: { fontSize: 11, fontWeight: '900', letterSpacing: 0.5 },
  condition: { color: '#9CA3AF', fontSize: 13, marginBottom: 12 },
  metrics: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 12, backgroundColor: '#0a0e1a', borderRadius: 8, padding: 10 },
  metric: { alignItems: 'center', gap: 4 },
  metricIcon: { fontSize: 18 },
  metricLabel: { color: '#4B5563', fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.5 },
  metricValue: { fontSize: 16, fontWeight: '900' },
  rec: { color: '#9CA3AF', fontSize: 13, lineHeight: 20 },
  legend: { margin: 16, padding: 16, backgroundColor: '#111827', borderRadius: 10 },
  legendTitle: { color: '#d2673d', fontWeight: '700', fontSize: 13, marginBottom: 6 },
  legendText: { color: '#6B7280', fontSize: 12, lineHeight: 18 },
  empty: { padding: 40, alignItems: 'center' },
  emptyText: { color: '#6B7280', textAlign: 'center', fontSize: 14 },
});
