import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
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
  ImagePlus,
  MapPin,
  Plus,
  ShieldCheck,
  Sparkles,
  Star,
  Target,
} from 'lucide-react-native';
import { useNavigation, useRoute } from '../lib/useNavigation';
import { getBrowserLocation } from '../lib/browserLocation';
import { spotsService } from '../lib/spotsService';
import { useAuthStore } from '../stores/useAuthStore';
import { Logger } from '../lib/logger';
import { deleteFromStorage, pickImage, uploadImage } from '../lib/mediaUpload';
import {
  getMapboxAvailabilityError,
  getMapInitializationError,
} from '../lib/mapboxWebSupport';
import { getSpotPersistenceError, getSpotSubmissionErrorMessage, parseSpotCoordinates } from '../lib/spotSubmission';

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
  const routedCoordinates = parseSpotCoordinates(
    route.params?.latitude,
    route.params?.longitude
  );
  const [coordinates, setCoordinates] = useState<[number, number]>(
    routedCoordinates ?? NEUTRAL_CENTER
  );
  const [hasCoordinates, setHasCoordinates] = useState(routedCoordinates !== null);
  const [name, setName] = useState('');
  const [difficulty, setDifficulty] = useState<'Beginner' | 'Intermediate' | 'Advanced'>('Beginner');
  const [spotType, setSpotType] = useState<'park' | 'street' | 'diy' | 'quest' | 'shop'>('park');
  const [bustRisk, setBustRisk] = useState<'low' | 'medium' | 'high'>('low');
  const [obstacles, setObstacles] = useState<string[]>([]);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [pickingPhoto, setPickingPhoto] = useState(false);
  const [potentialRating, setPotentialRating] = useState(3);
  const [difficultyRating, setDifficultyRating] = useState(3);
  const [qualityRating, setQualityRating] = useState(3);
  const [submitting, setSubmitting] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [mapUnavailable, setMapUnavailable] = useState<string | null>(null);
  const [manualLatitude, setManualLatitude] = useState(
    routedCoordinates ? String(routedCoordinates[1]) : ''
  );
  const [manualLongitude, setManualLongitude] = useState(
    routedCoordinates ? String(routedCoordinates[0]) : ''
  );

  useEffect(() => {
    const mapbox = window.mapboxgl;
    const token =
      (Constants.expoConfig?.extra?.mapboxAccessToken as string | undefined) ??
      process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN;
    const availabilityError = getMapboxAvailabilityError(mapbox, token);
    if (availabilityError || !mapbox || !token) {
      setMapUnavailable(availabilityError ?? 'The interactive map is unavailable.');
      Logger.warn('Add spot web map unavailable', {
        message: availabilityError ?? 'Unknown map availability failure',
      });
      return;
    }
    if (!container.current) return;

    let instance: MapboxGLMap | null = null;
    try {
      mapbox.accessToken = token;
      const createdMap = new mapbox.Map({
        container: container.current,
        style: 'mapbox://styles/mapbox/streets-v12',
        center: coordinates,
        zoom: hasCoordinates ? 14 : 2,
        attributionControl: true,
      });
      instance = createdMap;
      const pin = hasCoordinates
        ? new mapbox.Marker({ color: ORANGE }).setLngLat(coordinates).addTo(createdMap)
        : null;
      createdMap.on('click', event => {
        const next: [number, number] = [event.lngLat.lng, event.lngLat.lat];
        setCoordinates(next);
        setManualLatitude(String(next[1]));
        setManualLongitude(String(next[0]));
        setHasCoordinates(true);
        if (marker.current) {
          marker.current.setLngLat(next);
        } else {
          marker.current = new mapbox.Marker({ color: ORANGE })
            .setLngLat(next)
            .addTo(createdMap);
        }
      });
      map.current = createdMap;
      marker.current = pin;
      setMapUnavailable(null);
    } catch (error) {
      const message = getMapInitializationError(error);
      marker.current?.remove();
      instance?.remove();
      marker.current = null;
      map.current = null;
      setMapUnavailable(message);
      Logger.warn('Add spot web map initialization failed', { message });
      return;
    }

    return () => {
      marker.current?.remove();
      instance?.remove();
      marker.current = null;
      map.current = null;
    };
  }, []);

  const locate = async () => {
    setLocationError(null);
    try {
      const position = await getBrowserLocation();
      const next: [number, number] = [position.longitude, position.latitude];
      setCoordinates(next);
      setManualLatitude(String(next[1]));
      setManualLongitude(String(next[0]));
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

  const applyManualCoordinates = () => {
    const next = parseSpotCoordinates(manualLatitude, manualLongitude);
    if (!next) {
      setLocationError('Enter a latitude from -90 to 90 and a longitude from -180 to 180.');
      return;
    }

    setCoordinates(next);
    setHasCoordinates(true);
    setLocationError(null);
    if (marker.current) {
      marker.current.setLngLat(next);
    } else if (map.current && window.mapboxgl) {
      marker.current = new window.mapboxgl.Marker({ color: ORANGE })
        .setLngLat(next)
        .addTo(map.current);
    }
    map.current?.flyTo({ center: next, zoom: 16 });
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
      Alert.alert('Spot name required', 'Enter a name for this skate spot.');
      return;
    }
    if (!hasCoordinates) {
      Alert.alert('Location required', 'Tap the map or use your current location before saving this spot.');
      return;
    }
    let uploadedPhotoUrl: string | null = null;
    let createdId = '';
    let safeToCleanupUploadedPhoto = false;
    setSubmitting(true);
    try {
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
      createdId = typeof created?.id === 'string' ? created.id.trim() : '';
      if (!createdId) {
        throw new Error('The saved spot did not return an ID.');
      }

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
      Alert.alert('Spot added', `Your pin and ratings${uploadedPhotoUrl ? ', plus the photo,' : ''} are saved on the live SkateQuest map.`, [
        { text: 'Done', onPress: () => navigation.goBack() },
      ]);
    } catch (error) {
      Logger.error('Web spot creation failed', error);
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
        {mapUnavailable ? (
          <View style={s.mapFallback}>
            <View style={s.mapFallbackMark}>
              <MapPin color={INK} size={27} strokeWidth={2.8} />
            </View>
            <Text style={s.mapFallbackKicker}>INTERACTIVE MAP UNAVAILABLE</Text>
            <Text style={s.mapFallbackText}>{mapUnavailable}</Text>
            <Text style={s.mapFallbackHelp}>
              Your spot form still works. Use your real GPS location or enter exact coordinates.
            </Text>
            <Pressable style={s.fallbackLocateButton} onPress={() => void locate()}>
              <Crosshair color={INK} size={18} strokeWidth={2.8} />
              <Text style={s.fallbackLocateText}>USE MY REAL LOCATION</Text>
            </Pressable>
            <View style={s.manualCoordinateRow}>
              <TextInput
                accessibilityLabel="Latitude"
                inputMode="decimal"
                value={manualLatitude}
                onChangeText={setManualLatitude}
                placeholder="Latitude"
                placeholderTextColor="#777D87"
                style={s.coordinateInput}
              />
              <TextInput
                accessibilityLabel="Longitude"
                inputMode="decimal"
                value={manualLongitude}
                onChangeText={setManualLongitude}
                placeholder="Longitude"
                placeholderTextColor="#777D87"
                style={s.coordinateInput}
              />
            </View>
            <Pressable style={s.lockCoordinatesButton} onPress={applyManualCoordinates}>
              <Check color={INK} size={16} strokeWidth={3} />
              <Text style={s.lockCoordinatesText}>LOCK THESE COORDINATES</Text>
            </Pressable>
          </View>
        ) : (
          <>
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
              <Pressable
                style={s.locateButton}
                onPress={() => void locate()}
                accessibilityRole="button"
                accessibilityLabel="Use my location"
                accessibilityHint="Uses your browser location to place the spot pin"
              >
                <Crosshair color={INK} size={20} strokeWidth={2.8} />
              </Pressable>
            </View>

            <View style={s.mapBottomHud} pointerEvents="none">
              <View style={s.mapHint}>
                <Crosshair color={ORANGE} size={16} />
                <Text style={s.mapHintText}>TAP THE EXACT SPOT ON THE MAP</Text>
              </View>
            </View>
          </>
        )}
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
        {spotType === 'street' ? (
          <Choice
            label="BUST RISK"
            values={['low', 'medium', 'high']}
            value={bustRisk}
            onChange={value => setBustRisk(value as typeof bustRisk)}
          />
        ) : null}
      </View>

      <View style={s.obstacleCard}>
        <View style={s.sectionHead}>
          <View style={[s.sectionNumber, s.sectionNumberBlue]}><Text style={s.sectionNumberText}>02</Text></View>
          <View style={s.sectionCopy}>
            <Text style={s.sectionKicker}>WHAT'S SKATEABLE</Text>
            <Text style={[s.sectionTitle, s.sectionTitleLight]}>Obstacles</Text>
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

      <View style={s.mediaRatingCard}>
        <View style={s.sectionHead}>
          <View style={[s.sectionNumber, s.sectionNumberAcid]}><Text style={s.sectionNumberText}>03</Text></View>
          <View style={s.sectionCopy}>
            <Text style={s.sectionKicker}>SHOW IT + SCORE IT</Text>
            <Text style={[s.sectionTitle, s.sectionTitleLight]}>Photo and ratings</Text>
          </View>
          <Star color={ACID} size={21} fill={ACID} />
        </View>

        <Text style={s.sectionBody}>Add a real photo if you have one. Rate what matters to skaters—not how pretty the place looks.</Text>
        {photoUri ? (
          <View style={s.photoPreviewShell}>
            <Image source={{ uri: photoUri }} style={s.photoPreview} resizeMode="cover" />
            <Pressable style={s.photoChangeButton} onPress={() => void choosePhoto()}>
              <Text style={s.photoChangeText}>CHANGE PHOTO</Text>
            </Pressable>
          </View>
        ) : (
          <Pressable style={s.photoButton} onPress={() => void choosePhoto()} disabled={pickingPhoto}>
            {pickingPhoto ? <ActivityIndicator color={ACID} /> : <ImagePlus color={ACID} size={23} />}
            <View style={s.photoButtonCopy}>
              <Text style={s.photoButtonTitle}>ADD A REAL SPOT PHOTO</Text>
              <Text style={s.photoButtonSub}>OPTIONAL · UPLOADS WITH THE SPOT</Text>
            </View>
          </Pressable>
        )}

        <View style={s.ratingStack}>
          <RatingRow label="Potential" value={potentialRating} onChange={setPotentialRating} />
          <RatingRow label="How hard" value={difficultyRating} onChange={setDifficultyRating} />
          <RatingRow label="How good" value={qualityRating} onChange={setQualityRating} />
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

function RatingRow({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  return (
    <View style={s.ratingRow}>
      <View style={s.ratingCopy}>
        <Text style={s.ratingLabel}>{label.toUpperCase()}</Text>
        <Text style={s.ratingValue}>{value}/5</Text>
      </View>
      <View style={s.ratingChoices}>
        {[1, 2, 3, 4, 5].map(item => (
          <Pressable key={item} accessibilityRole="button" accessibilityLabel={`${label} ${item} out of 5`} onPress={() => onChange(item)} style={[s.ratingButton, item <= value && s.ratingButtonActive]}>
            <Star size={16} color={item <= value ? INK : '#727D8C'} fill={item <= value ? INK : 'transparent'} />
          </Pressable>
        ))}
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
  mapFallback: { flex: 1, padding: 18, alignItems: 'center', justifyContent: 'center' },
  mapFallbackMark: { width: 58, height: 58, borderRadius: 17, backgroundColor: ORANGE, borderWidth: 2, borderColor: INK, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '-4deg' }] },
  mapFallbackKicker: { color: ORANGE, fontSize: 9, fontWeight: '900', letterSpacing: 1.2, marginTop: 12 },
  mapFallbackText: { color: PAPER, maxWidth: 430, textAlign: 'center', fontSize: 12, lineHeight: 17, fontWeight: '800', marginTop: 5 },
  mapFallbackHelp: { color: MUTED, maxWidth: 430, textAlign: 'center', fontSize: 10, lineHeight: 15, fontWeight: '700', marginTop: 5 },
  fallbackLocateButton: { minHeight: 42, marginTop: 12, borderRadius: 12, paddingHorizontal: 12, backgroundColor: ORANGE, borderWidth: 2, borderColor: INK, flexDirection: 'row', alignItems: 'center', gap: 7 },
  fallbackLocateText: { color: INK, fontSize: 8, fontWeight: '900', letterSpacing: 0.8 },
  manualCoordinateRow: { width: '100%', maxWidth: 430, flexDirection: 'row', gap: 8, marginTop: 11 },
  coordinateInput: { flex: 1, minHeight: 43, borderRadius: 11, paddingHorizontal: 11, backgroundColor: '#E9E4DA', borderWidth: 1.5, borderColor: '#CFC8BB', color: INK, fontSize: 12, fontWeight: '700' },
  lockCoordinatesButton: { minHeight: 38, marginTop: 8, borderRadius: 11, paddingHorizontal: 11, backgroundColor: ACID, borderWidth: 2, borderColor: INK, flexDirection: 'row', alignItems: 'center', gap: 6 },
  lockCoordinatesText: { color: INK, fontSize: 7.5, fontWeight: '900', letterSpacing: 0.7 },
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
  mediaRatingCard: { marginTop: 10, borderRadius: 23, padding: 15, backgroundColor: '#11151B', borderWidth: 1, borderColor: '#303641' },
  sectionHead: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  sectionNumber: { width: 39, height: 39, borderRadius: 12, backgroundColor: ORANGE, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '-4deg' }] },
  sectionNumberBlue: { backgroundColor: BLUE },
  sectionNumberAcid: { backgroundColor: ACID },
  sectionNumberText: { color: INK, fontSize: 10, fontWeight: '900' },
  sectionCopy: { flex: 1 },
  sectionKicker: { color: ORANGE, fontSize: 7, fontWeight: '900', letterSpacing: 1.1 },
  sectionTitle: { color: INK, fontSize: 17, fontWeight: '900', letterSpacing: -0.4, marginTop: 1 },
  sectionTitleLight: { color: PAPER },
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

  photoButton: { minHeight: 72, marginTop: 12, borderRadius: 15, borderWidth: 1.5, borderStyle: 'dashed', borderColor: '#52606F', backgroundColor: '#171D26', paddingHorizontal: 13, flexDirection: 'row', alignItems: 'center', gap: 11 },
  photoButtonCopy: { flex: 1 },
  photoButtonTitle: { color: PAPER, fontSize: 9, fontWeight: '900', letterSpacing: 0.7 },
  photoButtonSub: { color: '#75808E', fontSize: 7, fontWeight: '900', letterSpacing: 0.5, marginTop: 3 },
  photoPreviewShell: { height: 230, marginTop: 12, borderRadius: 17, overflow: 'hidden', borderWidth: 1, borderColor: '#3B4654', position: 'relative' },
  photoPreview: { width: '100%', height: '100%' },
  photoChangeButton: { position: 'absolute', right: 10, bottom: 10, minHeight: 37, borderRadius: 11, backgroundColor: 'rgba(7,8,11,.88)', paddingHorizontal: 11, alignItems: 'center', justifyContent: 'center' },
  photoChangeText: { color: PAPER, fontSize: 7.5, fontWeight: '900', letterSpacing: 0.7 },
  ratingStack: { marginTop: 12, gap: 8 },
  ratingRow: { minHeight: 55, borderRadius: 15, backgroundColor: '#171D26', borderWidth: 1, borderColor: '#303946', paddingHorizontal: 11, flexDirection: 'row', alignItems: 'center', gap: 10 },
  ratingCopy: { width: 83 },
  ratingLabel: { color: PAPER, fontSize: 8, fontWeight: '900', letterSpacing: 0.7 },
  ratingValue: { color: ACID, fontSize: 8, fontWeight: '900', marginTop: 3 },
  ratingChoices: { flex: 1, flexDirection: 'row', justifyContent: 'flex-end', gap: 6 },
  ratingButton: { width: 34, height: 34, borderRadius: 10, backgroundColor: '#222A35', alignItems: 'center', justifyContent: 'center' },
  ratingButtonActive: { backgroundColor: ACID },

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
