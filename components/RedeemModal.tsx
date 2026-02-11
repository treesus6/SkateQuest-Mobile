import React, { useState } from 'react';
import { View, Text, Modal, ActivityIndicator, Alert } from 'react-native';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/useAuthStore';
import Button from './ui/Button';

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
      <View className="flex-1 bg-black/80 justify-center items-center">
        <View className="bg-gray-800 rounded-2xl p-6 w-[85%] max-w-[400px] items-center">
          {!redeemCode ? (
            <>
              <Text className="text-2xl font-bold text-white mb-3">Redeem Deal</Text>
              <Text className="text-lg font-semibold text-brand-terracotta mb-4 text-center">{dealTitle}</Text>
              <Text className="text-sm text-gray-400 text-center mb-6">
                You'll receive a unique QR code to show at the shop counter.
              </Text>

              {loading ? (
                <ActivityIndicator size="large" color="#d2673d" className="my-5" />
              ) : (
                <View className="w-full gap-3">
                  <Button title="Redeem Now" onPress={handleRedeem} variant="primary" size="lg" />
                  <Button title="Cancel" onPress={handleClose} variant="secondary" size="lg" />
                </View>
              )}
            </>
          ) : (
            <>
              <Text className="text-2xl font-bold text-white mb-3">Your Code</Text>
              <Text className="text-base text-green-400 mb-6 text-center">Show this QR code at the shop!</Text>

              <View className="bg-white p-5 rounded-xl mb-5">
                {QRCode ? (
                  <QRCode value={redeemCode} size={200} />
                ) : (
                  <View className="w-[200px] h-[200px] justify-center items-center bg-gray-100">
                    <Text className="text-2xl font-bold text-black mb-2">{redeemCode}</Text>
                    <Text className="text-[10px] text-gray-500 text-center px-5">
                      (Install react-native-qrcode-svg for QR display)
                    </Text>
                  </View>
                )}
              </View>

              <Text className="text-sm text-gray-400 mb-2">Code: {redeemCode}</Text>
              <Text className="text-xs text-gray-500 mb-6">Valid for 24 hours</Text>

              <Button title="Done" onPress={handleClose} variant="primary" size="lg" className="bg-green-400" />
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}
