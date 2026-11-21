import React, { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { supabase } from '../lib/supabase';
import { reportDiscoveryError } from '../lib/discoveryService';
import { useAuthStore } from '../stores/useAuthStore';

type Referral = {
  id: string;
  clicked_at: string;
  source_surface: string;
  map_sponsors: { name: string } | null;
};
export default function PartnerReferralHistory() {
  const { user } = useAuthStore();
  const [rows, setRows] = useState<Referral[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let active = true;
    setRows([]);
    setLoading(true);
    if (!user) {
      setLoading(false);
      return;
    }
    void (async () => {
      try {
        const result = await supabase
          .from('partner_referrals')
          .select('id,clicked_at,source_surface,map_sponsors(name)')
          .eq('user_id', user.id)
          .order('clicked_at', { ascending: false })
          .limit(20);
        if (result.error) throw result.error;
        if (active) {
          setRows((result.data ?? []) as unknown as Referral[]);
          setError(null);
        }
      } catch (err) {
        if (active) setError(reportDiscoveryError('Partner history failed', err));
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [user?.id, retry]);
  return (
    <View
      style={{
        padding: 18,
        margin: 14,
        borderWidth: 2,
        borderColor: '#D8F04B',
        backgroundColor: '#12161C',
      }}
    >
      <Text style={{ color: '#D8F04B', fontWeight: '900', fontSize: 19 }}>BRAND AMBASSADOR</Text>
      <Text style={{ color: '#A9B0BA', marginVertical: 8 }}>
        Your recorded partner referrals. These are outbound taps; purchases are not tracked.
      </Text>
      {error ? (
        <Pressable onPress={() => setRetry(n => n + 1)}>
          <Text style={{ color: '#FFAF8B' }}>History unavailable. Tap to retry.</Text>
        </Pressable>
      ) : loading ? (
        <Text style={{ color: '#F6F0E5' }}>Loading referrals…</Text>
      ) : rows.length ? (
        rows.map(row => (
          <Text key={row.id} style={{ color: '#F6F0E5', marginVertical: 7 }}>
            {row.map_sponsors?.name || 'Partner'} · {row.source_surface} ·{' '}
            {new Date(row.clicked_at).toLocaleDateString()}
          </Text>
        ))
      ) : (
        <Text style={{ color: '#F6F0E5' }}>
          No partner referrals yet. Discover independent skate brands on Home or Map.
        </Text>
      )}
    </View>
  );
}
