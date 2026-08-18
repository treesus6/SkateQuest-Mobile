import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Text, TouchableOpacity, View } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useNavigation } from '../lib/useNavigation';
import { getCurrentLocation } from '../lib/currentLocation';
import { supabase } from '../lib/supabase';
import { feedService } from '../lib/feedService';
import { useAuthStore } from '../stores/useAuthStore';
import { SkateEvents } from '../lib/analytics';
import Button from '../components/ui/Button';

export default function QRCodeScannerScreenVerified() {
  const navigation = useNavigation<any>();
  const { user } = useAuthStore();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [locationReady, setLocationReady] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  const checkLocation = async () => {
    setLocationError(null);
    try {
      await getCurrentLocation();
      setLocationReady(true);
    } catch (error) {
      setLocationReady(false);
      setLocationError(error instanceof Error ? error.message : 'Location is unavailable.');
    }
  };

  useEffect(() => { void checkLocation(); }, []);

  const handleScan = async ({ data }: { data: string }) => {
    if (scanned || processing) return;
    if (!user) {
      Alert.alert('Login required', 'Sign in before claiming a QR Hunt find.');
      return;
    }
    setScanned(true);
    setProcessing(true);
    try {
      const loc = await getCurrentLocation();
      const { data: result, error } = await supabase.rpc('claim_hidden_qr', {
        p_code: data,
        p_latitude: loc.latitude,
        p_longitude: loc.longitude,
        p_spot_id: null,
      });
      if (error) throw error;
      const claim = (result || {}) as any;

      if (claim.requires_proof) {
        Alert.alert(
          'Proof required',
          claim.trick_challenge
            ? `This older QR requires proof for: ${claim.trick_challenge}. No XP has been awarded.`
            : 'This older QR requires proof. No XP has been awarded.',
          [{ text: 'Scan another', onPress: () => setScanned(false) }]
        );
        return;
      }

      const xp = Number(claim.xp_awarded || 0);
      SkateEvents.qrCodeFound();
      await feedService.create({
        user_id: user.id,
        activity_type: 'qr_code_found',
        title: 'Found a QR Hunt code',
        description: `Physical QR verified by location${claim.distance_meters != null ? ` · ${claim.distance_meters}m from hide point` : ''}`,
        xp_earned: xp,
      }).catch(() => undefined);

      Alert.alert(
        'QR Hunt verified!',
        `${xp > 0 ? `+${xp} XP awarded. ` : ''}The server verified this physical find against the hiding location.`,
        [{ text: 'Done', onPress: () => navigation.goBack() }]
      );
    } catch (error: any) {
      Alert.alert('Could not verify QR', error?.message || 'This code could not be claimed.', [
        { text: 'Scan again', onPress: () => setScanned(false) },
      ]);
    } finally {
      setProcessing(false);
    }
  };

  if (!permission) return <View className="flex-1 bg-black items-center justify-center"><ActivityIndicator size="large" color="#D2673D" /></View>;

  if (!permission.granted) {
    return <View className="flex-1 bg-black justify-center items-center px-6 gap-3"><Text className="text-white text-center">Camera access is required to scan a physical SkateQuest QR.</Text><Button title="Allow camera" onPress={requestPermission} variant="primary" size="lg" /><Button title="Go back" onPress={() => navigation.goBack()} variant="secondary" size="lg" /></View>;
  }

  if (!locationReady) {
    return <View className="flex-1 bg-black justify-center items-center px-6 gap-3"><Text className="text-white text-center">{locationError || 'Checking location…'}</Text><Button title="Try location again" onPress={checkLocation} variant="primary" size="lg" /><Button title="Go back" onPress={() => navigation.goBack()} variant="secondary" size="lg" /></View>;
  }

  return (
    <View className="flex-1 bg-black">
      <CameraView style={{ flex: 1 }} facing="back" barcodeScannerSettings={{ barcodeTypes: ['qr'] }} onBarcodeScanned={scanned ? undefined : handleScan}>
        <View className="flex-1 bg-black/40 px-5 justify-between">
          <View className="pt-14 items-center">
            <Text className="text-white text-3xl font-black">QR Hunt</Text>
            <Text className="text-gray-300 text-center mt-2">Scan a physical SkateQuest code. Location is checked before the find counts.</Text>
            <TouchableOpacity className="mt-4" onPress={() => navigation.navigate('HideQRCode')}><Text className="text-brand-terracotta font-black underline">Hide a code for another skater →</Text></TouchableOpacity>
          </View>
          <View className="pb-12 items-center gap-3">
            {processing ? <ActivityIndicator size="large" color="#fff" /> : <Text className="text-white font-bold">Point the camera at the QR</Text>}
            <Button title="Cancel" onPress={() => navigation.goBack()} variant="primary" size="lg" />
          </View>
        </View>
      </CameraView>
    </View>
  );
}
