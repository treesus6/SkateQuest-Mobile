import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import {
  ArrowUpRight,
  CheckCircle2,
  ExternalLink,
  RefreshCw,
  ShieldCheck,
  Video,
  XCircle,
} from 'lucide-react-native';
import { supabase } from '../lib/supabase';

type ReviewItem = {
  submission_id: string;
  qr_id: string;
  qr_code: string;
  trick_challenge: string;
  proof_url: string;
  submitted_at: string;
  finder_id: string;
  finder_name: string;
};

const INK = '#07080B';
const PAPER = '#F6F0E5';
const ORANGE = '#E36D3F';
const ACID = '#D9F34A';
const BLUE = '#72A9FF';
const MUTED = '#8F98A6';

export default function QRTrickReviewPanel() {
  const [items, setItems] = useState<ReviewItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [actingOn, setActingOn] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('get_my_qr_trick_reviews');
      if (error) throw error;
      setItems((data || []) as ReviewItem[]);
    } catch (error: any) {
      Alert.alert('Could not load QR reviews', error?.message || 'Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const watch = async (url: string) => {
    const canOpen = await Linking.canOpenURL(url);
    if (!canOpen) {
      Alert.alert('Video unavailable', 'This proof clip could not be opened.');
      return;
    }
    await Linking.openURL(url);
  };

  const review = async (item: ReviewItem, approve: boolean) => {
    setActingOn(item.submission_id);
    try {
      const { data, error } = await supabase.rpc('review_hidden_qr_trick_proof', {
        p_submission_id: item.submission_id,
        p_approve: approve,
      });
      if (error) throw error;
      const result = (data || {}) as any;
      setItems((current) => current.filter((row) => row.submission_id !== item.submission_id));
      Alert.alert(
        approve ? 'Trick approved' : 'Proof rejected',
        approve
          ? `${item.finder_name} completed ${item.trick_challenge}. ${Number(result.xp_awarded || 0)} XP was awarded and this QR Hunt is complete.`
          : `${item.finder_name} can submit another clip for ${item.trick_challenge}.`,
      );
    } catch (error: any) {
      Alert.alert('Review failed', error?.message || 'Please try again.');
    } finally {
      setActingOn(null);
    }
  };

  return (
    <View style={s.panel}>
      <View style={s.header}>
        <View style={s.headerStamp}>
          <Video size={21} color={INK} strokeWidth={2.7} />
        </View>
        <View style={s.headerCopy}>
          <Text style={s.kicker}>HIDER DESK // PROOF REVIEW</Text>
          <Text style={s.title}>Trick proofs to review</Text>
        </View>
        <Pressable style={s.refresh} onPress={() => void load()} disabled={loading} accessibilityLabel="Refresh trick proofs">
          {loading ? <ActivityIndicator size="small" color={PAPER} /> : <RefreshCw size={17} color={PAPER} />}
        </Pressable>
      </View>

      <Text style={s.intro}>Watch the actual clip before approving. Approval completes the QR and awards XP.</Text>

      {loading ? (
        <View style={s.loadingRail}>
          <ActivityIndicator color={ORANGE} />
          <Text style={s.loadingText}>CHECKING YOUR HUNTS</Text>
        </View>
      ) : items.length === 0 ? (
        <View style={s.empty}>
          <View style={s.emptyMark}>
            <ShieldCheck size={22} color={INK} strokeWidth={2.7} />
          </View>
          <View style={s.emptyCopy}>
            <Text style={s.emptyTitle}>NO PROOFS WAITING</Text>
            <Text style={s.emptyText}>When someone lands one of your QR tricks, their clip will show up here.</Text>
          </View>
        </View>
      ) : (
        <View style={s.reviewStack}>
          {items.map((item, index) => {
            const busy = actingOn === item.submission_id;
            return (
              <View key={item.submission_id} style={s.ticket}>
                <View style={[s.ticketRail, { backgroundColor: index % 2 === 0 ? ORANGE : BLUE }]}>
                  <Text style={s.ticketIndex}>{String(index + 1).padStart(2, '0')}</Text>
                  <Video color={INK} size={21} strokeWidth={2.7} />
                </View>

                <View style={s.ticketBody}>
                  <View style={s.codeRow}>
                    <Text style={s.codeLabel}>QR {item.qr_code}</Text>
                    <View style={s.pendingBadge}>
                      <View style={s.pendingDot} />
                      <Text style={s.pendingText}>WAITING</Text>
                    </View>
                  </View>
                  <Text style={s.trick} numberOfLines={2}>{item.trick_challenge}</Text>
                  <Text style={s.finder}>Submitted by <Text style={s.finderStrong}>{item.finder_name}</Text></Text>

                  <Pressable style={s.watchButton} onPress={() => void watch(item.proof_url)}>
                    <View style={s.watchIcon}><ExternalLink size={16} color={INK} /></View>
                    <Text style={s.watchText}>WATCH PROOF CLIP</Text>
                    <ArrowUpRight size={17} color={INK} strokeWidth={2.8} />
                  </Pressable>

                  <View style={s.actionRow}>
                    <Pressable
                      style={[s.rejectButton, busy && s.disabled]}
                      disabled={busy}
                      onPress={() => void review(item, false)}
                    >
                      <XCircle size={17} color="#FFB4A7" />
                      <Text style={s.rejectText}>REJECT</Text>
                    </Pressable>
                    <Pressable
                      style={[s.approveButton, busy && s.disabled]}
                      disabled={busy}
                      onPress={() => void review(item, true)}
                    >
                      {busy ? <ActivityIndicator color={INK} /> : <CheckCircle2 size={17} color={INK} />}
                      <Text style={s.approveText}>APPROVE</Text>
                    </Pressable>
                  </View>
                </View>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  panel: { marginBottom: 14, borderRadius: 22, padding: 15, backgroundColor: '#11151B', borderWidth: 1, borderColor: '#303641' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerStamp: { width: 46, height: 46, borderRadius: 14, backgroundColor: ORANGE, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '-4deg' }] },
  headerCopy: { flex: 1 },
  kicker: { color: ORANGE, fontSize: 7.5, fontWeight: '900', letterSpacing: 1.2 },
  title: { color: PAPER, fontSize: 17, fontWeight: '900', letterSpacing: -0.4, marginTop: 2 },
  refresh: { width: 38, height: 38, borderRadius: 12, backgroundColor: '#1A2029', borderWidth: 1, borderColor: '#343C48', alignItems: 'center', justifyContent: 'center' },
  intro: { color: MUTED, fontSize: 10.5, lineHeight: 16, fontWeight: '700', marginTop: 12 },
  loadingRail: { minHeight: 62, marginTop: 14, borderRadius: 15, backgroundColor: '#0B0E13', borderWidth: 1, borderColor: '#242A33', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  loadingText: { color: MUTED, fontSize: 8, fontWeight: '900', letterSpacing: 1 },
  empty: { minHeight: 80, marginTop: 14, borderRadius: 16, padding: 12, backgroundColor: '#0B0E13', borderWidth: 1, borderColor: '#2B323D', flexDirection: 'row', alignItems: 'center', gap: 11 },
  emptyMark: { width: 43, height: 43, borderRadius: 13, backgroundColor: ACID, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '-4deg' }] },
  emptyCopy: { flex: 1 },
  emptyTitle: { color: PAPER, fontSize: 9, fontWeight: '900', letterSpacing: 1 },
  emptyText: { color: MUTED, fontSize: 10, lineHeight: 15, marginTop: 3 },
  reviewStack: { marginTop: 14, gap: 10 },
  ticket: { flexDirection: 'row', borderRadius: 18, backgroundColor: PAPER, borderWidth: 2, borderColor: INK, overflow: 'hidden' },
  ticketRail: { width: 54, paddingVertical: 13, alignItems: 'center', justifyContent: 'space-between' },
  ticketIndex: { color: INK, fontSize: 9, fontWeight: '900', letterSpacing: 0.8 },
  ticketBody: { flex: 1, padding: 13 },
  codeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  codeLabel: { color: ORANGE, fontSize: 7.5, fontWeight: '900', letterSpacing: 1 },
  pendingBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#E7E1D6', borderRadius: 999, paddingHorizontal: 7, minHeight: 25 },
  pendingDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: ORANGE },
  pendingText: { color: '#625E58', fontSize: 6.5, fontWeight: '900', letterSpacing: 0.6 },
  trick: { color: INK, fontSize: 20, lineHeight: 22, fontWeight: '900', letterSpacing: -0.7, marginTop: 5 },
  finder: { color: '#6D6B68', fontSize: 10.5, marginTop: 4 },
  finderStrong: { color: INK, fontWeight: '900' },
  watchButton: { minHeight: 43, marginTop: 11, borderRadius: 12, backgroundColor: BLUE, borderWidth: 1.5, borderColor: INK, paddingHorizontal: 8, flexDirection: 'row', alignItems: 'center', gap: 8 },
  watchIcon: { width: 28, height: 28, borderRadius: 9, backgroundColor: 'rgba(7,8,11,0.08)', alignItems: 'center', justifyContent: 'center' },
  watchText: { flex: 1, color: INK, fontSize: 8, fontWeight: '900', letterSpacing: 0.7 },
  actionRow: { flexDirection: 'row', gap: 7, marginTop: 8 },
  rejectButton: { flex: 1, minHeight: 42, borderRadius: 12, backgroundColor: '#39201D', borderWidth: 1, borderColor: '#71372D', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  rejectText: { color: '#FFB4A7', fontSize: 8, fontWeight: '900', letterSpacing: 0.7 },
  approveButton: { flex: 1, minHeight: 42, borderRadius: 12, backgroundColor: ACID, borderWidth: 1.5, borderColor: INK, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  approveText: { color: INK, fontSize: 8, fontWeight: '900', letterSpacing: 0.7 },
  disabled: { opacity: 0.5 },
});