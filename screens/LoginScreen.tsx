import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity } from 'react-native';
import { useAuthStore } from '../stores/useAuthStore';

export default function LoginScreen({ navigation }: any) {
  const { signIn, loading } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = async () => {
    setError('');
    if (!email.trim() || !password) {
      setError('Please enter both email and password');
      return;
    }
    const { error: signInError } = await signIn(email.trim(), password);
    if (signInError) {
      setError(signInError.message || 'Invalid email or password');
    }
  };

  return (
    <View className="flex-1 p-5 bg-[#05070B]">
      <Text className="text-3xl font-black text-gray-100 mb-2">Welcome Back</Text>
      <Text className="text-base text-gray-400 mb-5">Sign in to continue your SkateQuest</Text>

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
        placeholder="Password"
        placeholderTextColor="#6B7280"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />

      <TouchableOpacity
        className={`bg-[#FF5A3C] py-3.5 rounded-lg items-center mt-2 ${loading ? 'opacity-50' : ''}`}
        onPress={handleLogin}
        disabled={loading}
      >
        <Text className="text-gray-100 font-bold text-base">
          {loading ? 'Loading...' : 'Sign In'}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => navigation.navigate('ForgotPassword')}>
        <Text className="text-gray-400 mt-4 text-center">Forgot your password?</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => navigation.navigate('Signup')}>
        <Text className="text-[#FF5A3C] mt-2 text-center">Don't have an account? Sign up</Text>
      </TouchableOpacity>
    </View>
  );
}
