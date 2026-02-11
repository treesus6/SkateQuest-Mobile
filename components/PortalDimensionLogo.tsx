import React from 'react';
import { View, Image, TouchableOpacity, Linking, Text } from 'react-native';
import { Heart } from 'lucide-react-native';
import Card from './ui/Card';

const PORTAL_DIMENSION = {
  name: 'Portal Dimension',
  logo: require('../assets/supporters/portal-dimension.png'),
  url: 'https://portaldimension.com',
  instagram: '@portaldimension',
  location: 'Newport, OR',
  founder: 'Kevin Kowalski',
  founded: '2021',
  showNearPark: 'Newport',
};

interface PortalDimensionLogoProps {
  skateparkName?: string;
}

export const PortalDimensionLogo: React.FC<PortalDimensionLogoProps> = ({ skateparkName }) => {
  const parkName = skateparkName?.toLowerCase() || '';
  if (!parkName.includes('newport')) return null;

  const handlePress = async () => {
    try {
      const canOpen = await Linking.canOpenURL(PORTAL_DIMENSION.url);
      if (canOpen) await Linking.openURL(PORTAL_DIMENSION.url);
    } catch (error) {
      console.error('Error opening Portal Dimension link:', error);
    }
  };

  return (
    <Card className="mx-4 items-center">
      <View className="flex-row items-center gap-2 mb-2.5">
        <Heart color="#d2673d" size={16} />
        <Text className="text-sm font-bold text-gray-800 dark:text-gray-100 tracking-wide">Community Love</Text>
      </View>
      <TouchableOpacity onPress={handlePress} activeOpacity={0.7} className="p-2.5">
        <Image source={PORTAL_DIMENSION.logo} style={{ width: 150, height: 80 }} resizeMode="contain" />
      </TouchableOpacity>
      <Text className="text-xs text-gray-500 dark:text-gray-400 mt-1">{PORTAL_DIMENSION.location}</Text>
      <Text className="text-[11px] text-gray-400 dark:text-gray-500 italic mt-0.5 text-center px-2.5">
        Helping each other for the love of skateboarding
      </Text>
    </Card>
  );
};

export default PortalDimensionLogo;
