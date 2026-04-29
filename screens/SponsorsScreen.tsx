import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  RefreshControl, Image, Linking, Alert, TextInput,
} from 'react-native';
import { Globe, Instagram, Search, Star, MapPin } from 'lucide-react-native';
import { useAuthStore } from '../stores/useAuthStore';
import {
  sponsorsService, MapSponsor,
  SPONSOR_CATEGORY_LABELS, SPONSOR_CATEGORY_EMOJI,
} from '../lib/sponsorsService';
import Card from '../components/ui/Card';
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

export default function SponsorsScreen() {
  const { user } = useAuthStore();
  const [sponsors, setSponsors] = useState<MapSponsor[]>([]);
  const [filtered, setFiltered] = useState<MapSponsor[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [query, setQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');

  const load = useCallback(async () => {
    try {
      const data = await sponsorsService.getAll();
      setSponsors(data);
    } catch (e) {
      console.warn(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    let result = sponsors;
    if (activeCategory !== 'all') result = result.filter(s => s.category === activeCategory);
    if (query.trim()) {
      const q = query.toLowerCase();
      result = result.filter(s =>
        s.name.toLowerCase().includes(q) ||
        s.city?.toLowerCase().includes(q) ||
        s.state?.toLowerCase().includes(q)
      );
    }
    setFiltered(result);
  }, [sponsors, activeCategory, query]);

  const handleWebsite = async (s: MapSponsor) => {
    if (!s.website_url) return;
    await sponsorsService.trackClick(s.id, user?.id ?? null, 'website_tap');
    Linking.openURL(s.website_url).catch(() => Alert.alert('Could not open link'));
  };

  const handleInstagram = async (s: MapSponsor) => {
    if (!s.instagram_url) return;
    await sponsorsService.trackClick(s.id, user?.id ?? null, 'instagram_tap');
    Linking.openURL(s.instagram_url).catch(() => Alert.alert('Could not open link'));
  };

  const renderSponsor = ({ item }: { item: MapSponsor }) => {
    const emoji = SPONSOR_CATEGORY_EMOJI[item.category] || '🤙';
    const label = SPONSOR_CATEGORY_LABELS[item.category] || 'Community';
    return (
      <Card>
        <View className="flex-row items-start gap-3">
          {item.logo_url ? (
            <Image source={{ uri: item.logo_url }} className="w-14 h-14 rounded-xl" resizeMode="contain" />
          ) : (
            <View className="w-14 h-14 rounded-xl bg-brand-terracotta/15 items-center justify-center">
              <Text className="text-2xl">{emoji}</Text>
            </View>
          )}
          <View className="flex-1">
            <View className="flex-row items-center gap-2 flex-wrap">
              <Text className="text-base font-black text-gray-900 dark:text-gray-100">{item.name}</Text>
              {item.featured && <Star size={12} color="#FFD700" fill="#FFD700" />}
            </View>
            <Text className="text-xs text-brand-terracotta font-semibold mt-0.5">{emoji} {label}</Text>
            {item.tagline ? <Text className="text-xs text-gray-500 dark:text-gray-400 mt-1">{item.tagline}</Text> : null}
            {(item.city || item.state) && (
              <View className="flex-row items-center gap-1 mt-1">
                <MapPin size={10} color="#9CA3AF" />
                <Text className="text-xs text-gray-400">{[item.city, item.state].filter(Boolean).join(', ')}</Text>
              </View>
            )}
            <View className="flex-row gap-2 mt-2">
              {item.website_url && (
                <TouchableOpacity onPress={() => handleWebsite(item)}
                  className="flex-row items-center gap-1 bg-brand-terracotta rounded-lg px-3 py-1.5">
                  <Globe size={12} color="white" />
                  <Text className="text-white text-xs font-bold">Website</Text>
                </TouchableOpacity>
              )}
              {item.instagram_url && (
                <TouchableOpacity onPress={() => handleInstagram(item)}
                  className="flex-row items-center gap-1 bg-gray-100 dark:bg-gray-700 rounded-lg px-3 py-1.5">
                  <Instagram size={12} color="#E1306C" />
                  <Text className="text-gray-700 dark:text-gray-200 text-xs font-semibold">IG</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </Card>
    );
  };

  if (loading) return (
    <View className="flex-1 bg-brand-beige dark:bg-gray-900 p-4">
      {[1,2,3].map(i => <LoadingSkeleton key={i} height={100} className="mb-3" />)}
    </View>
  );

  return (
    <View className="flex-1 bg-brand-beige dark:bg-gray-900">
      <View className="bg-brand-terracotta p-5 pb-4 rounded-b-2xl">
        <Text className="text-2xl font-black text-white text-center mb-1">Skate Community</Text>
        <Text className="text-white/80 text-xs text-center mb-3">
          Shops · Brands · Boards · Wheels · Crews
        </Text>
        <View className="flex-row items-center bg-white/20 rounded-xl px-3">
          <Search color="rgba(255,255,255,0.8)" size={16} />
          <TextInput
            className="flex-1 py-2.5 px-2 text-white"
            placeholder="Search by name or city..."
            placeholderTextColor="rgba(255,255,255,0.6)"
            value={query}
            onChangeText={setQuery}
          />
        </View>
      </View>

      {/* Category chips */}
      <View className="px-4 pt-3 pb-1">
        <FlatList
          horizontal showsHorizontalScrollIndicator={false}
          data={CATEGORIES} keyExtractor={c => c.key}
          renderItem={({ item: cat }) => (
            <TouchableOpacity
              onPress={() => setActiveCategory(cat.key)}
              className={`mr-2 px-3 py-1.5 rounded-full flex-row items-center gap-1 ${
                activeCategory === cat.key
                  ? 'bg-brand-terracotta'
                  : 'bg-gray-200 dark:bg-gray-700'
              }`}
            >
              <Text className="text-sm">{cat.emoji}</Text>
              <Text className={`text-xs font-semibold ${
                activeCategory === cat.key ? 'text-white' : 'text-gray-600 dark:text-gray-300'
              }`}>{cat.label}</Text>
            </TouchableOpacity>
          )}
        />
      </View>

      <FlatList
        data={filtered}
        keyExtractor={item => item.id}
        renderItem={renderSponsor}
        contentContainerStyle={{ padding: 16 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}
        ListEmptyComponent={
          <View className="items-center mt-20">
            <Text className="text-4xl mb-3">🛹</Text>
            <Text className="text-lg font-bold text-gray-400">
              {query ? 'No results' : 'No community listings yet'}
            </Text>
            <Text className="text-sm text-gray-300 mt-1 text-center px-8">
              {query ? 'Try a different search' : 'Local shops and brands coming soon. Know one? Tell us!'}
            </Text>
          </View>
        }
      />
    </View>
  );
}
