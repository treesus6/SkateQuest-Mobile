import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  Platform,
  Pressable,
  Text,
  View,
} from 'react-native';
import { discoveryService, DiscoveryPartner, reportDiscoveryError } from '../lib/discoveryService';
import { useAuthStore } from '../stores/useAuthStore';

export async function openDiscoveryPartner(
  partner: DiscoveryPartner,
  surface: 'home' | 'map' | 'spot' | 'profile',
  signedIn: boolean
) {
  if (!partner.website_url || !/^https:\/\//i.test(partner.website_url))
    throw new Error('Partner website unavailable.');
  // Open synchronously on web to preserve the browser's user-gesture permission.
  if (Platform.OS === 'web') {
    const opened = window.open(partner.website_url, '_blank', 'noopener,noreferrer');
    void opened;
  } else {
    await Linking.openURL(partner.website_url);
  }
  if (!signedIn) return null;
  // This proves an outbound tap, never a purchase or physical presence.
  return discoveryService.recordReferral(partner.id, surface);
}

export default function PartnerDiscoveryCard({
  partner,
  surface,
}: {
  partner: DiscoveryPartner;
  surface: 'home' | 'map' | 'spot' | 'profile';
}) {
  const { user } = useAuthStore();
  const [clicks, setClicks] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const opening = useRef(false);
  const refresh = useCallback(async () => {
    try {
      setClicks(await discoveryService.getPartnerStats(partner.id));
      setError(null);
    } catch (err) {
      setError(reportDiscoveryError('Partner count failed', err));
    }
  }, [partner.id]);
  useEffect(() => {
    void refresh();
    const timer = setInterval(() => void refresh(), 30000);
    return () => clearInterval(timer);
  }, [refresh]);
  const open = async () => {
    if (opening.current) return;
    opening.current = true;
    setBusy(true);
    try {
      const result = await openDiscoveryPartner(partner, surface, !!user);
      await refresh();
      if (result?.xp_awarded)
        Alert.alert(
          'Partner visited',
          `+${result.xp_awarded} XP saved. Partner XP is limited to once per day.`
        );
    } catch (err) {
      const message = reportDiscoveryError('Partner referral failed', err);
      Alert.alert('Partner visit could not be fully recorded', message);
    } finally {
      opening.current = false;
      setBusy(false);
    }
  };
  return (
    <View
      style={{
        borderWidth: 2,
        borderColor: '#D8F04B',
        backgroundColor: '#12161C',
        padding: 14,
        marginVertical: 10,
      }}
    >
      <Text style={{ color: '#D8F04B', fontWeight: '900', fontSize: 10 }}>
        INDEPENDENT SKATE PARTNER
      </Text>
      <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center', marginVertical: 10 }}>
        {partner.logo_url ? (
          <Image
            source={{ uri: partner.logo_url }}
            style={{ width: 52, height: 52, backgroundColor: '#fff' }}
            resizeMode="contain"
          />
        ) : null}
        <View style={{ flex: 1 }}>
          <Text style={{ color: '#F6F0E5', fontSize: 19, fontWeight: '900' }}>{partner.name}</Text>
          <Text style={{ color: '#A9B0BA', fontSize: 12 }}>
            {partner.category.replace(/_/g, ' ')}
            {partner.city ? ` · ${partner.city}` : ''}
          </Text>
        </View>
      </View>
      <Text style={{ color: '#A9B0BA', fontSize: 11 }}>
        {clicks === null ? 'Referral count unavailable' : `${clicks} recorded outbound referrals`} ·
        Purchases are not tracked
      </Text>
      {error ? (
        <Pressable onPress={() => void refresh()}>
          <Text style={{ color: '#FFAF8B', marginTop: 6 }}>
            Count could not load. Tap to retry.
          </Text>
        </Pressable>
      ) : null}
      <Pressable
        accessibilityRole="link"
        disabled={busy}
        onPress={() => void open()}
        style={{
          backgroundColor: '#D8F04B',
          minHeight: 44,
          alignItems: 'center',
          justifyContent: 'center',
          marginTop: 12,
        }}
      >
        {busy ? (
          <ActivityIndicator color="#07080B" />
        ) : (
          <Text style={{ color: '#07080B', fontWeight: '900' }}>SHOP PARTNER ↗</Text>
        )}
      </Pressable>
    </View>
  );
}
