import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Constants from 'expo-constants';
import { Crosshair, Flame, MapPin, Plus, RotateCcw, TriangleAlert } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { getBrowserLocation } from '../lib/browserLocation';
import { spotsService } from '../lib/spotsService';
import { Logger } from '../lib/logger';
import { getMapboxAvailabilityError, getMapInitializationError } from '../lib/mapboxWebSupport';
import { SkateSpot } from '../types';

const INK = '#07080B';
const PAPER = '#F6F0E5';
const ORANGE = '#E36D3F';
const ACID = '#D9F34A';
const MUTED = '#7F8793';

const NEUTRAL_CENTER: [number, number] = [0, 20];
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
  const [center, setCenter] = useState<[number, number]>(NEUTRAL_CENTER);
  const [hasRealCenter, setHasRealCenter] = useState(false);
  const [loading, setLoading] = useState(true);
  const [locationLoading, setLocationLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mapUnavailable, setMapUnavailable] = useState<string | null>(null);

  const token =
    (Constants.expoConfig?.extra?.mapboxAccessToken as string | undefined) ??
    process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN;

  const openSpot = useCallback(
    (spot: SkateSpot) => {
      router.push({ pathname: '/spot-detail' as any, params: { spotId: spot.id } });
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
      setHasRealCenter(true);
      setCenter(next);
      await loadSpots(next);
      return true;
    } catch (locationError) {
      const message =
        locationError instanceof Error
          ? locationError.message
          : 'Could not determine your location.';
      setHasRealCenter(false);
      setSpots([]);
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
      await locateUser();
      if (active) setLoading(false);
    };
    void bootMapData();
    return () => {
      active = false;
    };
  }, [locateUser]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const mapbox = window.mapboxgl;
    const availabilityError = getMapboxAvailabilityError(mapbox, token);
    if (availabilityError || !mapbox || !token) {
      const message = availabilityError ?? 'The interactive map is unavailable.';
      setMapUnavailable(message);
      Logger.warn('Web scene map unavailable', { message });
      return;
    }

    let map: MapboxGLMap;
    try {
      mapbox.accessToken = token;
      map = new mapbox.Map({
        container: containerRef.current,
        style: 'mapbox://styles/mapbox/streets-v12',
        center,
        zoom: hasRealCenter ? 12 : 2,
        attributionControl: true,
      });
      setMapUnavailable(null);
    } catch (initializationError) {
      const message = getMapInitializationError(initializationError);
      setMapUnavailable(message);
      mapRef.current = null;
      Logger.warn('Web scene map initialization failed', { message });
      return;
    }

    map.on('load', () => setError(current => (current?.includes('map library') ? null : current)));
    map.on('error', () =>
      setError('Map tiles could not be loaded. Check the Mapbox token and network.')
    );
    map.on('moveend', () => {
      if (moveReloadTimerRef.current) clearTimeout(moveReloadTimerRef.current);
      moveReloadTimerRef.current = setTimeout(() => {
        const movedCenter = map.getCenter();
        const next: [number, number] = [movedCenter.lng, movedCenter.lat];
        setHasRealCenter(true);
        setCenter(next);
        void loadSpots(next).catch(queryError => {
          Logger.error('Web map moved-area spots query failed', queryError);
          setError(
            'Skate spots could not be loaded for this area. Check your connection and try again.'
          );
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
    map.flyTo({ center, zoom: hasRealCenter ? 14 : 2 });
  }, [center, hasRealCenter]);

  useEffect(() => {
    const mapbox = window.mapboxgl;
    const map = mapRef.current;
    if (!mapbox || !map) return;

    markersRef.current.forEach(marker => marker.remove());

    const spotMarkers = spots.map(spot => {
      const selected = selectedSpot?.id === spot.id;
      const hasPhoto = typeof spot.image_url === 'string' && spot.image_url.trim().length > 0;
      const el = document.createElement('button');
      el.type = 'button';
      el.title = spot.name;
      el.setAttribute('aria-label', `Open ${spot.name}`);
      el.style.width = hasPhoto ? (selected ? '50px' : '44px') : selected ? '34px' : '28px';
      el.style.height = hasPhoto ? (selected ? '50px' : '44px') : selected ? '34px' : '28px';
      el.style.borderRadius = hasPhoto ? '13px' : selected ? '11px' : '999px';
      el.style.border = `3px solid ${INK}`;
      el.style.background = selected ? ORANGE : ACID;
      el.style.padding = hasPhoto ? '2px' : '0';
      el.style.overflow = 'hidden';
      el.style.boxShadow = selected
        ? '0 0 0 5px rgba(227,109,63,.23), 0 7px 16px rgba(0,0,0,.38)'
        : '0 0 0 4px rgba(217,243,74,.22), 0 5px 12px rgba(0,0,0,.32)';
      el.style.cursor = 'pointer';
      el.style.transition = 'all 160ms ease';
      if (hasPhoto) {
        const image = document.createElement('img');
        image.src = spot.image_url!;
        image.alt = '';
        image.style.width = '100%';
        image.style.height = '100%';
        image.style.objectFit = 'cover';
        image.style.borderRadius = '8px';
        image.style.display = 'block';
        el.appendChild(image);
      }
      el.addEventListener('click', event => {
        event.stopPropagation();
        setSelectedSpot(spot);
        map.flyTo({ center: [spot.longitude, spot.latitude], zoom: 15 });
      });

      return new mapbox.Marker({ element: el })
        .setLngLat([spot.longitude, spot.latitude])
        .setPopup(new mapbox.Popup({ offset: 18 }).setText(spot.name))
        .addTo(map);
    });

    const sponsorElement = document.createElement('button');
    sponsorElement.type = 'button';
    sponsorElement.title = 'Portal Dimension — Newport, Oregon Skatepark';
    sponsorElement.setAttribute('aria-label', 'Open Portal Dimension website');
    sponsorElement.style.width = '58px';
    sponsorElement.style.height = '58px';
    sponsorElement.style.borderRadius = '14px';
    sponsorElement.style.border = `3px solid ${ORANGE}`;
    sponsorElement.style.background = '#fff';
    sponsorElement.style.padding = '3px';
    sponsorElement.style.cursor = 'pointer';
    sponsorElement.style.boxShadow = '0 6px 18px rgba(0,0,0,.34)';

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

    const sponsorMarker = new mapbox.Marker({ element: sponsorElement })
      .setLngLat(PORTAL_DIMENSION_COORDINATES)
      .setPopup(
        new mapbox.Popup({ offset: 20 }).setHTML(
          '<strong>Portal Dimension</strong><br/>Newport, Oregon skatepark partner — tap the logo to visit.'
        )
      )
      .addTo(map);

    markersRef.current = [...spotMarkers, sponsorMarker];
  }, [spots, selectedSpot?.id]);

  if (!token) {
    return (
      <MapError
        message="Mapbox is not configured. Set EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN."
        onAddSpot={() => router.push('/add-spot' as any)}
      />
    );
  }

  if (mapUnavailable) {
    return (
      <MapError
        message={`${mapUnavailable} You can still add a real spot using GPS or exact coordinates.`}
        onAddSpot={() => router.push('/add-spot' as any)}
      />
    );
  }

  return (
    <View style={s.container}>
      <View ref={containerRef} nativeID="skatequest-web-map" style={s.map} />

      <View pointerEvents="box-none" style={s.topHud}>
        <View style={s.sceneCard}>
          <View style={s.sceneCardTop}>
            <View style={s.sceneDot} />
            <Text style={s.sceneKicker}>SCENE MAP</Text>
          </View>
          <Text style={s.sceneCount}>{hasRealCenter ? spots.length : '—'}</Text>
          <Text style={s.sceneLabel}>
            {hasRealCenter ? 'REAL SPOTS NEARBY' : 'ENABLE GPS TO LOAD'}
          </Text>
        </View>

        <View style={s.gpsChip}>
          <Crosshair color={INK} size={14} strokeWidth={3} />
          <Text style={s.gpsChipText}>{hasRealCenter ? 'GPS LIVE' : 'GPS OFF'}</Text>
        </View>

        {error ? (
          <View style={s.errorCard}>
            <TriangleAlert color={ORANGE} size={19} />
            <Text selectable style={s.errorText}>
              {error}
            </Text>
          </View>
        ) : null}
      </View>

      <View style={s.controlStack}>
        <MapButton
          label="Use my location"
          onPress={() => void locateUser()}
          accent={ACID}
          icon={
            locationLoading ? (
              <ActivityIndicator color={INK} />
            ) : (
              <Crosshair color={INK} size={21} strokeWidth={2.8} />
            )
          }
        />
        <MapButton
          label="Add a spot"
          onPress={() => router.push('/add-spot' as any)}
          accent={ORANGE}
          icon={<Plus color={INK} size={23} strokeWidth={3} />}
        />
      </View>

      {loading ? (
        <View style={s.loadingBadge}>
          <ActivityIndicator color={INK} />
          <Text style={s.loadingBadgeText}>SCANNING THE SCENE</Text>
        </View>
      ) : null}

      <ScrollView
        horizontal
        style={s.spotRailWrap}
        contentContainerStyle={s.spotRail}
        showsHorizontalScrollIndicator={false}
      >
        {spots.slice(0, 15).map((spot, index) => {
          const selected = selectedSpot?.id === spot.id;
          return (
            <Pressable
              key={spot.id}
              onPress={() => {
                setSelectedSpot(spot);
                mapRef.current?.flyTo({ center: [spot.longitude, spot.latitude], zoom: 15 });
              }}
              style={[
                s.spotCard,
                selected && s.spotCardSelected,
                index % 2 === 1 && s.spotCardTilt,
              ]}
            >
              {spot.image_url ? (
                <Image
                  source={{ uri: spot.image_url }}
                  style={s.spotThumb}
                  resizeMode="cover"
                  accessibilityLabel={`Photo of ${spot.name}`}
                />
              ) : null}
              <View style={[s.spotRank, selected && s.spotRankSelected]}>
                <Text style={s.spotRankText}>{String(index + 1).padStart(2, '0')}</Text>
              </View>
              <View style={s.spotCopy}>
                <View style={s.spotTypeRow}>
                  <MapPin color={selected ? INK : ORANGE} size={12} />
                  <Text style={[s.spotType, selected && s.spotTypeSelected]}>
                    {String(spot.spot_type ?? 'SKATE SPOT').toUpperCase()}
                  </Text>
                </View>
                <Text numberOfLines={1} style={[s.spotName, selected && s.spotNameSelected]}>
                  {spot.name}
                </Text>
                <Text numberOfLines={1} style={[s.spotMeta, selected && s.spotMetaSelected]}>
                  {spot.difficulty ? `${spot.difficulty} • ` : ''}
                  {spot.tricks?.length ?? 0} TRICKS LOGGED
                </Text>
              </View>
              <Pressable
                accessibilityRole="button"
                onPress={event => {
                  event.stopPropagation?.();
                  openSpot(spot);
                }}
                style={[s.openSpotBtn, selected && s.openSpotBtnSelected]}
              >
                <Text style={s.openSpotText}>OPEN</Text>
                <Text style={s.openSpotArrow}>↗</Text>
              </Pressable>
            </Pressable>
          );
        })}

        {spots.length === 0 && !loading ? (
          <View style={s.emptyCard}>
            <Flame color={ORANGE} size={24} />
            <Text style={s.emptyTitle}>NO SAVED SPOTS HERE YET</Text>
            <Text style={s.emptyText}>
              GPS only finds nearby pins—it never limits where you can add one. Move the map and
              drop a real spot anywhere.
            </Text>
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

function MapButton({
  label,
  onPress,
  icon,
  accent,
}: {
  label: string;
  onPress: () => void;
  icon: React.ReactNode;
  accent: string;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={[s.mapButton, { backgroundColor: accent }]}
    >
      {icon}
    </Pressable>
  );
}

function MapError({ message, onAddSpot }: { message: string; onAddSpot: () => void }) {
  return (
    <View style={s.errorScreen}>
      <View style={s.errorStamp}>
        <MapPin color={INK} size={34} />
      </View>
      <Text style={s.errorScreenKicker}>MAP OFFLINE</Text>
      <Text selectable style={s.errorScreenText}>
        {message}
      </Text>
      <Pressable accessibilityRole="button" onPress={onAddSpot} style={s.errorAddButton}>
        <Plus color={INK} size={19} strokeWidth={3} />
        <Text style={s.errorAddButtonText}>ADD A SPOT WITHOUT THE MAP</Text>
      </Pressable>
      <RotateCcw color={MUTED} size={19} />
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: INK },
  map: { flex: 1, minHeight: 420 },
  topHud: { position: 'absolute', top: 15, left: 14, right: 14, alignItems: 'flex-start', gap: 8 },
  sceneCard: {
    width: 145,
    minHeight: 111,
    backgroundColor: INK,
    borderRadius: 21,
    borderWidth: 2,
    borderColor: PAPER,
    padding: 13,
    transform: [{ rotate: '-1.5deg' }],
    shadowColor: '#000',
    shadowOpacity: 0.24,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 6,
  },
  sceneCardTop: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  sceneDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: ACID },
  sceneKicker: { color: PAPER, fontSize: 8, fontWeight: '900', letterSpacing: 1.35 },
  sceneCount: { color: ACID, fontSize: 35, lineHeight: 37, fontWeight: '900', marginTop: 5 },
  sceneLabel: { color: PAPER, fontSize: 7.5, fontWeight: '900', letterSpacing: 0.85, marginTop: 2 },
  gpsChip: {
    position: 'absolute',
    right: 0,
    top: 0,
    minHeight: 38,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 11,
    borderRadius: 13,
    backgroundColor: ACID,
    borderWidth: 2,
    borderColor: INK,
    transform: [{ rotate: '1.5deg' }],
  },
  gpsChipText: { color: INK, fontSize: 9, fontWeight: '900', letterSpacing: 1 },
  errorCard: {
    maxWidth: 340,
    marginTop: 2,
    backgroundColor: INK,
    borderColor: ORANGE,
    borderWidth: 2,
    borderRadius: 16,
    padding: 11,
    flexDirection: 'row',
    gap: 9,
  },
  errorText: { color: PAPER, flex: 1, fontSize: 11.5, lineHeight: 16, fontWeight: '700' },
  controlStack: { position: 'absolute', right: 14, bottom: 244, gap: 9 },
  mapButton: {
    width: 51,
    height: 51,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: INK,
    shadowColor: '#000',
    shadowOpacity: 0.24,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 5 },
    elevation: 7,
  },
  loadingBadge: {
    position: 'absolute',
    top: '46%',
    alignSelf: 'center',
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    paddingHorizontal: 13,
    borderRadius: 14,
    backgroundColor: ACID,
    borderWidth: 2,
    borderColor: INK,
  },
  loadingBadgeText: { color: INK, fontSize: 9, fontWeight: '900', letterSpacing: 1.1 },
  spotRailWrap: { position: 'absolute', left: 0, right: 0, bottom: 92, maxHeight: 132 },
  spotRail: { paddingHorizontal: 14, gap: 10, alignItems: 'flex-end' },
  spotCard: {
    width: 252,
    minHeight: 116,
    borderRadius: 20,
    backgroundColor: INK,
    borderWidth: 2,
    borderColor: PAPER,
    flexDirection: 'row',
    alignItems: 'stretch',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.24,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 7,
  },
  spotCardSelected: { backgroundColor: ACID, borderColor: INK, transform: [{ rotate: '-1deg' }] },
  spotCardTilt: { transform: [{ rotate: '0.6deg' }] },
  spotThumb: { width: 74, height: '100%' },
  spotRank: { width: 38, backgroundColor: ORANGE, alignItems: 'center', justifyContent: 'center' },
  spotRankSelected: { backgroundColor: ORANGE },
  spotRankText: { color: INK, fontSize: 13, fontWeight: '900', transform: [{ rotate: '-90deg' }] },
  spotCopy: { flex: 1, paddingHorizontal: 11, paddingVertical: 12, justifyContent: 'center' },
  spotTypeRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  spotType: { color: ORANGE, fontSize: 7.5, fontWeight: '900', letterSpacing: 0.9 },
  spotTypeSelected: { color: INK },
  spotName: { color: PAPER, fontSize: 16, fontWeight: '900', marginTop: 5, letterSpacing: -0.35 },
  spotNameSelected: { color: INK },
  spotMeta: { color: '#A4ABB6', fontSize: 8.5, fontWeight: '800', marginTop: 4 },
  spotMetaSelected: { color: 'rgba(7,8,11,0.68)' },
  openSpotBtn: {
    width: 52,
    backgroundColor: PAPER,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  openSpotBtnSelected: { backgroundColor: ORANGE },
  openSpotText: { color: INK, fontSize: 8, fontWeight: '900', letterSpacing: 0.7 },
  openSpotArrow: { color: INK, fontSize: 18, fontWeight: '900' },
  emptyCard: {
    width: 276,
    minHeight: 110,
    borderRadius: 20,
    padding: 15,
    backgroundColor: INK,
    borderWidth: 2,
    borderColor: PAPER,
  },
  emptyTitle: { color: PAPER, fontSize: 15, fontWeight: '900', marginTop: 7 },
  emptyText: { color: '#A4ABB6', fontSize: 10.5, lineHeight: 15, marginTop: 4 },
  errorScreen: {
    flex: 1,
    backgroundColor: INK,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 10,
  },
  errorStamp: {
    width: 68,
    height: 68,
    borderRadius: 19,
    backgroundColor: ORANGE,
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ rotate: '-5deg' }],
  },
  errorScreenKicker: {
    color: ORANGE,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.8,
    marginTop: 4,
  },
  errorScreenText: {
    color: PAPER,
    textAlign: 'center',
    fontSize: 15,
    lineHeight: 21,
    maxWidth: 330,
  },
  errorAddButton: {
    minHeight: 46,
    marginTop: 5,
    borderRadius: 13,
    paddingHorizontal: 13,
    backgroundColor: ACID,
    borderWidth: 2,
    borderColor: INK,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  errorAddButtonText: { color: INK, fontSize: 8, fontWeight: '900', letterSpacing: 0.8 },
});
