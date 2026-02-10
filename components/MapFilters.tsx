import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, ScrollView } from 'react-native';

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

  const filterTypes = [
    { key: 'park' as const, label: 'Parks', emoji: '🛹', color: '#10b981' },
    { key: 'street' as const, label: 'Street', emoji: '🏙️', color: '#3b82f6' },
    { key: 'diy' as const, label: 'DIY', emoji: '🔨', color: '#f59e0b' },
    { key: 'quest' as const, label: 'Quests', emoji: '📱', color: '#8b5cf6' },
    { key: 'shop' as const, label: 'Shops', emoji: '🛒', color: '#ef4444' },
  ];

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          <View style={styles.header}>
            <Text style={styles.title}>Map Filters</Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.closeText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.filterList}>
            {filterTypes.map(({ key, label, emoji, color }) => (
              <TouchableOpacity
                key={key}
                style={[
                  styles.filterItem,
                  localFilters[key] && { borderColor: color, borderWidth: 2 },
                ]}
                onPress={() => toggleFilter(key)}
              >
                <View style={styles.filterLeft}>
                  <Text style={styles.filterEmoji}>{emoji}</Text>
                  <Text style={styles.filterLabel}>{label}</Text>
                </View>
                <View style={[styles.checkbox, localFilters[key] && { backgroundColor: color }]}>
                  {localFilters[key] && <Text style={styles.checkmark}>✓</Text>}
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity style={styles.quickButton} onPress={selectAll}>
              <Text style={styles.quickButtonText}>Select All</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.quickButton} onPress={selectNone}>
              <Text style={styles.quickButtonText}>Clear All</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.doneButton} onPress={onClose}>
            <Text style={styles.doneButtonText}>Done</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#2a2a2a',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 20,
    paddingBottom: 40,
    paddingHorizontal: 20,
    maxHeight: '70%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  closeText: {
    fontSize: 24,
    color: '#666',
    fontWeight: 'bold',
  },
  filterList: {
    marginBottom: 20,
  },
  filterItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#333',
  },
  filterLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  filterEmoji: {
    fontSize: 28,
    marginRight: 12,
  },
  filterLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  checkbox: {
    width: 28,
    height: 28,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#666',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkmark: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    gap: 12,
  },
  quickButton: {
    flex: 1,
    backgroundColor: '#444',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  quickButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  doneButton: {
    backgroundColor: '#d2673d',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  doneButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
