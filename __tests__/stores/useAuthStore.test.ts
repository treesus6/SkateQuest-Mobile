import { act } from '@testing-library/react-native';
import { useAuthStore } from '../../stores/useAuthStore';
import { supabase } from '../../lib/supabase';

// Access the mocked supabase auth methods
const mockSignUp = supabase.auth.signUp as jest.Mock;
const mockSignInWithPassword = supabase.auth.signInWithPassword as jest.Mock;
const mockSignOut = supabase.auth.signOut as jest.Mock;
const mockGetSession = supabase.auth.getSession as jest.Mock;
const mockOnAuthStateChange = supabase.auth.onAuthStateChange as jest.Mock;

describe('useAuthStore', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    // Reset the store state before each test
    useAuthStore.setState({
      user: null,
      session: null,
      loading: true,
    });

    // Default mock for onAuthStateChange
    mockOnAuthStateChange.mockReturnValue({
      data: { subscription: { unsubscribe: jest.fn() } },
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('initial state', () => {
    it('should have null user and session with loading true', () => {
      const state = useAuthStore.getState();

      expect(state.user).toBeNull();
      expect(state.session).toBeNull();
      expect(state.loading).toBe(true);
    });
  });

  describe('initialize', () => {
    it('should set session and user from getSession when successful', async () => {
      const mockUser = { id: 'user-1', email: 'skater@test.com' };
      const mockSession = { user: mockUser, access_token: 'token-abc' };

      mockGetSession.mockResolvedValue({
        data: { session: mockSession },
      });

      const cleanup = useAuthStore.getState().initialize();

      // Wait for the promise to resolve
      await act(async () => {
        await Promise.resolve();
      });

      const state = useAuthStore.getState();
      expect(state.session).toEqual(mockSession);
      expect(state.user).toEqual(mockUser);
      expect(state.loading).toBe(false);

      // Cleanup should be a function
      expect(typeof cleanup).toBe('function');
    });

    it('should set loading to false when getSession returns no session', async () => {
      mockGetSession.mockResolvedValue({
        data: { session: null },
      });

      useAuthStore.getState().initialize();

      await act(async () => {
        await Promise.resolve();
      });

      const state = useAuthStore.getState();
      expect(state.user).toBeNull();
      expect(state.session).toBeNull();
      expect(state.loading).toBe(false);
    });

    it('should set loading to false when getSession fails', async () => {
      mockGetSession.mockRejectedValue(new Error('Network error'));

      useAuthStore.getState().initialize();

      await act(async () => {
        await Promise.resolve();
      });

      const state = useAuthStore.getState();
      expect(state.loading).toBe(false);
    });

    it('should set loading to false after 10 second timeout as fallback', async () => {
      // getSession never resolves
      mockGetSession.mockReturnValue(new Promise(() => {}));

      useAuthStore.getState().initialize();

      // Before timeout
      expect(useAuthStore.getState().loading).toBe(true);

      // Fast-forward 10 seconds
      act(() => {
        jest.advanceTimersByTime(10000);
      });

      expect(useAuthStore.getState().loading).toBe(false);
    });

    it('should subscribe to auth state changes', async () => {
      mockGetSession.mockResolvedValue({ data: { session: null } });

      useAuthStore.getState().initialize();

      expect(mockOnAuthStateChange).toHaveBeenCalledTimes(1);
      expect(typeof mockOnAuthStateChange.mock.calls[0][0]).toBe('function');
    });

    it('should update state when auth state changes', async () => {
      mockGetSession.mockResolvedValue({ data: { session: null } });

      let authChangeCallback: Function;
      mockOnAuthStateChange.mockImplementation(callback => {
        authChangeCallback = callback;
        return { data: { subscription: { unsubscribe: jest.fn() } } };
      });

      useAuthStore.getState().initialize();

      const mockUser = { id: 'user-2', email: 'new@test.com' };
      const mockSession = { user: mockUser, access_token: 'new-token' };

      act(() => {
        authChangeCallback!('SIGNED_IN', mockSession);
      });

      const state = useAuthStore.getState();
      expect(state.session).toEqual(mockSession);
      expect(state.user).toEqual(mockUser);
      expect(state.loading).toBe(false);
    });

    it('should set user to null when auth state change has no session', async () => {
      mockGetSession.mockResolvedValue({ data: { session: null } });

      let authChangeCallback: Function;
      mockOnAuthStateChange.mockImplementation(callback => {
        authChangeCallback = callback;
        return { data: { subscription: { unsubscribe: jest.fn() } } };
      });

      useAuthStore.getState().initialize();

      act(() => {
        authChangeCallback!('SIGNED_OUT', null);
      });

      const state = useAuthStore.getState();
      expect(state.session).toBeNull();
      expect(state.user).toBeNull();
    });

    it('should unsubscribe and clear timeout on cleanup', async () => {
      const mockUnsubscribe = jest.fn();
      mockGetSession.mockResolvedValue({ data: { session: null } });
      mockOnAuthStateChange.mockReturnValue({
        data: { subscription: { unsubscribe: mockUnsubscribe } },
      });

      const cleanup = useAuthStore.getState().initialize();
      cleanup();

      expect(mockUnsubscribe).toHaveBeenCalledTimes(1);
    });
  });

  describe('signUp', () => {
    it('should call supabase signUp with email and password', async () => {
      mockSignUp.mockResolvedValue({ error: null });

      const result = await useAuthStore.getState().signUp('newuser@test.com', 'password123');

      expect(mockSignUp).toHaveBeenCalledWith({
        email: 'newuser@test.com',
        password: 'password123',
      });
      expect(result.error).toBeNull();
    });

    it('should return the error when signUp fails', async () => {
      const mockError = { message: 'Email already registered' };
      mockSignUp.mockResolvedValue({ error: mockError });

      const result = await useAuthStore.getState().signUp('existing@test.com', 'password123');

      expect(result.error).toEqual(mockError);
    });
  });

  describe('signIn', () => {
    it('should call supabase signInWithPassword with email and password', async () => {
      mockSignInWithPassword.mockResolvedValue({ error: null });

      const result = await useAuthStore.getState().signIn('skater@test.com', 'password123');

      expect(mockSignInWithPassword).toHaveBeenCalledWith({
        email: 'skater@test.com',
        password: 'password123',
      });
      expect(result.error).toBeNull();
    });

    it('should return the error when signIn fails with invalid credentials', async () => {
      const mockError = { message: 'Invalid login credentials' };
      mockSignInWithPassword.mockResolvedValue({ error: mockError });

      const result = await useAuthStore.getState().signIn('wrong@test.com', 'badpassword');

      expect(result.error).toEqual(mockError);
    });
  });

  describe('signOut', () => {
    it('should call supabase signOut', async () => {
      mockSignOut.mockResolvedValue({ error: null });

      await useAuthStore.getState().signOut();

      expect(mockSignOut).toHaveBeenCalledTimes(1);
    });
  });

  describe('resetPassword', () => {
    it('should call supabase resetPasswordForEmail with the provided email', async () => {
      // The mock for resetPasswordForEmail is not set up in jest.setup.js,
      // so we need to add it here
      (supabase.auth as any).resetPasswordForEmail = jest.fn().mockResolvedValue({ error: null });

      const result = await useAuthStore.getState().resetPassword('forgot@test.com');

      expect((supabase.auth as any).resetPasswordForEmail).toHaveBeenCalledWith('forgot@test.com');
      expect(result.error).toBeNull();
    });

    it('should return the error when resetPassword fails', async () => {
      const mockError = { message: 'User not found' };
      (supabase.auth as any).resetPasswordForEmail = jest
        .fn()
        .mockResolvedValue({ error: mockError });

      const result = await useAuthStore.getState().resetPassword('unknown@test.com');

      expect(result.error).toEqual(mockError);
    });
  });
});
