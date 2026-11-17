import React from 'react';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import SpotDetailScreen from '../../screens/SpotDetailScreen';
import { spotsService } from '../../lib/spotsService';
import { sessionsService } from '../../lib/sessionsService';
import { pickImage, uploadImage } from '../../lib/mediaUpload';
import { postSpotComment, verifySpotComment } from '../../lib/spotComments';

const SPOT_ID = '7f9d5ad6-e271-4ad2-8ca5-8e2537edb5bc';
const spot = {
  id: SPOT_ID,
  name: 'First spot',
  latitude: 45,
  longitude: -122,
  spot_photos: [],
  spot_conditions: [],
};

jest.mock('../../stores/useAuthStore', () => ({
  useAuthStore: () => ({ user: { id: 'skater-a' } }),
}));
jest.mock('../../lib/spotsService', () => ({
  spotsService: { getById: jest.fn(), addPhoto: jest.fn(), reportCondition: jest.fn() },
}));
jest.mock('../../lib/challengesService', () => ({
  challengesService: { getForSpot: jest.fn().mockResolvedValue({ data: [] }) },
}));
jest.mock('../../lib/sessionsService', () => {
  const actual = jest.requireActual('../../lib/sessionsService');
  return { ...actual, sessionsService: { setRsvp: jest.fn() } };
});
jest.mock('../../lib/spotComments', () => {
  const actual = jest.requireActual('../../lib/spotComments');
  return { ...actual, postSpotComment: jest.fn(), verifySpotComment: jest.fn() };
});
jest.mock('../../lib/mediaUpload', () => ({
  pickImage: jest.fn(),
  uploadImage: jest.fn(),
  deleteFromStorage: jest.fn(),
}));
jest.mock('../../lib/supabase', () => ({
  supabase: {
    from: (table: string) => {
      const chain: Record<string, unknown> = {};
      chain.select = jest.fn(() => chain);
      chain.eq = jest.fn(() => chain);
      chain.gte = jest.fn(() => chain);
      chain.order = jest.fn(() => chain);
      chain.in = jest.fn(() => Promise.resolve({ data: [], error: null }));
      chain.limit = jest.fn(() => {
        if (table === 'skate_sessions') {
          return Promise.resolve({
            data: [
              {
                id: 'session-1',
                title: 'Saturday ledge session',
                spot_id: '7f9d5ad6-e271-4ad2-8ca5-8e2537edb5bc',
                scheduled_time: new Date(Date.now() + 3600000).toISOString(),
                creator_id: 'creator-1',
                max_participants: null,
                participants: [],
              },
            ],
            error: null,
          });
        }
        return Promise.resolve({ data: [], error: null });
      });
      return chain;
    },
  },
}));
jest.mock('../../components/KingOfTheHill', () => () => null);
jest.mock('../../components/TerritoryControl', () => () => null);
jest.mock('../../components/GhostClipViewer', () => () => null);
jest.mock('../../components/SpotMiniMap', () => () => null);
jest.mock('../../components/ui/LoadingSkeleton', () => () => null);

const getById = spotsService.getById as jest.Mock;
const setRsvp = (sessionsService as unknown as { setRsvp: jest.Mock }).setRsvp;
const reportCondition = spotsService.reportCondition as jest.Mock;
const addPhoto = spotsService.addPhoto as jest.Mock;
const mockPostComment = postSpotComment as jest.Mock;
const mockVerifyComment = verifySpotComment as jest.Mock;
const mockPickImage = pickImage as jest.Mock;
const mockUploadImage = uploadImage as jest.Mock;
const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);

const screen = () => (
  <SpotDetailScreen route={{ params: { spotId: SPOT_ID } }} navigation={{ navigate: jest.fn() }} />
);

beforeEach(() => {
  jest.clearAllMocks();
  getById.mockResolvedValue({ data: spot, error: null });
});

async function renderWithSession() {
  const view = await render(screen());
  await waitFor(() => expect(view.getByText('Saturday ledge session')).toBeTruthy());
  return view;
}

