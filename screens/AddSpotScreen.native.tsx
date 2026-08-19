import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Mapbox from '@rnmapbox/maps';
import * as Location from 'expo-location';
import { Crosshair, MapPin, Plus, ShieldCheck } from 'lucide-react-native';
import { useNavigation, useRoute } from '../lib/useNavigation';
import { useAuthStore } from '../stores/useAuthStore';
import { spotsService } from '../lib/spotsService';

const ACCENT = '#D2673D';
const BG = '#05070B';
const CARD = '#101722';
const BORDER = '#202B3A';
const NEUTRAL_CENTER: [number, number] = [0, 20];
const OBSTACLES = ['Stairs', 'Handrail', 'Flatbar', 'Ledge', 'Hubba', 'Manual Pad', 'Quarterpipe', 'Bowl', 'Gap', 'Wallride'];
const TYPES = ['park', 'street', 'diy', 'quest', 'shop'] as const;
const DIFFICULTIES = ['Beginner', 'Intermediate', 'Advanced'] as const;
const RISKS = ['low', 'medium', 'high'] as const;

export default function AddSpotScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const user = useAuthStore(state => state.user);
  const cameraRef = useRef<Mapbox.Camera>(null);
  const routeLat = Number(route.params?.latitude);
  const routeLng = Number(route.params?.longitude);
  const hasRoutePoint = Number.isFinite(routeLat) && Number.isFinite(routeLng);

  const [coordinates, setCoordinates] = useState<[number, number]>(hasRoutePoint ? [routeLng, routeLat] : NEUTRAL_CENTER);
  const [hasCoordinates, setHasCoordinates] = useState(hasRoutePoint);
  const [name, setName] = useState('');
  const [difficulty, setDifficulty] = useState<(typeof DIFFICULTIES)[number]>('Beginner');
  const [spotType, setSpotType] = useState<(typeof TYPES)[number]>('park');
  const [bustRisk, setBustRisk] = useState<(typeof RISKS)[number]>('low');
  const [obstacles, setObstacles] = useState<string[]>([]);
  const [tricks, setTricks] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [locating, setLocating] = useState(false);
  const [locationMessage, setLocationMessage] = useState<string | null>(null);

  const locate = async () => {
    setLocating(true);
    setLocationMessage(null);
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== 'granted') {
        setLocationMessage('Location permission is off. Tap the real spot on the map instead.');
        return;
      }
      const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const next: [number, number] = [location.coords.longitude, location.coords.latitude];
      setCoordinates(next);
      setHasCoordinates(true);
      cameraRef.current?.setCamera({ centerCoordinate: next, zoomLevel: 16, animationDuration: 700 });
    } catch (error) {
      setLocationMessage(error instanceof Error ? error.message : 'Could not get your current location.');
    } finally {
      setLocating(false);
    }
  };

  useEffect(() => {
    if (!hasRoutePoint) void locate();
  }, []);

  const handleMapPress = (event: any) => {
    const point = event?.geometry?.coordinates;
    if (!Array.isArray(point) || point.length < 2) return;
    const next: [number, number] = [Number(point[0]), Number(point[1])];
    if (!Number.isFinite(next[0]) || !Number.isFinite(next[1])) return;
    setCoordinates(next);
    setHasCoordinates(true);
  };

  const toggleObstacle = (item: string) => {
    setObstacles(current => current.includes(item) ? current.filter(value => value !== item) : [...current, item]);
  };

  const submit = async () => {
    if (!user) {
      Alert.alert('Sign in required', 'Sign in before adding a spot.');
      return;
    }
    if (!name.trim()) {
      Alert.alert('Spot name required', 'Give the real spot a name.');
      return;
    }
    if (!hasCoordinates) {
      Alert.alert('Location required', 'Tap the real spot on the map or use your current location.');
      return;
    }
    try {
      setSubmitting(true);
      const { data, error } = await spotsService.create({
        name: name.trim(),
        latitude: coordinates[1],
        longitude: coordinates[0],
        difficulty,
        obstacles,
        tricks: tricks.split(',').map(value => value.trim()).filter(Boolean),
        added_by: user.id,
        spot_type: spotType,
        bust_risk: spotType === 'street' ? bustRisk : undefined,
      });
      if (error) throw error;
      if (!data?.id) throw new Error('The saved spot did not return an ID.');
      Alert.alert(
        'Spot added',
        'Your real spot is saved. Adding a spot does not self-award XP; progression stays tied to verified game activity.',
        [{ text: 'Done', onPress: () => navigation.goBack() }]
      );
    } catch (error: any) {
      Alert.alert('Spot not saved', error?.message ?? 'Try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScrollView style={s.container} contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
      <View style={s.hero}>
        <Text style={s.eyebrow}>REAL-WORLD MAP</Text>
        <Text style={s.title}>Add a skate spot</Text>
        <Text style={s.subtitle}>Put the pin on the actual location. No guessed coordinates and no fake spot data.</Text>
      </View>

      <View style={s.mapCard}>
        <Mapbox.MapView style={StyleSheet.absoluteFill} styleURL={Mapbox.StyleURL.Street} onPress={handleMapPress}>
          <Mapbox.Camera ref={cameraRef} centerCoordinate={coordinates} zoomLevel={hasCoordinates ? 15 : 1.4} />
          <Mapbox.UserLocation visible />
          {hasCoordinates ? (
            <Mapbox.PointAnnotation id="new-spot" coordinate={coordinates}>
              <View style={s.pin}><MapPin color="#fff" size={25} /></View>
            </Mapbox.PointAnnotation>
          ) : null}
        </Mapbox.MapView>
        <View style={s.mapTopBar}>
          <View style={s.locationPill}>
            <MapPin color={hasCoordinates ? '#72E39C' : '#F7B955'} size={14} />
            <Text style={s.locationPillText}>{hasCoordinates ? `${coordinates[1].toFixed(5)}, ${coordinates[0].toFixed(5)}` : 'Choose a real location'}</Text>
          </View>
          <Pressable style={s.locateButton} onPress={() => void locate()} disabled={locating}>
            {locating ? <ActivityIndicator color={ACCENT} size="small" /> : <Crosshair color={ACCENT} size={20} />}
          </Pressable>
        </View>
      </View>
      {locationMessage ? <Text style={s.warning}>{locationMessage}</Text> : null}

      <View style={s.formCard}>
        <Label text="Spot name" />
        <TextInput style={s.input} value={name} onChangeText={setName} placeholder="Downtown ledges" placeholderTextColor="#596577" maxLength={80} />

        <Label text="Spot type" />
        <ChoiceRow values={TYPES} value={spotType} onChange={setSpotType} />

        <Label text="Difficulty" />
        <ChoiceRow values={DIFFICULTIES} value={difficulty} onChange={setDifficulty} />

        {spotType === 'street' ? <><Label text="Bust risk" /><ChoiceRow values={RISKS} value={bustRisk} onChange={setBustRisk} /></> : null}

        <Label text="Obstacles" />
        <View style={s.wrap}>
          {OBSTACLES.map(item => (
            <Pressable key={item} onPress={() => toggleObstacle(item)} style={[s.chip, obstacles.includes(item) && s.chipActive]}>
              <Text style={[s.chipText, obstacles.includes(item) && s.chipTextActive]}>{item}</Text>
            </Pressable>
          ))}
        </View>

        <Label text="Known tricks / lines" />
        <TextInput
          style={[s.input, s.multiline]}
          value={tricks}
          onChangeText={setTricks}
          placeholder="kickflip, 50-50, manual line"
          placeholderTextColor="#596577"
          multiline
          maxLength={300}
        />
        <Text style={s.helper}>Comma-separated tags are saved with the spot so skaters know what works there.</Text>

        <View style={s.integrityBox}>
          <ShieldCheck color="#72E39C" size={18} />
          <Text style={s.integrityText}>Community submissions cannot set sponsor status, QR rewards, crew ownership, reputation points, or XP.</Text>
        </View>

        <Pressable style={[s.submitButton, submitting && { opacity: 0.55 }]} disabled={submitting} onPress={() => void submit()}>
          {submitting ? <ActivityIndicator color="#fff" /> : <><Plus color="#fff" size={19} /><Text style={s.submitText}>SAVE REAL SPOT</Text></>}
        </Pressable>
      </View>
    </ScrollView>
  );
}

function Label({ text }: { text: string }) {
  return <Text style={s.label}>{text}</Text>;
}

function ChoiceRow<T extends readonly string[]>({ values, value, onChange }: { values: T; value: T[number]; onChange: (value: T[number]) => void }) {
  return (
    <View style={s.wrap}>
      {values.map(item => (
        <Pressable key={item} onPress={() => onChange(item)} style={[s.chip, value === item && s.chipActive]}>
          <Text style={[s.chipText, value === item && s.chipTextActive]}>{item.toUpperCase()}</Text>
        </Pressable>
      ))}
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  content: { paddingBottom: 48 },
  hero: { padding: 20, paddingBottom: 14 },
  eyebrow: { color: ACCENT, fontSize: 9, fontWeight: '900', letterSpacing: 1.4 },
  title: { color: '#F7F4EF', fontSize: 27, fontWeight: '900', marginTop: 4 },
  subtitle: { color: '#8793A4', fontSize: 12, lineHeight: 18, marginTop: 5 },
  mapCard: { marginHorizontal: 16, height: 310, borderRadius: 22, overflow: 'hidden', borderWidth: 1, borderColor: BORDER, backgroundColor: '#0F1722' },
  mapTopBar: { position: 'absolute', top: 12, left: 12, right: 12, flexDirection: 'row', gap: 8, alignItems: 'center' },
  locationPill: { flex: 1, minHeight: 42, borderRadius: 13, backgroundColor: 'rgba(5,7,11,.88)', flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 11 },
  locationPillText: { color: '#DDE4EC', fontSize: 11, fontWeight: '800', flex: 1 },
  locateButton: { width: 42, height: 42, borderRadius: 13, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  pin: { width: 38, height: 38, borderRadius: 19, backgroundColor: ACCENT, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: '#fff' },
  warning: { color: '#FBBF8A', fontSize: 11, lineHeight: 17, marginHorizontal: 20, marginTop: 9 },
  formCard: { margin: 16, backgroundColor: CARD, borderRadius: 22, borderWidth: 1, borderColor: BORDER, padding: 16 },
  label: { color: '#B8C2CF', fontSize: 11, fontWeight: '900', marginTop: 12, marginBottom: 8, letterSpacing: 0.3 },
  input: { minHeight: 48, borderRadius: 13, backgroundColor: '#0C131D', borderWidth: 1, borderColor: '#293648', color: '#fff', paddingHorizontal: 13, fontSize: 14 },
  multiline: { minHeight: 82, paddingTop: 12, textAlignVertical: 'top' },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  chip: { paddingHorizontal: 11, paddingVertical: 8, borderRadius: 10, backgroundColor: '#0C131D', borderWidth: 1, borderColor: '#293648' },
  chipActive: { backgroundColor: ACCENT, borderColor: ACCENT },
  chipText: { color: '#8491A2', fontSize: 10, fontWeight: '800' },
  chipTextActive: { color: '#fff' },
  helper: { color: '#627083', fontSize: 10, lineHeight: 15, marginTop: 6 },
  integrityBox: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, padding: 12, borderRadius: 13, backgroundColor: '#10221A', marginTop: 16 },
  integrityText: { color: '#9EC5AD', fontSize: 10, lineHeight: 16, flex: 1 },
  submitButton: { minHeight: 52, marginTop: 16, borderRadius: 14, backgroundColor: ACCENT, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  submitText: { color: '#fff', fontSize: 13, fontWeight: '900', letterSpacing: 0.8 },
});
