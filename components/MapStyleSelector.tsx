import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal } from 'react-native';
import Mapbox from '@rnmapbox/maps';

export type MapStyle = {
  name: string;
  url: string;
  icon: string;
};

export const MAP_STYLES: MapStyle[] = [
  {
    name: 'Street',
    url: Mapbox.StyleURL.Street,
    icon: '🗺️',
  },
  {
    name: 'Satellite',
    url: Mapbox.StyleURL.Satellite,
    icon: '🛰️',
  },
  {
    name: 'Dark',
    url: Mapbox.StyleURL.Dark,
    icon: '🌙',
  },
  {
    name: 'Light',
    url: Mapbox.StyleURL.Light,
    icon: '☀️',
  },
  {
    name: 'Outdoors',
    url: Mapbox.StyleURL.Outdoors,
    icon: '🏞️',
  },
];

interface MapStyleSelectorProps {
  currentStyle: string;
  onStyleChange: (styleUrl: string) => void;
}

export default function MapStyleSelector({
  currentStyle,
  onStyleChange,
}: MapStyleSelectorProps) {
  const [modalVisible, setModalVisible] = useState(false);

  const currentStyleInfo = MAP_STYLES.find(style => style.url === currentStyle) || MAP_STYLES[0];

  return (
    <>
      <TouchableOpacity
        style={styles.styleButton}
        onPress={() => setModalVisible(true)}
      >
        <Text style={styles.styleButtonText}>{currentStyleInfo.icon}</Text>
      </TouchableOpacity>

      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Map Style</Text>

            {MAP_STYLES.map(style => (
              <TouchableOpacity
                key={style.url}
                style={[
                  styles.styleOption,
                  currentStyle === style.url && styles.styleOptionActive,
                ]}
                onPress={() => {
                  onStyleChange(style.url);
                  setModalVisible(false);
                }}
              >
                <Text style={styles.styleIcon}>{style.icon}</Text>
                <Text
                  style={[
                    styles.styleName,
                    currentStyle === style.url && styles.styleNameActive,
                  ]}
                >
                  {style.name}
                </Text>
                {currentStyle === style.url && (
                  <Text style={styles.checkmark}>✓</Text>
                )}
              </TouchableOpacity>
            ))}

            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setModalVisible(false)}
            >
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  styleButton: {
    position: 'absolute',
    top: 110,
    right: 20,
    backgroundColor: '#fff',
    borderRadius: 30,
    width: 50,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  styleButtonText: {
    fontSize: 24,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 40,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
    textAlign: 'center',
  },
  styleOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    backgroundColor: '#f5f0ea',
  },
  styleOptionActive: {
    backgroundColor: '#d2673d',
  },
  styleIcon: {
    fontSize: 28,
    marginRight: 15,
  },
  styleName: {
    fontSize: 16,
    color: '#333',
    flex: 1,
  },
  styleNameActive: {
    color: '#fff',
    fontWeight: 'bold',
  },
  checkmark: {
    fontSize: 20,
    color: '#fff',
    fontWeight: 'bold',
  },
  closeButton: {
    marginTop: 20,
    padding: 15,
    backgroundColor: '#f5f0ea',
    borderRadius: 10,
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 16,
    color: '#333',
    fontWeight: '600',
  },
});
