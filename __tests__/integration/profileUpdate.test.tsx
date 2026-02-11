import React from 'react';
import { render, waitFor, fireEvent } from '@testing-library/react-native';
import { Alert } from 'react-native';
import ProfileScreen from '../../screens/ProfileScreen';
import { useAuthStore } from '../../stores/useAuthStore';
import { profilesService } from '../../lib/profilesService';

// Mock the useAuthStore
jest.mock('../../stores/useAuthStore');
const mockUseAuthStore = useAuthStore as unknown as jest.Mock;

// Mock profilesService
jest.mock('../../lib/profilesService');
const mockGetById = profilesService.getById as jest.Mock;
const mockCreate = profilesService.create as jest.Mock;
const mockGetLevelProgress = profilesService.getLevelProgress as jest.Mock;

// Mock LoadingSkeleton to avoid Animated issues in test renderer
jest.mock('../../components/ui/LoadingSkeleton', () => {
  const { View } = require('react-native');
  return {
    __esModule: true,
    default: () => <View testID="loading-skeleton" />,
  };
});

// Mock Alert.alert
jest.spyOn(Alert, 'alert');

describe('ProfileScreen - Integration', () => {
  const mockSignOut = jest.fn();
  const mockUser = {
    id: 'user-abc-123',
    email: 'skater@test.com',
  };

  const mockProfile = {
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

    mockUseAuthStore.mockReturnValue({
      user: mockUser,
      signOut: mockSignOut,
    });
  });

  /**
   * Helper to set up profilesService mocks.
   */
  function setupProfileMocks(options: {
    profileData?: any;
    profileError?: any;
    rpcData?: any;
    rpcError?: any;
  } = {}) {
    const { profileData = mockProfile, profileError = null, rpcData = null, rpcError = null } = options;

    mockGetById.mockResolvedValue({ data: profileData, error: profileError });
    mockGetLevelProgress.mockResolvedValue({ data: rpcData, error: rpcError });
    mockCreate.mockResolvedValue({ data: profileData, error: null });
  }

  describe('loading state', () => {
    it('should not display profile content while loading', () => {
      // Set up a query that never resolves
      mockGetById.mockReturnValue(new Promise(() => {}));

      const { queryByText } = render(<ProfileScreen />);

      // Profile content should not be rendered during loading
      expect(queryByText('SkaterPro')).toBeNull();
      expect(queryByText('Sign Out')).toBeNull();
    });
  });

  describe('profile display', () => {
    it('should display the username after loading', async () => {
      setupProfileMocks({});

      const { getByText } = render(<ProfileScreen />);

      await waitFor(() => {
        expect(getByText('SkaterPro')).toBeTruthy();
      });
    });

    it('should display the user email', async () => {
      setupProfileMocks({});

      const { getByText } = render(<ProfileScreen />);

      await waitFor(() => {
        expect(getByText('skater@test.com')).toBeTruthy();
      });
    });

    it('should display XP, Level, Spots, and Challenges stats', async () => {
      setupProfileMocks({});

      const { getByText } = render(<ProfileScreen />);

      await waitFor(() => {
        expect(getByText('1250')).toBeTruthy();  // XP
        expect(getByText('5')).toBeTruthy();     // Level
        expect(getByText('12')).toBeTruthy();    // Spots
        expect(getByText('3')).toBeTruthy();     // Challenges completed count
      });

      expect(getByText('XP')).toBeTruthy();
      expect(getByText('Level')).toBeTruthy();
      expect(getByText('Spots')).toBeTruthy();
      expect(getByText('Challenges')).toBeTruthy();
    });

    it('should display default values when profile fields are missing', async () => {
      setupProfileMocks({
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

      await waitFor(() => {
        expect(getByText('Skater')).toBeTruthy();  // fallback username
        expect(getAllByText('0').length).toBeGreaterThanOrEqual(1);  // fallback XP / spots / challenges
        expect(getByText('1')).toBeTruthy();        // fallback level
      });
    });
  });

  describe('level progress', () => {
    it('should display level progress when available', async () => {
      const mockLevelProgress = {
        current_level: 5,
        current_xp: 1250,
        xp_for_current_level: 1000,
        xp_for_next_level: 2000,
        xp_progress: 250,
        xp_needed: 750,
        progress_percentage: 25,
      };

      setupProfileMocks({ rpcData: mockLevelProgress });

      const { getByText } = render(<ProfileScreen />);

      await waitFor(() => {
        expect(getByText(/Level 5/)).toBeTruthy();
        expect(getByText(/750 XP needed for next level/)).toBeTruthy();
      });
    });

    it('should not display level progress when rpc fails', async () => {
      setupProfileMocks({
        rpcError: { message: 'RPC function not found' },
      });

      const { queryByText } = render(<ProfileScreen />);

      await waitFor(() => {
        expect(queryByText(/XP needed for next level/)).toBeNull();
      });
    });
  });

  describe('streak display', () => {
    it('should display the streak when it is greater than zero', async () => {
      setupProfileMocks({});

      const { getByText } = render(<ProfileScreen />);

      await waitFor(() => {
        expect(getByText(/7 Day Streak/)).toBeTruthy();
      });
    });

    it('should not display the streak section when streak is zero', async () => {
      setupProfileMocks({
        profileData: { ...mockProfile, streak: 0 },
      });

      const { queryByText } = render(<ProfileScreen />);

      await waitFor(() => {
        expect(queryByText(/Day Streak/)).toBeNull();
      });
    });

    it('should not display the streak section when streak is not set', async () => {
      setupProfileMocks({
        profileData: { ...mockProfile, streak: null },
      });

      const { queryByText } = render(<ProfileScreen />);

      await waitFor(() => {
        expect(queryByText(/Day Streak/)).toBeNull();
      });
    });
  });

  describe('badges display', () => {
    it('should display unlocked badges', async () => {
      setupProfileMocks({});

      const { getByText } = render(<ProfileScreen />);

      await waitFor(() => {
        expect(getByText(/First Kickflip/)).toBeTruthy();
        expect(getByText(/Park Master/)).toBeTruthy();
      });
    });

    it('should not display the badges section when badges is empty', async () => {
      setupProfileMocks({
        profileData: { ...mockProfile, badges: {} },
      });

      const { queryByText } = render(<ProfileScreen />);

      await waitFor(() => {
        expect(queryByText('Badges')).toBeNull();
      });
    });

    it('should not display badges that are unlocked: false', async () => {
      setupProfileMocks({
        profileData: {
          ...mockProfile,
          badges: { 'First Kickflip': true, 'Secret Badge': false },
        },
      });

      const { getByText, queryByText } = render(<ProfileScreen />);

      await waitFor(() => {
        expect(getByText(/First Kickflip/)).toBeTruthy();
        expect(queryByText(/Secret Badge/)).toBeNull();
      });
    });
  });

  describe('sign out flow', () => {
    it('should show an Alert confirmation when Sign Out is pressed', async () => {
      setupProfileMocks({});

      const { getByText } = render(<ProfileScreen />);

      await waitFor(() => {
        expect(getByText('Sign Out')).toBeTruthy();
      });

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

    it('should call signOut when the destructive action is confirmed', async () => {
      setupProfileMocks({});
      mockSignOut.mockResolvedValue(undefined);

      // Capture the Alert.alert call and simulate pressing the destructive button
      (Alert.alert as jest.Mock).mockImplementation((_title, _message, buttons) => {
        const signOutButton = buttons?.find((b: any) => b.style === 'destructive');
        signOutButton?.onPress?.();
      });

      const { getByText } = render(<ProfileScreen />);

      await waitFor(() => {
        expect(getByText('Sign Out')).toBeTruthy();
      });

      fireEvent.press(getByText('Sign Out'));

      await waitFor(() => {
        expect(mockSignOut).toHaveBeenCalledTimes(1);
      });
    });

    it('should not call signOut when Cancel is pressed in the alert', async () => {
      setupProfileMocks({});

      // Simulate pressing Cancel
      (Alert.alert as jest.Mock).mockImplementation((_title, _message, buttons) => {
        const cancelButton = buttons?.find((b: any) => b.style === 'cancel');
        cancelButton?.onPress?.();
      });

      const { getByText } = render(<ProfileScreen />);

      await waitFor(() => {
        expect(getByText('Sign Out')).toBeTruthy();
      });

      fireEvent.press(getByText('Sign Out'));

      expect(mockSignOut).not.toHaveBeenCalled();
    });
  });

  describe('profile creation flow', () => {
    it('should create a new profile when PGRST116 error is returned', async () => {
      const profileError = { code: 'PGRST116', message: 'No rows found' };

      mockGetById.mockResolvedValue({ data: null, error: profileError });
      mockCreate.mockResolvedValue({
        data: { ...mockProfile, username: 'Skater1234' },
        error: null,
      });
      mockGetLevelProgress.mockResolvedValue({ data: null, error: null });

      render(<ProfileScreen />);

      await waitFor(() => {
        expect(mockCreate).toHaveBeenCalled();
      });
    });
  });

  describe('no user state', () => {
    it('should not attempt to load profile when user is null', () => {
      mockUseAuthStore.mockReturnValue({
        user: null,
        signOut: mockSignOut,
      });

      render(<ProfileScreen />);

      expect(mockGetById).not.toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    it('should handle generic profile loading errors without crashing', async () => {
      const profileError = { code: 'GENERIC', message: 'Something went wrong' };
      setupProfileMocks({ profileError });

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      const { getByText } = render(<ProfileScreen />);

      await waitFor(() => {
        // The component should still render the sign out button
        expect(getByText('Sign Out')).toBeTruthy();
      });

      consoleSpy.mockRestore();
    });
  });
});
