import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { useNavigation } from '../lib/useNavigation';
import { useAuthStore } from '../stores/useAuthStore';
import { Mail, ArrowLeft, CheckCircle2, KeyRound } from 'lucide-react-native';

export default function ForgotPasswordScreen() {
  const navigation = useNavigation();
  const { resetPassword } = useAuthStore();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleReset = async () => {
    if (!email.trim()) {
      Alert.alert('Error', 'Please enter your email');
      return;
    }
    setLoading(true);
    const { error } = await resetPassword(email.trim());
    setLoading(false);
    if (error) {
      Alert.alert('Error', error.message);
      return;
    }
    setSent(true);
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} className="flex-1 bg-[#07090D]">
      <View className="flex-1 justify-center px-6">
        <View className="w-16 h-16 rounded-[20px] bg-[#1B1110] border border-[#5B2D22] items-center justify-center mb-5">
          {sent ? <CheckCircle2 size={29} color="#4ADE80" /> : <KeyRound size={29} color="#D2673D" />}
        </View>

        <Text className="text-[#D2673D] text-[11px] font-black tracking-[2px]">ACCOUNT ACCESS</Text>
        <Text className="text-white text-[32px] font-black mt-1">{sent ? 'Check your email' : 'Reset password'}</Text>
        <Text className="text-[#7B8493] text-sm leading-5 mt-2 mb-7">
          {sent ? `We sent password reset instructions to ${email.trim()}.` : 'Enter the email connected to your SkateQuest account.'}
        </Text>

        {!sent ? (
          <>
            <View className="flex-row items-center bg-[#10151D] border border-[#252D39] rounded-2xl px-4 mb-4">
              <Mail size={18} color="#687383" />
              <TextInput
                className="flex-1 p-4 text-base text-white"
                placeholder="Email address"
                placeholderTextColor="#596271"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                editable={!loading}
              />
            </View>
            <TouchableOpacity
              disabled={loading || !email.trim()}
              onPress={handleReset}
              className={`rounded-2xl py-4 items-center ${email.trim() && !loading ? 'bg-[#D2673D]' : 'bg-[#353B45]'}`}
            >
              {loading ? <ActivityIndicator color="#fff" /> : <Text className="text-white text-sm font-black">SEND RESET LINK</Text>}
            </TouchableOpacity>
          </>
        ) : null}

        <TouchableOpacity onPress={() => navigation.goBack()} className="mt-6 flex-row items-center gap-2">
          <ArrowLeft size={16} color="#D2673D" />
          <Text className="text-[#D2673D] text-sm font-black">Back to sign in</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}
