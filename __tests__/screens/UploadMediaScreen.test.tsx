import React from 'react';
import { Alert } from 'react-native';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import UploadMediaScreen from '../../screens/UploadMediaScreen';
import { supabase } from '../../lib/supabase';
import { pickVideo, uploadVideo, saveMediaToDatabase } from '../../lib/mediaUpload';
import { feedService } from '../../lib/feedService';

let mockParams: Record<string, unknown> = {};
jest.mock('../../lib/useNavigation', () => ({
  useNavigation: () => ({ goBack: jest.fn() }),
  useRoute: () => ({ params: mockParams }),
}));
jest.mock('../../stores/useAuthStore', () => ({
  useAuthStore: () => ({ user: { id: 'skater-id' } }),
}));
jest.mock('../../lib/supabase', () => ({ supabase: { rpc: jest.fn() } }));
jest.mock('../../lib/mediaUpload', () => ({
  pickVideo: jest.fn(),
  pickImage: jest.fn(),
  uploadImage: jest.fn(),
  uploadVideo: jest.fn(),
  saveMediaToDatabase: jest.fn(),
}));
jest.mock('../../lib/feedService', () => ({ feedService: { create: jest.fn() } }));
jest.mock('../../lib/trickAnalyzer', () => ({
  analyzeTrickVideo: jest.fn(),
  saveAnalysisResult: jest.fn(),
}));
jest.spyOn(Alert, 'alert').mockImplementation(() => {});

beforeEach(() => {
  jest.clearAllMocks();
  mockParams = { bingoCardId: 'card-id', bingoCellIndex: '0' };
  (pickVideo as jest.Mock).mockResolvedValue({ uri: 'file:///proof.mp4' });
  (uploadVideo as jest.Mock).mockResolvedValue({
    url: 'https://example.com/proof.mp4',
    type: 'video',
  });
  (saveMediaToDatabase as jest.Mock).mockResolvedValue({
    id: 'media-id',
    url: 'https://example.com/proof.mp4',
  });
  (supabase.rpc as jest.Mock).mockResolvedValue({ data: { success: true }, error: null });
  (feedService.create as jest.Mock).mockResolvedValue({ error: null });
});

it.each(['0', '24', 0, 24])('submits Bingo square %p through the proof RPC', async cell => {
  mockParams.bingoCellIndex = cell;
  const ui = await render(<UploadMediaScreen />);
  expect(ui.queryByText('Photo from Gallery')).toBeNull();
  await fireEvent.press(ui.getByText('Video from Gallery'));
  await fireEvent.press(await ui.findByText('Submit Bingo Proof'));
  await waitFor(() =>
    expect(supabase.rpc).toHaveBeenCalledWith('submit_bingo_cell_proof', {
      p_bingo_card_id: 'card-id',
      p_cell_index: Number(cell),
      p_media_id: 'media-id',
    })
  );
  expect(feedService.create).not.toHaveBeenCalled();
  expect(Alert.alert).toHaveBeenCalledWith(
    'Success',
    expect.stringContaining('Bingo proof uploaded'),
    expect.any(Array)
  );
});

it.each([undefined, '', ' ', '25', '-1', '1.5', ['0', '1'], true])(
  'blocks malformed Bingo square %p before uploading',
  async cell => {
    mockParams.bingoCellIndex = cell;
    const ui = await render(<UploadMediaScreen />);
    expect(ui.queryByText('Photo from Gallery')).toBeNull();
    await fireEvent.press(ui.getByText('Video from Gallery'));
    await fireEvent.press(await ui.findByText('Upload'));
    await waitFor(() =>
      expect(Alert.alert).toHaveBeenCalledWith('Error', expect.stringContaining('Bingo link'))
    );
    expect(uploadVideo).not.toHaveBeenCalled();
    expect(supabase.rpc).not.toHaveBeenCalled();
    expect(feedService.create).not.toHaveBeenCalled();
  }
);

it('does not report success when the proof RPC rejects the submission', async () => {
  (supabase.rpc as jest.Mock).mockResolvedValue({
    error: { message: 'this bingo card has expired' },
  });
  const ui = await render(<UploadMediaScreen />);
  await fireEvent.press(ui.getByText('Video from Gallery'));
  await fireEvent.press(await ui.findByText('Submit Bingo Proof'));
  await waitFor(() =>
    expect(Alert.alert).toHaveBeenCalledWith('Error', 'this bingo card has expired')
  );
  expect(Alert.alert).not.toHaveBeenCalledWith('Success', expect.anything(), expect.anything());
  expect(feedService.create).not.toHaveBeenCalled();
});

it('preserves ordinary media uploads without Bingo parameters', async () => {
  mockParams = {};
  const ui = await render(<UploadMediaScreen />);
  expect(ui.getByText('Photo from Gallery')).toBeTruthy();
  await fireEvent.press(ui.getByText('Video from Gallery'));
  await fireEvent.press(await ui.findByText('Upload'));
  await waitFor(() => expect(feedService.create).toHaveBeenCalled());
  expect(supabase.rpc).not.toHaveBeenCalled();
});
