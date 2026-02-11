import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, ScrollView } from 'react-native';
import { MapPin, Building2, Hammer, Smartphone, ShoppingCart, Check, X } from 'lucide-react-native';
import Button from './ui/Button';

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
  { key: 'park' as const, label: 'Parks', icon: MapPin, color: '#10b981' },
  { key: 'street' as const, label: 'Street', icon: Building2, color: '#3b82f6' },
  { key: 'diy' as const, label: 'DIY', icon: Hammer, color: '#f59e0b' },
  { key: 'quest' as const, label: 'Quests', icon: Smartphone, color: '#8b5cf6' },
  { key: 'shop' as const, label: 'Shops', icon: ShoppingCart, color: '#ef4444' },
];

export default function MapFilters({ visible, onClose, filters, onFilterChange }: MapFiltersProps) {
  const [localFilters, setLocalFilters] = useState(filters);

  const toggleFilter = (type: keyof typeof filters) => {
    const newFilters = { ...localFilters, [type]: !localFilters[type] };
    setLocalFilters(newFilters);
    onFilterChange(newFilters);
  };

  const selectAll = () => {
    const allOn = { park: true, street: true, diy: true, quest: true, shop: true };
    setLocalFilters(allOn);
    onFilterChange(allOn);
  };

  const selectNone = () => {
    const allOff = { park: false, street: false, diy: false, quest: false, shop: false };
    setLocalFilters(allOff);
    onFilterChange(allOff);
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 bg-black/70 justify-end">
        <View className="bg-gray-800 rounded-t-2xl pt-5 pb-10 px-5" style={{ maxHeight: '70%' }}>
          <View className="flex-row justify-between items-center mb-5">
            <Text className="text-2xl font-bold text-white">Map Filters</Text>
            <TouchableOpacity onPress={onClose}>
              <X color="#666" size={24} />
            </TouchableOpacity>
          </View>

          <ScrollView className="mb-5">
            {FILTER_TYPES.map(({ key, label, icon: Icon, color }) => (
              <TouchableOpacity
                key={key}
                className="flex-row justify-between items-center bg-gray-900 rounded-xl p-4 mb-3"
                style={localFilters[key] ? { borderWidth: 2, borderColor: color } : { borderWidth: 1, borderColor: '#333' }}
                onPress={() => toggleFilter(key)}
              >
                <View className="flex-row items-center flex-1">
                  <Icon color={color} size={24} />
                  <Text className="text-lg font-semibold text-white ml-3">{label}</Text>
                </View>
                <View
                  className="w-7 h-7 rounded-md border-2 justify-center items-center"
                  style={localFilters[key] ? { backgroundColor: color, borderColor: color } : { borderColor: '#666' }}
                >
                  {localFilters[key] && <Check color="#fff" size={18} />}
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <View className="flex-row gap-3 mb-4">
            <View className="flex-1">
              <Button title="Select All" onPress={selectAll} variant="secondary" size="md" />
            </View>
            <View className="flex-1">
              <Button title="Clear All" onPress={selectNone} variant="secondary" size="md" />
            </View>
          </View>

          <Button title="Done" onPress={onClose} variant="primary" size="lg" />
        </View>
      </View>
    </Modal>
  );
}
