import React, { useEffect } from 'react';
import { View, Text, Button, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function LoginScreen({ navigation }: any) {
  useEffect(() => {
    // Force clear onboarding flag
    AsyncStorage.removeItem('onboarding_completed');
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>SkateQuest Login</Text>
      <Button 
        title="Go to App" 
        onPress={() => navigation.navigate('Main')}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#1a1a1a' },
  title: { fontSize: 32, color: '#fff', marginBottom: 20 }
});
