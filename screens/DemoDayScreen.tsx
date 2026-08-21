import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CalendarDays, Check, Gift, MapPin, Megaphone, Store, Users } from 'lucide-react-native';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/useAuthStore';

const INK = '#07080B';
const PAPER = '#F6F0E5';
const ORANGE = '#E36D3F';
const ACID = '#D9F34A';
const BLUE = '#72A9FF';

type DemoDay = {
  id: string;
  shop_id: string | null;
  title: string;
  description: string | null;
  latitude: number | null;
  longitude: number | null;
  event_date: string;
  brands: string[] | null;
  free_stuff: boolean | null;
  skate_shops: {
    shop_name: string;
    city: string | null;
    state: string | null;
  } | null;
};

export default function DemoDayScreen() {
  const { user } = useAuthStore();
  const [demos, setDemos] = useState<DemoDay[]>([]);
  const [rsvps, setRsvps] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setError(null);
    try {
      const { data, error: demoError } = await supabase
        .from('demo_days')
        .select('id,shop_id,title,description,latitude,longitude,event_date,brands,free_stuff,skate_shops!shop_id(shop_name,city,state)')
        .gte('event_date', new Date().toISOString())
        .order('event_date');
      if (demoError) throw demoError;

      setDemos((data || []) as unknown as DemoDay[]);

      if (user?.id) {
        const { data: rv, error: rsvpError } = await supabase
          .from('demo_day_rsvps')
          .select('demo_id')
          .eq('user_id', user.id);
        if (rsvpError) throw rsvpError;
        setRsvps(new Set(rv?.map(row => row.demo_id) || []));
      } else {
        setRsvps(new Set());
      }
    } catch (loadError: any) {
      console.error('Demo Days load failed:', loadError);
      setDemos([]);
      setError(loadError?.message || 'Upcoming demo events could not be loaded.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.id]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const rsvp = async (demoId: string) => {
    if (!user?.id) {
      Alert.alert('Sign in required', 'Sign in to RSVP to a demo day.');
      return;
    }

    const wasGoing = rsvps.has(demoId);
    setSavingId(demoId);
    try {
      if (wasGoing) {
        const { error: removeError } = await supabase
          .from('demo_day_rsvps')
          .delete()
          .eq('user_id', user.id)
          .eq('demo_id', demoId);
        if (removeError) throw removeError;
        setRsvps(prev => {
          const next = new Set(prev);
          next.delete(demoId);
          return next;
        });
      } else {
        const { error: addError } = await supabase
          .from('demo_day_rsvps')
          .insert({ user_id: user.id, demo_id: demoId });
        if (addError) throw addError;
        setRsvps(prev => new Set([...prev, demoId]));
      }
    } catch (rsvpError: any) {
      Alert.alert('RSVP not saved', rsvpError?.message || 'Try again.');
    } finally {
      setSavingId(null);
    }
  };

  const giveawayCount = useMemo(
    () => demos.filter(demo => demo.free_stuff).length,
    [demos]
  );

  if (loading) {
    return (
      <SafeAreaView style={s.loading} edges={['top']}>
        <View style={s.loadingStamp}><Megaphone color={INK} size={30} strokeWidth={2.8} /></View>
        <ActivityIndicator color={ORANGE} />
        <Text style={s.loadingText}>CHECKING UPCOMING DEMOS</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <FlatList
        data={demos}
        keyExtractor={item => item.id}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              void loadData();
            }}
            tintColor={ORANGE}
          />
        }
        contentContainerStyle={s.listContent}
        ListHeaderComponent={
          <>
            <View style={s.hero}>
              <View style={s.orangeSlash} />
              <View style={s.acidSlash} />
              <View style={s.blueOrb} />

              <View style={s.heroTopRow}>
                <View style={s.heroStamp}>
                  <Megaphone color={INK} size={29} strokeWidth={2.8} />
                </View>
                <View style={s.eventChip}>
                  <CalendarDays color={INK} size={12} strokeWidth={3} />
                  <Text style={s.eventChipText}>UPCOMING</Text>
                </View>
              </View>

              <Text style={s.eyebrow}>SHOP EVENTS • BRAND DEMOS • SESSION DAYS</Text>
              <Text style={s.title}>DEMO{`\n`}DAYS.</Text>
              <Text style={s.sub}>
                Upcoming demo events from the live SkateQuest listings. RSVP when you actually plan to pull up.
              </Text>
            </View>

            <View style={s.statsTicket}>
              <View style={s.statCell}>
                <CalendarDays color={INK} size={18} strokeWidth={2.8} />
                <Text style={s.statValue}>{demos.length}</Text>
                <Text style={s.statLabel}>UPCOMING</Text>
              </View>
              <View style={s.statDivider} />
              <View style={s.statCell}>
                <Gift color={INK} size={18} strokeWidth={2.8} />
                <Text style={s.statValue}>{giveawayCount}</Text>
                <Text style={s.statLabel}>GIVEAWAYS</Text>
              </View>
              <View style={s.statDivider} />
              <View style={s.statCell}>
                <Users color={INK} size={18} strokeWidth={2.8} />
                <Text style={s.statValue}>{rsvps.size}</Text>
                <Text style={s.statLabel}>YOUR RSVPS</Text>
              </View>
            </View>

            {error ? (
              <View style={s.errorCard}>
                <Text style={s.errorTitle}>EVENT FEED ISSUE</Text>
                <Text style={s.errorText}>{error}</Text>
              </View>
            ) : null}

            {demos.length > 0 ? (
              <View style={s.sectionHeader}>
                <View>
                  <Text style={s.sectionTitle}>EVENT POSTERS</Text>
                  <Text style={s.sectionSub}>EARLIEST DATES FIRST</Text>
                </View>
                <View style={s.livePill}>
                  <View style={s.liveDot} />
                  <Text style={s.liveText}>LIVE LISTINGS</Text>
                </View>
              </View>
            ) : null}
          </>
        }
        renderItem={({ item, index }) => {
          const going = rsvps.has(item.id);
          const date = new Date(item.event_date);
          const place = [item.skate_shops?.city, item.skate_shops?.state].filter(Boolean).join(', ');
          const accent = index % 3 === 0 ? ORANGE : index % 3 === 1 ? ACID : BLUE;

          return (
            <View style={[s.card, index % 2 === 1 && s.cardTilt]}>
              <View style={[s.posterStripe, { backgroundColor: accent }]} />

              <View style={s.posterTop}>
                <View style={[s.dateBox, { backgroundColor: accent }]}>
                  <Text style={s.dateMonth}>
                    {date.toLocaleString('default', { month: 'short' }).toUpperCase()}
                  </Text>
                  <Text style={s.dateDay}>{date.getDate()}</Text>
                </View>

                <View style={s.cardMain}>
                  <Text style={s.eventKicker}>DEMO DAY #{String(index + 1).padStart(2, '0')}</Text>
                  <Text style={s.eventTitle}>{item.title}</Text>
                  {item.skate_shops?.shop_name ? (
                    <View style={s.shopRow}>
                      <Store color={ORANGE} size={13} strokeWidth={2.7} />
                      <Text style={s.shopName}>{item.skate_shops.shop_name}</Text>
                    </View>
                  ) : null}
                </View>
              </View>

              <View style={s.infoRow}>
                <View style={s.infoBlock}>
                  <CalendarDays color={INK} size={14} strokeWidth={2.7} />
                  <View>
                    <Text style={s.infoKicker}>START</Text>
                    <Text style={s.infoText}>
                      {date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                    </Text>
                  </View>
                </View>
                <View style={s.infoBlock}>
                  <MapPin color={INK} size={14} strokeWidth={2.7} />
                  <View style={s.infoCopy}>
                    <Text style={s.infoKicker}>LOCATION</Text>
                    <Text numberOfLines={1} style={s.infoText}>{place || 'Event coordinates listed'}</Text>
                  </View>
                </View>
              </View>

              {item.description ? <Text style={s.description}>{item.description}</Text> : null}

              {item.brands?.length ? (
                <View style={s.brandWrap}>
                  <Text style={s.brandLabel}>BRANDS</Text>
                  <View style={s.brandRow}>
                    {item.brands.slice(0, 6).map(brand => (
                      <View key={brand} style={s.brandTag}>
                        <Text style={s.brandText}>{brand.toUpperCase()}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              ) : null}

              {item.free_stuff ? (
                <View style={s.giveawayTicket}>
                  <Gift color={INK} size={17} strokeWidth={2.8} />
                  <Text style={s.giveawayText}>GIVEAWAYS LISTED FOR THIS EVENT</Text>
                </View>
              ) : null}

              <TouchableOpacity
                style={[s.rsvpBtn, going && s.goingBtn, savingId === item.id && s.disabled]}
                disabled={savingId === item.id}
                onPress={() => void rsvp(item.id)}
              >
                {savingId === item.id ? (
                  <ActivityIndicator color={INK} />
                ) : going ? (
                  <Check color={INK} size={18} strokeWidth={3} />
                ) : (
                  <Users color={INK} size={18} strokeWidth={2.8} />
                )}
                <Text style={s.rsvpTxt}>{going ? 'YOU’RE GOING' : 'RSVP TO THIS DEMO'}</Text>
              </TouchableOpacity>
            </View>
          );
        }}
        ListEmptyComponent={
          !error ? (
            <View style={s.empty}>
              <View style={s.emptyIcon}><Megaphone color={INK} size={31} strokeWidth={2.8} /></View>
              <Text style={s.emptyTitle}>NO UPCOMING DEMOS LISTED</Text>
              <Text style={s.emptyText}>
                Nothing fake is filled in here. Real demo-day listings will appear when shops or organizers add them.
              </Text>
            </View>
          ) : null
        }
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: INK },
  loading: { flex: 1, backgroundColor: INK, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingStamp: { width: 64, height: 64, borderRadius: 19, backgroundColor: ACID, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '-6deg' }] },
  loadingText: { color: PAPER, fontSize: 9, fontWeight: '900', letterSpacing: 1.3 },
  listContent: { paddingBottom: 118 },

  hero: { minHeight: 295, paddingHorizontal: 18, paddingTop: 20, paddingBottom: 28, overflow: 'hidden', position: 'relative' },
  orangeSlash: { position: 'absolute', width: 305, height: 94, right: -105, top: 55, backgroundColor: ORANGE, transform: [{ rotate: '31deg' }] },
  acidSlash: { position: 'absolute', width: 220, height: 27, left: -70, bottom: 34, backgroundColor: ACID, transform: [{ rotate: '-10deg' }] },
  blueOrb: { position: 'absolute', width: 165, height: 165, borderRadius: 83, right: 8, bottom: -58, backgroundColor: BLUE, opacity: 0.12 },
  heroTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  heroStamp: { width: 60, height: 60, borderRadius: 18, backgroundColor: ACID, borderWidth: 3, borderColor: INK, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '-6deg' }] },
  eventChip: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: PAPER, borderRadius: 999, borderWidth: 2, borderColor: INK, paddingHorizontal: 10, paddingVertical: 7 },
  eventChipText: { color: INK, fontSize: 8, fontWeight: '900', letterSpacing: 1 },
  eyebrow: { color: ORANGE, fontSize: 8, fontWeight: '900', letterSpacing: 1.45, marginTop: 27 },
  title: { color: PAPER, fontSize: 51, lineHeight: 47, fontWeight: '900', letterSpacing: -2.9, marginTop: 3 },
  sub: { color: '#A3AAB5', fontSize: 12, lineHeight: 18, fontWeight: '700', maxWidth: 305, marginTop: 8 },

  statsTicket: { marginHorizontal: 14, marginTop: -10, minHeight: 100, backgroundColor: PAPER, borderRadius: 24, borderWidth: 2, borderColor: INK, flexDirection: 'row', alignItems: 'stretch', paddingVertical: 14, shadowColor: '#000', shadowOpacity: 0.28, shadowRadius: 12, shadowOffset: { width: 0, height: 8 }, elevation: 7, transform: [{ rotate: '-0.5deg' }] },
  statCell: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  statDivider: { width: 1, backgroundColor: '#D4CEC2' },
  statValue: { color: INK, fontSize: 19, lineHeight: 22, fontWeight: '900', marginTop: 5 },
  statLabel: { color: '#74766F', fontSize: 7, fontWeight: '900', letterSpacing: 0.7, marginTop: 1 },

  errorCard: { marginHorizontal: 14, marginTop: 18, borderRadius: 16, borderWidth: 1, borderColor: '#63362A', backgroundColor: '#20110E', padding: 13 },
  errorTitle: { color: ORANGE, fontSize: 9, fontWeight: '900', letterSpacing: 1.1 },
  errorText: { color: '#C6A99F', fontSize: 10, lineHeight: 15, marginTop: 3 },
  sectionHeader: { paddingHorizontal: 18, paddingTop: 26, paddingBottom: 11, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  sectionTitle: { color: PAPER, fontSize: 18, fontWeight: '900', letterSpacing: -0.4 },
  sectionSub: { color: '#727A87', fontSize: 7, fontWeight: '900', letterSpacing: 0.85, marginTop: 3 },
  livePill: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#172317', borderRadius: 999, paddingHorizontal: 9, paddingVertical: 6 },
  liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: ACID },
  liveText: { color: ACID, fontSize: 7, fontWeight: '900', letterSpacing: 0.75 },

  card: { marginHorizontal: 14, marginBottom: 14, backgroundColor: PAPER, borderRadius: 22, borderWidth: 2, borderColor: INK, padding: 15, overflow: 'hidden', position: 'relative' },
  cardTilt: { transform: [{ rotate: '0.4deg' }] },
  posterStripe: { position: 'absolute', left: 0, top: 0, right: 0, height: 7 },
  posterTop: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 3 },
  dateBox: { width: 61, height: 68, borderRadius: 17, borderWidth: 2, borderColor: INK, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '-4deg' }] },
  dateMonth: { color: INK, fontSize: 8, fontWeight: '900', letterSpacing: 0.7 },
  dateDay: { color: INK, fontSize: 26, lineHeight: 29, fontWeight: '900' },
  cardMain: { flex: 1 },
  eventKicker: { color: ORANGE, fontSize: 6.5, fontWeight: '900', letterSpacing: 0.9 },
  eventTitle: { color: INK, fontSize: 20, lineHeight: 23, fontWeight: '900', letterSpacing: -0.65, marginTop: 2 },
  shopRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 5 },
  shopName: { color: '#666A65', fontSize: 9, fontWeight: '900' },
  infoRow: { flexDirection: 'row', gap: 8, marginTop: 15 },
  infoBlock: { flex: 1, minHeight: 53, flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: '#EAE5DB', borderRadius: 13, borderWidth: 1, borderColor: '#D1C9BD', paddingHorizontal: 10 },
  infoCopy: { flex: 1 },
  infoKicker: { color: '#8B8C85', fontSize: 6.5, fontWeight: '900', letterSpacing: 0.75 },
  infoText: { color: INK, fontSize: 9, fontWeight: '900', marginTop: 2 },
  description: { color: '#646963', fontSize: 10.5, lineHeight: 16, fontWeight: '600', marginTop: 12 },
  brandWrap: { marginTop: 13 },
  brandLabel: { color: '#8B8C85', fontSize: 6.5, fontWeight: '900', letterSpacing: 0.8, marginBottom: 6 },
  brandRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 5 },
  brandTag: { borderRadius: 999, borderWidth: 1.5, borderColor: INK, paddingHorizontal: 8, paddingVertical: 5 },
  brandText: { color: INK, fontSize: 6.5, fontWeight: '900', letterSpacing: 0.55 },
  giveawayTicket: { flexDirection: 'row', alignItems: 'center', gap: 7, minHeight: 45, backgroundColor: ACID, borderRadius: 13, borderWidth: 1.5, borderColor: INK, paddingHorizontal: 11, marginTop: 13 },
  giveawayText: { color: INK, fontSize: 7.5, fontWeight: '900', letterSpacing: 0.65 },
  rsvpBtn: { minHeight: 49, marginTop: 14, borderRadius: 14, borderWidth: 2, borderColor: INK, backgroundColor: ORANGE, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 },
  goingBtn: { backgroundColor: ACID },
  rsvpTxt: { color: INK, fontWeight: '900', fontSize: 8.5, letterSpacing: 0.75 },
  disabled: { opacity: 0.55 },

  empty: { marginHorizontal: 14, marginTop: 26, minHeight: 230, borderRadius: 24, borderWidth: 1.5, borderColor: '#30343D', backgroundColor: '#13161C', alignItems: 'center', justifyContent: 'center', padding: 24 },
  emptyIcon: { width: 64, height: 64, borderRadius: 19, backgroundColor: ACID, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '-5deg' }] },
  emptyTitle: { color: PAPER, fontSize: 14, fontWeight: '900', letterSpacing: 0.8, marginTop: 14, textAlign: 'center' },
  emptyText: { color: '#7F8793', fontSize: 11, lineHeight: 17, textAlign: 'center', marginTop: 6, maxWidth: 280 },
});
