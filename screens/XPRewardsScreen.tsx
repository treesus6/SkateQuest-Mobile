import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  RefreshControl,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { CheckCircle2, Clock3, Copy, Gift, Lock, ShieldCheck, Store, Ticket, Zap } from 'lucide-react-native';
import { useAuthStore } from '../stores/useAuthStore';
import { supabase } from '../lib/supabase';
import { profilesService } from '../lib/profilesService';
import { shopsService } from '../lib/shopsService';

const ACCENT = '#D2673D';
const BG = '#05070B';
const CARD = '#101722';
const BORDER = '#202B3A';

interface LevelProgress {
  current_level: number;
  current_xp: number;
  xp_for_current_level: number;
  xp_for_next_level: number;
  xp_progress: number;
  xp_needed: number;
  progress_percentage: number;
}

interface ShopDeal {
  id: string;
  shop_id: string;
  title: string;
  description: string | null;
  xp_cost: number;
  active: boolean;
  max_redemptions: number | null;
  redemptions_count: number;
  expires_at: string | null;
  shop: { id: string; name: string; address: string | null } | null;
}

interface Redemption {
  id: string;
  deal_id: string;
  redemption_code: string;
  xp_cost_paid: number;
  redeemed_at: string;
  expires_at: string;
  used: boolean;
  deal: { title: string; shop: { name: string } | null } | null;
}

function normalizeRelation<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

function ProgressCard({ xp, progress }: { xp: number; progress: LevelProgress | null }) {
  const level = progress?.current_level ?? 1;
  const percent = Math.max(0, Math.min(100, Number(progress?.progress_percentage ?? 0)));
  return (
    <View style={s.progressCard}>
      <View style={s.progressTop}>
        <View>
          <Text style={s.kicker}>SERVER-MANAGED PROGRESSION</Text>
          <Text style={s.heroTitle}>XP Rewards</Text>
        </View>
        <View style={s.levelPill}><Zap size={15} color="#F7B955" /><Text style={s.levelText}>LV {level}</Text></View>
      </View>
      <Text style={s.xpValue}>{xp.toLocaleString()} XP</Text>
      <View style={s.track}><View style={[s.fill, { width: `${percent}%` }]} /></View>
      <View style={s.progressMeta}>
        <Text style={s.metaText}>{progress ? `${progress.xp_needed.toLocaleString()} XP to next level` : 'Loading level progress'}</Text>
        <Text style={s.metaText}>{percent.toFixed(0)}%</Text>
      </View>
    </View>
  );
}

