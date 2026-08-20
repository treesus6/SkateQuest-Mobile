import React from 'react';
import { Alert } from 'react-native';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import ProfileScreen from '../../screens/ProfileScreen';
import { profilesService } from '../../lib/profilesService';
import { useAuthStore } from '../../stores/useAuthStore';

jest.mock('../../stores/useAuthStore');
jest.mock('../../lib/profilesService');

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
jest.mock('../../lib/useNavigation', () => ({
  useNavigation: () => ({ navigate: mockNavigate, goBack: mockGoBack }),
  useRoute: () => ({ params: {} }),
}));

jest.mock('../../components/ui/LoadingSkeleton', () => ({
  __esModule: true,
  default: () => null,
}));

const mockUseAuthStore = useAuthStore as unknown as jest.Mock;
const mockGetById = profilesService.getById as jest.Mock;
const mockCreate = profilesService.create as jest.Mock;
const mockGetLevelProgress = profilesService.getLevelProgress as jest.Mock;

jest.spyOn(Alert, 'alert').mockImplementation(() => {});

interface MockProfile {
  id: string;
  username: string | null;
  level: number | null;
  xp: number | null;
  spots_added: number | null;
  challenges_completed: string[] | null;
  streak: number | null;
  badges: Record<string, boolean> | null;
  created_at: string;
  tricks_landed?: number | null;
  total_sessions?: number | null;
}

