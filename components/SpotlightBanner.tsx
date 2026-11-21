import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { discoveryService, reportDiscoveryError, Spotlight } from '../lib/discoveryService';
export default function SpotlightBanner({
  onSelect,
}: {
  onSelect?: (spotlight: Spotlight) => void;
}) {
  const router = useRouter();
  const [spotlights, setSpotlights] = useState<Spotlight[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const refresh = useCallback(async () => {
    try {
      setSpotlights(await discoveryService.getSpotlights());
      setError(null);
    } catch (err) {
      setError(reportDiscoveryError('Spotlight load failed', err));
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    void refresh();
    const timer = setInterval(() => void refresh(), 30000);
    return () => clearInterval(timer);
  }, [refresh]);
  return (
    <View
      style={{
        backgroundColor: '#D8F04B',
        borderWidth: 2,
        borderColor: '#07080B',
        padding: 16,
        marginVertical: 12,
      }}
    >
      <Text style={{ color: '#07080B', fontSize: 11, fontWeight: '900' }}>
        COMMUNITY CLIP SPOTLIGHT
      </Text>
      {error ? (
        <Pressable onPress={() => void refresh()}>
          <Text style={{ color: '#07080B', marginTop: 8 }}>
            Spotlight could not load. Tap to retry.
          </Text>
        </Pressable>
      ) : loading ? (
        <Text style={{ marginTop: 8 }}>Loading current challenges…</Text>
      ) : spotlights.length ? (
        spotlights.map(spotlight => (
          <Pressable
            key={spotlight.id}
            onPress={() =>
              onSelect
                ? onSelect(spotlight)
                : router.push({
                    pathname: '/skate-tv',
                    params: { spotlightId: spotlight.id },
                  } as any)
            }
            style={{ paddingVertical: 12 }}
          >
            <Text style={{ color: '#07080B', fontWeight: '900', fontSize: 20 }}>
              {spotlight.title}
            </Text>
            <Text style={{ color: '#07080B', marginTop: 5 }}>
              {spotlight.skate_spots?.name} · Ends{' '}
              {new Date(spotlight.ends_at).toLocaleDateString()}
            </Text>
            <Text style={{ color: '#07080B', fontWeight: '900', marginTop: 8 }}>
              VIEW / SUBMIT A REAL CLIP ↗
            </Text>
          </Pressable>
        ))
      ) : (
        <Text style={{ color: '#07080B', marginTop: 8 }}>
          No weekly spot challenge is open yet. Share a real clip in the Fresh feed.
        </Text>
      )}
      <Pressable
        onPress={() => router.push('/judges-booth' as any)}
        style={{ minHeight: 44, justifyContent: 'center' }}
      >
        <Text style={{ color: '#07080B', fontWeight: '900' }}>JUDGE’S BOOTH ↗</Text>
      </Pressable>
    </View>
  );
}
