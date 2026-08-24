import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Mapbox from '@rnmapbox/maps';
import * as Location from 'expo-location';
import { Crosshair, ImagePlus, MapPin, Plus, ShieldCheck, Star } from 'lucide-react-native';
import { useNavigation, useRoute } from '../lib/useNavigation';
import { useAuthStore } from '../stores/useAuthStore';
import { spotsService } from '../lib/spotsService';
import { deleteFromStorage, pickImage, uploadImage } from '../lib/mediaUpload';
import { Logger } from '../lib/logger';
import { getSpotPersistenceError, getSpotSubmissionErrorMessage } from '../lib/spotSubmission';

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
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [pickingPhoto, setPickingPhoto] = useState(false);
  const [potentialRating, setPotentialRating] = useState(3);
  const [difficultyRating, setDifficultyRating] = useState(3);
  const [qualityRating, setQualityRating] = useState(3);
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

  const choosePhoto = async () => {
    try {
      setPickingPhoto(true);
      const asset = await pickImage(false);
      if (asset) setPhotoUri(asset.uri);
    } catch (error) {
      Alert.alert('Photo not selected', getSpotSubmissionErrorMessage(error));
    } finally {
      setPickingPhoto(false);
    }
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
    let uploadedPhotoUrl: string | null = null;
    let createdId = '';
    let safeToCleanupUploadedPhoto = false;
    try {
      setSubmitting(true);
      const { data: duplicate, error: duplicateError } = await spotsService.findDuplicate(coordinates[1], coordinates[0], spotType);
      if (duplicateError) throw duplicateError;
      if (duplicate) {
        Alert.alert(
          'Spot already exists',
          `${duplicate.name} is already pinned here. Open that spot instead of making a duplicate.`,
          [
            { text: 'Move Pin', style: 'cancel' },
            { text: 'View Existing', onPress: () => navigation.navigate('SpotDetail', { spotId: duplicate.id }) },
          ]
        );
        return;
      }

      let photoFileSize: number | null = null;
      if (photoUri) {
        const uploaded = await uploadImage(photoUri, 'spot_photos', user.id);
        uploadedPhotoUrl = uploaded.url;
        photoFileSize = uploaded.fileSize;
      }

      const { data, error } = await spotsService.createWithDetails({
        name: name.trim(),
        latitude: coordinates[1],
        longitude: coordinates[0],
        difficultyLabel: difficulty,
        obstacles,
        tricks: tricks.split(',').map(value => value.trim()).filter(Boolean),
        spotType,
        bustRisk: spotType === 'street' ? bustRisk : undefined,
        potential: potentialRating,
        difficulty: difficultyRating,
        quality: qualityRating,
        photoUrl: uploadedPhotoUrl,
        photoFileSize,
      });
      if (error) {
        safeToCleanupUploadedPhoto = true;
        throw error;
      }
      const created = Array.isArray(data) ? data[0] : data;
      createdId = typeof created?.id === 'string' ? created.id : '';
      if (!createdId) throw new Error('The saved spot did not return an ID.');

      const { data: saved, error: readError } = await spotsService.getById(createdId);
      if (readError) throw readError;
      const persistenceError = getSpotPersistenceError(saved, {
        id: createdId,
        name: name.trim(),
        latitude: coordinates[1],
        longitude: coordinates[0],
        addedBy: user.id,
        potentialRating,
        difficultyRating,
        qualityRating,
        ratingCount: 1,
        photoUrl: uploadedPhotoUrl,
      });
      if (persistenceError) throw new Error(persistenceError);
      Alert.alert(
        'Spot added',
        `Your pin and ratings${uploadedPhotoUrl ? ', plus the photo,' : ''} are saved on the live SkateQuest map.`,
        [{ text: 'Done', onPress: () => navigation.goBack() }]
      );
    } catch (error) {
      Logger.error('Native spot creation failed', error);
      if (uploadedPhotoUrl && safeToCleanupUploadedPhoto) {
        try {
          await deleteFromStorage(uploadedPhotoUrl, 'spot-photos');
        } catch (cleanupError) {
          Logger.warn('Orphan spot photo cleanup failed', cleanupError);
        }
      }
      Alert.alert('Spot not saved', getSpotSubmissionErrorMessage(error));
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

        <Label text="Spot photo (optional)" />
        {photoUri ? (
          <View style={s.photoPreviewShell}>
            <Image source={{ uri: photoUri }} style={s.photoPreview} resizeMode="cover" />
            <Pressable style={s.photoChangeButton} onPress={() => void choosePhoto()}>
              <Text style={s.photoChangeText}>CHANGE PHOTO</Text>
            </Pressable>
          </View>
        ) : (
          <Pressable style={s.photoButton} onPress={() => void choosePhoto()} disabled={pickingPhoto}>
            {pickingPhoto ? <ActivityIndicator color={ACCENT} /> : <ImagePlus color={ACCENT} size={22} />}
            <View style={{ flex: 1 }}>
              <Text style={s.photoButtonTitle}>ADD A REAL SPOT PHOTO</Text>
              <Text style={s.photoButtonSub}>Show skaters exactly what is here.</Text>
            </View>
          </Pressable>
        )}

        <Label text="Rate the spot" />
        <Text style={s.helper}>1 is low. 5 is maxed out.</Text>
        <RatingRow label="Potential" value={potentialRating} onChange={setPotentialRating} />
        <RatingRow label="How hard" value={difficultyRating} onChange={setDifficultyRating} />
        <RatingRow label="How good" value={qualityRating} onChange={setQualityRating} />

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

function RatingRow({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  return (
    <View style={s.ratingRow}>
      <Text style={s.ratingLabel}>{label.toUpperCase()}</Text>
      <View style={s.ratingChoices}>
        {[1, 2, 3, 4, 5].map(item => (
          <Pressable key={item} accessibilityRole="button" accessibilityLabel={`${label} ${item} out of 5`} onPress={() => onChange(item)} style={[s.ratingButton, item <= value && s.ratingButtonActive]}>
            <Star size={15} color={item <= value ? '#05070B' : '#667386'} fill={item <= value ? '#05070B' : 'transparent'} />
          </Pressable>
        ))}
      </View>
      <Text style={s.ratingValue}>{value}/5</Text>
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
  photoButton: { minHeight: 70, borderRadius: 14, borderWidth: 1, borderStyle: 'dashed', borderColor: '#3E5068', backgroundColor: '#0C131D', padding: 13, flexDirection: 'row', alignItems: 'center', gap: 11 },
  photoButtonTitle: { color: '#E9EEF5', fontSize: 11, fontWeight: '900' },
  photoButtonSub: { color: '#68788C', fontSize: 10, marginTop: 3 },
  photoPreviewShell: { height: 190, borderRadius: 15, overflow: 'hidden', borderWidth: 1, borderColor: '#35445A', position: 'relative' },
  photoPreview: { width: '100%', height: '100%' },
  photoChangeButton: { position: 'absolute', right: 10, bottom: 10, minHeight: 35, borderRadius: 10, backgroundColor: 'rgba(5,7,11,.88)', paddingHorizontal: 11, alignItems: 'center', justifyContent: 'center' },
  photoChangeText: { color: '#fff', fontSize: 9, fontWeight: '900' },
  ratingRow: { minHeight: 48, marginTop: 8, borderRadius: 13, backgroundColor: '#0C131D', borderWidth: 1, borderColor: '#293648', paddingHorizontal: 10, flexDirection: 'row', alignItems: 'center', gap: 8 },
  ratingLabel: { color: '#B8C2CF', width: 72, fontSize: 9, fontWeight: '900' },
  ratingChoices: { flex: 1, flexDirection: 'row', gap: 5 },
  ratingButton: { width: 29, height: 29, borderRadius: 9, backgroundColor: '#172130', alignItems: 'center', justifyContent: 'center' },
  ratingButtonActive: { backgroundColor: '#D9F34A' },
  ratingValue: { color: '#D9F34A', fontSize: 10, fontWeight: '900' },
  integrityBox: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, padding: 12, borderRadius: 13, backgroundColor: '#10221A', marginTop: 16 },
  integrityText: { color: '#9EC5AD', fontSize: 10, lineHeight: 16, flex: 1 },
  submitButton: { minHeight: 52, marginTop: 16, borderRadius: 14, backgroundColor: ACCENT, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  submitText: { color: '#fff', fontSize: 13, fontWeight: '900', letterSpacing: 0.8 },
});