describe('ProfileScreen - Integration', () => {
  const mockSignOut = jest.fn();
  const mockDeleteAccount = jest.fn().mockResolvedValue({ error: null });
  const mockUser = { id: 'user-abc-123', email: 'skater@test.com' };
  const mockProfile: MockProfile = {
    id: 'user-abc-123',
    username: 'SkaterPro',
    level: 5,
    xp: 1250,
    spots_added: 12,
    challenges_completed: ['c1', 'c2', 'c3'],
    streak: 7,
    badges: { 'First Kickflip': true, 'Park Master': true },
    created_at: '2025-01-01T00:00:00Z',
    tricks_landed: 18,
    total_sessions: 9,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuthStore.mockReturnValue({
      user: mockUser,
      signOut: mockSignOut,
      deleteAccount: mockDeleteAccount,
    });
    mockGetLevelProgress.mockResolvedValue({ data: null, error: null });
  });

  function setupProfileQuery(options: {
    profileData?: MockProfile | null;
    profileError?: { code: string; message: string } | null;
    rpcData?: Record<string, unknown> | null;
    rpcError?: { message: string } | null;
  } = {}) {
    const {
      profileData = mockProfile,
      profileError = null,
      rpcData = null,
      rpcError = null,
    } = options;
    mockGetById.mockResolvedValue({ data: profileData, error: profileError });
    mockGetLevelProgress.mockResolvedValue({ data: rpcData, error: rpcError });
  }

  it('does not show profile content while loading', async () => {
    mockGetById.mockReturnValue(new Promise(() => {}));
    const { queryByText } = render(<ProfileScreen />);
    expect(queryByText('@SkaterPro')).toBeNull();
    expect(queryByText('Sign Out')).toBeNull();
  });

  it('renders the current skater card and live stats', async () => {
    setupProfileQuery();
    const { getByText } = render(<ProfileScreen />);

    await waitFor(() => expect(getByText('@SkaterPro')).toBeTruthy());
    expect(getByText('skater@test.com')).toBeTruthy();
    expect(getByText('LVL 5')).toBeTruthy();
    expect(getByText('1,250')).toBeTruthy();
    expect(getByText('18')).toBeTruthy();
    expect(getByText('9')).toBeTruthy();
    expect(getByText('XP')).toBeTruthy();
    expect(getByText('TRICKS')).toBeTruthy();
    expect(getByText('SESSIONS')).toBeTruthy();
  });

  it('renders safe defaults for missing profile fields', async () => {
    setupProfileQuery({
      profileData: {
        id: 'user-abc-123',
        username: null,
        level: null,
        xp: null,
        spots_added: null,
        challenges_completed: null,
        streak: null,
        badges: null,
        created_at: '2025-01-01T00:00:00Z',
      },
    });
    const { getByText, getAllByText } = render(<ProfileScreen />);

    await waitFor(() => expect(getByText('@Skater')).toBeTruthy());
    expect(getByText('LVL 1')).toBeTruthy();
    expect(getAllByText('0').length).toBeGreaterThanOrEqual(3);
  });

  it('renders level progress from the profile RPC', async () => {
    setupProfileQuery({
      rpcData: {
        current_level: 5,
        current_xp: 1250,
        xp_for_current_level: 1000,
        xp_for_next_level: 2000,
        xp_progress: 250,
        xp_needed: 750,
        progress_percentage: 25,
      },
    });
    const { getByText } = render(<ProfileScreen />);

    await waitFor(() => expect(getByText('LEVEL 6')).toBeTruthy());
    expect(getByText('250 XP THIS LEVEL')).toBeTruthy();
    expect(getByText('750 XP LEFT')).toBeTruthy();
    expect(getByText('25%')).toBeTruthy();
  });

  it('hides level progress if the RPC fails', async () => {
    setupProfileQuery({ rpcError: { message: 'RPC function not found' } });
    const { queryByText } = render(<ProfileScreen />);

    await waitFor(() => expect(mockGetLevelProgress).toHaveBeenCalledWith(1250));
    expect(queryByText('NEXT UNLOCK')).toBeNull();
  });

  it('renders streak and unlocked badges only', async () => {
    setupProfileQuery({
      profileData: {
        ...mockProfile,
        badges: { 'First Kickflip': true, 'Secret Badge': false },
      },
    });
    const { getByText, queryByText } = render(<ProfileScreen />);

    await waitFor(() => expect(getByText('7 DAY STREAK')).toBeTruthy());
    expect(getByText('BADGE WALL')).toBeTruthy();
    expect(getByText('First Kickflip')).toBeTruthy();
    expect(queryByText('Secret Badge')).toBeNull();
  });

  it('hides the streak when it is zero', async () => {
    setupProfileQuery({ profileData: { ...mockProfile, streak: 0 } });
    const { queryByText } = render(<ProfileScreen />);

    await waitFor(() => expect(mockGetById).toHaveBeenCalled());
    expect(queryByText(/DAY STREAK/)).toBeNull();
  });

  it('shows confirmation before signing out', async () => {
    setupProfileQuery();
    const { getByText } = render(<ProfileScreen />);

    await waitFor(() => expect(getByText('Sign Out')).toBeTruthy());
    fireEvent.press(getByText('Sign Out'));
    expect(Alert.alert).toHaveBeenCalledWith(
      'Sign Out',
      'Are you sure you want to sign out?',
      expect.arrayContaining([
        expect.objectContaining({ text: 'Cancel', style: 'cancel' }),
        expect.objectContaining({ text: 'Sign Out', style: 'destructive' }),
      ])
    );
  });

  it('calls signOut when the destructive action is confirmed', async () => {
    setupProfileQuery();
    type AlertButton = { style?: string; onPress?: () => void; text: string };
    (Alert.alert as jest.Mock).mockImplementation(
      (_title: string, _message: string, buttons: AlertButton[]) => {
        buttons?.find(button => button.style === 'destructive')?.onPress?.();
      }
    );
    const { getByText } = render(<ProfileScreen />);

    await waitFor(() => expect(getByText('Sign Out')).toBeTruthy());
    fireEvent.press(getByText('Sign Out'));
    await waitFor(() => expect(mockSignOut).toHaveBeenCalledTimes(1));
  });

  it('prompts the owner to sign out when the profile is missing', async () => {
    mockGetById.mockResolvedValue({
      data: null,
      error: { code: 'PGRST116', message: 'No rows found' },
    });
    render(<ProfileScreen />);

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith(
        'Profile Missing',
        'We could not find your profile. Try signing out and back in.',
        expect.arrayContaining([expect.objectContaining({ text: 'Sign Out' })])
      );
    });
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('does not query a profile when there is no authenticated user', async () => {
    mockUseAuthStore.mockReturnValue({
      user: null,
      signOut: mockSignOut,
      deleteAccount: mockDeleteAccount,
    });
    render(<ProfileScreen />);
    expect(mockGetById).not.toHaveBeenCalled();
  });
});
