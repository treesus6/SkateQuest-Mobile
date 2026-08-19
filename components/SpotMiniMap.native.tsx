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
    <View style={{ flex: 1, overflow: 'hidden', borderRadius: 18, borderWidth: 1, borderColor: '#283241' }}>
      <Mapbox.MapView
        style={{ flex: 1 }}
        styleURL={Mapbox.StyleURL.Dark}
        scrollEnabled={false}
        pitchEnabled={false}
        rotateEnabled={false}
        zoomEnabled={false}
        logoEnabled={false}
        attributionEnabled={false}
      >
        <Mapbox.Camera zoomLevel={14.5} centerCoordinate={[longitude, latitude]} />
        <Mapbox.PointAnnotation id="spot-location" coordinate={[longitude, latitude]}>
          <View
            style={{
              width: 46,
              height: 46,
              borderRadius: 23,
              backgroundColor: 'rgba(210,103,61,0.18)',
              borderWidth: 2,
              borderColor: '#D2673D',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <MapPin color="#D2673D" size={26} fill="rgba(210,103,61,0.18)" />
          </View>
        </Mapbox.PointAnnotation>
      </Mapbox.MapView>
    </View>
  );
}
