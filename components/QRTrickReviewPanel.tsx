import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Linking, Text, TouchableOpacity, View } from 'react-native';
import { CheckCircle2, ExternalLink, RefreshCw, XCircle } from 'lucide-react-native';
import { supabase } from '../lib/supabase';

type ReviewItem = {
  submission_id: string;
  qr_id: string;
  qr_code: string;
  trick_challenge: string;
  proof_url: string;
  submitted_at: string;
  finder_id: string;
  finder_name: string;
};

export default function QRTrickReviewPanel() {
  const [items, setItems] = useState<ReviewItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [actingOn, setActingOn] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('get_my_qr_trick_reviews');
      if (error) throw error;
      setItems((data || []) as ReviewItem[]);
    } catch (error: any) {
      Alert.alert('Could not load QR reviews', error?.message || 'Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const watch = async (url: string) => {
    const canOpen = await Linking.canOpenURL(url);
    if (!canOpen) {
      Alert.alert('Video unavailable', 'This proof clip could not be opened.');
      return;
    }
    await Linking.openURL(url);
  };

  const review = async (item: ReviewItem, approve: boolean) => {
    setActingOn(item.submission_id);
    try {
      const { data, error } = await supabase.rpc('review_hidden_qr_trick_proof', {
        p_submission_id: item.submission_id,
        p_approve: approve,
      });
      if (error) throw error;
      const result = (data || {}) as any;
      setItems((current) => current.filter((row) => row.submission_id !== item.submission_id));
      Alert.alert(
        approve ? 'Trick approved' : 'Proof rejected',
        approve
          ? `${item.finder_name} completed ${item.trick_challenge}. ${Number(result.xp_awarded || 0)} XP was awarded and this QR Hunt is complete.`
          : `${item.finder_name} can submit another clip for ${item.trick_challenge}.`,
      );
    } catch (error: any) {
      Alert.alert('Review failed', error?.message || 'Please try again.');
    } finally {
      setActingOn(null);
    }
  };

  return (
    <View className="bg-[#0D121C] border border-[#293244] rounded-2xl p-4 mb-6">
      <View className="flex-row items-center justify-between">
        <View className="flex-1 pr-3">
          <Text className="text-white text-lg font-black">Trick proofs to review</Text>
          <Text className="text-gray-400 text-xs mt-1">Watch the actual clip before approving. Approval completes the QR and awards 50 XP.</Text>
        </View>
        <TouchableOpacity onPress={() => void load()} disabled={loading} className="p-2">
          <RefreshCw size={19} color="#D1D5DB" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View className="py-6 items-center"><ActivityIndicator color="#D2673D" /></View>
      ) : items.length === 0 ? (
        <Text className="text-gray-500 text-sm mt-4">No pending trick proofs right now.</Text>
      ) : (
        <View className="mt-4 gap-3">
          {items.map((item) => {
            const busy = actingOn === item.submission_id;
            return (
              <View key={item.submission_id} className="bg-[#151C29] rounded-xl p-4 border border-[#2A3344]">
                <Text className="text-[#FF8A63] text-xs font-black tracking-widest">{item.qr_code}</Text>
                <Text className="text-white text-xl font-black mt-1">{item.trick_challenge}</Text>
                <Text className="text-gray-400 text-sm mt-1">Submitted by {item.finder_name}</Text>

                <TouchableOpacity className="flex-row items-center justify-center bg-[#223047] py-3 rounded-xl mt-4" onPress={() => void watch(item.proof_url)}>
                  <ExternalLink size={17} color="#FFFFFF" />
                  <Text className="text-white font-black ml-2">Watch proof clip</Text>
                </TouchableOpacity>

                <View className="flex-row gap-3 mt-3">
                  <TouchableOpacity className={`flex-1 flex-row justify-center items-center bg-red-500/15 border border-red-700 py-3 rounded-xl ${busy ? 'opacity-50' : ''}`} disabled={busy} onPress={() => void review(item, false)}>
                    <XCircle size={17} color="#FCA5A5" />
                    <Text className="text-red-200 font-black ml-2">Reject</Text>
                  </TouchableOpacity>
                  <TouchableOpacity className={`flex-1 flex-row justify-center items-center bg-emerald-500/15 border border-emerald-700 py-3 rounded-xl ${busy ? 'opacity-50' : ''}`} disabled={busy} onPress={() => void review(item, true)}>
                    {busy ? <ActivityIndicator color="#86EFAC" /> : <CheckCircle2 size={17} color="#86EFAC" />}
                    <Text className="text-emerald-200 font-black ml-2">Approve</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}
