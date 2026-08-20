import React from 'react';
import { Alert } from 'react-native';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import ForgotPasswordScreen from '../../screens/ForgotPasswordScreen';
import { useAuthStore } from '../../stores/useAuthStore';

jest.mock('../../stores/useAuthStore');
const mockUseAuthStore = useAuthStore as unknown as jest.Mock;

const mockGoBack = jest.fn();
jest.mock('../../lib/useNavigation', () => ({
  useNavigation: () => ({ goBack: mockGoBack }),
}));

jest.spyOn(Alert, 'alert').mockImplementation(() => {});

describe('ForgotPasswordScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuthStore.mockReturnValue({
      resetPassword: jest.fn().mockResolvedValue({ error: null }),
      loading: false,
    });
  });

  it('renders reset password form', async () => {
    const { getByText, getByPlaceholderText } = await render(<ForgotPasswordScreen />);
    expect(getByText('Reset password')).toBeTruthy();
    expect(getByPlaceholderText('Email address')).toBeTruthy();
    expect(getByText('SEND RESET LINK')).toBeTruthy();
  });

  it('does not submit an empty email', async () => {
    const mockReset = jest.fn().mockResolvedValue({ error: null });
    mockUseAuthStore.mockReturnValue({ resetPassword: mockReset, loading: false });
    const { getByText } = await render(<ForgotPasswordScreen />);
    await fireEvent.press(getByText('SEND RESET LINK'));
    expect(mockReset).not.toHaveBeenCalled();
  });

  it('calls resetPassword with email', async () => {
    const mockReset = jest.fn().mockResolvedValue({ error: null });
    mockUseAuthStore.mockReturnValue({ resetPassword: mockReset, loading: false });

    const { getByPlaceholderText, getByText } = await render(<ForgotPasswordScreen />);

    await fireEvent.changeText(getByPlaceholderText('Email address'), 'test@example.com');
    await fireEvent.press(getByText('SEND RESET LINK'));

    await waitFor(() => {
      expect(mockReset).toHaveBeenCalledWith('test@example.com');
    });
  });

  it('shows the sent confirmation and hides the form after reset', async () => {
    const mockReset = jest.fn().mockResolvedValue({ error: null });
    mockUseAuthStore.mockReturnValue({ resetPassword: mockReset, loading: false });

    const { getByPlaceholderText, getByText, queryByPlaceholderText } = await render(
      <ForgotPasswordScreen />
    );

    await fireEvent.changeText(getByPlaceholderText('Email address'), 'test@example.com');
    await fireEvent.press(getByText('SEND RESET LINK'));

    await waitFor(() => {
      expect(getByText('Check your email')).toBeTruthy();
    });
    expect(queryByPlaceholderText('Email address')).toBeNull();
  });

  it('shows an alert for reset failure', async () => {
    const mockReset = jest.fn().mockResolvedValue({
      error: { message: 'User not found' },
    });
    mockUseAuthStore.mockReturnValue({ resetPassword: mockReset, loading: false });

    const { getByPlaceholderText, getByText } = await render(<ForgotPasswordScreen />);

    await fireEvent.changeText(getByPlaceholderText('Email address'), 'bad@example.com');
    await fireEvent.press(getByText('SEND RESET LINK'));

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith('Error', 'User not found');
    });
  });

  it('goes back to the previous screen', async () => {
    const { getByText } = await render(<ForgotPasswordScreen />);
    await fireEvent.press(getByText('Back to sign in'));
    expect(mockGoBack).toHaveBeenCalledTimes(1);
  });
});
