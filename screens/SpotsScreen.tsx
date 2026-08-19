import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, FlatList, RefreshControl, TextInput, TouchableOpacity,
} from 'react-native';
import { MapPin, Search, Navigation, Layers3, ChevronRight } from 'lucide-react-native';
import { useNavigation } from '../lib/useNavigation';
import { spotsService } from '../lib/spotsService';
import { SkateSpot } from '../types';
import LoadingSkeleton from '../components/ui/LoadingSkeleton';

const DIFFICULTY_COLORS: Record<string, string> = {
  Beginner: '#22C55E', Intermediate: '#F59E0B', Advanced: '#EF4444',
};

export default function SpotsScreen() {
  const navigation = useNavigation<any>();
  const [spots, setSpots] = useState<SkateSpot[]>([]);
  const [filtered, setFiltered] = useState<SkateSpot[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [query, setQuery] = useState('');

  const loadSpots = useCallback(async () => {
    try {
      const { data, error } = await spotsService.getAll();
      if (!error && data) {
        setSpots(data as SkateSpot[]);
        setFiltered(data as SkateSpot[]);
      }
    } catch {} finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { loadSpots(); }, [loadSpots]);

  useEffect(() => {
    const q = query.toLowerCase().trim();
    if (!q) { setFiltered(spots); return; }
    setFiltered(spots.filter(s => s.name.toLowerCase().includes(q)));
  }, [query, spots]);

  const renderItem = ({ item }: { item: SkateSpot }) => {
    const color = DIFFICULTY_COLORS[item.difficulty || 'Beginner'] || '#8B95A5';
    return (
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={() => navigation.navigate('SpotDetail', { spotId: item.id })}
        className="bg-[#10151D] border border-[#252D39] rounded-[20px] p-4 mb-3"
      >
        <View className="flex-row items-start gap-3">
          <View className="w-12 h-12 rounded-2xl bg-[#1B1110] items-center justify-center">
            <MapPin size={22} color="#D2673D" />
          </View>
          <View className="flex-1">
            <View className="flex-row items-start justify-between gap-2">
              <Text className="text-white text-[17px] font-black flex-1" numberOfLines={2}>{item.name}</Text>
              {item.difficulty ? (
                <View className="px-2.5 py-1 rounded-full" style={{ backgroundColor: `${color}20`, borderWidth: 1, borderColor: `${color}55` }}>
                  <Text className="text-[10px] font-black uppercase" style={{ color }}>{item.difficulty}</Text>
                </View>
              ) : null}
            </View>
            {(item.latitude && item.longitude) ? (
              <View className="flex-row items-center gap-1.5 mt-2">
                <Navigation color="#697383" size={12} />
                <Text className="text-[#7B8493] text-xs">{item.latitude.toFixed(4)}, {item.longitude.toFixed(4)}</Text>
              </View>
            ) : null}
            {item.tricks?.length ? (
              <View className="flex-row flex-wrap gap-1.5 mt-3">
                {item.tricks.slice(0, 3).map((trick, index) => (
                  <View key={`${trick}-${index}`} className="bg-[#0B1017] border border-[#202733] rounded-full px-2.5 py-1">
                    <Text className="text-[#AEB5C0] text-[10px] font-bold">{trick}</Text>
                  </View>
                ))}
              </View>
            ) : null}
          </View>
          <ChevronRight size={20} color="#4D5664" />
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View className="flex-1 bg-[#07090D] p-4 pt-10">
        <LoadingSkeleton height={130} className="mb-4" />
        {[1,2,3,4].map(i => <LoadingSkeleton key={i} height={100} className="mb-3" />)}
      </View>
    );
  }

  return (
    <View className="flex-1 bg-[#07090D]">
      <View className="px-5 pt-12 pb-5">
        <Text className="text-[#D2673D] text-[11px] font-black tracking-[2px]">EXPLORE THE SCENE</Text>
        <Text className="text-white text-[30px] font-black mt-1">Skate Spots</Text>
        <Text className="text-[#7B8493] text-sm mt-1">Real parks, street spots, DIYs and community finds.</Text>

        <View className="flex-row gap-2 mt-4">
          <View className="flex-1 bg-[#10151D] border border-[#252D39] rounded-2xl p-3">
            <Layers3 size={16} color="#D2673D" />
            <Text className="text-white text-xl font-black mt-1">{spots.length.toLocaleString()}</Text>
            <Text className="text-[#697383] text-[11px]">spots loaded</Text>
          </View>
          <TouchableOpacity
            onPress={() => navigation.navigate('Map')}
            className="flex-1 bg-[#1B1110] border border-[#5B2D22] rounded-2xl p-3"
          >
            <Navigation size={16} color="#D2673D" />
            <Text className="text-white text-sm font-black mt-2">Open Map</Text>
            <Text className="text-[#A96C59] text-[11px] mt-0.5">Find what’s nearby</Text>
          </TouchableOpacity>
        </View>

        <View className="flex-row items-center bg-[#10151D] border border-[#252D39] rounded-2xl px-4 mt-4">
          <Search color="#687383" size={18} />
          <TextInput
            className="flex-1 py-3.5 px-3 text-white"
            placeholder="Search spots..."
            placeholderTextColor="#596271"
            value={query}
            onChangeText={setQuery}
          />
          {query ? <Text className="text-[#7B8493] text-xs">{filtered.length}</Text> : null}
        </View>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 32 }}
        refreshControl={<RefreshControl tintColor="#D2673D" refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadSpots(); }} />}
        ListEmptyComponent={
          <View className="items-center mt-20 px-8">
            <View className="w-16 h-16 rounded-2xl bg-[#10151D] items-center justify-center border border-[#252D39]">
              <MapPin size={28} color="#596271" />
            </View>
            <Text className="text-white text-lg font-black mt-4">{query ? 'No matching spots' : 'No spots yet'}</Text>
            <Text className="text-[#697383] text-sm text-center mt-2">{query ? 'Try another spot name.' : 'Community spots will show here as they are added.'}</Text>
          </View>
        }
      />
    </View>
  );
}
