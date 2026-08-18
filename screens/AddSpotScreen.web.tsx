import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import Constants from 'expo-constants';
import { useNavigation, useRoute } from '../lib/useNavigation';
import { getBrowserLocation } from '../lib/browserLocation';
import { spotsService } from '../lib/spotsService';
import { useAuthStore } from '../stores/useAuthStore';
import { Logger } from '../lib/logger';

const FALLBACK: [number, number] = [-122.4324, 37.78825];
const OBSTACLES = [
  'Stairs',
  'Handrail',
  'Flatbar',
  'Ledge',
  'Hubba',
  'Manual Pad',
  'Quarterpipe',
  'Bowl',
  'Gap',
  'Wallride',
];

export default function AddSpotScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { user } = useAuthStore();
  const container = useRef<any>(null);
  const map = useRef<MapboxGLMap | null>(null);
  const marker = useRef<MapboxGLMarker | null>(null);
  const [coordinates, setCoordinates] = useState<[number, number]>(
    route.params?.longitude && route.params?.latitude
      ? [route.params.longitude, route.params.latitude]
      : FALLBACK
  );
  const [name, setName] = useState('');
  const [difficulty, setDifficulty] = useState<'Beginner' | 'Intermediate' | 'Advanced'>(
    'Beginner'
  );
  const [spotType, setSpotType] = useState<'park' | 'street' | 'diy' | 'quest' | 'shop'>('park');
  const [bustRisk, setBustRisk] = useState<'low' | 'medium' | 'high'>('low');
  const [obstacles, setObstacles] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  useEffect(() => {
    const mapbox = window.mapboxgl;
    const token =
      (Constants.expoConfig?.extra?.mapboxAccessToken as string | undefined) ??
      process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN;
    if (!container.current || !mapbox || !token) return;
    mapbox.accessToken = token;
    const instance = new mapbox.Map({
      container: container.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: coordinates,
      zoom: 14,
      attributionControl: true,
    });
    const pin = new mapbox.Marker({ color: '#d2673d' }).setLngLat(coordinates).addTo(instance);
    instance.on('click', event => {
      const next: [number, number] = [event.lngLat.lng, event.lngLat.lat];
      setCoordinates(next);
      pin.setLngLat(next);
    });
    map.current = instance;
    marker.current = pin;
    return () => {
      pin.remove();
      instance.remove();
    };
  }, []);

  const locate = async () => {
    setLocationError(null);
    try {
      const position = await getBrowserLocation();
      const next: [number, number] = [position.longitude, position.latitude];
      setCoordinates(next);
      marker.current?.setLngLat(next);
      map.current?.flyTo({ center: next, zoom: 16 });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Location is unavailable.';
      setLocationError(message);
      Logger.warn('Add spot browser location failed', { message });
    }
  };

  const submit = async () => {
    if (!user) return;
    if (!name.trim()) {
      Alert.alert('Spot name required', 'Enter a name for this skate spot.');
      return;
    }
    setSubmitting(true);
    try {
      const { data, error } = await spotsService.create({
        name: name.trim(),
        latitude: coordinates[1],
        longitude: coordinates[0],
        difficulty,
        obstacles,
        added_by: user.id,
        spot_type: spotType,
        bust_risk: bustRisk,
      });
      if (error) throw error;
      const createdId = (data as any)?.id;
      if (createdId) {
        const { data: saved, error: readError } = await spotsService.getById(createdId);
        if (readError || !saved || (saved as any).added_by !== user.id)
          throw readError ?? new Error('The saved spot could not be verified.');
      }
      Alert.alert('Spot added', 'Your spot was saved to SkateQuest.', [
        { text: 'Done', onPress: () => navigation.goBack() },
      ]);
    } catch (error) {
      Logger.error('Web spot creation failed', error);
      Alert.alert('Spot not saved', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      style={{ flex: 1, backgroundColor: '#07090D' }}
      contentContainerStyle={{ paddingBottom: 48 }}
    >
      <View ref={container} style={{ height: 320, backgroundColor: '#111827' }} />
      <View style={{ padding: 20, gap: 14, width: '100%', maxWidth: 680, alignSelf: 'center' }}>
        <Text selectable style={{ color: 'white', fontSize: 25, fontWeight: '900' }}>
          Add a real skate spot
        </Text>
        <Text style={{ color: '#AAB1BC' }}>
          Tap the map or use your current location. Your submission is saved to the existing
          SkateQuest database.
        </Text>
        {locationError ? (
          <Text selectable style={{ color: '#FCA5A5' }}>
            {locationError}
          </Text>
        ) : null}
        <Choice label="Use my location" values={['Locate']} value="Locate" onChange={locate} />
        <Field
          label="Spot name"
          value={name}
          onChangeText={setName}
          placeholder="Downtown ledges"
        />
        <Text style={{ color: '#D1D5DB' }}>
          Coordinates: {coordinates[1].toFixed(6)}, {coordinates[0].toFixed(6)}
        </Text>
        <Choice
          label="Difficulty"
          values={['Beginner', 'Intermediate', 'Advanced']}
          value={difficulty}
          onChange={value => setDifficulty(value as typeof difficulty)}
        />
        <Choice
          label="Spot type"
          values={['park', 'street', 'diy', 'quest', 'shop']}
          value={spotType}
          onChange={value => setSpotType(value as typeof spotType)}
        />
        <Choice
          label="Bust risk"
          values={['low', 'medium', 'high']}
          value={bustRisk}
          onChange={value => setBustRisk(value as typeof bustRisk)}
        />
        <Text style={{ color: 'white', fontWeight: '700' }}>Obstacles</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {OBSTACLES.map(item => (
            <Pressable
              key={item}
              onPress={() =>
                setObstacles(current =>
                  current.includes(item)
                    ? current.filter(value => value !== item)
                    : [...current, item]
                )
              }
              style={{
                padding: 10,
                borderRadius: 999,
                backgroundColor: obstacles.includes(item) ? '#D2673D' : '#1F2937',
              }}
            >
              <Text style={{ color: 'white' }}>{item}</Text>
            </Pressable>
          ))}
        </View>
        <Pressable
          disabled={submitting}
          onPress={submit}
          style={{
            minHeight: 52,
            borderRadius: 14,
            backgroundColor: '#D2673D',
            opacity: submitting ? 0.6 : 1,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {submitting ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={{ color: 'white', fontWeight: '900', fontSize: 16 }}>Save spot</Text>
          )}
        </Pressable>
      </View>
    </ScrollView>
  );
}

function Field(props: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
}) {
  return (
    <View style={{ gap: 7 }}>
      <Text style={{ color: 'white', fontWeight: '700' }}>{props.label}</Text>
      <TextInput
        {...props}
        style={{
          color: 'white',
          backgroundColor: '#111827',
          borderColor: '#374151',
          borderWidth: 1,
          borderRadius: 12,
          minHeight: 50,
          paddingHorizontal: 14,
        }}
      />
    </View>
  );
}
function Choice({
  label,
  values,
  value,
  onChange,
}: {
  label: string;
  values: string[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <View style={{ gap: 8 }}>
      <Text style={{ color: 'white', fontWeight: '700' }}>{label}</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {values.map(item => (
          <Pressable
            key={item}
            onPress={() => onChange(item)}
            style={{
              paddingVertical: 10,
              paddingHorizontal: 13,
              borderRadius: 10,
              backgroundColor: value === item ? '#D2673D' : '#1F2937',
            }}
          >
            <Text style={{ color: 'white', textTransform: 'capitalize' }}>{item}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}
