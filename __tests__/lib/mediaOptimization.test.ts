/// <reference path="../../types/testEnvShims.d.ts" />
import { describe, expect, it, jest, beforeEach } from '@jest/globals';

const mockGetThumbnailAsync = jest.fn();

jest.mock('expo-video-thumbnails', () => ({
  getThumbnailAsync: (...args: unknown[]) => mockGetThumbnailAsync(...args),
}));

import { generateVideoThumbnail } from '../../lib/mediaOptimization';

describe('generateVideoThumbnail', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns the generated thumbnail uri on success', async () => {
    mockGetThumbnailAsync.mockResolvedValue({
      uri: 'file:///tmp/thumb.jpg',
      width: 100,
      height: 100,
    });

    const result = await generateVideoThumbnail('file:///tmp/video.mp4');

    expect(mockGetThumbnailAsync).toHaveBeenCalledWith('file:///tmp/video.mp4', { time: 1000 });
    expect(result).toBe('file:///tmp/thumb.jpg');
  });

  it('respects a custom time offset', async () => {
    mockGetThumbnailAsync.mockResolvedValue({
      uri: 'file:///tmp/thumb.jpg',
      width: 100,
      height: 100,
    });

    await generateVideoThumbnail('file:///tmp/video.mp4', 2500);

    expect(mockGetThumbnailAsync).toHaveBeenCalledWith('file:///tmp/video.mp4', { time: 2500 });
  });

  it('returns null instead of throwing when thumbnail generation fails', async () => {
    mockGetThumbnailAsync.mockRejectedValue(new Error('boom'));

    await expect(generateVideoThumbnail('file:///tmp/bad.mp4')).resolves.toBeNull();
  });
});
