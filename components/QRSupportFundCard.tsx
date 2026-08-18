import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Text, TouchableOpacity, View } from 'react-native';
import { HeartHandshake, RefreshCw } from 'lucide-react-native';
import { supabase } from '../lib/supabase';

type Summary = {
  paid_qr_count: number;
  gross_cents: number;
  processing_fee_cents: number;
  refunded_cents: number;
  disbursed_cents: number;
  tracked_balance_cents: number;
};

const dollars = (cents: number) => `$${(Number(cents || 0) / 100).toFixed(2)}`;

export default function QRSupportFundCard() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('get_public_qr_support_fund_summary');
      if (error) throw error;
      setSummary((data || null) as Summary | null);
    } catch {
      setSummary(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  return (
    <View className="bg-[#121826] border border-[#2A3344] rounded-2xl p-4 mb-5">
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center flex-1">
          <HeartHandshake size={21} color="#FF8A63" />
          <Text className="text-white font-black text-lg ml-2">Skateboard Support Fund</Text>
        </View>
        <TouchableOpacity onPress={() => void load()} disabled={loading} className="p-2">
          <RefreshCw size={17} color="#9CA3AF" />
        </TouchableOpacity>
      </View>

      <Text className="text-gray-400 text-xs mt-2">Tracked from real paid QR Hunts. Totals exclude personal payment details.</Text>

      {loading ? (
        <View className="py-5 items-center"><ActivityIndicator color="#D2673D" /></View>
      ) : summary ? (
        <>
          <View className="flex-row mt-4 gap-3">
            <View className="flex-1 bg-[#0B0F16] rounded-xl p-3">
              <Text className="text-gray-500 text-xs font-bold">PAID HUNTS</Text>
              <Text className="text-white text-2xl font-black mt-1">{Number(summary.paid_qr_count || 0)}</Text>
            </View>
            <View className="flex-1 bg-[#0B0F16] rounded-xl p-3">
              <Text className="text-gray-500 text-xs font-bold">GROSS SUPPORT</Text>
              <Text className="text-white text-2xl font-black mt-1">{dollars(summary.gross_cents)}</Text>
            </View>
          </View>

          <View className="bg-emerald-500/10 border border-emerald-800 rounded-xl p-3 mt-3">
            <Text className="text-emerald-300 text-xs font-black">TRACKED SUPPORT BALANCE</Text>
            <Text className="text-emerald-100 text-3xl font-black mt-1">{dollars(summary.tracked_balance_cents)}</Text>
            <Text className="text-gray-400 text-xs mt-1">After recorded processor fees, refunds, and disbursements.</Text>
          </View>

          <View className="flex-row justify-between mt-3">
            <Text className="text-gray-500 text-xs">Fees {dollars(summary.processing_fee_cents)}</Text>
            <Text className="text-gray-500 text-xs">Refunds {dollars(summary.refunded_cents)}</Text>
            <Text className="text-gray-500 text-xs">Given out {dollars(summary.disbursed_cents)}</Text>
          </View>
        </>
      ) : (
        <Text className="text-gray-500 text-sm mt-4">Fund totals are temporarily unavailable.</Text>
      )}
    </View>
  );
}
