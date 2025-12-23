import React from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity } from 'react-native';

type Props = {
  visible: boolean;
  level: number;
  onClose: () => void;
};

export default function LevelUpModal({ visible, level, onClose }: Props) {
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.title}>Level Up!</Text>
          <Text style={styles.level}>Level {level}</Text>
          <Text style={styles.body}>
            You just leveled up. Keep stacking clips and unlocking new challenges.
          </Text>
          <TouchableOpacity style={styles.button} onPress={onClose}>
            <Text style={styles.buttonText}>Keep skating</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(3, 7, 18, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    width: '80%',
    backgroundColor: '#05070B',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#FF5A3C',
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#F5F5F5',
    marginBottom: 8,
    textAlign: 'center',
  },
  level: {
    fontSize: 32,
    fontWeight: '900',
    color: '#FF5A3C',
    textAlign: 'center',
    marginBottom: 12,
  },
  body: {
    fontSize: 14,
    color: '#C7CED9',
    textAlign: 'center',
    marginBottom: 16,
  },
  button: {
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: '#FF5A3C',
    alignItems: 'center',
  },
  buttonText: {
    color: '#F5F5F5',
    fontWeight: '700',
  },
});
