import React from 'react';
import { View, Image, TouchableOpacity, Linking } from 'react-native';
import { sceneService } from '../lib/sceneService';
import { useAuthStore } from '../stores/useAuthStore';

interface Props { skateparkName?: string; }

// Shows the Portal Dimension logo on spots near Newport OR
// Tapping it opens their website and tracks the tap
export default function PortalDimensionLogo({ skateparkName }: Props) {
  const { user } = useAuthStore();

  const handleTap = async () => {
    // Track the tap then open the site
    try {
      const { data } = await import('../lib/supabase').then(m =>
        m.supabase.from('map_sponsors').select('id').eq('name', 'Portal Dimension').single()
      );
      if (data?.id) await sceneService.trackTap(data.id, user?.id ?? null, 'logo_tap');
    } catch {}
    Linking.openURL('https://portaldimension.com');
  };

  return (
    <View className="items-center my-3">
      <TouchableOpacity onPress={handleTap} activeOpacity={0.8}>
        <Image
          source={require('../assets/supporters/portal-dimension.png')}
          style={{ width: 120, height: 60 }}
          resizeMode="contain"
        />
      </TouchableOpacity>
    </View>
  );
}
