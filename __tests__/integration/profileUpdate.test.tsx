import React from 'react';
import { render, waitFor, fireEvent } from '@testing-library/react-native';
import { Alert } from 'react-native';
import ProfileScreen from '../../screens/ProfileScreen';
import { useAuthStore } from '../../stores/useAuthStore';
import { supabase } from '../../lib/supabase';

// Mock the useAuthStore
jest.mock('../../stores/useAuthStore');
const mockUseAuthStore = useAuthStore as unknown as jest.Mock;

// Mock Alert.alert
jest.spyOn(Alert, 'alert');

// Access the mocked supabase.from
const mockFrom = supabase.from as jest.Mock;

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
   * Helper to set up the supabase.from mock chain for the profile query.
   * Returns mock functions so tests can customize behavior.
   */
  function setupProfileQuery(options: {
    profileData?: any;
    profileError?: any;
    rpcData?: any;
    rpcError?: any;
  }) {
    const {
      profileData = mockProfile,
      profileError = null,
      rpcData = null,
      rpcError = null,
    } = options;

    const mockSingle = jest.fn().mockResolvedValue({ data: profileData, error: profileError });
    const mockEq = jest.fn().mockReturnValue({ single: mockSingle });
    const mockSelect = jest.fn().mockReturnValue({ eq: mockEq });

    mockFrom.mockReturnValue({
      select: mockSelect,
      insert: jest
        .fn()
        .mockReturnValue({ select: jest.fn().mockReturnValue({ single: jest.fn() }) }),
    });

    // Mock supabase.rpc for level progress
    (supabase as any).rpc = jest.fn().mockResolvedValue({ data: rpcData, error: rpcError });

    return { mockSingle, mockEq, mockSelect };
  }

  describe('loading state', () => {
    it('should display loading text while profile is being fetched', () => {
      // Set up a query that never resolves
      const mockSingle = jest.fn().mockReturnValue(new Promise(() => {}));
      const mockEq = jest.fn().mockReturnValue({ single: mockSingle });
      const mockSelect = jest.fn().mockReturnValue({ eq: mockEq });
      mockFrom.mockReturnValue({ select: mockSelect });

      const { getByText } = render(<ProfileScreen />);

      expect(getByText('Loading profile...')).toBeTruthy();
    });
  });

  describe('profile display', () => {
    it('should display the username after loading', async () => {
      setupProfileQuery({});

      const { getByText } = render(<ProfileScreen />);

      await waitFor(() => {
        expect(getByText('SkaterPro')).toBeTruthy();
      });
    });

    it('should display the user email', async () => {
      setupProfileQuery({});

      const { getByText } = render(<ProfileScreen />);

      await waitFor(() => {
        expect(getByText('skater@test.com')).toBeTruthy();
      });
    });

    it('should display XP, Level, Spots, and Challenges stats', async () => {
      setupProfileQuery({});

      const { getByText } = render(<ProfileScreen />);

      await waitFor(() => {
        expect(getByText('1250')).toBeTruthy(); // XP
        expect(getByText('5')).toBeTruthy(); // Level
        expect(getByText('12')).toBeTruthy(); // Spots
        expect(getByText('3')).toBeTruthy(); // Challenges completed count
      });

      expect(getByText('XP')).toBeTruthy();
      expect(getByText('Level')).toBeTruthy();
      expect(getByText('Spots')).toBeTruthy();
      expect(getByText('Challenges')).toBeTruthy();
    });

    it('should display default values when profile fields are missing', async () => {
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

      const { getByText } = render(<ProfileScreen />);

      await waitFor(() => {
        expect(getByText('Skater')).toBeTruthy(); // fallback username
        expect(getByText('0')).toBeTruthy(); // fallback XP / spots / challenges
        expect(getByText('1')).toBeTruthy(); // fallback level
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

      setupProfileQuery({ rpcData: mockLevelProgress });

      const { getByText } = render(<ProfileScreen />);

      await waitFor(() => {
        expect(getByText(/Level 5/)).toBeTruthy();
        expect(getByText(/750 XP needed for next level/)).toBeTruthy();
      });
    });

    it('should not display level progress when rpc fails', async () => {
      setupProfileQuery({
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
      setupProfileQuery({});

      const { getByText } = render(<ProfileScreen />);

      await waitFor(() => {
        expect(getByText(/7 Day Streak/)).toBeTruthy();
      });
    });

    it('should not display the streak section when streak is zero', async () => {
      setupProfileQuery({
        profileData: { ...mockProfile, streak: 0 },
      });

      const { queryByText } = render(<ProfileScreen />);

      await waitFor(() => {
        expect(queryByText(/Day Streak/)).toBeNull();
      });
    });

    it('should not display the streak section when streak is not set', async () => {
      setupProfileQuery({
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
      setupProfileQuery({});

      const { getByText } = render(<ProfileScreen />);

      await waitFor(() => {
        expect(getByText(/First Kickflip/)).toBeTruthy();
        expect(getByText(/Park Master/)).toBeTruthy();
      });
    });

    it('should not display the badges section when badges is empty', async () => {
      setupProfileQuery({
        profileData: { ...mockProfile, badges: {} },
      });

      const { queryByText } = render(<ProfileScreen />);

      await waitFor(() => {
        expect(queryByText('Badges')).toBeNull();
      });
    });

    it('should not display badges that are unlocked: false', async () => {
      setupProfileQuery({
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
      setupProfileQuery({});

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
      setupProfileQuery({});
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
      setupProfileQuery({});

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

      const mockInsertSingle = jest.fn().mockResolvedValue({
        data: { ...mockProfile, username: 'Skater1234' },
        error: null,
      });
      const mockInsertSelect = jest.fn().mockReturnValue({ single: mockInsertSingle });
      const mockInsert = jest.fn().mockReturnValue({ select: mockInsertSelect });

      const mockSingle = jest.fn().mockResolvedValue({ data: null, error: profileError });
      const mockEq = jest.fn().mockReturnValue({ single: mockSingle });
      const mockSelect = jest.fn().mockReturnValue({ eq: mockEq });

      mockFrom.mockReturnValue({ select: mockSelect, insert: mockInsert });
      (supabase as any).rpc = jest.fn().mockResolvedValue({ data: null, error: null });

      render(<ProfileScreen />);

      await waitFor(() => {
        // Profile should be created and insert should be called
        expect(mockInsert).toHaveBeenCalled();
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

      // supabase.from should not be called since user is null
      expect(mockFrom).not.toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    it('should handle generic profile loading errors without crashing', async () => {
      const profileError = { code: 'GENERIC', message: 'Something went wrong' };
      setupProfileQuery({ profileError });

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
