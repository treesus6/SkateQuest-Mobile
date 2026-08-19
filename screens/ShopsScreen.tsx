import React from 'react';
import { View, Text, FlatList, TouchableOpacity, Linking } from 'react-native';
import { MapPin, Phone, Globe, Navigation, ShieldCheck, Store, BadgeCheck } from 'lucide-react-native';
import { useSupabaseQuery } from '../hooks/useSupabaseQuery';
import { shopsService } from '../lib/shopsService';
import { Shop } from '../types';

export default function ShopsScreen() {
  const { data: shops, loading, refetch } = useSupabaseQuery<Shop[]>(
    () => shopsService.getAll(),
    [],
    { cacheKey: 'shops-all' }
  );

  const allShops = shops ?? [];
  const verifiedCount = allShops.filter(shop => shop.verified).length;

  const openMaps = (lat: number, lng: number) =>
    Linking.openURL(`https://maps.google.com/?q=${lat},${lng}`);

  const renderShop = ({ item }: { item: Shop }) => (
    <View className="bg-[#10151D] border border-[#252D39] rounded-[20px] p-4 mb-3">
      <View className="flex-row items-start gap-3">
        <View className="w-12 h-12 rounded-2xl bg-[#101B16] items-center justify-center border border-[#20382B]">
          <Store size={22} color="#22C55E" />
        </View>
        <View className="flex-1">
          <View className="flex-row items-start justify-between gap-2">
            <Text className="text-white text-[17px] font-black flex-1">{item.name}</Text>
            {item.verified ? (
              <View className="bg-[#12331F] border border-[#285D39] px-2 py-1 rounded-full flex-row items-center gap-1">
                <ShieldCheck color="#4ADE80" size={11} />
                <Text className="text-[#4ADE80] text-[10px] font-black uppercase">Verified</Text>
              </View>
            ) : null}
          </View>

          <View className="flex-row items-start gap-1.5 mt-2">
            <MapPin color="#697383" size={13} style={{ marginTop: 2 }} />
            <Text className="text-[#9AA3AF] text-sm flex-1">{item.address}</Text>
          </View>

          {item.hours ? <Text className="text-[#626C79] text-xs mt-2">{item.hours}</Text> : null}
        </View>
      </View>

      <View className="flex-row gap-2 mt-4">
        {item.phone ? (
          <TouchableOpacity
            className="flex-1 bg-[#0B1017] border border-[#252D39] rounded-xl py-3 flex-row items-center justify-center gap-2"
            onPress={() => Linking.openURL(`tel:${item.phone}`)}
          >
            <Phone color="#AEB5C0" size={15} />
            <Text className="text-[#D4D8DE] text-xs font-black">Call</Text>
          </TouchableOpacity>
        ) : null}
        {item.website ? (
          <TouchableOpacity
            className="flex-1 bg-[#0B1017] border border-[#252D39] rounded-xl py-3 flex-row items-center justify-center gap-2"
            onPress={() => Linking.openURL(item.website!.startsWith('http') ? item.website! : `https://${item.website}`)}
          >
            <Globe color="#AEB5C0" size={15} />
            <Text className="text-[#D4D8DE] text-xs font-black">Website</Text>
          </TouchableOpacity>
        ) : null}
        <TouchableOpacity
          className="flex-[1.2] bg-[#D2673D] rounded-xl py-3 flex-row items-center justify-center gap-2"
          onPress={() => openMaps(item.latitude, item.longitude)}
        >
          <Navigation color="#fff" size={15} />
          <Text className="text-white text-xs font-black">Directions</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View className="flex-1 bg-[#07090D]">
      <View className="px-5 pt-12 pb-5">
        <Text className="text-[#22C55E] text-[11px] font-black tracking-[2px]">SUPPORT THE SCENE</Text>
        <Text className="text-white text-[30px] font-black mt-1">Skate Shops</Text>
        <Text className="text-[#7B8493] text-sm mt-1">Local shops, gear, parts and places that keep skating moving.</Text>

        <View className="flex-row gap-2 mt-4">
          <View className="flex-1 bg-[#10151D] border border-[#252D39] rounded-2xl p-3">
            <Store size={16} color="#22C55E" />
            <Text className="text-white text-xl font-black mt-1">{allShops.length}</Text>
            <Text className="text-[#697383] text-[11px]">shops listed</Text>
          </View>
          <View className="flex-1 bg-[#10151D] border border-[#252D39] rounded-2xl p-3">
            <BadgeCheck size={16} color="#4ADE80" />
            <Text className="text-white text-xl font-black mt-1">{verifiedCount}</Text>
            <Text className="text-[#697383] text-[11px]">verified</Text>
          </View>
        </View>
      </View>

      <FlatList
        data={allShops}
        renderItem={renderShop}
        keyExtractor={item => item.id}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 32 }}
        refreshing={loading}
        onRefresh={refetch}
        ListEmptyComponent={
          <View className="items-center mt-20 px-8">
            <View className="w-16 h-16 rounded-2xl bg-[#10151D] items-center justify-center border border-[#252D39]">
              <Store size={28} color="#596271" />
            </View>
            <Text className="text-white text-lg font-black mt-4">No shops found</Text>
            <Text className="text-[#697383] text-sm text-center mt-2">Shops will show here as they are added to SkateQuest.</Text>
          </View>
        }
      />
    </View>
  );
}
