import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Modal } from 'react-native';
import Mapbox from '@rnmapbox/maps';
import { Map, Satellite, Moon, Sun, TreePine, Check, Layers3, X } from 'lucide-react-native';

export type MapStyle = {
  name: string;
  url: string;
  icon: any;
  description: string;
};

export const MAP_STYLES: MapStyle[] = [
  { name: 'Street', url: Mapbox.StyleURL.Street, icon: Map, description: 'Best for streets, parks, and city navigation' },
  { name: 'Satellite', url: Mapbox.StyleURL.Satellite, icon: Satellite, description: 'See terrain, transitions, and real surroundings' },
  { name: 'Dark', url: Mapbox.StyleURL.Dark, icon: Moon, description: 'Low-glare night session map' },
  { name: 'Light', url: Mapbox.StyleURL.Light, icon: Sun, description: 'Clean high-contrast daytime map' },
  { name: 'Outdoors', url: Mapbox.StyleURL.Outdoors, icon: TreePine, description: 'Terrain-forward view for exploring new areas' },
];

interface MapStyleSelectorProps {
  currentStyle: string;
  onStyleChange: (styleUrl: string) => void;
}

export default function MapStyleSelector({ currentStyle, onStyleChange }: MapStyleSelectorProps) {
  const [modalVisible, setModalVisible] = useState(false);
  const currentStyleInfo = MAP_STYLES.find(style => style.url === currentStyle) || MAP_STYLES[0];
  const CurrentIcon = currentStyleInfo.icon;

  return (
    <>
      <TouchableOpacity
        className="absolute top-[110px] right-5 bg-[#0F1623]/95 rounded-2xl w-[50px] h-[50px] justify-center items-center border border-[#283241] shadow-lg"
        onPress={() => setModalVisible(true)}
        accessibilityRole="button"
        accessibilityLabel={`Map style: ${currentStyleInfo.name}`}
      >
        <CurrentIcon color="#D2673D" size={23} />
      </TouchableOpacity>

      <Modal animationType="slide" transparent visible={modalVisible} onRequestClose={() => setModalVisible(false)}>
        <View className="flex-1 justify-end bg-black/75">
          <View className="bg-[#0B1018] rounded-t-[28px] p-5 pb-8 border-t border-[#202733]">
            <View className="w-12 h-1 rounded-full bg-[#303845] self-center mb-5" />

            <View className="flex-row items-start justify-between mb-5">
              <View className="flex-row items-center gap-3 flex-1 pr-4">
                <View className="w-11 h-11 rounded-2xl bg-[#2A1812] items-center justify-center">
                  <Layers3 color="#D2673D" size={21} />
                </View>
                <View className="flex-1">
                  <Text className="text-[11px] font-black tracking-[2px] text-[#D2673D] uppercase">Map Look</Text>
                  <Text className="text-2xl font-black text-white mt-0.5">Choose your terrain view</Text>
                  <Text className="text-xs text-[#7C8795] mt-1">Current: {currentStyleInfo.name}</Text>
                </View>
              </View>
              <TouchableOpacity className="w-10 h-10 rounded-full bg-[#141B25] items-center justify-center" onPress={() => setModalVisible(false)}>
                <X color="#9AA4B2" size={20} />
              </TouchableOpacity>
            </View>

            {MAP_STYLES.map(style => {
              const StyleIcon = style.icon;
              const isActive = currentStyle === style.url;
              return (
                <TouchableOpacity
                  key={style.url}
                  className="flex-row items-center p-4 rounded-2xl mb-3 bg-[#111721] border"
                  style={{ borderColor: isActive ? '#D2673D' : '#252D39' }}
                  onPress={() => {
                    onStyleChange(style.url);
                    setModalVisible(false);
                  }}
                  activeOpacity={0.8}
                >
                  <View className="w-11 h-11 rounded-2xl bg-[#181F2A] items-center justify-center">
                    <StyleIcon color={isActive ? '#D2673D' : '#AAB3BF'} size={22} />
                  </View>
                  <View className="flex-1 ml-3">
                    <Text className={`text-base font-black ${isActive ? 'text-[#F4A07D]' : 'text-white'}`}>{style.name}</Text>
                    <Text className="text-xs text-[#7C8795] mt-1">{style.description}</Text>
                  </View>
                  <View className={`w-8 h-8 rounded-xl items-center justify-center ${isActive ? 'bg-[#D2673D]' : 'bg-[#151C27]'}`}>
                    {isActive ? <Check color="#fff" size={18} strokeWidth={3} /> : null}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </Modal>
    </>
  );
}
