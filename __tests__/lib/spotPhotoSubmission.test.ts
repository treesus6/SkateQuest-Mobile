import { jest } from '@jest/globals';
import {
  getSpotPhotoPersistenceError,
  persistPrimarySpotPhoto,
} from '../../lib/spotPhotoSubmission';
import { saveMediaToDatabase, uploadImage } from '../../lib/mediaUpload';
import { spotsService } from '../../lib/spotsService';

jest.mock('../../lib/mediaUpload', () => ({
  pickImage: jest.fn(),
  uploadImage: jest.fn(),
  saveMediaToDatabase: jest.fn(),
}));

jest.mock('../../lib/spotsService', () => ({
  spotsService: {
    uploadPhoto: jest.fn(),
    getById: jest.fn(),
  },
}));

const mockUploadImage = uploadImage as jest.MockedFunction<typeof uploadImage>;
const mockSaveMedia = saveMediaToDatabase as jest.MockedFunction<typeof saveMediaToDatabase>;
const mockUploadPhoto = spotsService.uploadPhoto as jest.MockedFunction<
  typeof spotsService.uploadPhoto
>;
const mockGetById = spotsService.getById as jest.MockedFunction<typeof spotsService.getById>;

describe('spot photo persistence', () => {
  beforeEach(() => jest.clearAllMocks());

  it('uploads, links, and verifies the primary spot photo', async () => {
    mockUploadImage.mockResolvedValue({ url: 'https://photo', type: 'photo', fileSize: 42 });
    mockSaveMedia.mockResolvedValue({ id: 'media-id' });
    mockUploadPhoto.mockResolvedValue(undefined);
    mockGetById.mockResolvedValue({
      data: {
        id: 'spot-id',
        spot_photos: [{ media_id: 'media-id', uploaded_by: 'user-id', is_primary: true }],
      },
      error: null,
    } as never);

    await expect(
      persistPrimarySpotPhoto({
        photo: { uri: 'blob:photo', fileName: 'spot.jpg' },
        spotId: 'spot-id',
        spotName: 'Real Spot',
        userId: 'user-id',
      })
    ).resolves.toEqual({ mediaId: 'media-id' });

    expect(mockUploadImage).toHaveBeenCalledWith('blob:photo', 'spot_photos', 'user-id');
    expect(mockUploadPhoto).toHaveBeenCalledWith('spot-id', 'media-id', 'user-id', true);
    expect(mockGetById).toHaveBeenCalledWith('spot-id');
  });

  it('rejects a missing or non-primary photo read-back', () => {
    expect(getSpotPhotoPersistenceError({}, { mediaId: 'media-id', userId: 'user-id' })).toBe(
      'The saved spot photo could not be read back.'
    );
    expect(
      getSpotPhotoPersistenceError(
        {
          spot_photos: [{ media_id: 'media-id', uploaded_by: 'user-id', is_primary: false }],
        },
        { mediaId: 'media-id', userId: 'user-id' }
      )
    ).toBe('The saved spot photo was not marked as primary.');
  });
});
