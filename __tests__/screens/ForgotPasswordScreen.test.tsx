import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import ForgotPasswordScreen from '../../screens/ForgotPasswordScreen';
import { useAuthStore } from '../../stores/useAuthStore';

jest.mock('../../stores/useAuthStore');
const mockUseAuthStore = useAuthStore as unknown as jest.Mock;

const mockNavigation = {
  navigate: jest.fn(),
};

describe('ForgotPasswordScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuthStore.mockReturnValue({
      resetPassword: jest.fn().mockResolvedValue({ error: null }),
      loading: false,
    });
  });

  it('renders reset password form', () => {
    const { getByText, getByPlaceholderText } = render(
      <ForgotPasswordScreen navigation={mockNavigation} />
    );
    expect(getByText('Reset Password')).toBeTruthy();
    expect(getByPlaceholderText('Email')).toBeTruthy();
    expect(getByText('Send Reset Link')).toBeTruthy();
  });

  it('shows validation error for empty email', async () => {
    const { getByText } = render(<ForgotPasswordScreen navigation={mockNavigation} />);
    fireEvent.press(getByText('Send Reset Link'));
    await waitFor(() => {
      expect(getByText('Please enter your email address')).toBeTruthy();
    });
  });

  it('calls resetPassword with email', async () => {
    const mockReset = jest.fn().mockResolvedValue({ error: null });
    mockUseAuthStore.mockReturnValue({ resetPassword: mockReset, loading: false });

    const { getByPlaceholderText, getByText } = render(
      <ForgotPasswordScreen navigation={mockNavigation} />
    );

    fireEvent.changeText(getByPlaceholderText('Email'), 'test@example.com');
    fireEvent.press(getByText('Send Reset Link'));

    await waitFor(() => {
      expect(mockReset).toHaveBeenCalledWith('test@example.com');
    });
  });

  it('shows success screen after reset', async () => {
    const mockReset = jest.fn().mockResolvedValue({ error: null });
    mockUseAuthStore.mockReturnValue({ resetPassword: mockReset, loading: false });

    const { getByPlaceholderText, getByText } = render(
      <ForgotPasswordScreen navigation={mockNavigation} />
    );

    fireEvent.changeText(getByPlaceholderText('Email'), 'test@example.com');
    fireEvent.press(getByText('Send Reset Link'));

    await waitFor(() => {
      expect(getByText('Check Your Email')).toBeTruthy();
    });
  });

  it('shows error from reset failure', async () => {
    const mockReset = jest.fn().mockResolvedValue({
      error: { message: 'User not found' },
    });
    mockUseAuthStore.mockReturnValue({ resetPassword: mockReset, loading: false });

    const { getByPlaceholderText, getByText } = render(
      <ForgotPasswordScreen navigation={mockNavigation} />
    );

    fireEvent.changeText(getByPlaceholderText('Email'), 'bad@example.com');
    fireEvent.press(getByText('Send Reset Link'));

    await waitFor(() => {
      expect(getByText('User not found')).toBeTruthy();
    });
  });

  it('navigates back to login', () => {
    const { getByText } = render(<ForgotPasswordScreen navigation={mockNavigation} />);
    fireEvent.press(getByText('Back to Sign In'));
    expect(mockNavigation.navigate).toHaveBeenCalledWith('Login');
  });
});
