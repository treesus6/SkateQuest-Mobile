import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/useAuthStore';

// Optional QR code import - install with: bun add react-native-qrcode-svg
let QRCode: any = null;
try {
  QRCode = require('react-native-qrcode-svg').default;
} catch (e) {
  console.log('QRCode not installed - install with: bun add react-native-qrcode-svg');
}

interface RedeemModalProps {
  visible: boolean;
  dealId: string;
  dealTitle: string;
  onClose: () => void;
}

export default function RedeemModal({ visible, dealId, dealTitle, onClose }: RedeemModalProps) {
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [redeemCode, setRedeemCode] = useState<string | null>(null);

  const handleRedeem = async () => {
    if (!user?.id) {
      Alert.alert('Error', 'You must be logged in to redeem deals');
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('redeem_shop_deal', {
        p_user_id: user.id,
        p_deal_id: dealId,
      });

      if (error) throw error;

      if (data && data.code) {
        setRedeemCode(data.code);
      } else {
        throw new Error('No redemption code returned');
      }
    } catch (error: any) {
      console.error('Error redeeming deal:', error);
      Alert.alert('Error', error.message || 'Failed to redeem deal');
      onClose();
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setRedeemCode(null);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          {!redeemCode ? (
            <>
              <Text style={styles.title}>Redeem Deal</Text>
              <Text style={styles.dealTitle}>{dealTitle}</Text>
              <Text style={styles.description}>
                You'll receive a unique QR code to show at the shop counter.
              </Text>

              {loading ? (
                <ActivityIndicator size="large" color="#d2673d" style={styles.loader} />
              ) : (
                <View style={styles.buttonContainer}>
                  <TouchableOpacity style={styles.redeemButton} onPress={handleRedeem}>
                    <Text style={styles.redeemButtonText}>Redeem Now</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.cancelButton} onPress={handleClose}>
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                </View>
              )}
            </>
          ) : (
            <>
              <Text style={styles.title}>Your Code</Text>
              <Text style={styles.successMessage}>Show this QR code at the shop!</Text>

              <View style={styles.qrContainer}>
                {QRCode ? (
                  <QRCode value={redeemCode} size={200} />
                ) : (
                  <View style={styles.fallbackQR}>
                    <Text style={styles.codeText}>{redeemCode}</Text>
                    <Text style={styles.fallbackText}>
                      (Install react-native-qrcode-svg for QR display)
                    </Text>
                  </View>
                )}
              </View>

              <Text style={styles.codeLabel}>Code: {redeemCode}</Text>
              <Text style={styles.expiryNote}>Valid for 24 hours</Text>

              <TouchableOpacity style={styles.doneButton} onPress={handleClose}>
                <Text style={styles.doneButtonText}>Done</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: '#2a2a2a',
    borderRadius: 16,
    padding: 24,
    width: '85%',
    maxWidth: 400,
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 12,
  },
  dealTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#d2673d',
    marginBottom: 16,
    textAlign: 'center',
  },
  description: {
    fontSize: 14,
    color: '#aaa',
    textAlign: 'center',
    marginBottom: 24,
  },
  loader: {
    marginVertical: 20,
  },
  buttonContainer: {
    width: '100%',
    gap: 12,
  },
  redeemButton: {
    backgroundColor: '#d2673d',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  redeemButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  cancelButton: {
    backgroundColor: '#444',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#fff',
    fontSize: 16,
  },
  successMessage: {
    fontSize: 16,
    color: '#4ade80',
    marginBottom: 24,
    textAlign: 'center',
  },
  qrContainer: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
  },
  fallbackQR: {
    width: 200,
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  codeText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 8,
  },
  fallbackText: {
    fontSize: 10,
    color: '#666',
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  codeLabel: {
    fontSize: 14,
    color: '#aaa',
    marginBottom: 8,
  },
  expiryNote: {
    fontSize: 12,
    color: '#666',
    marginBottom: 24,
  },
  doneButton: {
    backgroundColor: '#4ade80',
    paddingVertical: 14,
    paddingHorizontal: 40,
    borderRadius: 8,
  },
  doneButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
