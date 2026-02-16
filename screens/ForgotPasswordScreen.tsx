import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity } from 'react-native';
import { useAuthStore } from '../stores/useAuthStore';

export default function ForgotPasswordScreen({ navigation }: any) {
  const { resetPassword, loading } = useAuthStore();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);

  const handleReset = async () => {
    setError('');
    if (!email.trim()) {
      setError('Please enter your email address');
      return;
    }
    const { error: resetError } = await resetPassword(email.trim());
    if (resetError) {
      setError(resetError.message || 'Failed to send reset email');
    } else {
      setSent(true);
    }
  };

  if (sent) {
    return (
      <View className="flex-1 p-5 bg-[#05070B] justify-center">
        <Text className="text-3xl font-black text-gray-100 mb-2">Check Your Email</Text>
        <Text className="text-base text-gray-400 mb-6">
          We sent a password reset link to {email}. Check your inbox and follow the instructions.
        </Text>
        <TouchableOpacity
          className="bg-[#FF5A3C] py-3.5 rounded-lg items-center"
          onPress={() => navigation.navigate('Login')}
        >
          <Text className="text-gray-100 font-bold text-base">Back to Sign In</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View className="flex-1 p-5 bg-[#05070B]">
      <Text className="text-3xl font-black text-gray-100 mb-2">Reset Password</Text>
      <Text className="text-base text-gray-400 mb-5">
        Enter your email and we'll send you a reset link
      </Text>

      {error ? (
        <View className="bg-red-500/20 border border-red-500 rounded-lg p-3 mb-3">
          <Text className="text-red-400 text-sm">{error}</Text>
        </View>
      ) : null}

      <TextInput
        className="bg-[#121826] text-gray-100 p-3 rounded-lg mb-3"
        placeholder="Email"
        placeholderTextColor="#6B7280"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
      />

      <TouchableOpacity
        className={`bg-[#FF5A3C] py-3.5 rounded-lg items-center mt-2 ${loading ? 'opacity-50' : ''}`}
        onPress={handleReset}
        disabled={loading}
      >
        <Text className="text-gray-100 font-bold text-base">
          {loading ? 'Sending...' : 'Send Reset Link'}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => navigation.navigate('Login')}>
        <Text className="text-[#FF5A3C] mt-4 text-center">Back to Sign In</Text>
      </TouchableOpacity>
    </View>
  );
}
