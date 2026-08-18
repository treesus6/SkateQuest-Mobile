import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import Constants from 'expo-constants';
import { Crosshair, MapPin, Plus, RotateCcw, TriangleAlert } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { getBrowserLocation } from '../lib/browserLocation';
import { spotsService } from '../lib/spotsService';
import { Logger } from '../lib/logger';
import { SkateSpot } from '../types';

const FALLBACK: [number, number] = [-122.4324, 37.78825];
// Portal Dimension sits beside the actual Newport, Oregon skatepark record.
const PORTAL_DIMENSION_COORDINATES: [number, number] = [-124.05915, 44.64155];
const PORTAL_DIMENSION_URL = 'https://portaldimension.com';
const PORTAL_DIMENSION_LOGO =
  'https://raw.githubusercontent.com/treesus6/SkateQuest-Mobile/main/assets/supporters/portal-dimension.png';

export default function MapScreen() {
  const router = useRouter();
  const containerRef = useRef<any>(null);
  const mapRef = useRef<MapboxGLMap | null>(null);
  const markersRef = useRef<MapboxGLMarker[]>([]);
  const spotsRequestRef = useRef(0);
  const moveReloadTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [spots, setSpots] = useState<SkateSpot[]>([]);
  const [selectedSpot, setSelectedSpot] = useState<SkateSpot | null>(null);
  const [center, setCenter] = useState<[number, number]>(FALLBACK);
  const [loading, setLoading] = useState(true);
  const [locationLoading, setLocationLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const token =
    (Constants.expoConfig?.extra?.mapboxAccessToken as string | undefined) ??
    process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN;

  const openSpot = useCallback(
    (spot: SkateSpot) => {
      router.push({ pathname: '/(screens)/spot-detail', params: { spotId: spot.id } });
    },
    [router]
  );

  const loadSpots = useCallback(async (coordinates: [number, number]) => {
    const requestId = ++spotsRequestRef.current;
    const { data, error: queryError } = await spotsService.getNearby(
      coordinates[1],
      coordinates[0],
      50000
    );
    if (queryError) throw queryError;
    if (requestId !== spotsRequestRef.current) return;
    setSpots((data ?? []) as SkateSpot[]);
  }, []);

  const locateUser = useCallback(async () => {
    setLocationLoading(true);
    setError(null);
    try {
      const location = await getBrowserLocation();
      const next: [number, number] = [location.longitude, location.latitude];
      setCenter(next);
      await loadSpots(next);
      return true;
    } catch (locationError) {
      const message =
        locationError instanceof Error
          ? locationError.message
          : 'Could not determine your location.';
      setError(message);
      Logger.warn('Browser location failed', { message });
      return false;
    } finally {
      setLocationLoading(false);
    }
  }, [loadSpots]);

  useEffect(() => {
    let active = true;

    const bootMapData = async () => {
      const located = await locateUser();
      if (!active) return;

      if (!located) {
        try {
          await loadSpots(FALLBACK);
        } catch (queryError) {
          Logger.error('Web map spots query failed', queryError);
          setError('Skate spots could not be loaded. Check your connection and try again.');
        }
      }

      if (active) setLoading(false);
    };

    void bootMapData();
    return () => {
      active = false;
    };
  }, [loadSpots, locateUser]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current || !token) return;
    if (!window.mapboxgl) {
      setError('The map library could not be loaded. Check your connection and try again.');
      return;
    }
    window.mapboxgl.accessToken = token;
    const map = new window.mapboxgl.Map({
      container: containerRef.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center,
      zoom: 12,
      attributionControl: true,
    });
    map.on('load', () => setError(current => (current?.includes('map library') ? null : current)));
    map.on('error', () =>
      setError('Map tiles could not be loaded. Check the Mapbox token and network.')
    );
    map.on('moveend', () => {
      if (moveReloadTimerRef.current) clearTimeout(moveReloadTimerRef.current);
      moveReloadTimerRef.current = setTimeout(() => {
        const movedCenter = map.getCenter();
        void loadSpots([movedCenter.lng, movedCenter.lat]).catch(queryError => {
          Logger.error('Web map moved-area spots query failed', queryError);
          setError('Skate spots could not be loaded for this area. Check your connection and try again.');
        });
      }, 250);
    });
    mapRef.current = map;
    return () => {
      if (moveReloadTimerRef.current) clearTimeout(moveReloadTimerRef.current);
      markersRef.current.forEach(marker => marker.remove());
      map.remove();
      mapRef.current = null;
    };
  }, [token, loadSpots]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const isFallback = center[0] === FALLBACK[0] && center[1] === FALLBACK[1];
    map.flyTo({ center, zoom: isFallback ? 12 : 14 });
  }, [center]);

  useEffect(() => {
    const mapbox = window.mapboxgl;
    const map = mapRef.current;
    if (!mapbox || !map) return;

    markersRef.current.forEach(marker => marker.remove());

    const spotMarkers = spots.map(spot => {
      const el = document.createElement('button');
      el.type = 'button';
      el.title = spot.name;
      el.setAttribute('aria-label', `Open ${spot.name}`);
      el.style.width = '24px';
      el.style.height = '24px';
      el.style.borderRadius = '999px';
      el.style.border = '3px solid white';
      el.style.background = '#D2673D';
      el.style.boxShadow = '0 2px 8px rgba(0,0,0,.45)';
      el.style.cursor = 'pointer';
      el.addEventListener('click', event => {
        event.stopPropagation();
        openSpot(spot);
      });
      return new mapbox.Marker({ element: el })
        .setLngLat([spot.longitude, spot.latitude])
        .setPopup(new mapbox.Popup({ offset: 18 }).setText(`${spot.name} — tap marker to open`))
        .addTo(map);
    });

    const sponsorElement = document.createElement('button');
    sponsorElement.type = 'button';
    sponsorElement.title = 'Portal Dimension — Newport, Oregon Skatepark';
    sponsorElement.setAttribute('aria-label', 'Open Portal Dimension website');
    sponsorElement.style.width = '58px';
    sponsorElement.style.height = '58px';
    sponsorElement.style.borderRadius = '12px';
    sponsorElement.style.border = '2px solid #D2673D';
    sponsorElement.style.background = '#fff';
    sponsorElement.style.padding = '3px';
    sponsorElement.style.cursor = 'pointer';
    sponsorElement.style.boxShadow = '0 4px 14px rgba(0,0,0,.35)';

    const sponsorImage = document.createElement('img');
    sponsorImage.src = PORTAL_DIMENSION_LOGO;
    sponsorImage.alt = 'Portal Dimension';
    sponsorImage.style.width = '100%';
    sponsorImage.style.height = '100%';
    sponsorImage.style.objectFit = 'contain';
    sponsorImage.style.display = 'block';
    sponsorElement.appendChild(sponsorImage);
    sponsorElement.addEventListener('click', event => {
      event.stopPropagation();
      window.open(PORTAL_DIMENSION_URL, '_blank', 'noopener,noreferrer');
    });

    const sponsorMarker = new mapbox.Marker({ element: sponsorElement, anchor: 'bottom' })
      .setLngLat(PORTAL_DIMENSION_COORDINATES)
      .setPopup(
        new mapbox.Popup({ offset: 20 }).setHTML(
          '<strong>Portal Dimension</strong><br/>Newport, Oregon skatepark partner — tap the logo to visit.'
        )
      )
      .addTo(map);

    markersRef.current = [...spotMarkers, sponsorMarker];
  }, [spots, openSpot]);

  if (!token) {
    return <MapError message="Mapbox is not configured. Set EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN." />;
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#07090D' }}>
      <View ref={containerRef} nativeID="skatequest-web-map" style={{ flex: 1, minHeight: 420 }} />

      <View style={{ position: 'absolute', top: 16, left: 16, right: 16, gap: 10 }}>
        <View
          style={{
            alignSelf: 'flex-start',
            backgroundColor: '#D2673D',
            borderRadius: 999,
            paddingHorizontal: 14,
            paddingVertical: 9,
          }}
        >
          <Text style={{ color: 'white', fontWeight: '800' }}>{spots.length} real spots nearby</Text>
        </View>
        {error ? (
          <View
            style={{
              backgroundColor: '#15100F',
              borderColor: '#6B3325',
              borderWidth: 1,
              borderRadius: 14,
              padding: 12,
              flexDirection: 'row',
              gap: 10,
            }}
          >
            <TriangleAlert color="#D2673D" size={20} />
            <Text selectable style={{ color: '#F3F4F6', flex: 1 }}>{error}</Text>
          </View>
        ) : null}
      </View>

      <View style={{ position: 'absolute', right: 16, bottom: 118, gap: 10 }}>
        <MapButton
          label="Use my location"
          onPress={() => {
            void locateUser();
          }}
          icon={
            locationLoading ? <ActivityIndicator color="#D2673D" /> : <Crosshair color="#D2673D" />
          }
        />
        <MapButton
          label="Add a spot"
          onPress={() => router.push('/(screens)/add-spot')}
          icon={<Plus color="#D2673D" />}
        />
      </View>

      {loading ? (
        <ActivityIndicator
          size="large"
          color="#D2673D"
          style={{ position: 'absolute', top: '45%', alignSelf: 'center' }}
        />
      ) : null}

      <ScrollView
        horizontal
        style={{ position: 'absolute', left: 0, right: 0, bottom: 14 }}
        contentContainerStyle={{ paddingHorizontal: 16, gap: 10 }}
        showsHorizontalScrollIndicator={false}
      >
        {spots.slice(0, 15).map(spot => (
          <View
            key={spot.id}
            style={{
              width: 205,
              padding: 14,
              borderRadius: 16,
              backgroundColor: selectedSpot?.id === spot.id ? '#2A1812' : '#10151D',
              borderWidth: 1,
              borderColor: '#343A45',
              gap: 9,
            }}
          >
            <Pressable
              onPress={() => {
                setSelectedSpot(spot);
                mapRef.current?.flyTo({ center: [spot.longitude, spot.latitude], zoom: 15 });
              }}
            >
              <Text numberOfLines={1} style={{ color: 'white', fontWeight: '800' }}>{spot.name}</Text>
              <Text style={{ color: '#AAB1BC', marginTop: 4 }}>{spot.spot_type ?? 'Skate spot'}</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={() => openSpot(spot)}
              style={{
                backgroundColor: '#D2673D',
                borderRadius: 10,
                minHeight: 38,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text style={{ color: 'white', fontWeight: '900' }}>Open spot</Text>
            </Pressable>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

function MapButton({ label, onPress, icon }: { label: string; onPress: () => void; icon: React.ReactNode }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={{
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: 'white',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {icon}
    </Pressable>
  );
}

function MapError({ message }: { message: string }) {
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: '#07090D',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        gap: 12,
      }}
    >
      <MapPin color="#D2673D" size={36} />
      <Text selectable style={{ color: 'white', textAlign: 'center', fontSize: 16 }}>{message}</Text>
      <RotateCcw color="#9CA3AF" />
    </View>
  );
}
