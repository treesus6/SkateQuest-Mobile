import React from 'react';
import { View, Text } from 'react-native';
import { useNetworkStore } from '../stores/useNetworkStore';

const OfflineIndicator: React.FC = () => {
  const isConnected = useNetworkStore(s => s.isConnected);

  if (isConnected) {
    return null;
  }

  return (
    <View className="bg-red-400 py-2 px-4 items-center">
      <Text className="text-white text-sm font-bold">No Internet Connection</Text>
      <Text className="text-white text-xs mt-0.5">Some features may be limited</Text>
    </View>
  );
};

export default OfflineIndicator;
