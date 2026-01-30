import React from 'react';
import { View, Text, Modal, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

interface ClaimSpotModalProps {
  visible: boolean;
  spotId: string;
  spotName: string;
  currentKingUsername: string | null;
  ghostVideoUrl: string | null;
  onClose: () => void;
}

export default function ClaimSpotModal({
  visible,
  spotId,
  spotName,
  currentKingUsername,
  ghostVideoUrl,
  onClose,
}: ClaimSpotModalProps) {
  const { user } = useAuth();
  const [submitting, setSubmitting] = React.useState(false);

  const handleSubmitClaim = async () => {
    if (!user) {
      Alert.alert('Error', 'You must be logged in to claim a spot.');
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase.from('claims').insert({
        spot_id: spotId,
        user_id: user.id,
        status: 'pending',
        video_url: null, // TODO: Add video upload
      });

      if (error) {
        throw error;
      }

      Alert.alert(
        'Claim Submitted!',
        'Your claim has been submitted to the Judges Booth. Good luck!',
        [{ text: 'OK', onPress: onClose }]
      );
    } catch (error) {
      console.error('Error submitting claim:', error);
      Alert.alert('Error', 'Failed to submit claim. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.title}>
              {currentKingUsername ? 'Challenge the King' : 'Claim This Spot'}
            </Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Text style={styles.closeText}>X</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.spotName}>{spotName}</Text>

          {currentKingUsername && (
            <View style={styles.currentKing}>
              <Text style={styles.currentKingLabel}>Current King:</Text>
              <Text style={styles.currentKingName}>{currentKingUsername}</Text>
            </View>
          )}

          <Text style={styles.instructions}>
            {currentKingUsername
              ? 'Upload a video of you landing a trick at this spot to challenge the current king!'
              : 'Upload a video of you landing a trick at this spot to claim it as your territory!'}
          </Text>

          {/* TODO: Add video recording/upload component */}
          <View style={styles.videoPlaceholder}>
            <Text style={styles.videoPlaceholderText}>Video Upload Coming Soon</Text>
          </View>

          <View style={styles.actions}>
            <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
              onPress={handleSubmitClaim}
              disabled={submitting}
            >
              <Text style={styles.submitText}>{submitting ? 'Submitting...' : 'Submit Claim'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    margin: 20,
    width: '90%',
    maxWidth: 400,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeText: {
    fontSize: 18,
    color: '#999',
  },
  spotName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#d2673d',
    marginBottom: 16,
  },
  currentKing: {
    backgroundColor: '#f5f0ea',
    padding: 12,
    borderRadius: 10,
    marginBottom: 16,
  },
  currentKingLabel: {
    fontSize: 12,
    color: '#999',
    marginBottom: 4,
  },
  currentKingName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  instructions: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 16,
  },
  videoPlaceholder: {
    height: 150,
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 2,
    borderColor: '#ddd',
    borderStyle: 'dashed',
  },
  videoPlaceholderText: {
    color: '#999',
    fontSize: 14,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#ddd',
    alignItems: 'center',
  },
  cancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  submitButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: '#9b59b6',
    alignItems: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});
