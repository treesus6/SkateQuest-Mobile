import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Modal } from 'react-native';
import Mapbox from '@rnmapbox/maps';
import { Map, Satellite, Moon, Sun, TreePine, Check } from 'lucide-react-native';
import Button from './ui/Button';

export type MapStyle = {
  name: string;
  url: string;
  icon: any;
};

export const MAP_STYLES: MapStyle[] = [
  { name: 'Street', url: Mapbox.StyleURL.Street, icon: Map },
  { name: 'Satellite', url: Mapbox.StyleURL.Satellite, icon: Satellite },
  { name: 'Dark', url: Mapbox.StyleURL.Dark, icon: Moon },
  { name: 'Light', url: Mapbox.StyleURL.Light, icon: Sun },
  { name: 'Outdoors', url: Mapbox.StyleURL.Outdoors, icon: TreePine },
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
        className="absolute top-[110px] right-5 bg-white dark:bg-gray-800 rounded-full w-[50px] h-[50px] justify-center items-center shadow-lg"
        onPress={() => setModalVisible(true)}
      >
        <CurrentIcon color="#d2673d" size={24} />
      </TouchableOpacity>

      <Modal animationType="slide" transparent visible={modalVisible} onRequestClose={() => setModalVisible(false)}>
        <View className="flex-1 justify-end bg-black/50">
          <View className="bg-white dark:bg-gray-800 rounded-t-2xl p-5 pb-10">
            <Text className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-5 text-center">Map Style</Text>

            {MAP_STYLES.map(style => {
              const StyleIcon = style.icon;
              const isActive = currentStyle === style.url;
              return (
                <TouchableOpacity
                  key={style.url}
                  className={`flex-row items-center p-4 rounded-xl mb-2.5 ${isActive ? 'bg-brand-terracotta' : 'bg-brand-beige dark:bg-gray-700'}`}
                  onPress={() => { onStyleChange(style.url); setModalVisible(false); }}
                >
                  <StyleIcon color={isActive ? '#fff' : '#d2673d'} size={24} />
                  <Text className={`text-base flex-1 ml-4 ${isActive ? 'text-white font-bold' : 'text-gray-800 dark:text-gray-100'}`}>
                    {style.name}
                  </Text>
                  {isActive && <Check color="#fff" size={20} />}
                </TouchableOpacity>
              );
            })}

            <View className="mt-5">
              <Button title="Close" onPress={() => setModalVisible(false)} variant="secondary" size="lg" />
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}
