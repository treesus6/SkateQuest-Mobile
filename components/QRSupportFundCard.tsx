import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { ArrowUpRight, HeartHandshake, RefreshCw, ShieldCheck } from 'lucide-react-native';
import { supabase } from '../lib/supabase';

type Summary = {
  paid_qr_count: number;
  gross_cents: number;
  processing_fee_cents: number;
  refunded_cents: number;
  disbursed_cents: number;
  tracked_balance_cents: number;
};

const INK = '#07080B';
const PAPER = '#F6F0E5';
const ORANGE = '#E36D3F';
const ACID = '#D9F34A';
const BLUE = '#72A9FF';
const MUTED = '#8F98A6';

const dollars = (cents: number) => `$${(Number(cents || 0) / 100).toFixed(2)}`;

export default function QRSupportFundCard() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('get_public_qr_support_fund_summary');
      if (error) throw error;
      setSummary((data || null) as Summary | null);
    } catch {
      setSummary(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <View style={s.card}>
      <View style={s.orangeEdge} />
      <View style={s.header}>
        <View style={s.iconStamp}>
          <HeartHandshake size={22} color={INK} strokeWidth={2.7} />
        </View>
        <View style={s.headerCopy}>
          <Text style={s.kicker}>QR HUNT // COMMUNITY</Text>
          <Text style={s.title}>Skateboard Support Fund</Text>
        </View>
        <Pressable style={s.refresh} onPress={() => void load()} disabled={loading} accessibilityLabel="Refresh support fund totals">
          {loading ? <ActivityIndicator size="small" color={PAPER} /> : <RefreshCw size={17} color={PAPER} />}
        </Pressable>
      </View>

      <Text style={s.body}>Tracked from real paid QR Hunts. Totals exclude personal payment details.</Text>

      {loading ? (
        <View style={s.loadingRail}>
          <ActivityIndicator color={ORANGE} />
          <Text style={s.loadingText}>SYNCING FUND TOTALS</Text>
        </View>
      ) : summary ? (
        <>
          <View style={s.statRow}>
            <View style={[s.stat, s.statOrange]}>
              <Text style={s.statLabel}>PAID HUNTS</Text>
              <Text style={s.statValue}>{Number(summary.paid_qr_count || 0)}</Text>
              <ArrowUpRight color={INK} size={16} style={s.statArrow} />
            </View>
            <View style={[s.stat, s.statBlue]}>
              <Text style={s.statLabel}>GROSS SUPPORT</Text>
              <Text style={s.statValue}>{dollars(summary.gross_cents)}</Text>
              <HeartHandshake color={INK} size={16} style={s.statArrow} />
            </View>
          </View>

          <View style={s.balanceTicket}>
            <View style={s.balanceHeader}>
              <View style={s.balanceBadge}>
                <ShieldCheck color={INK} size={16} />
                <Text style={s.balanceBadgeText}>TRACKED</Text>
              </View>
              <Text style={s.balanceMeta}>AFTER RECORDED FEES + OUTGOING SUPPORT</Text>
            </View>
            <Text style={s.balanceLabel}>SUPPORT BALANCE</Text>
            <Text style={s.balanceValue}>{dollars(summary.tracked_balance_cents)}</Text>
          </View>

          <View style={s.breakdown}>
            <Breakdown label="FEES" value={dollars(summary.processing_fee_cents)} />
            <Breakdown label="REFUNDS" value={dollars(summary.refunded_cents)} />
            <Breakdown label="GIVEN OUT" value={dollars(summary.disbursed_cents)} />
          </View>
        </>
      ) : (
        <View style={s.unavailable}>
          <Text style={s.unavailableTitle}>FUND TOTALS OFFLINE</Text>
          <Text style={s.unavailableText}>The public summary could not be loaded right now.</Text>
          <Pressable style={s.retry} onPress={() => void load()}>
            <RefreshCw size={15} color={INK} />
            <Text style={s.retryText}>TRY AGAIN</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

function Breakdown({ label, value }: { label: string; value: string }) {
  return (
    <View style={s.breakdownItem}>
      <Text style={s.breakdownLabel}>{label}</Text>
      <Text style={s.breakdownValue}>{value}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  card: { marginBottom: 14, borderRadius: 22, padding: 15, backgroundColor: '#11151B', borderWidth: 1, borderColor: '#303641', overflow: 'hidden', position: 'relative' },
  orangeEdge: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 5, backgroundColor: ORANGE },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  iconStamp: { width: 46, height: 46, borderRadius: 14, backgroundColor: ACID, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '-4deg' }] },
  headerCopy: { flex: 1 },
  kicker: { color: ORANGE, fontSize: 7.5, fontWeight: '900', letterSpacing: 1.2 },
  title: { color: PAPER, fontSize: 17, fontWeight: '900', letterSpacing: -0.4, marginTop: 2 },
  refresh: { width: 38, height: 38, borderRadius: 12, backgroundColor: '#1A2029', borderWidth: 1, borderColor: '#343C48', alignItems: 'center', justifyContent: 'center' },
  body: { color: MUTED, fontSize: 10.5, lineHeight: 16, fontWeight: '700', marginTop: 12 },
  loadingRail: { minHeight: 62, marginTop: 14, borderRadius: 15, backgroundColor: '#0B0E13', borderWidth: 1, borderColor: '#242A33', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  loadingText: { color: MUTED, fontSize: 8, fontWeight: '900', letterSpacing: 1 },
  statRow: { flexDirection: 'row', gap: 9, marginTop: 14 },
  stat: { flex: 1, minHeight: 92, borderRadius: 17, padding: 12, borderWidth: 2, borderColor: INK, position: 'relative' },
  statOrange: { backgroundColor: ORANGE },
  statBlue: { backgroundColor: BLUE },
  statLabel: { color: INK, fontSize: 7.5, fontWeight: '900', letterSpacing: 0.8 },
  statValue: { color: INK, fontSize: 22, fontWeight: '900', letterSpacing: -0.8, marginTop: 8 },
  statArrow: { position: 'absolute', right: 10, bottom: 10 },
  balanceTicket: { marginTop: 9, borderRadius: 17, backgroundColor: ACID, borderWidth: 2, borderColor: INK, padding: 13 },
  balanceHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  balanceBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 7, minHeight: 27, borderRadius: 9, backgroundColor: 'rgba(7,8,11,0.1)' },
  balanceBadgeText: { color: INK, fontSize: 7, fontWeight: '900', letterSpacing: 0.7 },
  balanceMeta: { flex: 1, textAlign: 'right', color: 'rgba(7,8,11,0.62)', fontSize: 6.5, fontWeight: '900', letterSpacing: 0.5 },
  balanceLabel: { color: INK, fontSize: 8, fontWeight: '900', letterSpacing: 1, marginTop: 12 },
  balanceValue: { color: INK, fontSize: 33, fontWeight: '900', letterSpacing: -1.4, marginTop: 1 },
  breakdown: { flexDirection: 'row', gap: 7, marginTop: 9 },
  breakdownItem: { flex: 1, minHeight: 54, borderRadius: 13, padding: 9, backgroundColor: '#0B0E13', borderWidth: 1, borderColor: '#262D37' },
  breakdownLabel: { color: '#6F7886', fontSize: 6.5, fontWeight: '900', letterSpacing: 0.7 },
  breakdownValue: { color: PAPER, fontSize: 11, fontWeight: '900', marginTop: 6 },
  unavailable: { marginTop: 14, borderRadius: 16, padding: 13, backgroundColor: '#0B0E13', borderWidth: 1, borderColor: '#2B323D' },
  unavailableTitle: { color: PAPER, fontSize: 9, fontWeight: '900', letterSpacing: 1 },
  unavailableText: { color: MUTED, fontSize: 10, lineHeight: 15, marginTop: 4 },
  retry: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 34, borderRadius: 10, paddingHorizontal: 10, backgroundColor: ACID, marginTop: 10 },
  retryText: { color: INK, fontSize: 8, fontWeight: '900', letterSpacing: 0.8 },
});