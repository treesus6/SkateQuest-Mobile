import React from 'react';
import { View } from 'react-native';
import Mapbox from '@rnmapbox/maps';
import { MapPin } from 'lucide-react-native';

export default function SpotMiniMap({
  latitude,
  longitude,
}: {
  latitude: number;
  longitude: number;
}) {
  return (
    <Mapbox.MapView
      style={{ flex: 1 }}
      styleURL={Mapbox.StyleURL.Street}
      scrollEnabled={false}
      pitchEnabled={false}
      rotateEnabled={false}
      zoomEnabled={false}
    >
      <Mapbox.Camera zoomLevel={14} centerCoordinate={[longitude, latitude]} />
      <Mapbox.PointAnnotation id="spot-location" coordinate={[longitude, latitude]}>
        <View style={{ alignItems: 'center', justifyContent: 'center' }}>
          <MapPin color="#d2673d" size={32} />
        </View>
      </Mapbox.PointAnnotation>
    </Mapbox.MapView>
  );
}
