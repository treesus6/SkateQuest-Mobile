import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import LoginScreen from '../../screens/LoginScreen';
import { useAuthStore } from '../../stores/useAuthStore';

// Mock the useAuthStore
jest.mock('../../stores/useAuthStore');
const mockUseAuthStore = useAuthStore as unknown as jest.Mock;

// Mock navigation
const mockNavigate = jest.fn();
const mockNavigation = {
  navigate: mockNavigate,
  goBack: jest.fn(),
  reset: jest.fn(),
};

describe('LoginScreen - Integration Flow', () => {
  const mockSignIn = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    mockUseAuthStore.mockReturnValue({
      signIn: mockSignIn,
      loading: false,
    });
  });

  describe('rendering', () => {
    it('should render the welcome text and subtitle', async () => {
      const { getByText } = await render(<LoginScreen navigation={mockNavigation} />);

      expect(getByText('Welcome Back')).toBeTruthy();
      expect(getByText('Sign in to continue your SkateQuest')).toBeTruthy();
    });

    it('should render email and password input fields', async () => {
      const { getByPlaceholderText } = await render(<LoginScreen navigation={mockNavigation} />);

      expect(getByPlaceholderText('Email')).toBeTruthy();
      expect(getByPlaceholderText('Password')).toBeTruthy();
    });

    it('should render the Sign In button', async () => {
      const { getByText } = await render(<LoginScreen navigation={mockNavigation} />);

      expect(getByText('Sign In')).toBeTruthy();
    });

    it('should render the sign up navigation link', async () => {
      const { getByText } = await render(<LoginScreen navigation={mockNavigation} />);

      expect(getByText("Don't have an account? Sign up")).toBeTruthy();
    });
  });

  describe('input handling', () => {
    it('should update email field when typing', async () => {
      const { getByPlaceholderText } = await render(<LoginScreen navigation={mockNavigation} />);

      const emailInput = getByPlaceholderText('Email');
      fireEvent.changeText(emailInput, 'skater@test.com');

      expect(emailInput.props.value).toBe('skater@test.com');
    });

    it('should update password field when typing', async () => {
      const { getByPlaceholderText } = await render(<LoginScreen navigation={mockNavigation} />);

      const passwordInput = getByPlaceholderText('Password');
      fireEvent.changeText(passwordInput, 'mypassword123');

      expect(passwordInput.props.value).toBe('mypassword123');
    });

    it('should have the password field set as secure text entry', async () => {
      const { getByPlaceholderText } = await render(<LoginScreen navigation={mockNavigation} />);

      const passwordInput = getByPlaceholderText('Password');
      expect(passwordInput.props.secureTextEntry).toBe(true);
    });

    it('should have autoCapitalize set to none on email field', async () => {
      const { getByPlaceholderText } = await render(<LoginScreen navigation={mockNavigation} />);

      const emailInput = getByPlaceholderText('Email');
      expect(emailInput.props.autoCapitalize).toBe('none');
    });
  });

  describe('login flow', () => {
    it('should call signIn with trimmed email and password on button press', async () => {
      mockSignIn.mockResolvedValue({ error: null });

      const { getByPlaceholderText, getByText } = await render(
        <LoginScreen navigation={mockNavigation} />
      );

      fireEvent.changeText(getByPlaceholderText('Email'), '  skater@test.com  ');
      fireEvent.changeText(getByPlaceholderText('Password'), 'password123');
      fireEvent.press(getByText('Sign In'));

      await waitFor(() => {
        expect(mockSignIn).toHaveBeenCalledWith('skater@test.com', 'password123');
      });
    });

    it('should show validation error when fields are empty', async () => {
      const { getByText } = await render(<LoginScreen navigation={mockNavigation} />);

      fireEvent.press(getByText('Sign In'));

      await waitFor(() => {
        expect(getByText('Please enter both email and password')).toBeTruthy();
      });

      // signIn should NOT be called when fields are empty
      expect(mockSignIn).not.toHaveBeenCalled();
    });

    it('should call signIn only once per button press', async () => {
      mockSignIn.mockResolvedValue({ error: null });

      const { getByPlaceholderText, getByText } = await render(
        <LoginScreen navigation={mockNavigation} />
      );

      fireEvent.changeText(getByPlaceholderText('Email'), 'test@test.com');
      fireEvent.changeText(getByPlaceholderText('Password'), 'pass');
      fireEvent.press(getByText('Sign In'));

      await waitFor(() => {
        expect(mockSignIn).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('loading state', () => {
    it('should display Loading... text when loading is true', async () => {
      mockUseAuthStore.mockReturnValue({
        signIn: mockSignIn,
        loading: true,
      });

      const { getByText } = await render(<LoginScreen navigation={mockNavigation} />);

      expect(getByText('Loading...')).toBeTruthy();
    });

    it('should display Sign In text when loading is false', async () => {
      mockUseAuthStore.mockReturnValue({
        signIn: mockSignIn,
        loading: false,
      });

      const { getByText } = await render(<LoginScreen navigation={mockNavigation} />);

      expect(getByText('Sign In')).toBeTruthy();
    });

    it('should show Loading text instead of Sign In when loading is true', async () => {
      mockUseAuthStore.mockReturnValue({
        signIn: mockSignIn,
        loading: true,
      });

      const { getByText, queryByText } = await render(<LoginScreen navigation={mockNavigation} />);

      expect(getByText('Loading...')).toBeTruthy();
      expect(queryByText('Sign In')).toBeNull();
    });
  });

  describe('navigation', () => {
    it('should navigate to Signup screen when sign up link is pressed', async () => {
      const { getByText } = await render(<LoginScreen navigation={mockNavigation} />);

      fireEvent.press(getByText("Don't have an account? Sign up"));

      expect(mockNavigate).toHaveBeenCalledWith('Signup');
    });

    it('should not navigate to Signup when sign in button is pressed', async () => {
      mockSignIn.mockResolvedValue({ error: null });

      const { getByText } = await render(<LoginScreen navigation={mockNavigation} />);

      fireEvent.press(getByText('Sign In'));

      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });

  describe('complete login flow', () => {
    it('should handle a full successful login flow', async () => {
      mockSignIn.mockResolvedValue({ error: null });

      const { getByPlaceholderText, getByText } = await render(
        <LoginScreen navigation={mockNavigation} />
      );

      fireEvent.changeText(getByPlaceholderText('Email'), 'pro.skater@test.com');
      fireEvent.changeText(getByPlaceholderText('Password'), 'kickflip2026');
      fireEvent.press(getByText('Sign In'));

      await waitFor(() => {
        expect(mockSignIn).toHaveBeenCalledWith('pro.skater@test.com', 'kickflip2026');
      });
    });

    it('should handle a failed login attempt gracefully', async () => {
      const mockError = { message: 'Invalid login credentials' };
      mockSignIn.mockResolvedValue({ error: mockError });

      const { getByPlaceholderText, getByText } = await render(
        <LoginScreen navigation={mockNavigation} />
      );

      fireEvent.changeText(getByPlaceholderText('Email'), 'wrong@test.com');
      fireEvent.changeText(getByPlaceholderText('Password'), 'wrongpass');
      fireEvent.press(getByText('Sign In'));

      await waitFor(() => {
        expect(mockSignIn).toHaveBeenCalledWith('wrong@test.com', 'wrongpass');
      });

      expect(getByText('Sign In')).toBeTruthy();
    });
  });
});
