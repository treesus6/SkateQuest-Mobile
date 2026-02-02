import React, { useRef, useEffect } from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import ConfettiCannon from 'react-native-confetti-cannon';

export default function LevelUpModal({ visible, level, onClose }: any) {
  const confettiRef = useRef<any>(null);

  useEffect(() => {
    if (visible && confettiRef.current) {
      confettiRef.current.start();
    }
  }, [visible]);

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <ConfettiCannon
          ref={confettiRef}
          count={200}
          origin={{ x: -10, y: 0 }}
          autoStart={false}
          fadeOut
        />
        <View style={styles.card}>
          <Text style={styles.title}>LEVEL UP! 🎉</Text>
          <Text style={styles.level}>Level {level}</Text>
          <TouchableOpacity style={styles.button} onPress={onClose}>
            <Text style={styles.buttonText}>Keep Skating!</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center' },
  card: { backgroundColor: '#fff', padding: 32, borderRadius: 16, alignItems: 'center', width: 280 },
  title: { fontSize: 28, fontWeight: 'bold', marginBottom: 16 },
  level: { fontSize: 48, fontWeight: 'bold', color: '#d2673d', marginBottom: 24 },
  button: { backgroundColor: '#d2673d', paddingVertical: 12, paddingHorizontal: 32, borderRadius: 8 },
  buttonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
});
