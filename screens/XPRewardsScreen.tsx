import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Clipboard from 'expo-clipboard';
import {
  CheckCircle2,
  Clock3,
  Copy,
  Gift,
  Lock,
  ShieldCheck,
  Store,
  Ticket,
  Trophy,
  Zap,
} from 'lucide-react-native';
import { useAuthStore } from '../stores/useAuthStore';
import { supabase } from '../lib/supabase';
import { profilesService } from '../lib/profilesService';
import { shopsService } from '../lib/shopsService';

const INK = '#07080B';
const PAPER = '#F6F0E5';
const ORANGE = '#E36D3F';
const ACID = '#D9F34A';
const BLUE = '#72A9FF';

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

function CodeModal({
  redemption,
  onClose,
}: {
  redemption: { code: string; expiresAt: string; title: string; shop: string } | null;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);
  if (!redemption) return null;

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View style={s.modalBackdrop}>
        <View style={s.modalCard}>
          <View style={s.modalHandle} />
          <View style={s.modalStamp}>
            <CheckCircle2 color={INK} size={29} strokeWidth={2.8} />
          </View>
          <Text style={s.modalKicker}>SERVER-VERIFIED REDEMPTION</Text>
          <Text style={s.modalTitle}>DEAL UNLOCKED.</Text>
          <Text style={s.modalSub}>
            {redemption.title}
            {redemption.shop ? ` • ${redemption.shop}` : ''}
          </Text>

          <View style={s.codeTicket}>
            <Text style={s.codeLabel}>YOUR ONE-TIME CODE</Text>
            <Text selectable style={s.code}>{redemption.code}</Text>
            <TouchableOpacity
              style={[s.copyButton, copied && s.copyButtonDone]}
              onPress={() =>
                void Clipboard.setStringAsync(redemption.code).then(() => setCopied(true))
              }
            >
              {copied ? (
                <CheckCircle2 color={INK} size={16} strokeWidth={2.8} />
              ) : (
                <Copy color={INK} size={16} strokeWidth={2.8} />
              )}
              <Text style={s.copyText}>{copied ? 'COPIED' : 'COPY CODE'}</Text>
            </TouchableOpacity>
          </View>

          <View style={s.expiryRow}>
            <Clock3 color={ORANGE} size={16} strokeWidth={2.7} />
            <Text style={s.expiryText}>
              Expires {new Date(redemption.expiresAt).toLocaleString()}
            </Text>
          </View>

          <TouchableOpacity style={s.doneButton} onPress={onClose}>
            <Text style={s.doneText}>DONE</Text>
          </TouchableOpacity>
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
  const [codeModal, setCodeModal] = useState<{
    code: string;
    expiresAt: string;
    title: string;
    shop: string;
  } | null>(null);

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
          .select(
            'id,shop_id,title,description,xp_cost,active,max_redemptions,redemptions_count,expires_at,shop:skate_shops(id,shop_name,address)'
          )
          .eq('active', true)
          .order('xp_cost', { ascending: true }),
        supabase
          .from('deal_redemptions')
          .select(
            'id,deal_id,redemption_code,xp_cost_paid,redeemed_at,expires_at,used,deal:shop_deals(title,shop:skate_shops(shop_name))'
          )
          .order('redeemed_at', { ascending: false })
          .limit(50),
      ]);

      if (profileResult.error) throw profileResult.error;
      if (progressResult.error) throw progressResult.error;
      if (dealsResult.error) throw dealsResult.error;
      if (redemptionsResult.error) throw redemptionsResult.error;

      setXp(Number(profileResult.data?.xp ?? 0));
      setProgress((progressResult.data ?? null) as LevelProgress | null);
      setDeals(
        (dealsResult.data ?? []).map((row: any) => {
          const shop = normalizeRelation(row.shop);
          return {
            ...row,
            shop: shop
              ? { id: shop.id, name: shop.shop_name, address: shop.address ?? null }
              : null,
          } as ShopDeal;
        })
      );
      setRedemptions(
        (redemptionsResult.data ?? []).map((row: any) => {
          const deal = normalizeRelation(row.deal);
          const shop = normalizeRelation(deal?.shop);
          return {
            ...row,
            deal: deal
              ? { title: deal.title, shop: shop ? { name: shop.shop_name } : null }
              : null,
          } as Redemption;
        })
      );
    } catch (error: any) {
      Alert.alert('Rewards unavailable', error?.message || 'Could not load XP rewards.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.id]);

  useEffect(() => {
    void load();
  }, [load]);

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
                if (!result?.code || !result?.expires_at) {
                  throw new Error('Server did not return a redemption code.');
                }
                setXp(Number(result.remaining_xp ?? Math.max(0, xp - deal.xp_cost)));
                setCodeModal({
                  code: result.code,
                  expiresAt: result.expires_at,
                  title: deal.title,
                  shop: deal.shop?.name || '',
                });
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

  const percent = Math.max(0, Math.min(100, Number(progress?.progress_percentage ?? 0)));
  const level = progress?.current_level ?? 1;
  const affordableCount = useMemo(
    () =>
      deals.filter(
        deal =>
          xp >= deal.xp_cost &&
          !(deal.max_redemptions != null && deal.redemptions_count >= deal.max_redemptions)
      ).length,
    [deals, xp]
  );

  if (loading) {
    return (
      <SafeAreaView style={s.loading} edges={['top']}>
        <View style={s.loadingStamp}><Zap color={INK} size={30} strokeWidth={2.8} /></View>
        <ActivityIndicator size="large" color={ORANGE} />
        <Text style={s.loadingText}>COUNTING LIVE XP</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <FlatList<ShopDeal | Redemption>
        data={tab === 'deals' ? deals : redemptions}
        keyExtractor={item => item.id}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              void load();
            }}
            tintColor={ORANGE}
          />
        }
        showsVerticalScrollIndicator={false}
        contentContainerStyle={s.listContent}
        ListHeaderComponent={
          <>
            <View style={s.hero}>
              <View style={s.orangeSlash} />
              <View style={s.acidSlash} />
              <View style={s.blueOrb} />
              <View style={s.heroTopRow}>
                <View style={s.heroStamp}>
                  <Zap color={INK} size={29} strokeWidth={2.8} />
                </View>
                <View style={s.secureChip}>
                  <ShieldCheck color={INK} size={12} strokeWidth={3} />
                  <Text style={s.secureChipText}>SERVER VERIFIED</Text>
                </View>
              </View>
              <Text style={s.eyebrow}>EARN IT IN THE APP • SPEND IT ON REAL DEALS</Text>
              <Text style={s.title}>XP{`\n`}REWARDS.</Text>
              <Text style={s.subtitle}>
                Your XP balance and redemption cost are checked on the server. No fake codes and no client-side XP shortcuts.
              </Text>
            </View>

            <View style={s.walletTicket}>
              <View style={s.walletTop}>
                <View>
                  <Text style={s.walletKicker}>YOUR XP WALLET</Text>
                  <Text style={s.walletValue}>{xp.toLocaleString()} XP</Text>
                </View>
                <View style={s.levelStamp}>
                  <Text style={s.levelLabel}>LEVEL</Text>
                  <Text style={s.levelValue}>{level}</Text>
                </View>
              </View>
              <View style={s.progressTrack}>
                <View style={[s.progressFill, { width: `${percent}%` }]} />
              </View>
              <View style={s.progressMeta}>
                <Text style={s.progressText}>
                  {progress ? `${progress.xp_needed.toLocaleString()} XP TO NEXT LEVEL` : 'LEVEL DATA LOADING'}
                </Text>
                <Text style={s.progressText}>{Math.round(percent)}%</Text>
              </View>
            </View>

            <View style={s.statsRow}>
              <View style={s.statCard}>
                <Gift color={INK} size={17} strokeWidth={2.8} />
                <Text style={s.statValue}>{deals.length}</Text>
                <Text style={s.statLabel}>LIVE DEALS</Text>
              </View>
              <View style={s.statCard}>
                <Trophy color={INK} size={17} strokeWidth={2.8} />
                <Text style={s.statValue}>{affordableCount}</Text>
                <Text style={s.statLabel}>UNLOCKABLE NOW</Text>
              </View>
              <View style={s.statCard}>
                <Ticket color={INK} size={17} strokeWidth={2.8} />
                <Text style={s.statValue}>{redemptions.length}</Text>
                <Text style={s.statLabel}>YOUR CODES</Text>
              </View>
            </View>

            <View style={s.tabs}>
              <TouchableOpacity
                style={[s.tab, tab === 'deals' && s.tabActive]}
                onPress={() => setTab('deals')}
              >
                <Gift color={tab === 'deals' ? INK : '#808894'} size={16} strokeWidth={2.8} />
                <Text style={[s.tabText, tab === 'deals' && s.tabTextActive]}>SHOP DEALS</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.tab, tab === 'mine' && s.tabActive]}
                onPress={() => setTab('mine')}
              >
                <Ticket color={tab === 'mine' ? INK : '#808894'} size={16} strokeWidth={2.8} />
                <Text style={[s.tabText, tab === 'mine' && s.tabTextActive]}>MY CODES</Text>
              </TouchableOpacity>
            </View>

            <View style={s.sectionHeader}>
              <Text style={s.sectionTitle}>{tab === 'deals' ? 'LIVE UNLOCKS' : 'YOUR REDEMPTIONS'}</Text>
              <Text style={s.sectionSub}>
                {tab === 'deals' ? 'LOWEST XP COST FIRST' : 'NEWEST CODE FIRST'}
              </Text>
            </View>
          </>
        }
        renderItem={({ item, index }) => {
          if (tab === 'mine') {
            const redemption = item as Redemption;
            const expired = new Date(redemption.expires_at).getTime() <= Date.now();
            const inactive = expired || redemption.used;
            return (
              <View style={[s.codeCard, inactive && s.codeCardInactive, index % 2 === 1 && s.cardTilt]}>
                <View style={s.codeCardTop}>
                  <View style={[s.codeStatus, !inactive && s.codeStatusLive]}>
                    <Text style={s.codeStatusText}>
                      {redemption.used ? 'USED' : expired ? 'EXPIRED' : 'LIVE CODE'}
                    </Text>
                  </View>
                  <Text style={s.codeCost}>{redemption.xp_cost_paid.toLocaleString()} XP PAID</Text>
                </View>
                <Text style={s.dealTitle}>{redemption.deal?.title || 'Shop reward'}</Text>
                <View style={s.shopRow}>
                  <Store color={ORANGE} size={13} strokeWidth={2.7} />
                  <Text style={s.shopName}>{redemption.deal?.shop?.name || 'Skate shop'}</Text>
                </View>
                <View style={s.savedCodeWrap}>
                  <Text style={s.savedCodeLabel}>REDEMPTION CODE</Text>
                  <Text selectable style={s.savedCode}>{redemption.redemption_code}</Text>
                </View>
                <Text style={s.smallMeta}>
                  {redemption.used
                    ? 'Already marked used'
                    : expired
                      ? `Expired ${new Date(redemption.expires_at).toLocaleString()}`
                      : `Expires ${new Date(redemption.expires_at).toLocaleString()}`}
                </Text>
              </View>
            );
          }

          const deal = item as ShopDeal;
          const affordable = xp >= deal.xp_cost;
          const soldOut =
            deal.max_redemptions != null && deal.redemptions_count >= deal.max_redemptions;
          const accent = affordable && !soldOut ? ACID : index % 2 === 0 ? ORANGE : BLUE;

          return (
            <View style={[s.dealCard, index % 2 === 1 && s.cardTilt]}>
              <View style={[s.dealStripe, { backgroundColor: accent }]} />
              <View style={s.dealTop}>
                <View style={[s.shopStamp, { backgroundColor: accent }]}>
                  <Store color={INK} size={22} strokeWidth={2.8} />
                </View>
                <View style={s.dealCopy}>
                  <Text style={s.shopKicker}>{deal.shop?.name || 'SKATE SHOP'}</Text>
                  <Text style={s.dealTitle}>{deal.title}</Text>
                </View>
                <View style={s.costSticker}>
                  <Text style={s.costValue}>{deal.xp_cost.toLocaleString()}</Text>
                  <Text style={s.costLabel}>XP</Text>
                </View>
              </View>

              {deal.description ? <Text style={s.description}>{deal.description}</Text> : null}
              {deal.shop?.address ? (
                <Text style={s.address} numberOfLines={2}>{deal.shop.address}</Text>
              ) : null}

              <View style={s.dealMetaRow}>
                <View style={s.secureMeta}>
                  <ShieldCheck color={INK} size={14} strokeWidth={2.8} />
                  <Text style={s.secureMetaText}>SERVER PRICED</Text>
                </View>
                {deal.expires_at ? (
                  <Text style={s.smallMeta}>ENDS {new Date(deal.expires_at).toLocaleDateString()}</Text>
                ) : null}
              </View>

              <TouchableOpacity
                style={[
                  s.redeemButton,
                  affordable && !soldOut && s.redeemButtonReady,
                  (!affordable || soldOut || redeemingId === deal.id) && s.disabled,
                ]}
                disabled={!affordable || soldOut || redeemingId === deal.id}
                onPress={() => redeem(deal)}
              >
                {redeemingId === deal.id ? (
                  <ActivityIndicator color={INK} />
                ) : !affordable ? (
                  <Lock color={INK} size={17} strokeWidth={2.8} />
                ) : (
                  <ShieldCheck color={INK} size={17} strokeWidth={2.8} />
                )}
                <Text style={s.redeemText}>
                  {soldOut ? 'SOLD OUT' : !affordable ? 'NEED MORE XP' : 'REDEEM SECURELY'}
                </Text>
              </TouchableOpacity>
            </View>
          );
        }}
        ListEmptyComponent={
          <View style={s.empty}>
            <View style={s.emptyStamp}>
              {tab === 'deals' ? (
                <Gift color={INK} size={30} strokeWidth={2.8} />
              ) : (
                <Ticket color={INK} size={30} strokeWidth={2.8} />
              )}
            </View>
            <Text style={s.emptyTitle}>{tab === 'deals' ? 'NO REAL SHOP DEALS YET' : 'NO CODES YET'}</Text>
            <Text style={s.emptyText}>
              {tab === 'deals'
                ? 'Nothing is fabricated here. Verified skate-shop rewards appear only when they exist in the live catalog.'
                : 'Secure redemption codes you actually unlock will stay here for your account.'}
            </Text>
          </View>
        }
      />

      <CodeModal redemption={codeModal} onClose={() => setCodeModal(null)} />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: INK },
  loading: { flex: 1, backgroundColor: INK, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingStamp: { width: 64, height: 64, borderRadius: 19, backgroundColor: ACID, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '-6deg' }] },
  loadingText: { color: PAPER, fontSize: 9, fontWeight: '900', letterSpacing: 1.3 },
  listContent: { paddingBottom: 118 },

  hero: { minHeight: 292, paddingHorizontal: 18, paddingTop: 20, paddingBottom: 28, overflow: 'hidden', position: 'relative' },
  orangeSlash: { position: 'absolute', width: 305, height: 94, right: -105, top: 55, backgroundColor: ORANGE, transform: [{ rotate: '31deg' }] },
  acidSlash: { position: 'absolute', width: 220, height: 27, left: -70, bottom: 34, backgroundColor: ACID, transform: [{ rotate: '-10deg' }] },
  blueOrb: { position: 'absolute', width: 165, height: 165, borderRadius: 83, right: 8, bottom: -58, backgroundColor: BLUE, opacity: 0.12 },
  heroTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  heroStamp: { width: 60, height: 60, borderRadius: 18, backgroundColor: ACID, borderWidth: 3, borderColor: INK, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '-6deg' }] },
  secureChip: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: PAPER, borderRadius: 999, borderWidth: 2, borderColor: INK, paddingHorizontal: 10, paddingVertical: 7 },
  secureChipText: { color: INK, fontSize: 7, fontWeight: '900', letterSpacing: 0.9 },
  eyebrow: { color: ORANGE, fontSize: 8, fontWeight: '900', letterSpacing: 1.45, marginTop: 27 },
  title: { color: PAPER, fontSize: 51, lineHeight: 47, fontWeight: '900', letterSpacing: -2.9, marginTop: 3 },
  subtitle: { color: '#A3AAB5', fontSize: 12, lineHeight: 18, fontWeight: '700', maxWidth: 305, marginTop: 8 },

  walletTicket: { marginHorizontal: 14, marginTop: -10, backgroundColor: PAPER, borderRadius: 24, borderWidth: 2, borderColor: INK, padding: 16, shadowColor: '#000', shadowOpacity: 0.28, shadowRadius: 12, shadowOffset: { width: 0, height: 8 }, elevation: 7, transform: [{ rotate: '-0.5deg' }] },
  walletTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  walletKicker: { color: ORANGE, fontSize: 7, fontWeight: '900', letterSpacing: 1.2 },
  walletValue: { color: INK, fontSize: 31, lineHeight: 34, fontWeight: '900', letterSpacing: -1.2, marginTop: 3 },
  levelStamp: { width: 61, height: 61, borderRadius: 18, backgroundColor: ORANGE, borderWidth: 2, borderColor: INK, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '5deg' }] },
  levelLabel: { color: INK, fontSize: 6.5, fontWeight: '900', letterSpacing: 0.7 },
  levelValue: { color: INK, fontSize: 23, lineHeight: 26, fontWeight: '900' },
  progressTrack: { height: 11, backgroundColor: '#D8D2C6', borderRadius: 999, overflow: 'hidden', marginTop: 14, borderWidth: 1, borderColor: '#C7BFB1' },
  progressFill: { height: '100%', backgroundColor: ACID, borderRightWidth: 2, borderColor: INK },
  progressMeta: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 7, gap: 8 },
  progressText: { color: '#666A66', fontSize: 7, fontWeight: '900', letterSpacing: 0.65 },

  statsRow: { flexDirection: 'row', gap: 7, paddingHorizontal: 14, marginTop: 13 },
  statCard: { flex: 1, minHeight: 84, backgroundColor: ACID, borderRadius: 17, borderWidth: 2, borderColor: INK, alignItems: 'center', justifyContent: 'center' },
  statValue: { color: INK, fontSize: 17, fontWeight: '900', marginTop: 3 },
  statLabel: { color: '#626A22', fontSize: 6, fontWeight: '900', letterSpacing: 0.65, marginTop: 1, textAlign: 'center' },

  tabs: { flexDirection: 'row', gap: 7, paddingHorizontal: 14, marginTop: 20 },
  tab: { flex: 1, minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderRadius: 14, borderWidth: 1.5, borderColor: '#30343D', backgroundColor: '#15181E' },
  tabActive: { backgroundColor: ORANGE, borderColor: INK, borderWidth: 2 },
  tabText: { color: '#808894', fontSize: 8, fontWeight: '900', letterSpacing: 0.7 },
  tabTextActive: { color: INK },
  sectionHeader: { paddingHorizontal: 18, paddingTop: 24, paddingBottom: 10 },
  sectionTitle: { color: PAPER, fontSize: 18, fontWeight: '900', letterSpacing: -0.4 },
  sectionSub: { color: '#727A87', fontSize: 7, fontWeight: '900', letterSpacing: 0.85, marginTop: 3 },

  dealCard: { marginHorizontal: 14, marginBottom: 13, backgroundColor: PAPER, borderRadius: 22, borderWidth: 2, borderColor: INK, padding: 15, overflow: 'hidden', position: 'relative' },
  dealStripe: { position: 'absolute', left: 0, top: 0, right: 0, height: 7 },
  cardTilt: { transform: [{ rotate: '0.4deg' }] },
  dealTop: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 3 },
  shopStamp: { width: 48, height: 48, borderRadius: 14, borderWidth: 1.5, borderColor: INK, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '-4deg' }] },
  dealCopy: { flex: 1 },
  shopKicker: { color: ORANGE, fontSize: 6.5, fontWeight: '900', letterSpacing: 0.9 },
  dealTitle: { color: INK, fontSize: 18, lineHeight: 21, fontWeight: '900', letterSpacing: -0.55, marginTop: 2 },
  costSticker: { minWidth: 59, height: 55, borderRadius: 16, backgroundColor: ORANGE, borderWidth: 2, borderColor: INK, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 7, transform: [{ rotate: '5deg' }] },
  costValue: { color: INK, fontSize: 14, lineHeight: 16, fontWeight: '900' },
  costLabel: { color: INK, fontSize: 6.5, fontWeight: '900' },
  description: { color: '#646963', fontSize: 10.5, lineHeight: 16, fontWeight: '600', marginTop: 12 },
  address: { color: '#858780', fontSize: 9, lineHeight: 14, fontWeight: '700', marginTop: 7 },
  dealMetaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginTop: 12 },
  secureMeta: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#EAE5DB', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 5 },
  secureMetaText: { color: INK, fontSize: 6.5, fontWeight: '900', letterSpacing: 0.65 },
  smallMeta: { color: '#7E817B', fontSize: 7, fontWeight: '800' },
  redeemButton: { minHeight: 49, marginTop: 13, borderRadius: 14, borderWidth: 2, borderColor: INK, backgroundColor: '#D6D0C6', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 },
  redeemButtonReady: { backgroundColor: ACID },
  redeemText: { color: INK, fontSize: 8.5, fontWeight: '900', letterSpacing: 0.75 },
  disabled: { opacity: 0.55 },

  codeCard: { marginHorizontal: 14, marginBottom: 13, backgroundColor: PAPER, borderRadius: 22, borderWidth: 2, borderColor: INK, padding: 15 },
  codeCardInactive: { opacity: 0.58 },
  codeCardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  codeStatus: { borderRadius: 999, backgroundColor: '#D6D0C6', paddingHorizontal: 8, paddingVertical: 5 },
  codeStatusLive: { backgroundColor: ACID },
  codeStatusText: { color: INK, fontSize: 6.5, fontWeight: '900', letterSpacing: 0.7 },
  codeCost: { color: '#7D817A', fontSize: 7, fontWeight: '900', letterSpacing: 0.65 },
  shopRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 6 },
  shopName: { color: '#666A65', fontSize: 9, fontWeight: '900' },
  savedCodeWrap: { backgroundColor: '#EAE5DB', borderRadius: 14, borderWidth: 1, borderColor: '#D1C9BD', padding: 11, marginTop: 12 },
  savedCodeLabel: { color: '#8A8B84', fontSize: 6.5, fontWeight: '900', letterSpacing: 0.8 },
  savedCode: { color: INK, fontSize: 19, fontWeight: '900', letterSpacing: 2.2, marginTop: 4 },

  empty: { marginHorizontal: 14, marginTop: 10, minHeight: 220, borderRadius: 24, borderWidth: 1.5, borderColor: '#30343D', backgroundColor: '#13161C', alignItems: 'center', justifyContent: 'center', padding: 24 },
  emptyStamp: { width: 63, height: 63, borderRadius: 19, backgroundColor: ACID, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '-5deg' }] },
  emptyTitle: { color: PAPER, fontSize: 14, fontWeight: '900', letterSpacing: 0.8, marginTop: 14, textAlign: 'center' },
  emptyText: { color: '#7F8793', fontSize: 11, lineHeight: 17, textAlign: 'center', marginTop: 6, maxWidth: 280 },

  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.78)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: PAPER, borderTopLeftRadius: 28, borderTopRightRadius: 28, borderWidth: 2, borderBottomWidth: 0, borderColor: INK, padding: 18, paddingBottom: 30 },
  modalHandle: { width: 48, height: 5, borderRadius: 999, backgroundColor: '#C6C0B6', alignSelf: 'center', marginBottom: 15 },
  modalStamp: { width: 58, height: 58, borderRadius: 17, backgroundColor: ACID, borderWidth: 2, borderColor: INK, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '-5deg' }] },
  modalKicker: { color: ORANGE, fontSize: 7, fontWeight: '900', letterSpacing: 1.1, marginTop: 13 },
  modalTitle: { color: INK, fontSize: 27, fontWeight: '900', letterSpacing: -1, marginTop: 2 },
  modalSub: { color: '#666A65', fontSize: 10.5, lineHeight: 16, fontWeight: '700', marginTop: 5 },
  codeTicket: { backgroundColor: ORANGE, borderRadius: 18, borderWidth: 2, borderColor: INK, padding: 14, marginTop: 15 },
  codeLabel: { color: '#6A351F', fontSize: 7, fontWeight: '900', letterSpacing: 1 },
  code: { color: INK, fontSize: 25, fontWeight: '900', letterSpacing: 2.8, marginTop: 5 },
  copyButton: { minHeight: 43, marginTop: 12, borderRadius: 12, borderWidth: 1.5, borderColor: INK, backgroundColor: PAPER, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  copyButtonDone: { backgroundColor: ACID },
  copyText: { color: INK, fontSize: 8, fontWeight: '900', letterSpacing: 0.7 },
  expiryRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12 },
  expiryText: { color: '#666A65', fontSize: 9, fontWeight: '800', flex: 1 },
  doneButton: { minHeight: 49, backgroundColor: INK, borderRadius: 13, alignItems: 'center', justifyContent: 'center', marginTop: 16 },
  doneText: { color: PAPER, fontSize: 9, fontWeight: '900', letterSpacing: 0.8 },
});