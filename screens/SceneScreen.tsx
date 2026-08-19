import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Linking,
  Alert,
  TextInput,
} from 'react-native';
import { Image } from 'expo-image';
import { Globe, Instagram, Search, Star, Map, Users, Store } from 'lucide-react-native';
import { useAuthStore } from '../stores/useAuthStore';
import { sceneService, MapSponsor, CATEGORY_LABELS, CATEGORY_EMOJI } from '../lib/sceneService';
import LoadingSkeleton from '../components/ui/LoadingSkeleton';

const CATEGORIES = [
  { key: 'all', label: 'All', emoji: '🗺️' },
  { key: 'skate_shop', label: 'Shops', emoji: '🏪' },
  { key: 'clothing_brand', label: 'Clothing', emoji: '👕' },
  { key: 'board_company', label: 'Boards', emoji: '🛹' },
  { key: 'wheel_company', label: 'Wheels', emoji: '🎡' },
  { key: 'diy_supporter', label: 'DIY', emoji: '🏗️' },
  { key: 'media_crew', label: 'Media', emoji: '🎥' },
];

export default function SceneScreen() {
  const { user } = useAuthStore();
  const [entries, setEntries] = useState<MapSponsor[]>([]);
  const [filtered, setFiltered] = useState<MapSponsor[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [query, setQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');

  const load = useCallback(async () => {
    try {
      const data = await sceneService.getAll();
      setEntries(data);
    } catch (e) {
      console.warn(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    let result = entries;
    if (activeCategory !== 'all') result = result.filter(s => s.category === activeCategory);
    if (query.trim()) {
      const q = query.toLowerCase();
      result = result.filter(
        s => s.name.toLowerCase().includes(q) || s.city?.toLowerCase().includes(q) || s.state?.toLowerCase().includes(q)
      );
    }
    setFiltered(result);
  }, [entries, activeCategory, query]);

  const handleWebsite = async (entry: MapSponsor) => {
    if (!entry.website_url) return;
    await sceneService.trackTap(entry.id, user?.id ?? null, 'website_tap');
    try { await Linking.openURL(entry.website_url); } catch { Alert.alert('Could not open link'); }
  };

  const handleInstagram = async (entry: MapSponsor) => {
    if (!entry.instagram_url) return;
    await sceneService.trackTap(entry.id, user?.id ?? null, 'instagram_tap');
    try { await Linking.openURL(entry.instagram_url); } catch { Alert.alert('Could not open link'); }
  };

  const featuredCount = entries.filter(entry => entry.featured).length;

  const renderEntry = ({ item }: { item: MapSponsor }) => {
    const emoji = CATEGORY_EMOJI[item.category] || '🤙';
    const label = CATEGORY_LABELS[item.category] || 'Community';
    return (
      <View className="bg-[#10151D] border border-[#252D39] rounded-[20px] p-4 mb-3">
        <View className="flex-row items-start gap-3">
          {item.logo_url ? (
            <View className="w-14 h-14 rounded-2xl bg-white overflow-hidden items-center justify-center">
              <Image source={{ uri: item.logo_url }} style={{ width: 56, height: 56 }} contentFit="contain" />
            </View>
          ) : (
            <View className="w-14 h-14 rounded-2xl bg-[#1B1110] items-center justify-center border border-[#4E2B22]">
              <Text className="text-2xl">{emoji}</Text>
            </View>
          )}
          <View className="flex-1">
            <View className="flex-row items-center gap-2 flex-wrap">
              <Text className="text-[17px] font-black text-white">{item.name}</Text>
              {item.featured && <Star size={13} color="#FFD166" fill="#FFD166" />}
            </View>
            <Text className="text-[11px] text-[#D2673D] font-black uppercase tracking-wider mt-1">{emoji} {label}</Text>
            {item.tagline ? <Text className="text-sm text-[#AEB5C0] mt-2 leading-5">{item.tagline}</Text> : null}
            {item.city || item.state ? (
              <Text className="text-xs text-[#697383] mt-2">📍 {[item.city, item.state].filter(Boolean).join(', ')}</Text>
            ) : null}
          </View>
        </View>

        {(item.website_url || item.instagram_url) ? (
          <View className="flex-row gap-2 mt-4">
            {item.website_url ? (
              <TouchableOpacity onPress={() => handleWebsite(item)} className="flex-1 bg-[#D2673D] rounded-xl py-3 flex-row items-center justify-center gap-2">
                <Globe size={14} color="white" />
                <Text className="text-white text-xs font-black">Website</Text>
              </TouchableOpacity>
            ) : null}
            {item.instagram_url ? (
              <TouchableOpacity onPress={() => handleInstagram(item)} className="flex-1 bg-[#0B1017] border border-[#252D39] rounded-xl py-3 flex-row items-center justify-center gap-2">
                <Instagram size={14} color="#E879F9" />
                <Text className="text-[#D4D8DE] text-xs font-black">Instagram</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        ) : null}
      </View>
    );
  };

  if (loading) {
    return (
      <View className="flex-1 bg-[#07090D] p-4 pt-10">
        <LoadingSkeleton height={140} className="mb-4" />
        {[1, 2, 3].map(i => <LoadingSkeleton key={i} height={110} className="mb-3" />)}
      </View>
    );
  }

  return (
    <View className="flex-1 bg-[#07090D]">
      <View className="px-5 pt-12 pb-4">
        <View className="flex-row items-center gap-2">
          <Map size={19} color="#D2673D" />
          <Text className="text-[#D2673D] text-[11px] font-black tracking-[2px]">KEEP IT IN THE COMMUNITY</Text>
        </View>
        <Text className="text-white text-[30px] font-black mt-2">The Scene</Text>
        <Text className="text-[#7B8493] text-sm mt-1">Skate shops, brands, crews, media and DIY supporters.</Text>

        <View className="flex-row gap-2 mt-4">
          <View className="flex-1 bg-[#10151D] border border-[#252D39] rounded-2xl p-3">
            <Users size={16} color="#D2673D" />
            <Text className="text-white text-xl font-black mt-1">{entries.length}</Text>
            <Text className="text-[#697383] text-[11px]">scene entries</Text>
          </View>
          <View className="flex-1 bg-[#10151D] border border-[#252D39] rounded-2xl p-3">
            <Star size={16} color="#FFD166" />
            <Text className="text-white text-xl font-black mt-1">{featuredCount}</Text>
            <Text className="text-[#697383] text-[11px]">featured</Text>
          </View>
        </View>

        <View className="flex-row items-center bg-[#10151D] border border-[#252D39] rounded-2xl px-4 mt-4">
          <Search color="#687383" size={18} />
          <TextInput
            className="flex-1 py-3.5 px-3 text-white"
            placeholder="Search name, city or state..."
            placeholderTextColor="#596271"
            value={query}
            onChangeText={setQuery}
          />
          {query ? <Text className="text-[#7B8493] text-xs">{filtered.length}</Text> : null}
        </View>
      </View>

      <View className="pb-2">
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16 }}
          data={CATEGORIES}
          keyExtractor={c => c.key}
          renderItem={({ item: cat }) => (
            <TouchableOpacity
              onPress={() => setActiveCategory(cat.key)}
              className={`mr-2 px-3.5 py-2 rounded-full flex-row items-center gap-1.5 border ${activeCategory === cat.key ? 'bg-[#D2673D] border-[#D2673D]' : 'bg-[#10151D] border-[#252D39]'}`}
            >
              <Text className="text-sm">{cat.emoji}</Text>
              <Text className={`text-xs font-black ${activeCategory === cat.key ? 'text-white' : 'text-[#9AA3AF]'}`}>{cat.label}</Text>
            </TouchableOpacity>
          )}
        />
      </View>

      <FlatList
        data={filtered}
        keyExtractor={item => item.id}
        renderItem={renderEntry}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 32 }}
        refreshControl={<RefreshControl tintColor="#D2673D" refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}
        ListEmptyComponent={
          <View className="items-center mt-20 px-8">
            <View className="w-16 h-16 rounded-2xl bg-[#10151D] items-center justify-center border border-[#252D39]">
              <Store size={28} color="#596271" />
            </View>
            <Text className="text-white text-lg font-black mt-4">{query ? 'No scene matches' : 'Nothing here yet'}</Text>
            <Text className="text-[#697383] text-sm text-center mt-2">{query ? 'Try another search or category.' : 'Community entries will appear here as they are added.'}</Text>
          </View>
        }
      />
    </View>
  );
}
