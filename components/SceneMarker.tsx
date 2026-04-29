import React, { useCallback } from 'react';
import { View, Text, TouchableOpacity, Image, Linking, Alert } from 'react-native';
import { ExternalLink, Instagram, Globe } from 'lucide-react-native';
import {
  MapSponsor,
  CATEGORY_LABELS,
  CATEGORY_EMOJI,
  sceneService,
} from '../lib/sceneService';
import { useAuthStore } from '../stores/useAuthStore';

interface Props {
  entry: MapSponsor;
  onClose?: () => void;
}

export default function SceneMarker({ entry, onClose }: Props) {
  const { user } = useAuthStore();
  const emoji = CATEGORY_EMOJI[entry.category] || '🤙';
  const label = CATEGORY_LABELS[entry.category] || 'Community';

  const handleWebsite = useCallback(async () => {
    if (!entry.website_url) return;
    await sceneService.trackTap(entry.id, user?.id ?? null, 'website_tap');
    try { await Linking.openURL(entry.website_url); }
    catch { Alert.alert('Could not open link'); }
  }, [entry, user]);

  const handleInstagram = useCallback(async () => {
    if (!entry.instagram_url) return;
    await sceneService.trackTap(entry.id, user?.id ?? null, 'instagram_tap');
    try { await Linking.openURL(entry.instagram_url); }
    catch { Alert.alert('Could not open link'); }
  }, [entry, user]);

  return (
    <View className="bg-white dark:bg-gray-800 rounded-2xl overflow-hidden shadow-xl mx-4" style={{ maxWidth: 320 }}>
      {/* Header */}
      <View className="bg-brand-terracotta px-4 py-2 flex-row items-center justify-between">
        <View className="flex-row items-center gap-2">
          <Text className="text-white text-base">{emoji}</Text>
          <Text className="text-white text-xs font-semibold uppercase tracking-wider">{label}</Text>
        </View>
        {entry.featured && (
          <View className="bg-white/20 rounded-full px-2 py-0.5">
            <Text className="text-white text-xs font-bold">Local Scene</Text>
          </View>
        )}
      </View>

      <View className="p-4">
        {/* Logo + name */}
        <View className="flex-row items-center gap-3 mb-3">
          {entry.logo_url ? (
            <Image
              source={{ uri: entry.logo_url }}
              className="w-16 h-16 rounded-xl"
              resizeMode="contain"
            />
          ) : (
            <View className="w-16 h-16 rounded-xl bg-brand-terracotta/20 items-center justify-center">
              <Text className="text-3xl">{emoji}</Text>
            </View>
          )}
          <View className="flex-1">
            <Text className="text-lg font-black text-gray-900 dark:text-gray-100">{entry.name}</Text>
            {entry.tagline ? (
              <Text className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{entry.tagline}</Text>
            ) : null}
            {(entry.city || entry.state) ? (
              <Text className="text-xs text-gray-400 mt-1">
                📍 {[entry.city, entry.state].filter(Boolean).join(', ')}
              </Text>
            ) : null}
          </View>
        </View>

        {entry.description ? (
          <Text className="text-sm text-gray-600 dark:text-gray-300 mb-4 leading-5">
            {entry.description}
          </Text>
        ) : null}

        {/* Buttons */}
        <View className="gap-2">
          {entry.website_url ? (
            <TouchableOpacity
              onPress={handleWebsite}
              className="bg-brand-terracotta rounded-xl py-3 flex-row items-center justify-center gap-2"
              activeOpacity={0.8}
            >
              <Globe size={16} color="white" />
              <Text className="text-white font-bold text-sm">Visit Website</Text>
              <ExternalLink size={12} color="rgba(255,255,255,0.7)" />
            </TouchableOpacity>
          ) : null}
          {entry.instagram_url ? (
            <TouchableOpacity
              onPress={handleInstagram}
              className="bg-gray-100 dark:bg-gray-700 rounded-xl py-2.5 flex-row items-center justify-center gap-2"
              activeOpacity={0.8}
            >
              <Instagram size={16} color="#E1306C" />
              <Text className="text-gray-700 dark:text-gray-200 font-semibold text-sm">Instagram</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        <Text className="text-xs text-gray-400 text-center mt-3">
          🤙 Part of the local skate scene
        </Text>
      </View>
    </View>
  );
}
