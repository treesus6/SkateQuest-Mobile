import React from 'react';
import { render } from '@testing-library/react-native';
import SpotMiniMap from '../../components/SpotMiniMap.native';

jest.mock('../../lib/mapboxSetup', () => ({ isMapboxConfigured: true }));

// Mapbox requires an Android native runtime. Keep the boundary props visible so
// the real component's coordinate validation is exercised without a device.
jest.mock('@rnmapbox/maps', () => {
  const React = require('react');
  return {
    __esModule: true,
    default: {
      MapView: ({ children, ...props }: any) =>
        React.createElement('View', { ...props, testID: 'native-map-view' }, children),
      Camera: (props: any) =>
        React.createElement('View', { ...props, testID: 'native-map-camera' }),
      PointAnnotation: ({ children, ...props }: any) =>
        React.createElement('View', { ...props, testID: 'native-map-pin' }, children),
      StyleURL: { Dark: 'mapbox://styles/mapbox/dark-v11' },
    },
  };
});

describe('native spot mini map coordinates', () => {
  it.each([
    [45.64, -122.67],
    [0, 0],
    [-90, 180],
  ])('passes valid latitude %s and longitude %s to the native map', async (latitude, longitude) => {
    const view = await render(<SpotMiniMap latitude={latitude} longitude={longitude} />);

    expect(view.getByTestId('native-map-camera').props.centerCoordinate).toEqual([
      longitude,
      latitude,
    ]);
    expect(view.getByTestId('native-map-pin').props.coordinate).toEqual([
      longitude,
      latitude,
    ]);
  });

  it.each([
    [NaN, 0],
    [Infinity, 0],
    [0, -Infinity],
    [91, 0],
    [-91, 0],
    [0, 181],
    [0, -181],
    [null, 0],
    ['45.64', -122.67],
  ])('does not construct native map views for malformed latitude %s and longitude %s', async (latitude, longitude) => {
    const view = await render(
      <SpotMiniMap latitude={latitude as number} longitude={longitude as number} />
    );

    expect(view.queryByTestId('native-map-view')).toBeNull();
    expect(view.queryByTestId('native-map-camera')).toBeNull();
    expect(view.queryByTestId('native-map-pin')).toBeNull();
    expect(view.getByText('Spot location unavailable')).toBeTruthy();
  });
});
