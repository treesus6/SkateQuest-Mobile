import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { getCurrentLocation } from '../lib/currentLocation';
import { spotsService } from '../lib/spotsService';
import { reportDiscoveryError } from '../lib/discoveryService';
import { useSpotDiscovery } from '../hooks/useSpotDiscovery';
import type { SkateSpot } from '../types';
import PartnerDiscoveryCard from './PartnerDiscoveryCard';

export default function NearbySpotRadar() {
  const router = useRouter();
  const [spots, setSpots] = useState<SkateSpot[]>([]);
  const [loading, setLoading] = useState(false);
  const [located, setLocated] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const discovery = useSpotDiscovery(spots.map(spot => spot.id));
  const locate = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const position = await getCurrentLocation();
      const result = await spotsService.getNearby(position.latitude, position.longitude, 50000);
      if (result.error) throw result.error;
      setSpots(result.data ?? []);
      setLocated(true);
    } catch (err) {
      setError(reportDiscoveryError('Nearby radar failed', err));
    } finally {
      setLoading(false);
    }
  }, []);
  return (
    <View style={{ marginBottom: 14 }}>
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 10,
        }}
      >
        <Text style={{ color: '#F6F0E5', fontWeight: '900', fontSize: 22 }}>NEARBY SPOT RADAR</Text>
        <Pressable
          disabled={loading}
          onPress={() => void locate()}
          style={{ minHeight: 44, justifyContent: 'center' }}
        >
          {loading ? (
            <ActivityIndicator color="#D8F04B" />
          ) : (
            <Text style={{ color: '#D8F04B', fontWeight: '900', fontSize: 11 }}>
              {located ? 'REFRESH GPS' : 'USE GPS'}
            </Text>
          )}
        </Pressable>
      </View>
      {error || discovery.error ? (
        <Text accessibilityRole="alert" style={{ color: '#FFAF8B', marginVertical: 8 }}>
          {error || discovery.error}
        </Text>
      ) : null}
      {!located ? (
        <Pressable
          onPress={() => void locate()}
          disabled={loading}
          style={{ padding: 16, borderWidth: 2, borderColor: '#343B47' }}
        >
          <Text style={{ color: '#F6F0E5' }}>
            Find real nearby spots and see who’s skating. Use GPS to start.
          </Text>
        </Pressable>
      ) : null}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 12, paddingVertical: 8 }}
      >
        {spots.slice(0, 12).map(spot => {
          const pulse = discovery.pulse[spot.id];
          return (
            <View
              key={spot.id}
              style={{
                width: 230,
                borderWidth: 2,
                borderColor: Number(pulse?.active_skaters) > 0 ? '#D8F04B' : '#343B47',
                padding: 12,
                backgroundColor: '#12161C',
              }}
            >
              <Pressable
                onPress={() =>
                  router.push({ pathname: '/spot-detail', params: { spotId: spot.id } } as any)
                }
              >
                {spot.image_url ? (
                  <Image
                    source={{ uri: spot.image_url }}
                    style={{ height: 90, width: '100%', marginBottom: 8 }}
                  />
                ) : null}
                <Text style={{ color: '#F6F0E5', fontWeight: '900', fontSize: 17 }}>
                  {spot.name}
                </Text>
                <Text style={{ color: '#D8F04B', marginTop: 6 }}>
                  {pulse ? `${pulse.active_skaters} skating now` : 'Activity loading…'}
                </Text>
                <Text style={{ color: '#A9B0BA', marginTop: 4 }}>
                  {pulse?.condition
                    ? `${pulse.condition.toUpperCase()} · reported ${new Date(pulse.reported_at!).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`
                    : 'No recent condition report'}
                </Text>
              </Pressable>
              <Pressable
                onPress={() =>
                  router.push({ pathname: '/live-check-in', params: { spotId: spot.id } } as any)
                }
                style={{
                  backgroundColor: '#E36D3F',
                  minHeight: 44,
                  justifyContent: 'center',
                  alignItems: 'center',
                  marginTop: 12,
                }}
              >
                <Text style={{ color: '#07080B', fontWeight: '900' }}>
                  {Number(pulse?.active_skaters) > 0 ? 'JOIN SESSION' : 'CHECK IN HERE'}
                </Text>
              </Pressable>
            </View>
          );
        })}
      </ScrollView>
      {located && !loading && spots.length === 0 ? (
        <Pressable onPress={() => router.push('/add-spot' as any)}>
          <Text style={{ color: '#F6F0E5', padding: 16 }}>
            No mapped spots nearby yet. Add the first real spot ↗
          </Text>
        </Pressable>
      ) : null}
      {discovery.partners
        .filter(p => p.featured)
        .slice(0, 3)
        .map(partner => (
          <PartnerDiscoveryCard key={partner.id} partner={partner} surface="home" />
        ))}
    </View>
  );
}
