import { supabase } from './supabase';
import * as FileSystem from 'expo-file-system';

export type UploadBucket = 'quest-proofs' | 'skatetv-clips' | 'user-avatars' | 'spot-photos';

export async function uploadMedia(
  uri: string,
  bucket: UploadBucket,
  folder: string,
  userId: string
): Promise<{ url: string | null; error: string | null }> {
  try {
    const ext = uri.split('.').pop()?.toLowerCase() || 'jpg';
    const filename = `${folder}/${userId}/${Date.now()}.${ext}`;
    
    const mimeTypes: Record<string, string> = {
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      webp: 'image/webp',
      mp4: 'video/mp4',
      mov: 'video/quicktime',
      m4v: 'video/mp4',
    };
    const contentType = mimeTypes[ext] || 'image/jpeg';

    // Read file as base64
    const base64 = await FileSystem.readAsStringAsync(uri, {
      encoding: FileSystem.EncodingType.Base64,
    });

    // Convert base64 to ArrayBuffer
    const byteCharacters = atob(base64);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);

    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(filename, byteArray, {
        contentType,
        upsert: false,
      });

    if (error) {
      console.error('Upload error:', error);
      return { url: null, error: error.message };
    }

    const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(filename);
    return { url: urlData.publicUrl, error: null };
  } catch (err: any) {
    console.error('Upload failed:', err);
    return { url: null, error: err.message || 'Upload failed' };
  }
}

export async function uploadQuestProof(uri: string, questId: string, userId: string) {
  return uploadMedia(uri, 'quest-proofs', `quest-${questId}`, userId);
}

export async function uploadSkateTVClip(uri: string, userId: string) {
  return uploadMedia(uri, 'skatetv-clips', 'clips', userId);
}

export async function uploadAvatar(uri: string, userId: string) {
  return uploadMedia(uri, 'user-avatars', 'avatars', userId);
}

export async function uploadSpotPhoto(uri: string, spotId: string, userId: string) {
  return uploadMedia(uri, 'spot-photos', `spot-${spotId}`, userId);
}
