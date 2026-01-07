import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { QRCode } from '../types';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const { width, height } = Dimensions.get('window');

export default function QRCodeScannerScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { user } = useAuth();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (!permission?.granted) {
      requestPermission();
    }
  }, [permission]);

  const handleBarCodeScanned = async ({ data }: { data: string }) => {
    if (scanned || processing) return;

    setScanned(true);
    setProcessing(true);

    try {
      // Query the QR code from the database
      const { data: qrCode, error } = await supabase
        .from('qr_codes')
        .select('*')
        .eq('code', data)
        .single();

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

      // Check if already found
      if (qrData.status === 'found') {
        Alert.alert(
          'Already Found!',
          `This QR code was already found by ${qrData.found_by_name || 'someone'}.`,
          [{ text: 'Scan Again', onPress: () => setScanned(false) }]
        );
        setProcessing(false);
        return;
      }

      // Check if expired
      if (qrData.status === 'expired' || new Date(qrData.expires_at) < new Date()) {
        Alert.alert(
          'Expired Code',
          'This QR code has expired.',
          [{ text: 'Scan Again', onPress: () => setScanned(false) }]
        );
        setProcessing(false);
        return;
      }

      // Check if user is trying to scan their own code
      if (qrData.purchased_by === user?.id) {
        Alert.alert(
          'Your Own Code!',
          "You can't scan a QR code you created yourself.",
          [{ text: 'Scan Again', onPress: () => setScanned(false) }]
        );
        setProcessing(false);
        return;
      }

      // Successful scan! Mark as found and award XP
      await handleSuccessfulScan(qrData);
    } catch (err) {
      console.error('Error scanning QR code:', err);
      Alert.alert(
        'Error',
        'Failed to process QR code. Please try again.',
        [{ text: 'Scan Again', onPress: () => setScanned(false) }]
      );
      setProcessing(false);
    }
  };

  const handleSuccessfulScan = async (qrData: QRCode) => {
    try {
      // Get user profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('username, xp')
        .eq('id', user?.id)
        .single();

      if (!profile) throw new Error('Profile not found');

      // Update QR code as found
      const { error: updateError } = await supabase
        .from('qr_codes')
        .update({
          status: 'found',
          found_by: user?.id,
          found_by_name: profile.username,
          found_at: new Date().toISOString(),
        })
        .eq('id', qrData.id);

      if (updateError) throw updateError;

      // Award XP to user
      const newXP = (profile.xp || 0) + qrData.xp_reward;
      const { error: xpError } = await supabase
        .from('profiles')
        .update({ xp: newXP })
        .eq('id', user?.id);

      if (xpError) throw xpError;

      // Create activity record
      await supabase.from('activities').insert({
        user_id: user?.id,
        activity_type: 'qr_code_found',
        title: 'Found QR Code!',
        description: qrData.trick_challenge
          ? `Found a charity QR code with challenge: ${qrData.trick_challenge}`
          : 'Found a charity QR code!',
        xp_earned: qrData.xp_reward,
      });

      // Show success message
      let message = `You found a charity QR code!\n\n+${qrData.xp_reward} XP earned!`;

      if (qrData.trick_challenge) {
        message += `\n\nChallenge: ${qrData.trick_challenge}`;
      }

      if (qrData.challenge_message) {
        message += `\n\nMessage: "${qrData.challenge_message}"`;
      }

      if (qrData.bonus_reward) {
        message += `\n\nBonus: ${qrData.bonus_reward}`;
      }

      message += '\n\nThis donation helps kids get skateboards!';

      Alert.alert(
        '🎉 Success!',
        message,
        [
          {
            text: 'Awesome!',
            onPress: () => navigation.goBack(),
          },
        ]
      );

      setProcessing(false);
    } catch (err) {
      console.error('Error updating QR code:', err);
      Alert.alert(
        'Error',
        'Found the code but failed to update. Please try again.',
        [{ text: 'OK', onPress: () => setScanned(false) }]
      );
      setProcessing(false);
    }
  };

  if (!permission) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#d2673d" />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <Text style={styles.text}>No access to camera</Text>
        <TouchableOpacity
          style={styles.button}
          onPress={requestPermission}
        >
          <Text style={styles.buttonText}>Grant Permission</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.button, { marginTop: 10, backgroundColor: '#666' }]}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.buttonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView
        style={styles.camera}
        facing="back"
        barcodeScannerSettings={{
          barcodeTypes: ['qr'],
        }}
        onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
      >
        <View style={styles.overlay}>
          <View style={styles.header}>
            <Text style={styles.title}>Scan QR Code</Text>
            <Text style={styles.subtitle}>
              Find charity QR codes hidden around town!
            </Text>
          </View>

          <View style={styles.scanArea}>
            <View style={styles.cornerTopLeft} />
            <View style={styles.cornerTopRight} />
            <View style={styles.cornerBottomLeft} />
            <View style={styles.cornerBottomRight} />
          </View>

          <View style={styles.footer}>
            {processing ? (
              <ActivityIndicator size="large" color="#fff" />
            ) : (
              <>
                <Text style={styles.instruction}>
                  {scanned
                    ? 'Processing...'
                    : 'Point your camera at a SkateQuest QR code'}
                </Text>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => navigation.goBack()}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </CameraView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  camera: {
    flex: 1,
    width: '100%',
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#ddd',
    textAlign: 'center',
  },
  scanArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 50,
  },
  cornerTopLeft: {
    position: 'absolute',
    top: height * 0.25,
    left: width * 0.15,
    width: 40,
    height: 40,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderColor: '#d2673d',
  },
  cornerTopRight: {
    position: 'absolute',
    top: height * 0.25,
    right: width * 0.15,
    width: 40,
    height: 40,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderColor: '#d2673d',
  },
  cornerBottomLeft: {
    position: 'absolute',
    bottom: height * 0.25,
    left: width * 0.15,
    width: 40,
    height: 40,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderColor: '#d2673d',
  },
  cornerBottomRight: {
    position: 'absolute',
    bottom: height * 0.25,
    right: width * 0.15,
    width: 40,
    height: 40,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderColor: '#d2673d',
  },
  footer: {
    paddingBottom: 60,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  instruction: {
    fontSize: 16,
    color: '#fff',
    textAlign: 'center',
    marginBottom: 20,
  },
  cancelButton: {
    backgroundColor: '#d2673d',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 25,
  },
  cancelButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  text: {
    fontSize: 18,
    color: '#fff',
    marginBottom: 20,
    textAlign: 'center',
  },
  button: {
    backgroundColor: '#d2673d',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 25,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
