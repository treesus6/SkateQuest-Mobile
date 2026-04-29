import React from 'react';
import { View, Text, TouchableOpacity, Image } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { sponsorsService } from '../lib/sponsorsService';
import { useAuthStore } from '../stores/useAuthStore';

// Portal Dimension is the first community partner — shows on Newport Skatepark detail
// Tap to go to the full community map listing
const PORTAL_DIMENSION_ID = ''; // filled at runtime from DB, or hardcode after first load

export default function PortalDimensionLogo({ skateparkName }: { skateparkName?: string }) {
  const navigation = useNavigation<any>();
  const { user } = useAuthStore();

  // Only show on Newport Skatepark
  const isNewport = skateparkName?.toLowerCase().includes('newport');
  if (!isNewport) return null;

  const handleTap = async () => {
    // Track the tap
    try {
      const all = await sponsorsService.getAll();
      const pd = all.find(s => s.name === 'Portal Dimension');
      if (pd) await sponsorsService.trackClick(pd.id, user?.id ?? null, 'spot_detail_logo');
    } catch {}
    navigation.navigate('Community');
  };

  return (
    <TouchableOpacity
      onPress={handleTap}
      className="mx-4 mb-4 bg-gray-900 rounded-2xl p-4 flex-row items-center gap-3"
      activeOpacity={0.8}
    >
      <Image
        source={require('../assets/supporters/portal-dimension.png')}
        className="w-12 h-12 rounded-xl"
        resizeMode="contain"
      />
      <View className="flex-1">
        <Text className="text-white font-black text-base">Portal Dimension</Text>
        <Text className="text-gray-400 text-xs mt-0.5">Newport's underground skate brand</Text>
        <Text className="text-brand-terracotta text-xs font-semibold mt-1">Community Partner · Tap to visit →</Text>
      </View>
    </TouchableOpacity>
  );
}
