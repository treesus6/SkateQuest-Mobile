import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, Linking } from 'react-native';
import { Shop } from '../types';
import { getShops } from '../services/shops';

export default function ShopsScreen() {
  const [shops, setShops] = useState<Shop[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadShops();
  }, []);

  const loadShops = async () => {
    try {
      const data = await getShops();
      setShops(data);
    } catch (error) {
      console.error('Error loading shops:', error);
    } finally {
      setLoading(false);
    }
  };

  const openPhone = (phone: string) => {
    Linking.openURL(`tel:${phone}`);
  };

  const openWebsite = (url: string) => {
    if (!url.startsWith('http')) {
      url = 'https://' + url;
    }
    Linking.openURL(url);
  };

  const openMaps = (lat: number, lng: number, _name: string) => {
    const url = `https://maps.google.com/?q=${lat},${lng}`;
    Linking.openURL(url);
  };

  const renderShop = ({ item }: { item: Shop }) => (
    <View className="bg-white rounded-xl p-[15px] mb-[15px] shadow-sm">
      <View className="flex-row justify-between items-center mb-[10px]">
        <Text className="text-[20px] font-bold text-[#333] flex-1">
          {item.verified && '✓ '}
          {item.name}
        </Text>
        {item.verified && (
          <View className="bg-[#4CAF50] px-[10px] py-1 rounded-xl">
            <Text className="text-white text-xs font-bold">Verified</Text>
          </View>
        )}
      </View>

      <Text className="text-[15px] text-[#666] mb-[5px]">📍 {item.address}</Text>

      {item.hours && <Text className="text-sm text-[#888] mb-[15px]">🕒 {item.hours}</Text>}

      <View className="flex-row flex-wrap gap-2">
        {item.phone && (
          <TouchableOpacity
            className="bg-[#f0f0f0] px-[15px] py-[10px] rounded-lg mr-2 mb-2"
            onPress={() => openPhone(item.phone!)}
          >
            <Text className="text-sm font-semibold text-[#333]">📞 Call</Text>
          </TouchableOpacity>
        )}

        {item.website && (
          <TouchableOpacity
            className="bg-[#f0f0f0] px-[15px] py-[10px] rounded-lg mr-2 mb-2"
            onPress={() => openWebsite(item.website!)}
          >
            <Text className="text-sm font-semibold text-[#333]">🌐 Website</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          className="bg-brand-orange px-[15px] py-[10px] rounded-lg mr-2 mb-2"
          onPress={() => openMaps(item.latitude, item.longitude, item.name)}
        >
          <Text className="text-sm font-semibold text-white">📍 Directions</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View className="flex-1 bg-[#f5f0ea]">
      <View className="bg-[#4CAF50] p-5 rounded-bl-[20px] rounded-br-[20px]">
        <Text className="text-[28px] font-bold text-white text-center">🛒 Skate Shops</Text>
        <Text className="text-sm text-white opacity-90 text-center mt-[5px]">
          {shops.length} shops found
        </Text>
      </View>

      <FlatList
        data={shops}
        renderItem={renderShop}
        keyExtractor={(item: Shop) => item.id}
        contentContainerStyle={{ padding: 15 }}
        refreshing={loading}
        onRefresh={loadShops}
        ListEmptyComponent={
          <View className="items-center mt-[100px]">
            <Text className="text-lg font-bold text-[#999]">No shops found</Text>
            <Text className="text-sm text-[#aaa] mt-[5px]">Check back later!</Text>
          </View>
        }
      />
    </View>
  );
}
