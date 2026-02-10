import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity } from 'react-native';
import { useAuth } from '../contexts/AuthContext';

export default function LoginScreen({ navigation }: any) {
  const { signIn, loading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = async () => {
    await signIn(email.trim(), password);
  };

  return (
    <View className="flex-1 p-5 bg-brand-dark">
      <Text className="text-[32px] font-black text-text-primary mb-2">Welcome Back</Text>
      <Text className="text-base text-text-secondary mb-5">
        Sign in to continue your SkateQuest
      </Text>

      <TextInput
        className="bg-brand-card text-text-primary p-3 rounded-lg mb-3"
        placeholder="Email"
        placeholderTextColor="#6B7280"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
      />

      <TextInput
        className="bg-brand-card text-text-primary p-3 rounded-lg mb-3"
        placeholder="Password"
        placeholderTextColor="#6B7280"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />

      <TouchableOpacity
        className="bg-brand-red py-3.5 rounded-lg items-center mt-2"
        onPress={handleLogin}
        disabled={loading}
      >
        <Text className="text-text-primary font-bold text-base">
          {loading ? 'Loading...' : 'Sign In'}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => navigation.navigate('Signup')}>
        <Text className="text-brand-red mt-4 text-center">Don't have an account? Sign up</Text>
      </TouchableOpacity>
    </View>
  );
}
