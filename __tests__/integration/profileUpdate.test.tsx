import React from 'react';
import { render, waitFor, fireEvent, act } from '@testing-library/react-native';
import { Alert } from 'react-native';
import ProfileScreen from '../../screens/ProfileScreen';
import { useAuthStore } from '../../stores/useAuthStore';
import { profilesService } from '../../lib/profilesService';

jest.mock('../../stores/useAuthStore');
jest.mock('../../lib/profilesService');

// Mock LoadingSkeleton to avoid Animated.loop issues in test environment
jest.mock('../../components/ui/LoadingSkeleton', () => ({
  __esModule: true,
  default: () => null,
}));


const mockUseAuthStore = useAuthStore as unknown as jest.Mock;
const mockGetById = profilesService.getById as jest.Mock;
const mockCreate = profilesService.create as jest.Mock;
const mockGetLevelProgress = profilesService.getLevelProgress as jest.Mock;

jest.spyOn(Alert, 'alert');

type MockBadges = Record<string, boolean>;
interface MockProfile {
  id: string;
  username: string | null;
  level: number | null;
  xp: number | null;
  spots_added: number | null;
  challenges_completed: string[] | null;
  streak: number | null;
  badges: MockBadges | null;
  created_at: string;
}

describe('ProfileScreen - Integration', () => {
  const mockSignOut = jest.fn();
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
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuthStore.mockReturnValue({ user: mockUser, signOut: mockSignOut });
    mockGetLevelProgress.mockResolvedValue({ data: null, error: null });
  });

  function setupProfileQuery(options: {
    profileData?: MockProfile | null;
    profileError?: { code: string; message: string } | null;
    rpcData?: Record<string, unknown> | null;
    rpcError?: { message: string } | null;
  }) {
    const { profileData = mockProfile, profileError = null, rpcData = null, rpcError = null } = options;
    mockGetById.mockResolvedValue({ data: profileData, error: profileError });
    mockGetLevelProgress.mockResolvedValue({ data: rpcData, error: rpcError });
  }

  describe('loading state', () => {
    it('should display loading text while profile is being fetched', async () => {
      mockGetById.mockReturnValue(new Promise(() => {}));
      mockGetLevelProgress.mockReturnValue(new Promise(() => {}));
      let getByText: (text: string) => unknown;
      await act(async () => {
        ({ getByText } = render(<ProfileScreen />));
      });
      expect(getByText!('Loading profile...')).toBeTruthy();
    });
  });

  describe('profile display', () => {
    it('should display the username after loading', async () => {
      setupProfileQuery({});
      const { getByText } = render(<ProfileScreen />);
      await waitFor(() => { expect(getByText('SkaterPro')).toBeTruthy(); });
    });

    it('should display the user email', async () => {
      setupProfileQuery({});
      const { getByText } = render(<ProfileScreen />);
      await waitFor(() => { expect(getByText('skater@test.com')).toBeTruthy(); });
    });

    it('should display XP, Level, Spots, and Challenges stats', async () => {
      setupProfileQuery({});
      const { getByText } = render(<ProfileScreen />);
      await waitFor(() => {
        expect(getByText('1250')).toBeTruthy();
        expect(getByText('5')).toBeTruthy();
        expect(getByText('12')).toBeTruthy();
        expect(getByText('3')).toBeTruthy();
      });
      expect(getByText('XP')).toBeTruthy();
      expect(getByText('Level')).toBeTruthy();
      expect(getByText('Spots')).toBeTruthy();
      expect(getByText('Challenges')).toBeTruthy();
    });

    it('should display default values when profile fields are missing', async () => {
      setupProfileQuery({
        profileData: { id: 'user-abc-123', username: null, level: null, xp: null, spots_added: null, challenges_completed: null, streak: null, badges: null, created_at: '2025-01-01T00:00:00Z' },
      });
      const { getByText } = render(<ProfileScreen />);
      await waitFor(() => {
        expect(getByText('Skater')).toBeTruthy();
        expect(getByText('0')).toBeTruthy();
        expect(getByText('1')).toBeTruthy();
      });
    });
  });

  describe('level progress', () => {
    it('should display level progress when available', async () => {
      setupProfileQuery({ rpcData: { current_level: 5, current_xp: 1250, xp_for_current_level: 1000, xp_for_next_level: 2000, xp_progress: 250, xp_needed: 750, progress_percentage: 25 } });
      const { getByText } = render(<ProfileScreen />);
      await waitFor(() => {
        expect(getByText(/Level 5/)).toBeTruthy();
        expect(getByText(/750 XP needed for next level/)).toBeTruthy();
      });
    });

    it('should not display level progress when rpc fails', async () => {
      setupProfileQuery({ rpcError: { message: 'RPC function not found' } });
      const { queryByText } = render(<ProfileScreen />);
      await waitFor(() => { expect(queryByText(/XP needed for next level/)).toBeNull(); });
    });
  });

  describe('streak display', () => {
    it('should display the streak when it is greater than zero', async () => {
      setupProfileQuery({});
      const { getByText } = render(<ProfileScreen />);
      await waitFor(() => { expect(getByText(/7 Day Streak/)).toBeTruthy(); });
    });

    it('should not display the streak section when streak is zero', async () => {
      setupProfileQuery({ profileData: { ...mockProfile, streak: 0 } });
      const { queryByText } = render(<ProfileScreen />);
      await waitFor(() => { expect(queryByText(/Day Streak/)).toBeNull(); });
    });

    it('should not display the streak section when streak is not set', async () => {
      setupProfileQuery({ profileData: { ...mockProfile, streak: null } });
      const { queryByText } = render(<ProfileScreen />);
      await waitFor(() => { expect(queryByText(/Day Streak/)).toBeNull(); });
    });
  });

  describe('badges display', () => {
    it('should display unlocked badges', async () => {
      setupProfileQuery({});
      const { getByText } = render(<ProfileScreen />);
      await waitFor(() => {
        expect(getByText(/First Kickflip/)).toBeTruthy();
        expect(getByText(/Park Master/)).toBeTruthy();
      });
    });

    it('should not display the badges section when badges is empty', async () => {
      setupProfileQuery({ profileData: { ...mockProfile, badges: {} } });
      const { queryByText } = render(<ProfileScreen />);
      await waitFor(() => { expect(queryByText('Badges')).toBeNull(); });
    });

    it('should not display badges that are unlocked: false', async () => {
      const customBadges: MockBadges = { 'First Kickflip': true, 'Secret Badge': false };
      setupProfileQuery({ profileData: { ...mockProfile, badges: customBadges } });
      const { getByText, queryByText } = render(<ProfileScreen />);
      await waitFor(() => {
        expect(getByText(/First Kickflip/)).toBeTruthy();
        expect(queryByText(/Secret Badge/)).toBeNull();
      });
    });
  });

  describe('sign out flow', () => {
    it('should show an Alert confirmation when Sign Out is pressed', async () => {
      setupProfileQuery({});
      const { getByText } = render(<ProfileScreen />);
      await waitFor(() => { expect(getByText('Sign Out')).toBeTruthy(); });
      fireEvent.press(getByText('Sign Out'));
      expect(Alert.alert).toHaveBeenCalledWith('Sign Out', 'Are you sure you want to sign out?',
        expect.arrayContaining([
          expect.objectContaining({ text: 'Cancel', style: 'cancel' }),
          expect.objectContaining({ text: 'Sign Out', style: 'destructive' }),
        ])
      );
    });

    it('should call signOut when the destructive action is confirmed', async () => {
      setupProfileQuery({});
      mockSignOut.mockResolvedValue(undefined);
      type AlertButton = { style: string; onPress?: () => void; text: string };
      (Alert.alert as jest.Mock).mockImplementation((_t: string, _m: string, buttons: AlertButton[]) => {
        buttons?.find((b) => b.style === 'destructive')?.onPress?.();
      });
      const { getByText } = render(<ProfileScreen />);
      await waitFor(() => { expect(getByText('Sign Out')).toBeTruthy(); });
      fireEvent.press(getByText('Sign Out'));
      await waitFor(() => { expect(mockSignOut).toHaveBeenCalledTimes(1); });
    });

    it('should not call signOut when Cancel is pressed in the alert', async () => {
      setupProfileQuery({});
      type AlertButton = { style: string; onPress?: () => void; text: string };
      (Alert.alert as jest.Mock).mockImplementation((_t: string, _m: string, buttons: AlertButton[]) => {
        buttons?.find((b) => b.style === 'cancel')?.onPress?.();
      });
      const { getByText } = render(<ProfileScreen />);
      await waitFor(() => { expect(getByText('Sign Out')).toBeTruthy(); });
      fireEvent.press(getByText('Sign Out'));
      expect(mockSignOut).not.toHaveBeenCalled();
    });
  });

  describe('profile creation flow', () => {
    it('should create a new profile when PGRST116 error is returned', async () => {
      mockGetById.mockResolvedValue({ data: null, error: { code: 'PGRST116', message: 'No rows found' } });
      mockCreate.mockResolvedValue({ data: { ...mockProfile, username: 'Skater1234' }, error: null });
      render(<ProfileScreen />);
      await waitFor(() => { expect(mockCreate).toHaveBeenCalled(); });
    });
  });

  describe('no user state', () => {
    it('should not attempt to load profile when user is null', () => {
      mockUseAuthStore.mockReturnValue({ user: null, signOut: mockSignOut });
      render(<ProfileScreen />);
      expect(mockGetById).not.toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    it('should handle generic profile loading errors without crashing', async () => {
      setupProfileQuery({ profileError: { code: 'GENERIC', message: 'Something went wrong' } });
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      const { getByText } = render(<ProfileScreen />);
      await waitFor(() => { expect(getByText('Sign Out')).toBeTruthy(); });
      consoleSpy.mockRestore();
    });
  });
});
