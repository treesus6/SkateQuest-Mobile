import React, { useEffect, useState } from 'react';
import { Tabs, useRouter } from 'expo-router';
import { TouchableOpacity, View, Text, Animated, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useChallenges } from '../../contexts/ChallengeContext';
import LevelUpModal from '../../components/LevelUpModal';
import { Home, Map as MapIcon, Zap, Users, UserRound, Video, MapPin, Bot, Footprints } from 'lucide-react-native';

// ─── Custom Tab Bar ───────────────────────────────────────────────────────────
// Rebuilt for Expo Router's tab bar props shape
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

  const handlePostPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    bounce(postScale);
    Animated.timing(postRotate, {
      toValue: postOpen ? 0 : 1,
      duration: 200,
      useNativeDriver: true,
    }).start();
    setPostOpen(o => !o);
  };

  const spin = postRotate.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '45deg'],
  });

  const TAB_CONFIG = [
    { icon: Home, label: 'Home', name: 'index' },
    { icon: MapIcon, label: 'Map', name: 'map' },
    { icon: null, label: '', name: 'POST', isPost: true },
    { icon: Zap, label: 'Quests', name: 'quests' },
    { icon: Users, label: 'Crew', name: 'crew' },
    { icon: UserRound, label: 'Me', name: 'profile' },
  ];

  const POST_ACTIONS = [
    { icon: Video, label: 'Post Clip', screen: '/(screens)/upload-media', color: '#d2673d' },
    { icon: MapPin, label: 'Check In', screen: '/(screens)/live-check-in', color: '#4ade80' },
    { icon: Footprints, label: 'Log Trick', screen: '/(screens)/trick-tracker', color: '#a855f7' },
    { icon: Bot, label: 'AI Coach', screen: '/(screens)/ai-coach', color: '#3b82f6' },
  ];

  return (
    <>
      {postOpen && (
        <TouchableOpacity
          style={s.overlay}
          activeOpacity={1}
          onPress={() => {
            setPostOpen(false);
            Animated.timing(postRotate, {
              toValue: 0,
              duration: 200,
              useNativeDriver: true,
            }).start();
          }}
          accessibilityRole="button"
          accessibilityLabel="Close post menu"
        >
          <View style={[s.postMenu, { bottom: 80 + insets.bottom }]}>
            {POST_ACTIONS.map((action, i) => (
              <Animated.View
                key={action.screen}
                style={{ transform: [{ scale: scaleRefs[i] || postScale }] }}
              >
                <TouchableOpacity
                  style={[s.postAction, { borderColor: action.color + '60' }]}
                  onPress={() => {
                    setPostOpen(false);
                    Animated.timing(postRotate, {
                      toValue: 0,
                      duration: 200,
                      useNativeDriver: true,
                    }).start();
                    router.push(action.screen as any);
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={action.label}
                >
                  <action.icon color={action.color} size={20} />
                  <Text style={[s.postActionLabel, { color: action.color }]}>{action.label}</Text>
                </TouchableOpacity>
              </Animated.View>
            ))}
          </View>
        </TouchableOpacity>
      )}

      <View style={[s.container, { paddingBottom: Math.max(insets.bottom - 4, 4) }]}>
        <View style={s.border} />
        <View style={s.row}>
          {TAB_CONFIG.map(tab => {
            if (tab.isPost) {
              return (
                <View key="post" style={s.postWrap}>
                  <Animated.View style={{ transform: [{ scale: postScale }] }}>
                    <TouchableOpacity
                      onPress={handlePostPress}
                      style={s.postBtn}
                      activeOpacity={0.9}
                      accessibilityRole="button"
                      accessibilityLabel={postOpen ? 'Close post menu' : 'Open post menu'}
                      accessibilityState={{ expanded: postOpen }}
                    >
                      <Animated.Text style={[s.postPlus, { transform: [{ rotate: spin }] }]}>+</Animated.Text>
                    </TouchableOpacity>
                  </Animated.View>
                </View>
              );
            }

            const routeIdx = state.routes.findIndex((r: any) => r.name === tab.name);
            if (routeIdx < 0 || !scaleRefs[routeIdx]) return null;

            const scale = scaleRefs[routeIdx];
            const isFocused = state.index === routeIdx;

            const onPress = () => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              bounce(scale);
              const event = navigation.emit({
                type: 'tabPress',
                target: state.routes[routeIdx]?.key,
                canPreventDefault: true,
              });
              if (!isFocused && !event.defaultPrevented) {
                navigation.navigate(tab.name);
              }
            };

            return (
              <Animated.View key={tab.name} style={[s.tab, { transform: [{ scale }] }]}>
                <TouchableOpacity
                  onPress={onPress}
                  style={s.tabInner}
                  activeOpacity={0.7}
                  accessibilityRole="button"
                  accessibilityLabel={tab.label}
                  accessibilityState={{ selected: isFocused }}
                >
                  <View style={[s.iconWrap, isFocused && s.iconWrapActive]}>
                    {tab.icon ? <tab.icon color={isFocused ? '#D2673D' : '#6B7280'} size={21} strokeWidth={isFocused ? 2.5 : 2} /> : null}
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

// ─── Level Up Wrapper ─────────────────────────────────────────────────────────
function LevelUpWrapper({ children }: { children: React.ReactNode }) {
  const { level } = useChallenges();
  const [lastLevel, setLastLevel] = useState(level);
  const [showLevelUp, setShowLevelUp] = useState(false);

  useEffect(() => {
    if (level > lastLevel) {
      setShowLevelUp(true);
      setLastLevel(level);
    }
  }, [level, lastLevel]);

  return (
    <>
      <LevelUpModal visible={showLevelUp} level={level} onClose={() => setShowLevelUp(false)} />
      {children}
    </>
  );
}

// ─── Tab Layout ───────────────────────────────────────────────────────────────
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
  container: {
    backgroundColor: '#080B14',
    borderTopWidth: 0,
    paddingTop: 8,
    position: 'relative',
  },
  border: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: 'transparent',
    borderTopWidth: 1,
    borderColor: 'rgba(210,103,61,0.15)',
  },
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8 },
  tab: { flex: 1 },
  tabInner: { alignItems: 'center', paddingVertical: 4, gap: 3 },
  iconWrap: {
    width: 36,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 10,
  },
  iconWrapActive: { backgroundColor: 'rgba(210,103,61,0.15)' },
  tabLabel: { fontSize: 10, color: '#4B5563', fontWeight: '600', letterSpacing: 0.3 },
  tabLabelActive: { color: '#d2673d' },
  postWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', marginTop: -22 },
  postBtn: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: '#d2673d',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#d2673d',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 12,
    borderWidth: 3,
    borderColor: '#080B14',
  },
  postPlus: { color: 'white', fontSize: 32, fontWeight: '200', marginTop: -2, lineHeight: 36 },
  overlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 100 },
  postMenu: {
    position: 'absolute',
    right: 16,
    flexDirection: 'column',
    gap: 10,
    alignItems: 'flex-end',
  },
  postAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#111827',
    borderRadius: 28,
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  postActionLabel: { fontSize: 14, fontWeight: '700', letterSpacing: 0.5 },
});
