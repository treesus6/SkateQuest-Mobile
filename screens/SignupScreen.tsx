import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity } from 'react-native';
import { useAuthStore } from '../stores/useAuthStore';
import { SkateEvents } from '../lib/analytics';

export default function SignupScreen({ navigation }: any) {
  const { signUp, loading } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submittedEmail, setSubmittedEmail] = useState('');

  const handleSignup = async () => {
    setError('');
    const normalizedEmail = email.trim();
    if (!normalizedEmail || !password) {
      setError('Please enter both email and password');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    const { error: signUpError } = await signUp(normalizedEmail, password);
    if (signUpError) {
      setError(signUpError.message || 'Failed to create account');
    } else {
      SkateEvents.signedUp();
      setSubmittedEmail(normalizedEmail);
      setPassword('');
    }
  };

  if (submittedEmail) {
    return (
      <View className="flex-1 p-5 bg-[#05070B] justify-center">
        <Text className="text-3xl font-black text-gray-100 mb-3 text-center">Check Your Email</Text>
        <Text className="text-base text-gray-400 text-center mb-2">
          We sent a SkateQuest confirmation link to:
        </Text>
        <Text className="text-base font-bold text-[#FF5A3C] text-center mb-6">{submittedEmail}</Text>
        <Text className="text-sm text-gray-500 text-center mb-6">
          Open the newest confirmation email on this device. The link will bring you back into SkateQuest.
        </Text>
        <TouchableOpacity
          className="bg-[#FF5A3C] py-3.5 rounded-lg items-center"
          onPress={() => navigation.navigate('Login')}
        >
          <Text className="text-gray-100 font-bold text-base">Go to Sign In</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View className="flex-1 p-5 bg-[#05070B]">
      <Text className="text-3xl font-black text-gray-100 mb-2">Create Account</Text>
      <Text className="text-base text-gray-400 mb-5">Start your SkateQuest journey</Text>

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

      <TextInput
        className="bg-[#121826] text-gray-100 p-3 rounded-lg mb-3"
        placeholder="Password (min 8 characters)"
        placeholderTextColor="#6B7280"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />

      <TouchableOpacity
        className={`bg-[#FF5A3C] py-3.5 rounded-lg items-center mt-2 ${loading ? 'opacity-50' : ''}`}
        onPress={handleSignup}
        disabled={loading}
      >
        <Text className="text-gray-100 font-bold text-base">
          {loading ? 'Loading...' : 'Sign Up'}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => navigation.navigate('Login')}>
        <Text className="text-[#FF5A3C] mt-4 text-center">Already have an account? Sign in</Text>
      </TouchableOpacity>
    </View>
  );
}