describe('SpotDetail RSVP validation', () => {
  it('does not apply an unconfirmed RSVP response', async () => {
    setRsvp.mockResolvedValue({ data: null, error: null });
    const view = await renderWithSession();

    await fireEvent.press(view.getByText('RSVP'));

    expect(alertSpy).toHaveBeenCalledWith(
      'RSVP not confirmed',
      expect.stringContaining('could not confirm your RSVP')
    );
    expect(view.getByText('RSVP')).toBeTruthy();
    expect(view.queryByText('GOING ✓')).toBeNull();
  });

  it('applies a server-confirmed RSVP', async () => {
    setRsvp.mockResolvedValue({
      data: { is_attending: true, attendee_count: 3 },
      error: null,
    });
    const view = await renderWithSession();

    await fireEvent.press(view.getByText('RSVP'));

    await waitFor(() => expect(view.getByText('GOING ✓')).toBeTruthy());
    expect(view.getByText(/3 going/)).toBeTruthy();
  });

  it('reports a full session instead of applying the response', async () => {
    setRsvp.mockResolvedValue({ data: { error: 'full' }, error: null });
    const view = await renderWithSession();

    await fireEvent.press(view.getByText('RSVP'));

    expect(alertSpy).toHaveBeenCalledWith('Session Full', expect.any(String));
    expect(view.queryByText('GOING ✓')).toBeNull();
  });
});

describe('SpotDetail condition reporting', () => {
  it('ignores a second tap while a report is in flight', async () => {
    let resolveReport!: (value: unknown) => void;
    reportCondition.mockReturnValueOnce(
      new Promise(done => {
        resolveReport = done;
      })
    );
    const view = await render(screen());
    await waitFor(() => expect(view.getByText('First spot')).toBeTruthy());

    await fireEvent.press(view.getByText('REPORT'));
    // First tap starts the report and must stay in flight: do not await it.
    const firstPress = fireEvent.press(view.getByText('DRY'));
    // waitFor polling flushes the in-flight state so the second tap sees the guard.
    await waitFor(() => expect(reportCondition).toHaveBeenCalledTimes(1));
    await fireEvent.press(view.getByText('DRY'));

    expect(reportCondition).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveReport({ condition: 'dry' });
    });
    await firstPress;
    expect(alertSpy).toHaveBeenCalledWith('Success', 'Condition reported!');
  });
});

describe('SpotDetail comment read-back', () => {
  it('keeps the draft and says unverified when the read-back fails', async () => {
    mockPostComment.mockResolvedValue({
      id: 'comment-1',
      spot_id: SPOT_ID,
      user_id: 'skater-a',
      content: 'Dry and fast',
      created_at: '2026-11-17T00:00:00.000Z',
    });
    mockVerifyComment.mockResolvedValue(false);
    const view = await render(screen());
    await waitFor(() => expect(view.getByText('First spot')).toBeTruthy());

    const input = view.getByPlaceholderText('Drop useful spot intel...');
    await fireEvent.changeText(input, 'Dry and fast');
    await fireEvent.press(view.getByText('POST'));

    expect(alertSpy).toHaveBeenCalledWith(
      'Comment not confirmed',
      expect.stringContaining('may have posted')
    );
    expect(view.getByPlaceholderText('Drop useful spot intel...').props.value).toBe(
      'Dry and fast'
    );
  });

  it('clears the draft only after the comment reads back', async () => {
    mockPostComment.mockResolvedValue({
      id: 'comment-1',
      spot_id: SPOT_ID,
      user_id: 'skater-a',
      content: 'Dry and fast',
      created_at: '2026-11-17T00:00:00.000Z',
    });
    mockVerifyComment.mockResolvedValue(true);
    const view = await render(screen());
    await waitFor(() => expect(view.getByText('First spot')).toBeTruthy());

    const input = view.getByPlaceholderText('Drop useful spot intel...');
    await fireEvent.changeText(input, 'Dry and fast');
    await fireEvent.press(view.getByText('POST'));

    await waitFor(() =>
      expect(view.getByPlaceholderText('Drop useful spot intel...').props.value).toBe('')
    );
    expect(alertSpy).not.toHaveBeenCalledWith('Comment not confirmed', expect.any(String));
  });
});

describe('SpotDetail photo verification', () => {
  it('says the photo needs verification instead of "not saved" when the read-back misses it', async () => {
    mockPickImage.mockResolvedValue({ uri: 'file:///photo.jpg' });
    mockUploadImage.mockResolvedValue({
      url: 'https://cdn.example/photo.jpg',
      fileSize: 123,
    });
    addPhoto.mockResolvedValue({ data: { id: 'photo-1' }, error: null });
    // Read-back returns the spot without the new photo.
    getById.mockResolvedValue({ data: spot, error: null });

    const view = await render(screen());
    await waitFor(() => expect(view.getByText('First spot')).toBeTruthy());

    await fireEvent.press(view.getByText('Add Photo'));

    await waitFor(() =>
      expect(alertSpy).toHaveBeenCalledWith(
        'Photo needs verification',
        expect.stringContaining('Open the spot to check it')
      )
    );
    expect(alertSpy).not.toHaveBeenCalledWith('Photo not saved', expect.any(String));
  });
});
