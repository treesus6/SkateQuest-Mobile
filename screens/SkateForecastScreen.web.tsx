import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';
import { weatherService } from '../lib/weatherService';
import { getBrowserLocation } from '../lib/browserLocation';

interface ForecastItem {
  spot_id: string;
  park_name: string;
  temp: number;
  rain: number | null;
  bust: number | null;
  score: number;
  condition: string;
  rec: string;
}

function scoreWithReportedBustRisk(weatherScore: number, bustRisk: number | null): number {
  if (bustRisk === null) return weatherScore;
  return Math.max(0, Math.min(100, weatherScore - Math.round(bustRisk * 0.25)));
}

function recommendation(score: number, rain: number | null, bust: number | null): string {
  const details: string[] = [];
  if (rain !== null) details.push(`${rain}% rain chance`);
  if (bust !== null) details.push(`${bust}% reported bust risk`);
  const suffix = details.length ? ` Current data: ${details.join(' · ')}.` : '';

  if (score >= 80) return `Conditions look strong for skating.${suffix}`;
  if (score >= 60) return `Conditions are mixed. Check the spot before committing.${suffix}`;
  return `Conditions look rough right now. Consider another spot or an indoor option.${suffix}`;
}

export default function SkateForecastScreen() {
  const [forecasts, setForecasts] = useState<ForecastItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const loadForecasts = async () => {
    try {
      setLoading(true);
      setMessage(null);

      let location;
      try {
        location = await getBrowserLocation();
      } catch (error) {
        setForecasts([]);
        setMessage(
          error instanceof Error
            ? error.message
            : 'Location is required to show real weather for skate spots near you.'
        );
        return;
      }

      const { data: spots, error: spotsError } = await supabase.rpc('get_nearby_spots', {
        lat: location.latitude,
        lng: location.longitude,
        radius_meters: 50000,
      });
      if (spotsError) throw spotsError;

      if (!spots?.length) {
        setForecasts([]);
        setMessage('No skate spots were found within 50 km of your verified location.');
        return;
      }

      const results = await Promise.all(
        spots.slice(0, 5).map(async (spot: any): Promise<ForecastItem | null> => {
          try {
            const weather = await weatherService.getWeatherForSpot(
              spot.id,
              Number(spot.latitude),
              Number(spot.longitude)
            );
            const weatherScore = weatherService.getSkateabilityScore(weather);
            if (weatherScore === null) return null;

            const { data: conditions, error: conditionsError } = await supabase
              .from('spot_conditions')
              .select('bust_risk')
              .eq('spot_id', spot.id)
              .order('created_at', { ascending: false })
              .limit(1)
              .maybeSingle();

            const bustRisk =
              !conditionsError && typeof conditions?.bust_risk === 'number'
                ? Math.max(0, Math.min(100, Math.round(conditions.bust_risk)))
                : null;
            const rainChance =
              typeof weather.precipitation_probability === 'number'
                ? Math.max(0, Math.min(100, Math.round(weather.precipitation_probability)))
                : null;
            const score = scoreWithReportedBustRisk(weatherScore, bustRisk);

            return {
              spot_id: String(spot.id),
              park_name: String(spot.name),
              temp: Math.round(weather.temperature),
              rain: rainChance,
              bust: bustRisk,
              score,
              condition: `${weatherService.getWeatherEmoji(weather.weather_main)} ${weather.weather_main}`,
              rec: recommendation(score, rainChance, bustRisk),
            };
          } catch (error) {
            console.warn(`Live forecast unavailable for ${spot?.name ?? spot?.id}:`, error);
            return null;
          }
        })
      );

      const liveResults = results.filter((item): item is ForecastItem => item !== null);
      setForecasts(liveResults);
      if (liveResults.length === 0) {
        setMessage('Live weather is unavailable for the nearby spots right now. No substitute conditions are being shown.');
      }
    } catch (error) {
      console.error('Error loading forecast:', error);
      setForecasts([]);
      setMessage('The live skate forecast could not be loaded. Pull down to retry.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    void loadForecasts();
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
      <View style={[s.container, s.center]}>
        <ActivityIndicator size="large" color="#d2673d" />
        <Text style={s.loadingText}>Checking live conditions…</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={s.container}>
      <ScrollView
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              void loadForecasts();
            }}
            tintColor="#d2673d"
          />
        }
      >
        <View style={s.header}>
          <Text style={s.title}>⛅ Skate Forecast</Text>
          <Text style={s.sub}>Live weather plus actual community-reported bust risk when available.</Text>
          <Text style={s.date}>
            {new Date().toLocaleDateString('en-US', {
              weekday: 'long',
              month: 'long',
              day: 'numeric',
            })}
          </Text>
          {message ? <Text style={s.message}>{message}</Text> : null}
        </View>

        <View style={s.cards}>
          {forecasts.length > 0 ? (
            forecasts.map(item => (
              <View key={item.spot_id} style={s.card}>
                <View style={s.cardHeader}>
                  <Text style={s.parkName}>{item.park_name}</Text>
                  <View
                    style={[
                      s.scoreBadge,
                      {
                        backgroundColor: getScoreColor(item.score) + '30',
                        borderColor: getScoreColor(item.score),
                      },
                    ]}
                  >
                    <Text style={[s.scoreLabel, { color: getScoreColor(item.score) }]}>
                      {getScoreLabel(item.score)}
                    </Text>
                  </View>
                </View>

                <Text style={s.condition}>{item.condition} · {item.temp}°F</Text>

                <View style={s.metrics}>
                  <View style={s.metric}>
                    <Text style={s.metricIcon}>🌧</Text>
                    <Text style={s.metricLabel}>Rain</Text>
                    <Text
                      style={[
                        s.metricValue,
                        { color: item.rain === null ? '#9CA3AF' : item.rain > 40 ? '#ef4444' : '#4ade80' },
                      ]}
                    >
                      {item.rain === null ? '—' : `${item.rain}%`}
                    </Text>
                  </View>
                  <View style={s.metric}>
                    <Text style={s.metricIcon}>👮</Text>
                    <Text style={s.metricLabel}>Bust Risk</Text>
                    <Text
                      style={[
                        s.metricValue,
                        {
                          color:
                            item.bust === null
                              ? '#9CA3AF'
                              : item.bust > 50
                                ? '#ef4444'
                                : item.bust > 30
                                  ? '#fbbf24'
                                  : '#4ade80',
                        },
                      ]}
                    >
                      {item.bust === null ? '—' : `${item.bust}%`}
                    </Text>
                  </View>
                  <View style={s.metric}>
                    <Text style={s.metricIcon}>🛹</Text>
                    <Text style={s.metricLabel}>Score</Text>
                    <Text style={[s.metricValue, { color: getScoreColor(item.score) }]}>{item.score}</Text>
                  </View>
                </View>

                <Text style={s.rec}>{item.rec}</Text>
                {item.bust === null ? (
                  <Text style={s.unreported}>Bust risk has not been reported for this spot.</Text>
                ) : null}
              </View>
            ))
          ) : (
            <View style={s.empty}>
              <Text style={s.emptyText}>{message ?? 'No live forecast data is available right now.'}</Text>
            </View>
          )}
        </View>

        <View style={s.legend}>
          <Text style={s.legendTitle}>How the score works</Text>
          <Text style={s.legendText}>
            The score uses live temperature, precipitation, rain probability, wind, and weather condition. A real community bust-risk report lowers the score when one exists; missing reports are left unreported instead of guessed.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#05070B' },
  center: { justifyContent: 'center', alignItems: 'center' },
  loadingText: { color: '#6B7280', marginTop: 12 },
  header: { padding: 20 },
  title: { fontSize: 24, fontWeight: '900', color: '#F3F4F6' },
  sub: { fontSize: 13, color: '#6B7280', marginTop: 4, lineHeight: 18 },
  date: { color: '#d2673d', fontSize: 13, fontWeight: '600', marginTop: 8 },
  message: { color: '#FBBF24', fontSize: 12, lineHeight: 18, marginTop: 10 },
  cards: { padding: 16, gap: 12 },
  card: { backgroundColor: '#111827', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#1a2030' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  parkName: { color: '#F3F4F6', fontSize: 16, fontWeight: '700', flex: 1, marginRight: 8 },
  scoreBadge: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1 },
  scoreLabel: { fontSize: 11, fontWeight: '900', letterSpacing: 0.5 },
  condition: { color: '#9CA3AF', fontSize: 13, marginBottom: 12 },
  metrics: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 12, backgroundColor: '#0a0e1a', borderRadius: 8, padding: 10 },
  metric: { alignItems: 'center', gap: 4, minWidth: 70 },
  metricIcon: { fontSize: 18 },
  metricLabel: { color: '#4B5563', fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.5 },
  metricValue: { fontSize: 16, fontWeight: '900' },
  rec: { color: '#9CA3AF', fontSize: 13, lineHeight: 20 },
  unreported: { color: '#6B7280', fontSize: 11, marginTop: 8 },
  legend: { margin: 16, padding: 16, backgroundColor: '#111827', borderRadius: 10 },
  legendTitle: { color: '#d2673d', fontWeight: '700', fontSize: 13, marginBottom: 6 },
  legendText: { color: '#6B7280', fontSize: 12, lineHeight: 18 },
  empty: { padding: 40, alignItems: 'center' },
  emptyText: { color: '#6B7280', textAlign: 'center', fontSize: 14, lineHeight: 20 },
});
