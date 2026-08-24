import { pickImage, saveMediaToDatabase, uploadImage } from './mediaUpload';
import { spotsService } from './spotsService';

export interface SelectedSpotPhoto {
  uri: string;
  fileName?: string | null;
}

export async function chooseSpotPhoto(): Promise<SelectedSpotPhoto | null> {
  const asset = await pickImage();
  if (!asset) return null;
  return { uri: asset.uri, fileName: asset.fileName };
}

export function getSpotPhotoPersistenceError(
  savedSpot: unknown,
  expected: { mediaId: string; userId: string }
): string | null {
  if (!savedSpot || typeof savedSpot !== 'object') {
    return 'The saved spot photo could not be read back.';
  }

  const photos = (savedSpot as Record<string, unknown>).spot_photos;
  if (!Array.isArray(photos)) {
    return 'The saved spot photo could not be read back.';
  }

  const match = photos.find(photo => {
    if (!photo || typeof photo !== 'object') return false;
    const row = photo as Record<string, unknown>;
    return row.media_id === expected.mediaId && row.uploaded_by === expected.userId;
  }) as Record<string, unknown> | undefined;

  if (!match) return 'The saved spot photo link could not be verified.';
  if (match.is_primary !== true) return 'The saved spot photo was not marked as primary.';
  return null;
}

export async function persistPrimarySpotPhoto(input: {
  photo: SelectedSpotPhoto;
  spotId: string;
  spotName: string;
  userId: string;
}): Promise<{ mediaId: string }> {
  const upload = await uploadImage(input.photo.uri, 'spot_photos', input.userId);
  const media = await saveMediaToDatabase(input.userId, upload, {
    caption: `Photo of ${input.spotName}`,
    spotId: input.spotId,
  });
  const mediaId = typeof media?.id === 'string' ? media.id.trim() : '';
  if (!mediaId) throw new Error('The uploaded spot photo did not return a media ID.');

  await spotsService.uploadPhoto(input.spotId, mediaId, input.userId, true);

  const { data: savedSpot, error } = await spotsService.getById(input.spotId);
  if (error) throw error;
  const persistenceError = getSpotPhotoPersistenceError(savedSpot, {
    mediaId,
    userId: input.userId,
  });
  if (persistenceError) throw new Error(persistenceError);

  return { mediaId };
}
