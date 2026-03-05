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

  it('renders login form', () => {
    const { getByPlaceholderText, getByText } = render(<LoginScreen navigation={mockNavigation} />);
    expect(getByText('Welcome Back')).toBeTruthy();
    expect(getByPlaceholderText('Email')).toBeTruthy();
    expect(getByPlaceholderText('Password')).toBeTruthy();
    expect(getByText('Sign In')).toBeTruthy();
  });

  it('shows validation error for empty fields', async () => {
    const { getByText } = render(<LoginScreen navigation={mockNavigation} />);
    fireEvent.press(getByText('Sign In'));
    await waitFor(() => {
      expect(getByText('Please enter both email and password')).toBeTruthy();
    });
  });

  it('calls signIn with email and password', async () => {
    const mockSignIn = jest.fn().mockResolvedValue({ error: null });
    mockUseAuthStore.mockReturnValue({ signIn: mockSignIn, loading: false });

    const { getByPlaceholderText, getByText } = render(<LoginScreen navigation={mockNavigation} />);

    fireEvent.changeText(getByPlaceholderText('Email'), 'test@example.com');
    fireEvent.changeText(getByPlaceholderText('Password'), 'password123');
    fireEvent.press(getByText('Sign In'));

    await waitFor(() => {
      expect(mockSignIn).toHaveBeenCalledWith('test@example.com', 'password123');
    });
  });

  it('shows error from sign in failure', async () => {
    const mockSignIn = jest.fn().mockResolvedValue({
      error: { message: 'Invalid credentials' },
    });
    mockUseAuthStore.mockReturnValue({ signIn: mockSignIn, loading: false });

    const { getByPlaceholderText, getByText } = render(<LoginScreen navigation={mockNavigation} />);

    fireEvent.changeText(getByPlaceholderText('Email'), 'bad@example.com');
    fireEvent.changeText(getByPlaceholderText('Password'), 'wrong');
    fireEvent.press(getByText('Sign In'));

    await waitFor(() => {
      expect(getByText('Invalid credentials')).toBeTruthy();
    });
  });

  it('navigates to Signup screen', () => {
    const { getByText } = render(<LoginScreen navigation={mockNavigation} />);
    fireEvent.press(getByText("Don't have an account? Sign up"));
    expect(mockNavigation.navigate).toHaveBeenCalledWith('Signup');
  });

  it('navigates to ForgotPassword screen', () => {
    const { getByText } = render(<LoginScreen navigation={mockNavigation} />);
    fireEvent.press(getByText('Forgot your password?'));
    expect(mockNavigation.navigate).toHaveBeenCalledWith('ForgotPassword');
  });

  it('shows loading state', () => {
    mockUseAuthStore.mockReturnValue({
      signIn: jest.fn(),
      loading: true,
    });
    const { getByText } = render(<LoginScreen navigation={mockNavigation} />);
    expect(getByText('Loading...')).toBeTruthy();
  });
});
