import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, Modal, ScrollView } from 'react-native';
import { MapPin, Building2, Hammer, Smartphone, ShoppingCart, Check, X, SlidersHorizontal } from 'lucide-react-native';

interface MapFiltersProps {
  visible: boolean;
  onClose: () => void;
  filters: {
    park: boolean;
    street: boolean;
    diy: boolean;
    quest: boolean;
    shop: boolean;
  };
  onFilterChange: (filters: any) => void;
}

const FILTER_TYPES = [
  { key: 'park' as const, label: 'Parks', sub: 'Skateparks & bowls', icon: MapPin, color: '#D2673D' },
  { key: 'street' as const, label: 'Street', sub: 'Rails, ledges & stairs', icon: Building2, color: '#F59E0B' },
  { key: 'diy' as const, label: 'DIY', sub: 'Community-built spots', icon: Hammer, color: '#A855F7' },
  { key: 'quest' as const, label: 'Quest Spots', sub: 'Locations tied to missions', icon: Smartphone, color: '#22C55E' },
  { key: 'shop' as const, label: 'Skate Shops', sub: 'Local shops & community stores', icon: ShoppingCart, color: '#38BDF8' },
];

export default function MapFilters({ visible, onClose, filters, onFilterChange }: MapFiltersProps) {
  const [localFilters, setLocalFilters] = useState(filters);

  useEffect(() => {
    if (visible) setLocalFilters(filters);
  }, [filters, visible]);

  const activeCount = useMemo(
    () => Object.values(localFilters).filter(Boolean).length,
    [localFilters]
  );

  const apply = (next: typeof filters) => {
    setLocalFilters(next);
    onFilterChange(next);
  };

  const toggleFilter = (type: keyof typeof filters) => {
    apply({ ...localFilters, [type]: !localFilters[type] });
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 bg-black/75 justify-end">
        <View className="bg-[#0B1018] rounded-t-[28px] pt-4 pb-8 px-5 border-t border-[#202733]" style={{ maxHeight: '82%' }}>
          <View className="w-12 h-1 rounded-full bg-[#303845] self-center mb-5" />

          <View className="flex-row justify-between items-start mb-5">
            <View className="flex-row items-center gap-3 flex-1 pr-4">
              <View className="w-11 h-11 rounded-2xl bg-[#2A1812] items-center justify-center">
                <SlidersHorizontal color="#D2673D" size={21} />
              </View>
              <View className="flex-1">
                <Text className="text-[11px] font-black tracking-[2px] text-[#D2673D] uppercase">Map Layers</Text>
                <Text className="text-2xl font-black text-white mt-0.5">What do you want to find?</Text>
                <Text className="text-xs text-[#7C8795] mt-1">{activeCount} of {FILTER_TYPES.length} layers visible</Text>
              </View>
            </View>
            <TouchableOpacity className="w-10 h-10 rounded-full bg-[#141B25] items-center justify-center" onPress={onClose}>
              <X color="#9AA4B2" size={20} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} className="mb-5">
            {FILTER_TYPES.map(({ key, label, sub, icon: Icon, color }) => {
              const active = localFilters[key];
              return (
                <TouchableOpacity
                  key={key}
                  className="flex-row items-center rounded-2xl p-4 mb-3 bg-[#111721] border"
                  style={{ borderColor: active ? `${color}88` : '#252D39' }}
                  onPress={() => toggleFilter(key)}
                  activeOpacity={0.8}
                >
                  <View className="w-12 h-12 rounded-2xl items-center justify-center" style={{ backgroundColor: `${color}18` }}>
                    <Icon color={color} size={23} />
                  </View>
                  <View className="flex-1 ml-3">
                    <Text className="text-[16px] font-black text-white">{label}</Text>
                    <Text className="text-xs text-[#7C8795] mt-1">{sub}</Text>
                  </View>
                  <View
                    className="w-8 h-8 rounded-xl border-2 justify-center items-center"
                    style={active ? { backgroundColor: color, borderColor: color } : { borderColor: '#4A5563', backgroundColor: '#0B1018' }}
                  >
                    {active && <Check color="#fff" size={18} strokeWidth={3} />}
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <View className="flex-row gap-3 mb-3">
            <TouchableOpacity
              className="flex-1 min-h-[48px] rounded-2xl bg-[#151C27] border border-[#2A3340] items-center justify-center"
              onPress={() => apply({ park: false, street: false, diy: false, quest: false, shop: false })}
            >
              <Text className="font-black text-[#AAB3BF]">Clear</Text>
            </TouchableOpacity>
            <TouchableOpacity
              className="flex-1 min-h-[48px] rounded-2xl bg-[#151C27] border border-[#2A3340] items-center justify-center"
              onPress={() => apply({ park: true, street: true, diy: true, quest: true, shop: true })}
            >
              <Text className="font-black text-[#AAB3BF]">Show all</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity className="min-h-[54px] rounded-2xl bg-[#D2673D] items-center justify-center" onPress={onClose}>
            <Text className="text-white text-base font-black">Back to the map</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}
