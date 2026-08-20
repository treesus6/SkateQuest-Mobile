import React, { useEffect, useState } from 'react';
import { Tabs, useRouter } from 'expo-router';
import { TouchableOpacity, View, Text, Animated, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import LevelUpModal from '../../components/LevelUpModal';
import { useAuthStore } from '../../stores/useAuthStore';
import { profilesService } from '../../lib/profilesService';
import { supabase } from '../../lib/supabase';
import { Home, Map as MapIcon, Zap, Users, UserRound, Video, MapPin, Bot, Footprints } from 'lucide-react-native';

const INK = '#07080B';
const PAPER = '#F5F0E7';
const ORANGE = '#E36D3F';
const ACID = '#D8F04B';

function SkateQuestTabBar({ state, navigation }: any) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const scaleRefs = React.useRef(state.routes.map(() => new Animated.Value(1))).current;
  const postScale = React.useRef(new Animated.Value(1)).current;
  const postRotate = React.useRef(new Animated.Value(0)).current;
  const [postOpen, setPostOpen] = React.useState(false);

  const bounce = (anim: Animated.Value) => {
    Animated.sequence([
      Animated.spring(anim, { toValue: 0.82, useNativeDriver: true, speed: 80, bounciness: 0 }),
      Animated.spring(anim, { toValue: 1, useNativeDriver: true, speed: 60, bounciness: 12 }),
    ]).start();
  };

  const closePost = () => {
    setPostOpen(false);
    Animated.timing(postRotate, { toValue: 0, duration: 180, useNativeDriver: true }).start();
  };

  const handlePostPress = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    bounce(postScale);
    Animated.timing(postRotate, {
      toValue: postOpen ? 0 : 1,
      duration: 190,
      useNativeDriver: true,
    }).start();
    setPostOpen(open => !open);
  };

  const spin = postRotate.interpolate({ inputRange: [0, 1], outputRange: ['-8deg', '37deg'] });

  const TAB_CONFIG = [
    { icon: Home, label: 'HOME', name: 'index' },
    { icon: MapIcon, label: 'MAP', name: 'map' },
    { icon: null, label: '', name: 'POST', isPost: true },
    { icon: Zap, label: 'QUESTS', name: 'quests' },
    { icon: Users, label: 'CREW', name: 'crew' },
    { icon: UserRound, label: 'ME', name: 'profile' },
  ];

  const POST_ACTIONS = [
    { icon: Video, label: 'POST CLIP', screen: '/(screens)/upload-media', color: ORANGE },
    { icon: MapPin, label: 'CHECK IN', screen: '/(screens)/live-check-in', color: ACID },
    { icon: Footprints, label: 'LOG TRICK', screen: '/(screens)/trick-tracker', color: '#A878FF' },
    { icon: Bot, label: 'AI COACH', screen: '/(screens)/ai-coach', color: '#63A7FF' },
  ];

  return (
    <>
      {postOpen ? (
        <TouchableOpacity
          style={s.overlay}
          activeOpacity={1}
          onPress={closePost}
          accessibilityRole="button"
          accessibilityLabel="Close action menu"
        >
          <View style={[s.postMenu, { bottom: 82 + insets.bottom }]}>
            <Text style={s.postMenuKicker}>DROP SOMETHING</Text>
            {POST_ACTIONS.map((action, i) => (
              <Animated.View key={action.screen} style={{ transform: [{ scale: scaleRefs[i] || postScale }] }}>
                <TouchableOpacity
                  style={[s.postAction, { borderLeftColor: action.color }]}
                  onPress={() => {
                    closePost();
                    router.push(action.screen as any);
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={action.label}
                >
                  <View style={[s.postActionIcon, { backgroundColor: action.color }]}>
                    <action.icon color={INK} size={19} strokeWidth={2.6} />
                  </View>
                  <Text style={s.postActionLabel}>{action.label}</Text>
                  <Text style={[s.postActionArrow, { color: action.color }]}>↗</Text>
                </TouchableOpacity>
              </Animated.View>
            ))}
          </View>
        </TouchableOpacity>
      ) : null}

      <View style={[s.shell, { paddingBottom: Math.max(insets.bottom, 7) }]}>
        <View style={s.rail}>
          {TAB_CONFIG.map(tab => {
            if (tab.isPost) {
              return (
                <View key="post" style={s.postWrap}>
                  <Animated.View style={{ transform: [{ scale: postScale }, { rotate: spin }] }}>
                    <TouchableOpacity
                      onPress={handlePostPress}
                      style={s.postBtn}
                      activeOpacity={0.88}
                      accessibilityRole="button"
                      accessibilityLabel={postOpen ? 'Close action menu' : 'Open action menu'}
                      accessibilityState={{ expanded: postOpen }}
                    >
                      <Text style={s.postPlus}>+</Text>
                    </TouchableOpacity>
                  </Animated.View>
                  <Text style={s.postCaption}>DROP</Text>
                </View>
              );
            }

            const routeIdx = state.routes.findIndex((route: any) => route.name === tab.name);
            if (routeIdx < 0 || !scaleRefs[routeIdx]) return null;
            const scale = scaleRefs[routeIdx];
            const isFocused = state.index === routeIdx;

            const onPress = () => {
              void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              bounce(scale);
              const event = navigation.emit({
                type: 'tabPress',
                target: state.routes[routeIdx]?.key,
                canPreventDefault: true,
              });
              if (!isFocused && !event.defaultPrevented) navigation.navigate(tab.name);
            };

            return (
              <Animated.View key={tab.name} style={[s.tab, { transform: [{ scale }] }]}>
                <TouchableOpacity
                  onPress={onPress}
                  style={s.tabInner}
                  activeOpacity={0.72}
                  accessibilityRole="button"
                  accessibilityLabel={tab.label}
                  accessibilityState={{ selected: isFocused }}
                >
                  <View style={[s.iconWrap, isFocused && s.iconWrapActive]}>
                    {tab.icon ? (
                      <tab.icon
                        color={isFocused ? INK : '#7C8491'}
                        size={20}
                        strokeWidth={isFocused ? 2.8 : 2.15}
                      />
                    ) : null}
                  </View>
                  <Text style={[s.tabLabel, isFocused && s.tabLabelActive]}>{tab.label}</Text>
                </TouchableOpacity>
              </Animated.View>
            );
          })}
        </View>
      </View>
    </>
  );
}

function readLevelFromProgress(progress: unknown): number | null {
  const row = Array.isArray(progress) ? progress[0] : progress;
  if (!row || typeof row !== 'object') return null;
  const value = Number((row as { current_level?: unknown; level?: unknown }).current_level ?? (row as { level?: unknown }).level);
  return Number.isFinite(value) && value >= 1 ? value : null;
}

function LevelUpWrapper({ children }: { children: React.ReactNode }) {
  const { user } = useAuthStore();
  const [level, setLevel] = useState(1);
  const [showLevelUp, setShowLevelUp] = useState(false);
  const lastLevelRef = React.useRef<number | null>(null);

  const applyXp = React.useCallback(async (rawXp: unknown, announceIncrease: boolean) => {
    const xp = Number(rawXp ?? 0);
    if (!Number.isFinite(xp) || xp < 0) return;

    const { data, error } = await profilesService.getLevelProgress(xp);
    if (error || !data) return;

    const nextLevel = readLevelFromProgress(data);
    if (nextLevel === null) return;

    const previousLevel = lastLevelRef.current;
    setLevel(nextLevel);
    if (announceIncrease && previousLevel !== null && nextLevel > previousLevel) setShowLevelUp(true);
    lastLevelRef.current = nextLevel;
  }, []);

  useEffect(() => {
    let active = true;

    if (!user?.id) {
      lastLevelRef.current = null;
      setLevel(1);
      setShowLevelUp(false);
      return () => {
        active = false;
      };
    }

    const loadInitialLevel = async () => {
      const { data, error } = await profilesService.getById(user.id);
      if (!active || error || !data) return;
      await applyXp(data.xp, false);
    };

    void loadInitialLevel();

    const channel = supabase
      .channel(`profile-progression-${user.id}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `id=eq.${user.id}` },
        payload => {
          if (!active) return;
          void applyXp((payload.new as { xp?: unknown })?.xp, true);
        }
      )
      .subscribe();

    return () => {
      active = false;
      void supabase.removeChannel(channel);
    };
  }, [user?.id, applyXp]);

  return (
    <>
      <LevelUpModal visible={showLevelUp} level={level} onClose={() => setShowLevelUp(false)} />
      {children}
    </>
  );
}

export default function TabsLayout() {
  return (
    <LevelUpWrapper>
      <Tabs tabBar={props => <SkateQuestTabBar {...props} />} screenOptions={{ headerShown: false }}>
        <Tabs.Screen name="index" options={{ title: 'Home' }} />
        <Tabs.Screen name="map" options={{ title: 'Map' }} />
        <Tabs.Screen name="quests" options={{ title: 'Quests' }} />
        <Tabs.Screen name="crew" options={{ title: 'Crew' }} />
        <Tabs.Screen name="profile" options={{ title: 'Profile' }} />
      </Tabs>
    </LevelUpWrapper>
  );
}

const s = StyleSheet.create({
  shell: { backgroundColor: INK, paddingHorizontal: 9, paddingTop: 7 },
  rail: {
    minHeight: 68,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    backgroundColor: '#101319',
    borderRadius: 23,
    borderWidth: 1,
    borderColor: '#2B3039',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.34,
    shadowRadius: 16,
    elevation: 18,
  },
  tab: { flex: 1 },
  tabInner: { alignItems: 'center', justifyContent: 'center', minHeight: 58, gap: 3 },
  iconWrap: { width: 35, height: 31, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  iconWrapActive: { backgroundColor: PAPER, transform: [{ rotate: '-3deg' }] },
  tabLabel: { fontSize: 8, color: '#606875', fontWeight: '900', letterSpacing: 0.8 },
  tabLabelActive: { color: PAPER },
  postWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', marginTop: -23 },
  postBtn: {
    width: 57,
    height: 57,
    borderRadius: 17,
    backgroundColor: ACID,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: INK,
    shadowColor: ACID,
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 13,
  },
  postPlus: { color: INK, fontSize: 34, fontWeight: '400', lineHeight: 37, marginTop: -3 },
  postCaption: { color: ACID, fontSize: 7, fontWeight: '900', letterSpacing: 1.2, marginTop: 2 },
  overlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 100, backgroundColor: 'rgba(3,4,6,0.54)' },
  postMenu: { position: 'absolute', right: 12, left: 12, gap: 8, alignItems: 'stretch' },
  postMenuKicker: { color: PAPER, fontSize: 10, fontWeight: '900', letterSpacing: 2, textAlign: 'right', marginBottom: 2, marginRight: 6 },
  postAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    minHeight: 58,
    backgroundColor: '#11151B',
    borderRadius: 17,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: '#303641',
    borderLeftWidth: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  postActionIcon: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '-3deg' }] },
  postActionLabel: { flex: 1, color: PAPER, fontSize: 13, fontWeight: '900', letterSpacing: 0.8 },
  postActionArrow: { fontSize: 22, fontWeight: '900' },
});
