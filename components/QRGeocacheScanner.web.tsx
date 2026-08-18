import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Text, View } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { getBrowserLocation, BrowserCoordinates } from '../lib/browserLocation';
import { qrCodeService } from '../lib/qrCodeService';
import { profilesService } from '../lib/profilesService';
import { useAuthStore } from '../stores/useAuthStore';
import Button from './ui/Button';

const PROXIMITY_THRESHOLD = 15;

interface QRGeocacheScannerProps {
  spotId: string;
  spotLat: number;
  spotLng: number;
  onSuccess: (ghostClipUrl?: string) => void;
  onCancel: () => void;
}

export default function QRGeocacheScanner({
  spotId,
  spotLat,
  spotLng,
  onSuccess,
  onCancel,
}: QRGeocacheScannerProps) {
  const { user } = useAuthStore();
  const [permission, requestPermission] = useCameraPermissions();
  const [location, setLocation] = useState<BrowserCoordinates | null>(null);
  const [distance, setDistance] = useState<number | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [scanned, setScanned] = useState(false);
  const [processing, setProcessing] = useState(false);

  const refreshLocation = async () => {
    setLocationError(null);
    try {
      const next = await getBrowserLocation(30000);
      setLocation(next);
      setDistance(calculateDistance(next.latitude, next.longitude, spotLat, spotLng));
    } catch (error) {
      setLocation(null);
      setDistance(null);
      setLocationError(error instanceof Error ? error.message : 'Location is unavailable.');
    }
  };

  useEffect(() => {
    void refreshLocation();
  }, [spotLat, spotLng]);

  const handleBarCodeScanned = async ({ data }: { data: string }) => {
    if (scanned || processing) return;
    setScanned(true);
    setProcessing(true);

    try {
      const fresh = await getBrowserLocation(30000);
      const freshDistance = calculateDistance(fresh.latitude, fresh.longitude, spotLat, spotLng);
      setLocation(fresh);
      setDistance(freshDistance);

      if (freshDistance > PROXIMITY_THRESHOLD) {
        Alert.alert(
          'Too Far Away!',
          `You must be within ${PROXIMITY_THRESHOLD}m of the spot to scan. Current distance: ${Math.round(freshDistance)}m`,
          [{ text: 'Try Again', onPress: () => setScanned(false) }]
        );
        return;
      }

      const { data: qrScan, error } = await qrCodeService.getScan(spotId, data);
      if (error || !qrScan) {
        Alert.alert('Invalid QR Code', 'This QR code does not belong to this spot.', [
          { text: 'Try Again', onPress: () => setScanned(false) },
        ]);
        return;
      }

      const userId = user?.id ?? '';
      if (!userId) throw new Error('Log in before scanning a QR geocache.');

      const { data: existingScan } = await qrCodeService.getUserScan(spotId, userId);
      if (existingScan) {
        Alert.alert('Already Scanned!', 'You have already found this QR code.', [
          { text: 'OK', onPress: onCancel },
        ]);
        return;
      }

      await qrCodeService.recordScan({
        spot_id: spotId,
        user_id: userId,
        qr_code: data,
        latitude: fresh.latitude,
        longitude: fresh.longitude,
        distance_from_spot: freshDistance,
      });

      const { data: profile } = await profilesService.getById(userId);
      if (profile) await profilesService.update(userId, { xp: (profile.xp || 0) + 50 });

      const { data: ghostClip } = await qrCodeService.getGhostClip(spotId);
      let ghostClipUrl: string | undefined;
      if (ghostClip) {
        await qrCodeService.unlockGhostClip(userId, ghostClip.id);
        ghostClipUrl = ghostClip.video_url;
      }

      Alert.alert(
        'QR Found!',
        `+50 XP earned!\n\n${ghostClip ? 'Ghost Clip unlocked!' : 'Keep skating!'}`,
        [{ text: 'Awesome!', onPress: () => onSuccess(ghostClipUrl) }]
      );
    } catch (error) {
      Alert.alert('QR scan failed', error instanceof Error ? error.message : 'Please try again.', [
        { text: 'Try Again', onPress: () => setScanned(false) },
      ]);
    } finally {
      setProcessing(false);
    }
  };

  if (!permission) {
    return (
      <View style={{ flex: 1, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color="#D2673D" />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <PermissionScreen
        message="Camera access is required to scan QR geocaches."
        primary="Allow camera"
        onPrimary={requestPermission}
        onCancel={onCancel}
      />
    );
  }

  if (!location) {
    return (
      <PermissionScreen
        message={locationError || 'Location is required to verify that you are at the skate spot.'}
        primary="Try location again"
        onPrimary={refreshLocation}
        onCancel={onCancel}
      />
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      <CameraView
        style={{ flex: 1, width: '100%' }}
        facing="back"
        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
        onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.38)',
            padding: 20,
            justifyContent: 'space-between',
          }}
        >
          <View style={{ alignItems: 'center', marginTop: 40 }}>
            <Text style={{ color: 'white', fontSize: 26, fontWeight: '900' }}>Scan QR Geocache</Text>
            <Text style={{ color: '#D1D5DB', marginTop: 8 }}>Must be within 15 meters</Text>
            {distance !== null ? (
              <View
                style={{
                  marginTop: 10,
                  borderRadius: 999,
                  paddingHorizontal: 14,
                  paddingVertical: 8,
                  backgroundColor: distance <= PROXIMITY_THRESHOLD ? '#059669' : '#DC2626',
                }}
              >
                <Text style={{ color: 'white', fontWeight: '900' }}>{Math.round(distance)}m away</Text>
              </View>
            ) : null}
          </View>

          <View style={{ alignItems: 'center', marginBottom: 36, gap: 12 }}>
            {processing ? <ActivityIndicator size="large" color="white" /> : null}
            <Text style={{ color: 'white', textAlign: 'center' }}>
              {processing ? 'Checking QR and location…' : 'Point your camera at the QR code'}
            </Text>
            <Button title="Cancel" onPress={onCancel} variant="primary" size="lg" />
          </View>
        </View>
      </CameraView>
    </View>
  );
}

function PermissionScreen({
  message,
  primary,
  onPrimary,
  onCancel,
}: {
  message: string;
  primary: string;
  onPrimary: () => void | Promise<void>;
  onCancel: () => void;
}) {
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: '#000',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        gap: 12,
      }}
    >
      <Text selectable style={{ color: 'white', fontSize: 17, textAlign: 'center' }}>{message}</Text>
      <Button title={primary} onPress={() => void onPrimary()} variant="primary" size="lg" />
      <Button title="Cancel" onPress={onCancel} variant="secondary" size="lg" />
    </View>
  );
}

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3;
  const p1 = (lat1 * Math.PI) / 180;
  const p2 = (lat2 * Math.PI) / 180;
  const dp = ((lat2 - lat1) * Math.PI) / 180;
  const dl = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dp / 2) * Math.sin(dp / 2) +
    Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) * Math.sin(dl / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
