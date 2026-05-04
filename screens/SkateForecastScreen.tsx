import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';

const MOCK_FORECAST = [
  { park_name: 'Kirtsis Park', temp: 64, rain: 5, bust: 20, score: 90, condition: '☀️ Clear', rec: 'Perfect day to skate. Low bust risk, no rain.' },
  { park_name: 'Portland Skatepark', temp: 58, rain: 30, bust: 45, score: 65, condition: '🌥 Cloudy', rec: 'Decent conditions. Watch for afternoon showers.' },
  { park_name: 'Burnside', temp: 61, rain: 15, bust: 15, score: 80, condition: '⛅ Partly Cloudy', rec: 'Good session conditions. Burnside is usually fine.' },
  { park_name: 'Clackamas Skatepark', temp: 63, rain: 10, bust: 30, score: 75, condition: '☀️ Clear', rec: 'Good conditions. Light security presence on weekends.' },
];

export default function SkateForecastScreen() {
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

  return (
    <SafeAreaView style={s.container}>
      <ScrollView>
        <View style={s.header}>
          <Text style={s.title}>⛅ Skate Forecast</Text>
          <Text style={s.sub}>Weather + bust risk combined. Best spots to skate today.</Text>
          <Text style={s.date}>{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</Text>
        </View>

        <View style={s.cards}>
          {MOCK_FORECAST.map((item, i) => (
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
          ))}
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
});
