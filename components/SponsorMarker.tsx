import React, { useCallback } from 'react';
import { View, Text, TouchableOpacity, Image, Linking, Alert } from 'react-native';
import { ExternalLink, Instagram, Globe } from 'lucide-react-native';
import {
  MapSponsor,
  SPONSOR_CATEGORY_LABELS,
  SPONSOR_CATEGORY_EMOJI,
  sponsorsService,
} from '../lib/sponsorsService';
import { useAuthStore } from '../stores/useAuthStore';

interface Props {
  sponsor: MapSponsor;
  onClose?: () => void;
}

export default function SponsorMarker({ sponsor, onClose }: Props) {
  const { user } = useAuthStore();
  const emoji = SPONSOR_CATEGORY_EMOJI[sponsor.category] || '🤙';
  const label = SPONSOR_CATEGORY_LABELS[sponsor.category] || 'Community';

  const handleWebsite = useCallback(async () => {
    if (!sponsor.website_url) return;
    await sponsorsService.trackClick(sponsor.id, user?.id ?? null, 'website_tap');
    try {
      await Linking.openURL(sponsor.website_url);
    } catch {
      Alert.alert('Could not open', sponsor.website_url ?? '');
    }
  }, [sponsor, user]);

  const handleInstagram = useCallback(async () => {
    if (!sponsor.instagram_url) return;
    await sponsorsService.trackClick(sponsor.id, user?.id ?? null, 'instagram_tap');
    try {
      await Linking.openURL(sponsor.instagram_url);
    } catch {
      Alert.alert('Could not open', sponsor.instagram_url ?? '');
    }
  }, [sponsor, user]);

  return (
    <View className="bg-white dark:bg-gray-800 rounded-2xl overflow-hidden shadow-xl mx-4" style={{ maxWidth: 320 }}>
      {/* Header bar */}
      <View className="bg-brand-terracotta px-4 py-2 flex-row items-center justify-between">
        <View className="flex-row items-center gap-2">
          <Text className="text-white text-base">{emoji}</Text>
          <Text className="text-white text-xs font-semibold uppercase tracking-wider">{label}</Text>
        </View>
        {sponsor.featured && (
          <View className="bg-white/20 rounded-full px-2 py-0.5">
            <Text className="text-white text-xs font-bold">Community Partner</Text>
          </View>
        )}
      </View>

      <View className="p-4">
        {/* Logo + name */}
        <View className="flex-row items-center gap-3 mb-3">
          {sponsor.logo_url ? (
            <Image
              source={{ uri: sponsor.logo_url }}
              className="w-16 h-16 rounded-xl"
              resizeMode="contain"
            />
          ) : (
            <View className="w-16 h-16 rounded-xl bg-brand-terracotta/20 items-center justify-center">
              <Text className="text-3xl">{emoji}</Text>
            </View>
          )}
          <View className="flex-1">
            <Text className="text-lg font-black text-gray-900 dark:text-gray-100">{sponsor.name}</Text>
            {sponsor.tagline ? (
              <Text className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{sponsor.tagline}</Text>
            ) : null}
            {(sponsor.city || sponsor.state) ? (
              <Text className="text-xs text-gray-400 mt-1">
                📍 {[sponsor.city, sponsor.state].filter(Boolean).join(', ')}
              </Text>
            ) : null}
          </View>
        </View>

        {/* Description */}
        {sponsor.description ? (
          <Text className="text-sm text-gray-600 dark:text-gray-300 mb-4 leading-5">
            {sponsor.description}
          </Text>
        ) : null}

        {/* Action buttons */}
        <View className="gap-2">
          {sponsor.website_url ? (
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

          {sponsor.instagram_url ? (
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

        {/* Support message */}
        <Text className="text-xs text-gray-400 text-center mt-3">
          🤙 Supporting the local skate community
        </Text>
      </View>
    </View>
  );
}
