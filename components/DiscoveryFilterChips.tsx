import React from 'react';
import { Pressable, ScrollView, Text } from 'react-native';
import type { DiscoveryFilter } from '../lib/discoveryService';
const FILTERS: [DiscoveryFilter, string][] = [
  ['all', 'ALL'],
  ['partners', 'PARTNERS'],
  ['live', 'LIVE NOW'],
  ['dry', 'DRY'],
  ['park', 'PARK'],
  ['street', 'STREET'],
  ['diy', 'DIY'],
  ['saved', 'SAVED'],
];
export default function DiscoveryFilterChips({
  value,
  onChange,
}: {
  value: DiscoveryFilter;
  onChange: (value: DiscoveryFilter) => void;
}) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ gap: 7, paddingVertical: 8 }}
    >
      {FILTERS.map(([key, label]) => (
        <Pressable
          key={key}
          accessibilityRole="button"
          accessibilityState={{ selected: value === key }}
          onPress={() => onChange(key)}
          style={{
            paddingHorizontal: 12,
            minHeight: 44,
            justifyContent: 'center',
            borderWidth: 2,
            borderColor: value === key ? '#D8F04B' : '#343B47',
            backgroundColor: value === key ? '#D8F04B' : '#12161C',
          }}
        >
          <Text
            style={{
              color: value === key ? '#07080B' : '#F6F0E5',
              fontSize: 10,
              fontWeight: '900',
            }}
          >
            {label}
          </Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}
