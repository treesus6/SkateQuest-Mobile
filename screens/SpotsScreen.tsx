import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, RefreshControl, TextInput,
} from 'react-native';
import { MapPin, Search } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { spotsService } from '../lib/spotsService';
import { SkateSpot } from '../types';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import LoadingSkeleton from '../components/ui/LoadingSkeleton';

const DIFFICULTY_COLORS: Record<string, string> = {
  Beginner: '#4CAF50', Intermediate: '#FF9800', Advanced: '#F44336',
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
    const color = DIFFICULTY_COLORS[item.difficulty || 'Beginner'] || '#999';
    return (
      <Card>
        <View className="flex-row justify-between items-start mb-1">
          <Text className="text-base font-bold text-gray-800 dark:text-gray-100 flex-1 mr-2">
            {item.name}
          </Text>
          {item.difficulty && (
            <View className="px-2 py-0.5 rounded-full" style={{ backgroundColor: color + '20' }}>
              <Text className="text-xs font-semibold" style={{ color }}>{item.difficulty}</Text>
            </View>
          )}
        </View>
        {(item.latitude && item.longitude) ? (
          <View className="flex-row items-center gap-1 mb-2">
            <MapPin color="#999" size={12} />
            <Text className="text-xs text-gray-400">
              {item.latitude.toFixed(4)}, {item.longitude.toFixed(4)}
            </Text>
          </View>
        ) : null}
        <Button
          title="View Details"
          variant="primary"
          size="sm"
          onPress={() => navigation.navigate('SpotDetail', { spotId: item.id })}
        />
      </Card>
    );
  };

  if (loading) {
    return (
      <View className="flex-1 bg-brand-beige dark:bg-gray-900 p-4">
        {[1,2,3,4].map(i => <LoadingSkeleton key={i} height={90} className="mb-3" />)}
      </View>
    );
  }

  return (
    <View className="flex-1 bg-brand-beige dark:bg-gray-900">
      <View className="bg-brand-terracotta p-5 pb-4 rounded-b-2xl">
        <Text className="text-2xl font-bold text-white text-center mb-3">
          Spots ({spots.length.toLocaleString()})
        </Text>
        <View className="flex-row items-center bg-white/20 rounded-xl px-3">
          <Search color="rgba(255,255,255,0.8)" size={16} />
          <TextInput
            className="flex-1 py-2.5 px-2 text-white"
            placeholder="Search spots..."
            placeholderTextColor="rgba(255,255,255,0.6)"
            value={query}
            onChangeText={setQuery}
          />
        </View>
      </View>
      <FlatList
        data={filtered}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        contentContainerStyle={{ padding: 16 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadSpots(); }} />}
        ListEmptyComponent={
          <View className="items-center mt-24">
            <Text className="text-lg font-bold text-gray-400">
              {query ? 'No spots match your search' : 'No spots yet'}
            </Text>
          </View>
        }
      />
    </View>
  );
}
