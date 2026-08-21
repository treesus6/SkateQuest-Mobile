import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Constants from 'expo-constants';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Crosshair,
  MapPin,
  Plus,
  ShieldCheck,
  Sparkles,
  Target,
} from 'lucide-react-native';
import { useNavigation, useRoute } from '../lib/useNavigation';
import { getBrowserLocation } from '../lib/browserLocation';
import { spotsService } from '../lib/spotsService';
import { useAuthStore } from '../stores/useAuthStore';
import { Logger } from '../lib/logger';

const INK = '#07080B';
const PAPER = '#F6F0E5';
const ORANGE = '#E36D3F';
const ACID = '#D9F34A';
const BLUE = '#72A9FF';
const MUTED = '#929AA7';
const NEUTRAL_CENTER: [number, number] = [0, 20];
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
  const routedCoordinates = Number.isFinite(Number(route.params?.longitude)) && Number.isFinite(Number(route.params?.latitude));
  const [coordinates, setCoordinates] = useState<[number, number]>(
    routedCoordinates ? [Number(route.params.longitude), Number(route.params.latitude)] : NEUTRAL_CENTER
  );
  const [hasCoordinates, setHasCoordinates] = useState(routedCoordinates);
  const [name, setName] = useState('');
  const [difficulty, setDifficulty] = useState<'Beginner' | 'Intermediate' | 'Advanced'>('Beginner');
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
      zoom: hasCoordinates ? 14 : 2,
      attributionControl: true,
    });
    const pin = hasCoordinates
      ? new mapbox.Marker({ color: ORANGE }).setLngLat(coordinates).addTo(instance)
      : null;
    instance.on('click', event => {
      const next: [number, number] = [event.lngLat.lng, event.lngLat.lat];
      setCoordinates(next);
      setHasCoordinates(true);
      if (marker.current) {
        marker.current.setLngLat(next);
      } else {
        marker.current = new mapbox.Marker({ color: ORANGE }).setLngLat(next).addTo(instance);
      }
    });
    map.current = instance;
    marker.current = pin;
    return () => {
      marker.current?.remove();
      instance.remove();
      marker.current = null;
    };
  }, []);

  const locate = async () => {
    setLocationError(null);
    try {
      const position = await getBrowserLocation();
      const next: [number, number] = [position.longitude, position.latitude];
      setCoordinates(next);
      setHasCoordinates(true);
      if (marker.current) {
        marker.current.setLngLat(next);
      } else if (map.current && window.mapboxgl) {
        marker.current = new window.mapboxgl.Marker({ color: ORANGE })
          .setLngLat(next)
          .addTo(map.current);
      }
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
    if (!hasCoordinates) {
      Alert.alert('Location required', 'Tap the map or use your current location before saving this spot.');
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
        if (readError || !saved || (saved as any).added_by !== user.id) {
          throw readError ?? new Error('The saved spot could not be verified.');
        }
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

  const readyToSave = !!name.trim() && hasCoordinates && !submitting;

  return (
    <ScrollView style={s.container} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
      <View style={s.topBar}>
        <Pressable style={s.backButton} onPress={() => navigation.goBack()} accessibilityLabel="Go back">
          <ArrowLeft color={PAPER} size={20} strokeWidth={2.8} />
        </Pressable>
        <View style={s.modePill}>
          <Target color={ACID} size={15} />
          <Text style={s.modePillText}>SPOT DROP // WEB</Text>
        </View>
      </View>

      <View style={s.hero}>
        <View style={s.heroOrange} />
        <View style={s.heroAcid} />
        <View style={s.heroBlue} />
        <View style={s.heroStamp}>
          <MapPin color={INK} size={27} strokeWidth={2.8} />
        </View>
        <Text style={s.heroKicker}>REAL-WORLD MAP // COMMUNITY</Text>
        <Text style={s.heroTitle}>DROP A{`\n`}REAL SPOT.</Text>
        <Text style={s.heroSub}>Pin the actual place, tell skaters what is there, and put it on the SkateQuest map.</Text>
      </View>

      <View style={s.mapShell}>
        <View ref={container} style={s.map} />
        <View style={s.mapTopHud} pointerEvents="box-none">
          <View style={[s.locationBadge, hasCoordinates && s.locationBadgeReady]}>
            <MapPin color={hasCoordinates ? INK : PAPER} size={16} />
            <View style={s.locationBadgeCopy}>
              <Text style={[s.locationBadgeLabel, hasCoordinates && s.locationBadgeLabelReady]}>PIN STATUS</Text>
              <Text style={[s.locationBadgeValue, hasCoordinates && s.locationBadgeValueReady]}>
                {hasCoordinates ? 'REAL LOCATION LOCKED' : 'CHOOSE A LOCATION'}
              </Text>
            </View>
            {hasCoordinates ? <Check color={INK} size={17} strokeWidth={3} /> : null}
          </View>
          <Pressable style={s.locateButton} onPress={() => void locate()}>
            <Crosshair color={INK} size={20} strokeWidth={2.8} />
          </Pressable>
        </View>

        <View style={s.mapBottomHud} pointerEvents="none">
          <View style={s.mapHint}>
            <Crosshair color={ORANGE} size={16} />
            <Text style={s.mapHintText}>TAP THE EXACT SPOT ON THE MAP</Text>
          </View>
        </View>
      </View>

      {locationError ? (
        <View style={s.errorCard}>
          <Text style={s.errorKicker}>LOCATION DIDN'T LOCK</Text>
          <Text selectable style={s.errorText}>{locationError}</Text>
          <Pressable style={s.errorRetry} onPress={() => void locate()}>
            <Crosshair color={INK} size={15} />
            <Text style={s.errorRetryText}>TRY MY LOCATION AGAIN</Text>
          </Pressable>
        </View>
      ) : null}

      <View style={s.coordinateRail}>
        <View style={[s.coordinateMark, hasCoordinates && s.coordinateMarkReady]}>
          {hasCoordinates ? <Check color={INK} size={18} strokeWidth={3} /> : <Crosshair color={PAPER} size={18} />}
        </View>
        <View style={s.coordinateCopy}>
          <Text style={s.coordinateLabel}>MAP COORDINATES</Text>
          <Text style={s.coordinateValue}>
            {hasCoordinates
              ? `${coordinates[1].toFixed(6)}, ${coordinates[0].toFixed(6)}`
              : 'Choose the real spot location before saving.'}
          </Text>
        </View>
      </View>

      <View style={s.formCard}>
        <View style={s.sectionHead}>
          <View style={s.sectionNumber}><Text style={s.sectionNumberText}>01</Text></View>
          <View style={s.sectionCopy}>
            <Text style={s.sectionKicker}>NAME + IDENTITY</Text>
            <Text style={s.sectionTitle}>What spot is this?</Text>
          </View>
          <Sparkles color={ORANGE} size={20} />
        </View>

        <Field label="SPOT NAME *" value={name} onChangeText={setName} placeholder="Downtown ledges" />

        <Choice
          label="SPOT TYPE"
          values={['park', 'street', 'diy', 'quest', 'shop']}
          value={spotType}
          onChange={value => setSpotType(value as typeof spotType)}
        />
        <Choice
          label="DIFFICULTY"
          values={['Beginner', 'Intermediate', 'Advanced']}
          value={difficulty}
          onChange={value => setDifficulty(value as typeof difficulty)}
        />
        <Choice
          label="BUST RISK"
          values={['low', 'medium', 'high']}
          value={bustRisk}
          onChange={value => setBustRisk(value as typeof bustRisk)}
        />
      </View>

      <View style={s.obstacleCard}>
        <View style={s.sectionHead}>
          <View style={[s.sectionNumber, s.sectionNumberBlue]}><Text style={s.sectionNumberText}>02</Text></View>
          <View style={s.sectionCopy}>
            <Text style={s.sectionKicker}>WHAT'S SKATEABLE</Text>
            <Text style={s.sectionTitle}>Obstacles</Text>
          </View>
          <Text style={s.countSticker}>{obstacles.length}</Text>
        </View>
        <Text style={s.sectionBody}>Tag only what is actually there. Skaters use this to know whether a spot is worth the trip.</Text>
        <View style={s.chipWrap}>
          {OBSTACLES.map(item => {
            const active = obstacles.includes(item);
            return (
              <Pressable
                key={item}
                onPress={() =>
                  setObstacles(current =>
                    current.includes(item)
                      ? current.filter(value => value !== item)
                      : [...current, item]
                  )
                }
                style={[s.obstacleChip, active && s.obstacleChipActive]}
              >
                {active ? <Check color={INK} size={13} strokeWidth={3} /> : null}
                <Text style={[s.obstacleChipText, active && s.obstacleChipTextActive]}>{item.toUpperCase()}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={s.integrityCard}>
        <View style={s.integrityMark}>
          <ShieldCheck color={INK} size={22} strokeWidth={2.7} />
        </View>
        <View style={s.integrityCopy}>
          <Text style={s.integrityTitle}>REAL SPOT RULE</Text>
          <Text style={s.integrityText}>SkateQuest will not invent a location for a submission. The pin you choose is the location saved.</Text>
        </View>
      </View>

      <Pressable
        disabled={!readyToSave}
        onPress={() => void submit()}
        style={[s.saveButton, !readyToSave && s.saveButtonDisabled]}
      >
        {submitting ? (
          <ActivityIndicator color={INK} />
        ) : (
          <>
            <View style={s.saveIcon}><Plus color={INK} size={21} strokeWidth={3} /></View>
            <View style={s.saveCopy}>
              <Text style={s.saveTitle}>Save spot</Text>
              <Text style={s.saveSub}>{readyToSave ? 'ADD IT TO THE LIVE MAP' : 'NAME + REAL LOCATION REQUIRED'}</Text>
            </View>
            <ArrowRight color={INK} size={20} strokeWidth={3} />
          </>
        )}
      </Pressable>
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
    <View style={s.field}>
      <Text style={s.fieldLabel}>{props.label}</Text>
      <TextInput
        value={props.value}
        onChangeText={props.onChangeText}
        placeholder={props.placeholder}
        placeholderTextColor="#777D87"
        style={s.input}
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
    <View style={s.choiceBlock}>
      <Text style={s.fieldLabel}>{label}</Text>
      <View style={s.chipWrap}>
        {values.map(item => {
          const active = value === item;
          return (
            <Pressable key={item} onPress={() => onChange(item)} style={[s.choiceChip, active && s.choiceChipActive]}>
              {active ? <Check color={INK} size={12} strokeWidth={3} /> : null}
              <Text style={[s.choiceChipText, active && s.choiceChipTextActive]}>{item.toUpperCase()}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: INK },
  content: { width: '100%', maxWidth: 760, alignSelf: 'center', paddingHorizontal: 14, paddingTop: 14, paddingBottom: 54 },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  backButton: { width: 42, height: 42, borderRadius: 14, backgroundColor: '#11151B', borderWidth: 1, borderColor: '#303641', alignItems: 'center', justifyContent: 'center' },
  modePill: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 35, paddingHorizontal: 10, borderRadius: 999, backgroundColor: '#11151B', borderWidth: 1, borderColor: '#303641' },
  modePillText: { color: PAPER, fontSize: 8, fontWeight: '900', letterSpacing: 1 },

  hero: { minHeight: 245, borderRadius: 30, padding: 19, backgroundColor: '#11141A', borderWidth: 1, borderColor: '#2A2E36', overflow: 'hidden', position: 'relative', justifyContent: 'flex-end' },
  heroOrange: { position: 'absolute', width: 280, height: 88, right: -92, top: 30, backgroundColor: ORANGE, transform: [{ rotate: '29deg' }] },
  heroAcid: { position: 'absolute', width: 260, height: 27, left: -90, bottom: 44, backgroundColor: ACID, transform: [{ rotate: '-11deg' }] },
  heroBlue: { position: 'absolute', width: 150, height: 150, borderRadius: 75, right: 22, bottom: -42, backgroundColor: BLUE, opacity: 0.15 },
  heroStamp: { position: 'absolute', top: 18, left: 18, width: 62, height: 62, borderRadius: 18, backgroundColor: ACID, borderWidth: 3, borderColor: INK, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '-5deg' }] },
  heroKicker: { color: ORANGE, fontSize: 9, fontWeight: '900', letterSpacing: 1.7 },
  heroTitle: { color: PAPER, fontSize: 44, lineHeight: 39, fontWeight: '900', letterSpacing: -2.5, marginTop: 5 },
  heroSub: { color: '#B4BBC5', fontSize: 11.5, lineHeight: 17, fontWeight: '700', maxWidth: 390, marginTop: 8 },

  mapShell: { height: 390, marginTop: 10, borderRadius: 26, overflow: 'hidden', backgroundColor: '#111827', borderWidth: 2, borderColor: INK, position: 'relative' },
  map: { flex: 1 },
  mapTopHud: { position: 'absolute', top: 12, left: 12, right: 12, flexDirection: 'row', gap: 8, alignItems: 'center' },
  locationBadge: { flex: 1, minHeight: 52, borderRadius: 16, paddingHorizontal: 11, backgroundColor: 'rgba(7,8,11,0.86)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.16)', flexDirection: 'row', alignItems: 'center', gap: 8 },
  locationBadgeReady: { backgroundColor: ACID, borderWidth: 2, borderColor: INK },
  locationBadgeCopy: { flex: 1 },
  locationBadgeLabel: { color: '#7D8795', fontSize: 6.5, fontWeight: '900', letterSpacing: 0.8 },
  locationBadgeLabelReady: { color: 'rgba(7,8,11,0.52)' },
  locationBadgeValue: { color: PAPER, fontSize: 9, fontWeight: '900', letterSpacing: 0.7, marginTop: 1 },
  locationBadgeValueReady: { color: INK },
  locateButton: { width: 52, height: 52, borderRadius: 16, backgroundColor: ORANGE, borderWidth: 2, borderColor: INK, alignItems: 'center', justifyContent: 'center' },
  mapBottomHud: { position: 'absolute', left: 12, right: 12, bottom: 12, alignItems: 'flex-start' },
  mapHint: { minHeight: 38, borderRadius: 12, paddingHorizontal: 10, backgroundColor: 'rgba(7,8,11,0.88)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.14)', flexDirection: 'row', alignItems: 'center', gap: 7 },
  mapHintText: { color: PAPER, fontSize: 7.5, fontWeight: '900', letterSpacing: 0.8 },

  errorCard: { marginTop: 9, borderRadius: 16, padding: 12, backgroundColor: '#3A201D', borderWidth: 1, borderColor: '#754237' },
  errorKicker: { color: '#FFB19E', fontSize: 8, fontWeight: '900', letterSpacing: 0.8 },
  errorText: { color: '#F5CEC5', fontSize: 10.5, lineHeight: 16, marginTop: 4 },
  errorRetry: { alignSelf: 'flex-start', minHeight: 35, borderRadius: 10, paddingHorizontal: 9, backgroundColor: ORANGE, borderWidth: 1, borderColor: INK, marginTop: 9, flexDirection: 'row', alignItems: 'center', gap: 6 },
  errorRetryText: { color: INK, fontSize: 7, fontWeight: '900', letterSpacing: 0.7 },

  coordinateRail: { minHeight: 67, marginTop: 10, borderRadius: 18, padding: 11, backgroundColor: '#11151B', borderWidth: 1, borderColor: '#303641', flexDirection: 'row', alignItems: 'center', gap: 10 },
  coordinateMark: { width: 42, height: 42, borderRadius: 13, backgroundColor: '#1B222D', alignItems: 'center', justifyContent: 'center' },
  coordinateMarkReady: { backgroundColor: ACID },
  coordinateCopy: { flex: 1 },
  coordinateLabel: { color: ORANGE, fontSize: 7, fontWeight: '900', letterSpacing: 1 },
  coordinateValue: { color: PAPER, fontSize: 10.5, fontWeight: '800', marginTop: 3 },

  formCard: { marginTop: 10, borderRadius: 23, padding: 15, backgroundColor: PAPER, borderWidth: 2, borderColor: INK },
  obstacleCard: { marginTop: 10, borderRadius: 23, padding: 15, backgroundColor: '#11151B', borderWidth: 1, borderColor: '#303641' },
  sectionHead: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  sectionNumber: { width: 39, height: 39, borderRadius: 12, backgroundColor: ORANGE, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '-4deg' }] },
  sectionNumberBlue: { backgroundColor: BLUE },
  sectionNumberText: { color: INK, fontSize: 10, fontWeight: '900' },
  sectionCopy: { flex: 1 },
  sectionKicker: { color: ORANGE, fontSize: 7, fontWeight: '900', letterSpacing: 1.1 },
  sectionTitle: { color: INK, fontSize: 17, fontWeight: '900', letterSpacing: -0.4, marginTop: 1 },
  sectionBody: { color: MUTED, fontSize: 10.5, lineHeight: 16, fontWeight: '700', marginTop: 11 },
  countSticker: { minWidth: 34, height: 34, borderRadius: 11, backgroundColor: ACID, color: INK, textAlign: 'center', lineHeight: 34, fontSize: 11, fontWeight: '900', transform: [{ rotate: '4deg' }] },

  field: { marginTop: 14 },
  fieldLabel: { color: INK, fontSize: 7.5, fontWeight: '900', letterSpacing: 1, marginBottom: 6 },
  input: { minHeight: 52, borderRadius: 14, paddingHorizontal: 13, backgroundColor: '#E9E4DA', borderWidth: 1.5, borderColor: '#CFC8BB', color: INK, fontSize: 14, fontWeight: '700' },
  choiceBlock: { marginTop: 14 },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  choiceChip: { minHeight: 36, borderRadius: 11, paddingHorizontal: 10, borderWidth: 1, borderColor: '#CFC8BB', backgroundColor: '#E9E4DA', flexDirection: 'row', alignItems: 'center', gap: 5 },
  choiceChipActive: { backgroundColor: ACID, borderColor: INK, borderWidth: 1.5 },
  choiceChipText: { color: '#6E6A64', fontSize: 7.5, fontWeight: '900', letterSpacing: 0.6 },
  choiceChipTextActive: { color: INK },
  obstacleChip: { minHeight: 36, borderRadius: 11, paddingHorizontal: 10, borderWidth: 1, borderColor: '#303641', backgroundColor: '#1A2029', flexDirection: 'row', alignItems: 'center', gap: 5 },
  obstacleChipActive: { backgroundColor: ACID, borderColor: INK, borderWidth: 1.5 },
  obstacleChipText: { color: '#96A0AE', fontSize: 7.5, fontWeight: '900', letterSpacing: 0.6 },
  obstacleChipTextActive: { color: INK },

  integrityCard: { minHeight: 78, marginTop: 10, borderRadius: 18, padding: 11, backgroundColor: ACID, borderWidth: 2, borderColor: INK, flexDirection: 'row', alignItems: 'center', gap: 10 },
  integrityMark: { width: 44, height: 44, borderRadius: 13, backgroundColor: ORANGE, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '-4deg' }] },
  integrityCopy: { flex: 1 },
  integrityTitle: { color: INK, fontSize: 8.5, fontWeight: '900', letterSpacing: 0.8 },
  integrityText: { color: 'rgba(7,8,11,0.68)', fontSize: 9.5, lineHeight: 14, fontWeight: '700', marginTop: 3 },

  saveButton: { minHeight: 66, marginTop: 10, borderRadius: 18, backgroundColor: ACID, borderWidth: 2, borderColor: INK, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 10 },
  saveButtonDisabled: { opacity: 0.42 },
  saveIcon: { width: 42, height: 42, borderRadius: 13, backgroundColor: ORANGE, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '-4deg' }] },
  saveCopy: { flex: 1 },
  saveTitle: { color: INK, fontSize: 12, fontWeight: '900', letterSpacing: 0.3 },
  saveSub: { color: 'rgba(7,8,11,0.58)', fontSize: 6.5, fontWeight: '900', letterSpacing: 0.6, marginTop: 2 },
});