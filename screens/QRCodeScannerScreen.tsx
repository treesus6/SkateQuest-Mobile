import React, { useState, useEffect } from 'react';
import { View, Text, Alert, ActivityIndicator, Dimensions } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList, QRCode } from '../types';
import { qrCodeService } from '../lib/qrCodeService';
import { profilesService } from '../lib/profilesService';
import { feedService } from '../lib/feedService';
import { useAuthStore } from '../stores/useAuthStore';
import Button from '../components/ui/Button';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const { width, height } = Dimensions.get('window');

export default function QRCodeScannerScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { user } = useAuthStore();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (!permission?.granted) requestPermission();
  }, [permission]);

  const handleBarCodeScanned = async ({ data }: { data: string }) => {
    if (scanned || processing) return;
    setScanned(true);
    setProcessing(true);

    try {
      const { data: qrCode, error } = await qrCodeService.getByCode(data);
      if (error || !qrCode) {
        Alert.alert(
          'Invalid QR Code',
          'This QR code is not part of the SkateQuest charity system.',
          [{ text: 'Scan Again', onPress: () => setScanned(false) }]
        );
        setProcessing(false);
        return;
      }

      const qrData = qrCode as QRCode;

      if (qrData.status === 'found') {
        Alert.alert(
          'Already Found!',
          `This QR code was already found by ${qrData.found_by_name || 'someone'}.`,
          [{ text: 'Scan Again', onPress: () => setScanned(false) }]
        );
        setProcessing(false);
        return;
      }

      if (qrData.status === 'expired' || new Date(qrData.expires_at) < new Date()) {
        Alert.alert('Expired Code', 'This QR code has expired.', [
          { text: 'Scan Again', onPress: () => setScanned(false) },
        ]);
        setProcessing(false);
        return;
      }

      if (qrData.purchased_by === user?.id) {
        Alert.alert('Your Own Code!', "You can't scan a QR code you created yourself.", [
          { text: 'Scan Again', onPress: () => setScanned(false) },
        ]);
        setProcessing(false);
        return;
      }

      await handleSuccessfulScan(qrData);
    } catch (err) {
      console.error('Error scanning QR code:', err);
      Alert.alert('Error', 'Failed to process QR code. Please try again.', [
        { text: 'Scan Again', onPress: () => setScanned(false) },
      ]);
      setProcessing(false);
    }
  };

  const handleSuccessfulScan = async (qrData: QRCode) => {
    try {
      const { data: profile } = await profilesService.getById(user?.id || '');
      if (!profile) throw new Error('Profile not found');

      await qrCodeService.markFound(qrData.id, user?.id || '', profile.username);

      const newXP = (profile.xp || 0) + qrData.xp_reward;
      await profilesService.update(user?.id || '', { xp: newXP });

      await feedService.create({
        user_id: user?.id || '',
        activity_type: 'qr_code_found',
        title: 'Found QR Code!',
        description: qrData.trick_challenge
          ? `Found a charity QR code with challenge: ${qrData.trick_challenge}`
          : 'Found a charity QR code!',
        xp_earned: qrData.xp_reward,
      });

      let message = `You found a charity QR code!\n\n+${qrData.xp_reward} XP earned!`;
      if (qrData.trick_challenge) message += `\n\nChallenge: ${qrData.trick_challenge}`;
      if (qrData.challenge_message) message += `\n\nMessage: "${qrData.challenge_message}"`;
      if (qrData.bonus_reward) message += `\n\nBonus: ${qrData.bonus_reward}`;
      message += '\n\nThis donation helps kids get skateboards!';

      Alert.alert('Success!', message, [{ text: 'Awesome!', onPress: () => navigation.goBack() }]);
      setProcessing(false);
    } catch (err) {
      console.error('Error updating QR code:', err);
      Alert.alert('Error', 'Found the code but failed to update. Please try again.', [
        { text: 'OK', onPress: () => setScanned(false) },
      ]);
      setProcessing(false);
    }
  };

  if (!permission) {
    return (
      <View className="flex-1 bg-black justify-center items-center">
        <ActivityIndicator size="large" color="#d2673d" />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View className="flex-1 bg-black justify-center items-center px-5">
        <Text className="text-lg text-white mb-5 text-center">No access to camera</Text>
        <Button title="Grant Permission" onPress={requestPermission} variant="primary" size="lg" />
        <View className="mt-2.5">
          <Button
            title="Go Back"
            onPress={() => navigation.goBack()}
            variant="secondary"
            size="lg"
          />
        </View>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-black">
      <CameraView
        style={{ flex: 1, width: '100%' }}
        facing="back"
        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
        onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <View className="pt-[60px] px-5 items-center">
            <Text className="text-[28px] font-bold text-white mb-2">Scan QR Code</Text>
            <Text className="text-base text-gray-300 text-center">
              Find charity QR codes hidden around town!
            </Text>
          </View>

          <View className="flex-1 justify-center items-center my-12">
            <View
              style={{
                position: 'absolute',
                top: height * 0.25,
                left: width * 0.15,
                width: 40,
                height: 40,
                borderTopWidth: 4,
                borderLeftWidth: 4,
                borderColor: '#d2673d',
              }}
            />
            <View
              style={{
                position: 'absolute',
                top: height * 0.25,
                right: width * 0.15,
                width: 40,
                height: 40,
                borderTopWidth: 4,
                borderRightWidth: 4,
                borderColor: '#d2673d',
              }}
            />
            <View
              style={{
                position: 'absolute',
                bottom: height * 0.25,
                left: width * 0.15,
                width: 40,
                height: 40,
                borderBottomWidth: 4,
                borderLeftWidth: 4,
                borderColor: '#d2673d',
              }}
            />
            <View
              style={{
                position: 'absolute',
                bottom: height * 0.25,
                right: width * 0.15,
                width: 40,
                height: 40,
                borderBottomWidth: 4,
                borderRightWidth: 4,
                borderColor: '#d2673d',
              }}
            />
          </View>

          <View className="pb-[60px] px-5 items-center">
            {processing ? (
              <ActivityIndicator size="large" color="#fff" />
            ) : (
              <>
                <Text className="text-base text-white text-center mb-5">
                  {scanned ? 'Processing...' : 'Point your camera at a SkateQuest QR code'}
                </Text>
                <Button
                  title="Cancel"
                  onPress={() => navigation.goBack()}
                  variant="primary"
                  size="lg"
                />
              </>
            )}
          </View>
        </View>
      </CameraView>
    </View>
  );
}
