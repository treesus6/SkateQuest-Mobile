import React from 'react';
import { View, Text, FlatList, TouchableOpacity, Linking } from 'react-native';
import { MapPin, Phone, Globe, Navigation, ShieldCheck } from 'lucide-react-native';
import { useSupabaseQuery } from '../hooks/useSupabaseQuery';
import { shopsService } from '../lib/shopsService';
import { Shop } from '../types';
import Card from '../components/ui/Card';

export default function ShopsScreen() {
  const { data: shops, loading, refetch } = useSupabaseQuery<Shop[]>(
    () => shopsService.getAll(),
    [],
    { cacheKey: 'shops-all' }
  );

  const openMaps = (lat: number, lng: number) =>
    Linking.openURL(`https://maps.google.com/?q=${lat},${lng}`);

  const renderShop = ({ item }: { item: Shop }) => (
    <Card>
      <View className="flex-row justify-between items-center mb-2">
        <Text className="text-xl font-bold text-gray-800 dark:text-gray-100 flex-1">{item.name}</Text>
        {item.verified && (
          <View className="bg-brand-green px-2.5 py-1 rounded-full flex-row items-center gap-1">
            <ShieldCheck color="#fff" size={12} />
            <Text className="text-white text-xs font-bold">Verified</Text>
          </View>
        )}
      </View>

      <View className="flex-row items-center gap-1.5 mb-1">
        <MapPin color="#888" size={14} />
        <Text className="text-sm text-gray-500 dark:text-gray-400">{item.address}</Text>
      </View>

      {item.hours ? (
        <Text className="text-sm text-gray-400 mb-3">{item.hours}</Text>
      ) : null}

      <View className="flex-row flex-wrap gap-2">
        {item.phone ? (
          <TouchableOpacity
            className="bg-gray-100 dark:bg-gray-700 px-3 py-2 rounded-lg flex-row items-center gap-1.5"
            onPress={() => Linking.openURL(`tel:${item.phone}`)}
          >
            <Phone color="#333" size={14} />
            <Text className="text-sm font-semibold text-gray-700 dark:text-gray-200">Call</Text>
          </TouchableOpacity>
        ) : null}
        {item.website ? (
          <TouchableOpacity
            className="bg-gray-100 dark:bg-gray-700 px-3 py-2 rounded-lg flex-row items-center gap-1.5"
            onPress={() => Linking.openURL(item.website!.startsWith('http') ? item.website! : `https://${item.website}`)}
          >
            <Globe color="#333" size={14} />
            <Text className="text-sm font-semibold text-gray-700 dark:text-gray-200">Website</Text>
          </TouchableOpacity>
        ) : null}
        <TouchableOpacity
          className="bg-brand-terracotta px-3 py-2 rounded-lg flex-row items-center gap-1.5"
          onPress={() => openMaps(item.latitude, item.longitude)}
        >
          <Navigation color="#fff" size={14} />
          <Text className="text-sm font-bold text-white">Directions</Text>
        </TouchableOpacity>
      </View>
    </Card>
  );

  return (
    <View className="flex-1 bg-brand-beige dark:bg-gray-900">
      <View className="bg-brand-green p-5 rounded-b-2xl">
        <Text className="text-2xl font-bold text-white text-center">Skate Shops</Text>
        <Text className="text-sm text-white/90 text-center mt-1">{(shops ?? []).length} shops found</Text>
      </View>

      <FlatList
        data={shops ?? []}
        renderItem={renderShop}
        keyExtractor={item => item.id}
        contentContainerStyle={{ padding: 16 }}
        refreshing={loading}
        onRefresh={refetch}
        ListEmptyComponent={
          <View className="items-center mt-24">
            <Text className="text-lg font-bold text-gray-400">No shops found</Text>
            <Text className="text-sm text-gray-300 mt-1">Check back later!</Text>
          </View>
        }
      />
    </View>
  );
}
