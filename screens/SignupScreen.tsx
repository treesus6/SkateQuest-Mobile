import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity } from 'react-native';
import { useAuthStore } from '../stores/useAuthStore';

export default function SignupScreen({ navigation }: any) {
  const { signUp, loading } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSignup = async () => {
    setError('');
    if (!email.trim() || !password) {
      setError('Please enter both email and password');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    const { error: signUpError } = await signUp(email.trim(), password);
    if (signUpError) {
      setError(signUpError.message || 'Failed to create account');
    }
  };

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
        placeholder="Password (min 6 characters)"
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