function CodeModal({ redemption, onClose }: { redemption: { code: string; expiresAt: string; title: string; shop: string } | null; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  if (!redemption) return null;
  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View style={s.modalBackdrop}>
        <View style={s.modalCard}>
          <View style={s.successIcon}><CheckCircle2 color="#72E39C" size={34} /></View>
          <Text style={s.modalTitle}>Deal unlocked</Text>
          <Text style={s.modalSub}>{redemption.title}{redemption.shop ? ` · ${redemption.shop}` : ''}</Text>
          <View style={s.codeBox}>
            <Text style={s.codeLabel}>YOUR CODE</Text>
            <Text selectable style={s.code}>{redemption.code}</Text>
            <TouchableOpacity
              style={[s.copyButton, copied && { backgroundColor: '#2F7D50' }]}
              onPress={() => void Clipboard.setStringAsync(redemption.code).then(() => setCopied(true))}
            >
              {copied ? <CheckCircle2 color="#fff" size={16} /> : <Copy color="#fff" size={16} />}
              <Text style={s.copyText}>{copied ? 'COPIED' : 'COPY CODE'}</Text>
            </TouchableOpacity>
          </View>
          <View style={s.expiryRow}><Clock3 color="#F7B955" size={16} /><Text style={s.expiryText}>Expires {new Date(redemption.expiresAt).toLocaleString()}</Text></View>
          <TouchableOpacity style={s.doneButton} onPress={onClose}><Text style={s.doneText}>DONE</Text></TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

export default function XPRewardsScreen() {
  const user = useAuthStore(state => state.user);
  const [xp, setXp] = useState(0);
  const [progress, setProgress] = useState<LevelProgress | null>(null);
  const [deals, setDeals] = useState<ShopDeal[]>([]);
  const [redemptions, setRedemptions] = useState<Redemption[]>([]);
  const [tab, setTab] = useState<'deals' | 'mine'>('deals');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [redeemingId, setRedeemingId] = useState<string | null>(null);
  const [codeModal, setCodeModal] = useState<{ code: string; expiresAt: string; title: string; shop: string } | null>(null);

  const load = useCallback(async () => {
    if (!user?.id) {
      setLoading(false);
      setRefreshing(false);
      return;
    }
    try {
      const [profileResult, progressResult, dealsResult, redemptionsResult] = await Promise.all([
        profilesService.getById(user.id),
        profilesService.getLevelProgress(user.id),
        supabase
          .from('shop_deals')
          .select('id,shop_id,title,description,xp_cost,active,max_redemptions,redemptions_count,expires_at,shop:skate_shops(id,shop_name,address)')
          .eq('active', true)
          .order('xp_cost', { ascending: true }),
        supabase
          .from('deal_redemptions')
          .select('id,deal_id,redemption_code,xp_cost_paid,redeemed_at,expires_at,used,deal:shop_deals(title,shop:skate_shops(shop_name))')
          .order('redeemed_at', { ascending: false })
          .limit(50),
      ]);

      if (profileResult.error) throw profileResult.error;
      if (progressResult.error) throw progressResult.error;
      if (dealsResult.error) throw dealsResult.error;
      if (redemptionsResult.error) throw redemptionsResult.error;

      setXp(Number(profileResult.data?.xp ?? 0));
      setProgress((progressResult.data ?? null) as LevelProgress | null);
      setDeals((dealsResult.data ?? []).map((row: any) => {
        const shop = normalizeRelation(row.shop);
        return {
          ...row,
          shop: shop ? { id: shop.id, name: shop.shop_name, address: shop.address ?? null } : null,
        } as ShopDeal;
      }));
      setRedemptions((redemptionsResult.data ?? []).map((row: any) => {
        const deal = normalizeRelation(row.deal);
        const shop = normalizeRelation(deal?.shop);
        return {
          ...row,
          deal: deal ? { title: deal.title, shop: shop ? { name: shop.shop_name } : null } : null,
        } as Redemption;
      }));
    } catch (error: any) {
      Alert.alert('Rewards unavailable', error?.message || 'Could not load XP rewards.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.id]);

  useEffect(() => { void load(); }, [load]);

  const redeem = (deal: ShopDeal) => {
    if (!user?.id) return;
    if (xp < deal.xp_cost) {
      Alert.alert('Not enough XP', `You need ${(deal.xp_cost - xp).toLocaleString()} more XP.`);
      return;
    }
    Alert.alert(
      'Redeem real shop deal?',
      `Spend ${deal.xp_cost.toLocaleString()} XP for “${deal.title}”? The server verifies the price and generates a one-time code.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Redeem',
          onPress: () => {
            void (async () => {
              try {
                setRedeemingId(deal.id);
                const { data, error } = await shopsService.redeemDeal(user.id, deal.id);
                if (error) throw error;
                const result = (Array.isArray(data) ? data[0] : data) as any;
                if (!result?.code || !result?.expires_at) throw new Error('Server did not return a redemption code.');
                setXp(Number(result.remaining_xp ?? Math.max(0, xp - deal.xp_cost)));
                setCodeModal({ code: result.code, expiresAt: result.expires_at, title: deal.title, shop: deal.shop?.name || '' });
                await load();
              } catch (error: any) {
                Alert.alert('Redemption failed', error?.message || 'The deal was not redeemed.');
              } finally {
                setRedeemingId(null);
              }
            })();
          },
        },
      ]
    );
  };

  if (loading) return <SafeAreaView style={s.center}><ActivityIndicator size="large" color={ACCENT} /></SafeAreaView>;

  return (
    <SafeAreaView style={s.container}>
      <ProgressCard xp={xp} progress={progress} />
      <View style={s.tabs}>
        <TouchableOpacity style={[s.tab, tab === 'deals' && s.tabActive]} onPress={() => setTab('deals')}><Gift size={16} color={tab === 'deals' ? '#fff' : '#8190A2'} /><Text style={[s.tabText, tab === 'deals' && s.tabTextActive]}>SHOP DEALS</Text></TouchableOpacity>
        <TouchableOpacity style={[s.tab, tab === 'mine' && s.tabActive]} onPress={() => setTab('mine')}><Ticket size={16} color={tab === 'mine' ? '#fff' : '#8190A2'} /><Text style={[s.tabText, tab === 'mine' && s.tabTextActive]}>MY CODES</Text></TouchableOpacity>
      </View>

      {tab === 'deals' ? (
        <FlatList
          data={deals}
          keyExtractor={item => item.id}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load(); }} tintColor={ACCENT} />}
          contentContainerStyle={s.list}
          renderItem={({ item }) => {
            const affordable = xp >= item.xp_cost;
            const soldOut = item.max_redemptions != null && item.redemptions_count >= item.max_redemptions;
            return (
              <View style={s.card}>
                <View style={s.cardTop}><View style={s.shopIcon}><Store color={ACCENT} size={19} /></View><View style={{ flex: 1 }}><Text style={s.shopName}>{item.shop?.name || 'Skate shop'}</Text><Text style={s.dealTitle}>{item.title}</Text></View></View>
                {item.description ? <Text style={s.description}>{item.description}</Text> : null}
                <View style={s.costRow}><View style={s.costPill}><Zap color="#F7B955" size={15} /><Text style={s.cost}>{item.xp_cost.toLocaleString()} XP</Text></View>{item.expires_at ? <Text style={s.smallMeta}>Ends {new Date(item.expires_at).toLocaleDateString()}</Text> : null}</View>
                <TouchableOpacity
                  style={[s.redeemButton, (!affordable || soldOut || redeemingId === item.id) && s.disabled]}
                  disabled={!affordable || soldOut || redeemingId === item.id}
                  onPress={() => redeem(item)}
                >
                  {redeemingId === item.id ? <ActivityIndicator color="#fff" /> : !affordable ? <Lock color="#fff" size={16} /> : <ShieldCheck color="#fff" size={16} />}
                  <Text style={s.redeemText}>{soldOut ? 'SOLD OUT' : !affordable ? 'NEED MORE XP' : 'REDEEM SECURELY'}</Text>
                </TouchableOpacity>
              </View>
            );
          }}
          ListEmptyComponent={<View style={s.empty}><Gift color="#3A4758" size={42} /><Text style={s.emptyTitle}>No real shop deals yet</Text><Text style={s.emptyText}>Nothing is fabricated here. Verified skate-shop rewards will appear when they are added to the live catalog.</Text></View>}
        />
      ) : (
        <FlatList
          data={redemptions}
          keyExtractor={item => item.id}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load(); }} tintColor={ACCENT} />}
          contentContainerStyle={s.list}
          renderItem={({ item }) => {
            const expired = new Date(item.expires_at).getTime() <= Date.now();
            return (
              <View style={[s.card, (expired || item.used) && { opacity: 0.55 }]}>
                <Text style={s.dealTitle}>{item.deal?.title || 'Shop reward'}</Text>
                <Text style={s.shopName}>{item.deal?.shop?.name || 'Skate shop'}</Text>
                <Text selectable style={s.savedCode}>{item.redemption_code}</Text>
                <Text style={s.smallMeta}>{item.used ? 'Used' : expired ? 'Expired' : `Expires ${new Date(item.expires_at).toLocaleString()}`} · {item.xp_cost_paid.toLocaleString()} XP paid</Text>
              </View>
            );
          }}
          ListEmptyComponent={<View style={s.empty}><Ticket color="#3A4758" size={42} /><Text style={s.emptyTitle}>No codes yet</Text><Text style={s.emptyText}>Redeemed shop codes will stay here for your account.</Text></View>}
        />
      )}

      <CodeModal redemption={codeModal} onClose={() => setCodeModal(null)} />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  center: { flex: 1, backgroundColor: BG, alignItems: 'center', justifyContent: 'center' },
  progressCard: { margin: 16, marginBottom: 10, padding: 18, borderRadius: 22, backgroundColor: '#111722', borderWidth: 1, borderColor: 'rgba(210,103,61,.35)' },
  progressTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  kicker: { color: ACCENT, fontSize: 8, fontWeight: '900', letterSpacing: 1.2 },
  heroTitle: { color: '#F7F4EF', fontSize: 25, fontWeight: '900', marginTop: 3 },
  levelPill: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 7, borderRadius: 999, backgroundColor: '#211A0E' },
  levelText: { color: '#F7B955', fontWeight: '900', fontSize: 11 },
  xpValue: { color: '#fff', fontSize: 20, fontWeight: '900', marginTop: 18 },
  track: { height: 8, borderRadius: 99, backgroundColor: '#273244', overflow: 'hidden', marginTop: 8 },
  fill: { height: '100%', backgroundColor: ACCENT },
  progressMeta: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 7 },
  metaText: { color: '#78869A', fontSize: 10 },
  tabs: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingBottom: 8 },
  tab: { flex: 1, minHeight: 42, borderRadius: 12, backgroundColor: '#111722', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, borderWidth: 1, borderColor: BORDER },
  tabActive: { backgroundColor: ACCENT, borderColor: ACCENT },
  tabText: { color: '#8190A2', fontSize: 10, fontWeight: '900', letterSpacing: .5 },
  tabTextActive: { color: '#fff' },
  list: { padding: 16, paddingTop: 8, paddingBottom: 42, gap: 10, flexGrow: 1 },
  card: { borderRadius: 18, padding: 15, backgroundColor: CARD, borderWidth: 1, borderColor: BORDER },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  shopIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#24140F', alignItems: 'center', justifyContent: 'center' },
  shopName: { color: ACCENT, fontSize: 11, fontWeight: '800', marginBottom: 2 },
  dealTitle: { color: '#EEF2F7', fontSize: 16, fontWeight: '900' },
  description: { color: '#8995A5', fontSize: 12, lineHeight: 18, marginTop: 10 },
  costRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 13 },
  costPill: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 9, paddingVertical: 6, borderRadius: 999, backgroundColor: '#211A0E' },
  cost: { color: '#F7B955', fontSize: 11, fontWeight: '900' },
  smallMeta: { color: '#667486', fontSize: 10, marginTop: 8 },
  redeemButton: { minHeight: 45, marginTop: 13, borderRadius: 12, backgroundColor: ACCENT, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 },
  disabled: { opacity: .45 },
  redeemText: { color: '#fff', fontSize: 10, fontWeight: '900', letterSpacing: .6 },
  savedCode: { color: '#F7B955', fontSize: 20, fontWeight: '900', letterSpacing: 2, marginTop: 12 },
  empty: { flex: 1, minHeight: 230, alignItems: 'center', justifyContent: 'center', padding: 28 },
  emptyTitle: { color: '#DDE4EC', fontSize: 17, fontWeight: '900', marginTop: 12 },
  emptyText: { color: '#718095', fontSize: 12, lineHeight: 18, textAlign: 'center', marginTop: 6 },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,.78)', alignItems: 'center', justifyContent: 'center', padding: 22 },
  modalCard: { width: '100%', maxWidth: 420, borderRadius: 24, padding: 20, backgroundColor: '#0D141E', borderWidth: 1, borderColor: BORDER, alignItems: 'center' },
  successIcon: { width: 62, height: 62, borderRadius: 31, backgroundColor: '#10251A', alignItems: 'center', justifyContent: 'center' },
  modalTitle: { color: '#F7F4EF', fontSize: 21, fontWeight: '900', marginTop: 11 },
  modalSub: { color: '#8491A2', fontSize: 12, textAlign: 'center', marginTop: 4 },
  codeBox: { width: '100%', alignItems: 'center', backgroundColor: '#111C29', borderRadius: 16, padding: 16, marginTop: 16 },
  codeLabel: { color: '#697789', fontSize: 9, fontWeight: '900', letterSpacing: 1.2 },
  code: { color: '#F7B955', fontSize: 26, fontWeight: '900', letterSpacing: 3, marginVertical: 10 },
  copyButton: { minHeight: 40, borderRadius: 11, paddingHorizontal: 14, backgroundColor: ACCENT, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  copyText: { color: '#fff', fontSize: 10, fontWeight: '900' },
  expiryRow: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 14 },
  expiryText: { color: '#9AA6B6', fontSize: 11 },
  doneButton: { width: '100%', minHeight: 45, borderRadius: 12, backgroundColor: '#253244', alignItems: 'center', justifyContent: 'center', marginTop: 18 },
  doneText: { color: '#fff', fontSize: 11, fontWeight: '900' },
});