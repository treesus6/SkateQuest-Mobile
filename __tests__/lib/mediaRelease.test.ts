import { Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { pickImage, pickVideo, uploadToStorage } from '../../lib/mediaUpload';
import { uploadMedia } from '../../lib/uploadMedia';

const mockUpload = jest.fn();
jest.mock('../../lib/supabase', () => ({
  supabase: {
    storage: {
      from: () => ({
        upload: (...args: unknown[]) => mockUpload(...args),
        getPublicUrl: (path: string) => ({ data: { publicUrl: `https://example.com/${path}` } }),
      }),
    },
  },
}));
jest.mock('expo-file-system/legacy', () => ({
  readAsStringAsync: jest.fn().mockResolvedValue('aGVsbG8='),
  getInfoAsync: jest.fn().mockResolvedValue({ exists: true, size: 5 }),
}));

const originalOS = Platform.OS;
beforeEach(() => {
  jest.clearAllMocks();
  Object.defineProperty(Platform, 'OS', { configurable: true, value: 'android' });
  mockUpload.mockResolvedValue({ data: {}, error: null });
  (ImagePicker.requestMediaLibraryPermissionsAsync as jest.Mock).mockResolvedValue({
    status: 'denied',
  });
  (ImagePicker.requestCameraPermissionsAsync as jest.Mock).mockResolvedValue({ status: 'granted' });
  (ImagePicker.launchImageLibraryAsync as jest.Mock).mockResolvedValue({
    canceled: false,
    assets: [{ uri: 'file:///clip.mp4' }],
  });
});
afterEach(() => Object.defineProperty(Platform, 'OS', { configurable: true, value: originalOS }));

it.each([pickImage, pickVideo])(
  'opens the Android system picker even when broad media access is denied',
  async pick => {
    await expect(pick()).resolves.toEqual({ uri: 'file:///clip.mp4' });
    expect(ImagePicker.requestMediaLibraryPermissionsAsync).not.toHaveBeenCalled();
    expect(ImagePicker.launchImageLibraryAsync).toHaveBeenCalledTimes(1);
  }
);
it.each([pickImage, pickVideo])('returns null when selection is cancelled', async pick => {
  (ImagePicker.launchImageLibraryAsync as jest.Mock).mockResolvedValueOnce({
    canceled: true,
    assets: null,
  });
  await expect(pick()).resolves.toBeNull();
  expect(mockUpload).not.toHaveBeenCalled();
});
it.each([pickImage, pickVideo])('still requires camera permission', async pick => {
  (ImagePicker.requestCameraPermissionsAsync as jest.Mock).mockResolvedValueOnce({
    status: 'denied',
  });
  await expect(pick(true)).rejects.toThrow('Permission denied');
  expect(ImagePicker.launchCameraAsync).not.toHaveBeenCalled();
});
it('preserves the iOS permission flow', async () => {
  Object.defineProperty(Platform, 'OS', { configurable: true, value: 'ios' });
  await expect(pickVideo()).rejects.toThrow('Permission denied');
  expect(ImagePicker.launchImageLibraryAsync).not.toHaveBeenCalled();
});
it('reads native files through the working compatibility API and uploads actual bytes', async () => {
  await expect(
    uploadToStorage('file:///image.jpg', 'spot-photos', 'spot', 'user-id')
  ).resolves.toContain('spot/user-id/');
  expect(FileSystem.readAsStringAsync).toHaveBeenCalledWith('file:///image.jpg', {
    encoding: 'base64',
  });
  expect(mockUpload.mock.calls[0][1]).toEqual(new Uint8Array([104, 101, 108, 108, 111]).buffer);
  const result = await uploadMedia('file:///clip.mp4', 'skatetv-clips', 'clips', 'user-id');
  expect(result.error).toBeNull();
  expect(result.url).toContain('clips/user-id/');
  expect(mockUpload.mock.calls[1][1]).toEqual(new Uint8Array([104, 101, 108, 108, 111]));
});
it('does not report a URL when storage rejects an upload', async () => {
  const log = jest.spyOn(console, 'error').mockImplementation(() => {});
  try {
    mockUpload.mockResolvedValue({ error: { message: 'Upload denied' } });
    await expect(
      uploadToStorage('file:///image.jpg', 'spot-photos', 'spot', 'user-id')
    ).rejects.toEqual({ message: 'Upload denied' });
    await expect(
      uploadMedia('file:///clip.mp4', 'skatetv-clips', 'clips', 'user-id')
    ).resolves.toEqual({ url: null, error: 'Upload denied' });
  } finally {
    log.mockRestore();
  }
});
