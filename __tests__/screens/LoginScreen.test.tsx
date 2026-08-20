import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import LoginScreen from '../../screens/LoginScreen';
import { useAuthStore } from '../../stores/useAuthStore';

// Mock the auth store
jest.mock('../../stores/useAuthStore');
const mockUseAuthStore = useAuthStore as unknown as jest.Mock;

const mockNavigation = {
  navigate: jest.fn(),
};

describe('LoginScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuthStore.mockReturnValue({
      signIn: jest.fn().mockResolvedValue({ error: null }),
      loading: false,
    });
  });

  it('renders login form', async () => {
    const { getByPlaceholderText, getByText } = await render(
      <LoginScreen navigation={mockNavigation} />
    );
    expect(getByText(/SKATE\s+QUEST/)).toBeTruthy();
    expect(getByText('Sign in with your email and password')).toBeTruthy();
    expect(getByPlaceholderText('Email')).toBeTruthy();
    expect(getByPlaceholderText('Password')).toBeTruthy();
    expect(getByText('Sign In')).toBeTruthy();
    expect(getByText('Continue with Google')).toBeTruthy();
  });

  it('shows validation error for empty fields', async () => {
    const { getByText } = await render(<LoginScreen navigation={mockNavigation} />);
    await fireEvent.press(getByText('Sign In'));
    await waitFor(() => {
      expect(getByText('Please enter both email and password')).toBeTruthy();
    });
  });

  it('calls signIn with email and password', async () => {
    const mockSignIn = jest.fn().mockResolvedValue({ error: null });
    mockUseAuthStore.mockReturnValue({ signIn: mockSignIn, loading: false });

    const { getByPlaceholderText, getByText } = await render(
      <LoginScreen navigation={mockNavigation} />
    );

    await fireEvent.changeText(getByPlaceholderText('Email'), 'test@example.com');
    await fireEvent.changeText(getByPlaceholderText('Password'), 'password123');
    await fireEvent.press(getByText('Sign In'));

    await waitFor(() => {
      expect(mockSignIn).toHaveBeenCalledWith('test@example.com', 'password123');
    });
  });

  it('shows error from sign in failure', async () => {
    const mockSignIn = jest.fn().mockResolvedValue({
      error: { message: 'Invalid credentials' },
    });
    mockUseAuthStore.mockReturnValue({ signIn: mockSignIn, loading: false });

    const { getByPlaceholderText, getByText } = await render(
      <LoginScreen navigation={mockNavigation} />
    );

    await fireEvent.changeText(getByPlaceholderText('Email'), 'bad@example.com');
    await fireEvent.changeText(getByPlaceholderText('Password'), 'wrong');
    await fireEvent.press(getByText('Sign In'));

    await waitFor(() => {
      expect(getByText('Invalid credentials')).toBeTruthy();
    });
  });

  it('navigates to Signup screen', async () => {
    const { getByText } = await render(<LoginScreen navigation={mockNavigation} />);
    await fireEvent.press(getByText('Sign Up'));
    expect(mockNavigation.navigate).toHaveBeenCalledWith('Signup');
  });

  it('navigates to ForgotPassword screen', async () => {
    const { getByText } = await render(<LoginScreen navigation={mockNavigation} />);
    await fireEvent.press(getByText('Forgot password?'));
    expect(mockNavigation.navigate).toHaveBeenCalledWith('ForgotPassword');
  });

  it('shows loading state', async () => {
    mockUseAuthStore.mockReturnValue({
      signIn: jest.fn(),
      loading: true,
    });
    const { queryByText } = await render(<LoginScreen navigation={mockNavigation} />);
    expect(queryByText('Sign In')).toBeNull();
  });
});