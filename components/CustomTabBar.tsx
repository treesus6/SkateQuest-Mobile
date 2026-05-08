import React, { useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  Animated, Dimensions, Platform, Modal
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

const { width } = Dimensions.get('window');

export default function CustomTabBar({ state, descriptors, navigation }: any) {
  const insets = useSafeAreaInsets();
  const scaleRefs = useRef(state.routes.map(() => new Animated.Value(1))).current;
  const postScale = useRef(new Animated.Value(1)).current;
  const postRotate = useRef(new Animated.Value(0)).current;
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
    { icon: '🏠', label: 'Home',    name: 'HomeTab' },
    { icon: '🗺',  label: 'Map',     name: 'SpotsTab' },
    { icon: null,  label: '',        name: 'POST', isPost: true },
    { icon: '⚡',  label: 'Quests',  name: 'ChallengesTab' },
    { icon: '👤',  label: 'Me',      name: 'ProfileTab' },
  ];

  const POST_ACTIONS = [
    { icon: '🎥', label: 'Post Clip',     screen: 'SkateTV',     color: '#d2673d' },
    { icon: '📍', label: 'Check In',      screen: 'LiveCheckIn', color: '#4ade80' },
    { icon: '🛹', label: 'Log Trick',     screen: 'AiCoach',     color: '#a855f7' },
  ];

  return (
    <>
      {/* Post menu overlay */}
      {postOpen && (
        <TouchableOpacity
          style={s.overlay}
          activeOpacity={1}
          onPress={() => { setPostOpen(false); Animated.timing(postRotate, { toValue: 0, duration: 200, useNativeDriver: true }).start(); }}
        >
          <View style={[s.postMenu, { bottom: 80 + insets.bottom }]}>
            {POST_ACTIONS.map((action, i) => (
              <Animated.View
                key={i}
                style={{
                  transform: [{ scale: scaleRefs[i] || new Animated.Value(1) }],
                  opacity: postOpen ? 1 : 0,
                }}
              >
                <TouchableOpacity
                  style={[s.postAction, { borderColor: action.color + '60' }]}
                  onPress={() => {
                    setPostOpen(false);
                    Animated.timing(postRotate, { toValue: 0, duration: 200, useNativeDriver: true }).start();
                    navigation.navigate(action.screen);
                  }}
                >
                  <Text style={s.postActionIcon}>{action.icon}</Text>
                  <Text style={[s.postActionLabel, { color: action.color }]}>{action.label}</Text>
                </TouchableOpacity>
              </Animated.View>
            ))}
          </View>
        </TouchableOpacity>
      )}

      {/* Tab Bar */}
      <View style={[s.container, { paddingBottom: Math.max(insets.bottom - 4, 4) }]}>
        {/* Blur effect border */}
        <View style={s.border} />

        <View style={s.row}>
          {TAB_CONFIG.map((tab, i) => {
            if (tab.isPost) {
              return (
                <View key="post" style={s.postWrap}>
                  <Animated.View style={{ transform: [{ scale: postScale }] }}>
                    <TouchableOpacity
                      onPress={handlePostPress}
                      style={s.postBtn}
                      activeOpacity={0.9}
                    >
                      <Animated.Text style={[s.postPlus, { transform: [{ rotate: spin }] }]}>+</Animated.Text>
                    </TouchableOpacity>
                  </Animated.View>
                </View>
              );
            }

            const routeIdx = state.routes.findIndex((r: any) => r.name === tab.name);
            const isFocused = state.index === routeIdx;

            const onPress = () => {
              if (routeIdx < 0) return;
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              bounce(scaleRefs[i]);
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
              <Animated.View
                key={tab.name}
                style={[s.tab, { transform: [{ scale: scaleRefs[i] }] }]}
              >
                <TouchableOpacity
                  onPress={onPress}
                  style={s.tabInner}
                  activeOpacity={0.7}
                >
                  <View style={[s.iconWrap, isFocused && s.iconWrapActive]}>
                    <Text style={[s.tabIcon, isFocused && s.tabIconActive]}>{tab.icon}</Text>
                  </View>
                  <Text style={[s.tabLabel, isFocused && s.tabLabelActive]}>
                    {tab.label}
                  </Text>
                </TouchableOpacity>
              </Animated.View>
            );
          })}
        </View>
      </View>
    </>
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
    top: 0, left: 0, right: 0,
    height: 1,
    backgroundColor: 'transparent',
    borderTopWidth: 1,
    borderColor: 'rgba(210,103,61,0.15)',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  tab: {
    flex: 1,
  },
  tabInner: {
    alignItems: 'center',
    paddingVertical: 4,
    gap: 3,
  },
  iconWrap: {
    width: 36,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 10,
  },
  iconWrapActive: {
    backgroundColor: 'rgba(210,103,61,0.15)',
  },
  tabIcon: {
    fontSize: 20,
    opacity: 0.5,
  },
  tabIconActive: {
    opacity: 1,
  },
  tabLabel: {
    fontSize: 10,
    color: '#4B5563',
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  tabLabelActive: {
    color: '#d2673d',
  },

  // Center POST button
  postWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -22,
  },
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
  postPlus: {
    color: 'white',
    fontSize: 32,
    fontWeight: '200',
    marginTop: -2,
    lineHeight: 36,
  },

  // Post menu
  overlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    zIndex: 100,
  },
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
  postActionIcon: {
    fontSize: 20,
  },
  postActionLabel: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});
