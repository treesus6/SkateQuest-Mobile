import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  Image,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { Video, ResizeMode } from 'expo-av';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import {
  pickImage,
  pickVideo,
  uploadImage,
  uploadVideo,
  saveMediaToDatabase,
} from '../lib/mediaUpload';

export default function UploadMediaScreen({ navigation }: any) {
  const { user } = useAuth();
  const [mediaUri, setMediaUri] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<'photo' | 'video' | null>(null);
  const [caption, setCaption] = useState('');
  const [trickName, setTrickName] = useState('');
  const [uploading, setUploading] = useState(false);

  const handlePickImage = async (useCamera: boolean = false) => {
    try {
      const result = await pickImage(useCamera);
      if (result) {
        setMediaUri(result.uri);
        setMediaType('photo');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  };

  const handlePickVideo = async (useCamera: boolean = false) => {
    try {
      const result = await pickVideo(useCamera);
      if (result) {
        setMediaUri(result.uri);
        setMediaType('video');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  };

  const handleUpload = async () => {
    if (!mediaUri || !user) return;

    setUploading(true);

    try {
      let mediaResult;

      if (mediaType === 'photo') {
        mediaResult = await uploadImage(mediaUri, 'user_photos', user.id);
      } else {
        mediaResult = await uploadVideo(mediaUri, 'user_videos', user.id);
      }

      // Save to database
      const media = await saveMediaToDatabase(user.id, mediaResult, {
        caption: caption || undefined,
        trickName: trickName || undefined,
      });

      // Create activity
      await supabase.from('activities').insert([
        {
          user_id: user.id,
          activity_type: 'media_uploaded',
          title: trickName
            ? `Landed a ${trickName}!`
            : `Posted a new ${mediaType}`,
          description: caption || undefined,
          media_id: media.id,
        },
      ]);

      Alert.alert('Success', 'Media uploaded!', [
        {
          text: 'OK',
          onPress: () => navigation.goBack(),
        },
      ]);
    } catch (error: any) {
      console.error('Upload error:', error);
      Alert.alert('Error', 'Failed to upload media');
    } finally {
      setUploading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Upload Media</Text>
        <View style={{ width: 60 }} />
      </View>

      {!mediaUri ? (
        <View style={styles.pickContainer}>
          <Text style={styles.sectionTitle}>Choose Media Type</Text>

          <TouchableOpacity
            style={styles.pickButton}
            onPress={() => handlePickImage(false)}
          >
            <Text style={styles.pickButtonIcon}>📷</Text>
            <Text style={styles.pickButtonText}>Photo from Gallery</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.pickButton}
            onPress={() => handlePickImage(true)}
          >
            <Text style={styles.pickButtonIcon}>📸</Text>
            <Text style={styles.pickButtonText}>Take Photo</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.pickButton}
            onPress={() => handlePickVideo(false)}
          >
            <Text style={styles.pickButtonIcon}>🎬</Text>
            <Text style={styles.pickButtonText}>Video from Gallery</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.pickButton}
            onPress={() => handlePickVideo(true)}
          >
            <Text style={styles.pickButtonIcon}>🎥</Text>
            <Text style={styles.pickButtonText}>Record Video</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.previewContainer}>
          <Text style={styles.sectionTitle}>Preview</Text>

          {mediaType === 'photo' ? (
            <Image source={{ uri: mediaUri }} style={styles.preview} />
          ) : (
            <Video
              source={{ uri: mediaUri }}
              style={styles.preview}
              useNativeControls
              resizeMode={ResizeMode.CONTAIN}
            />
          )}

          <TouchableOpacity
            style={styles.changeButton}
            onPress={() => {
              setMediaUri(null);
              setMediaType(null);
            }}
          >
            <Text style={styles.changeButtonText}>Change Media</Text>
          </TouchableOpacity>

          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Trick Name (optional)</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., Kickflip, Heelflip"
              value={trickName}
              onChangeText={setTrickName}
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Caption (optional)</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Say something about this..."
              value={caption}
              onChangeText={setCaption}
              multiline
              numberOfLines={3}
            />
          </View>

          <TouchableOpacity
            style={[styles.uploadButton, uploading && styles.uploadButtonDisabled]}
            onPress={handleUpload}
            disabled={uploading}
          >
            {uploading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.uploadButtonText}>Upload</Text>
            )}
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f0ea',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#d2673d',
    padding: 15,
    paddingTop: 15,
  },
  backButton: {
    padding: 5,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  pickContainer: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  pickButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 18,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  pickButtonIcon: {
    fontSize: 32,
    marginRight: 15,
  },
  pickButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  previewContainer: {
    padding: 20,
  },
  preview: {
    width: '100%',
    height: 300,
    borderRadius: 12,
    backgroundColor: '#000',
    marginBottom: 15,
  },
  changeButton: {
    backgroundColor: '#666',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 20,
  },
  changeButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  uploadButton: {
    backgroundColor: '#4CAF50',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 10,
  },
  uploadButtonDisabled: {
    opacity: 0.6,
  },
  uploadButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
