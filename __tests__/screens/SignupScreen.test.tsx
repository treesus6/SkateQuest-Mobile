import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import SignupScreen from '../../screens/SignupScreen';
import { useAuthStore } from '../../stores/useAuthStore';

jest.mock('../../stores/useAuthStore');
const mockUseAuthStore = useAuthStore as unknown as jest.Mock;

const mockNavigation = {
  navigate: jest.fn(),
};

describe('SignupScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuthStore.mockReturnValue({
      signUp: jest.fn().mockResolvedValue({ error: null }),
      loading: false,
    });
  });

  it('renders signup form', () => {
    const { getByText, getByPlaceholderText } = render(
      <SignupScreen navigation={mockNavigation} />
    );
    expect(getByText('Create Account')).toBeTruthy();
    expect(getByPlaceholderText('Email')).toBeTruthy();
    expect(getByPlaceholderText('Password (min 6 characters)')).toBeTruthy();
    expect(getByText('Sign Up')).toBeTruthy();
  });

  it('shows validation error for empty fields', async () => {
    const { getByText } = render(<SignupScreen navigation={mockNavigation} />);
    fireEvent.press(getByText('Sign Up'));
    await waitFor(() => {
      expect(getByText('Please enter both email and password')).toBeTruthy();
    });
  });

  it('shows error for short password', async () => {
    const { getByPlaceholderText, getByText } = render(
      <SignupScreen navigation={mockNavigation} />
    );
    fireEvent.changeText(getByPlaceholderText('Email'), 'test@example.com');
    fireEvent.changeText(getByPlaceholderText('Password (min 6 characters)'), '12345');
    fireEvent.press(getByText('Sign Up'));

    await waitFor(() => {
      expect(getByText('Password must be at least 6 characters')).toBeTruthy();
    });
  });

  it('calls signUp with email and password', async () => {
    const mockSignUp = jest.fn().mockResolvedValue({ error: null });
    mockUseAuthStore.mockReturnValue({ signUp: mockSignUp, loading: false });

    const { getByPlaceholderText, getByText } = render(
      <SignupScreen navigation={mockNavigation} />
    );

    fireEvent.changeText(getByPlaceholderText('Email'), 'test@example.com');
    fireEvent.changeText(getByPlaceholderText('Password (min 6 characters)'), 'password123');
    fireEvent.press(getByText('Sign Up'));

    await waitFor(() => {
      expect(mockSignUp).toHaveBeenCalledWith('test@example.com', 'password123');
    });
  });

  it('shows error from signup failure', async () => {
    const mockSignUp = jest.fn().mockResolvedValue({
      error: { message: 'Email already in use' },
    });
    mockUseAuthStore.mockReturnValue({ signUp: mockSignUp, loading: false });

    const { getByPlaceholderText, getByText } = render(
      <SignupScreen navigation={mockNavigation} />
    );

    fireEvent.changeText(getByPlaceholderText('Email'), 'taken@example.com');
    fireEvent.changeText(getByPlaceholderText('Password (min 6 characters)'), 'password123');
    fireEvent.press(getByText('Sign Up'));

    await waitFor(() => {
      expect(getByText('Email already in use')).toBeTruthy();
    });
  });

  it('navigates to Login screen', () => {
    const { getByText } = render(<SignupScreen navigation={mockNavigation} />);
    fireEvent.press(getByText('Already have an account? Sign in'));
    expect(mockNavigation.navigate).toHaveBeenCalledWith('Login');
  });
});
