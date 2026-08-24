import React from 'react';
import { Alert, Linking, Platform } from 'react-native';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import NativeBetaNotice from '../../components/BetaNotice.native';
import WebBetaNotice from '../../components/BetaNotice.web';

jest.mock('expo-constants', () => ({
  __esModule: true,
  default: {
    expoConfig: { extra: { supportEmail: 'support@skatequest.me' } },
  },
}));

jest.mock('react-native-safe-area-context', () => {
  const { View } = require('react-native');
  return { SafeAreaView: View };
});

const originalPlatform = Platform.OS;

describe('BetaNotice', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Object.defineProperty(Platform, 'OS', { configurable: true, value: 'android' });
    jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
    jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  });

  afterEach(() => {
    Object.defineProperty(Platform, 'OS', { configurable: true, value: originalPlatform });
    jest.restoreAllMocks();
  });

  it('renders the Android beta notice and opens the support email', async () => {
    const { getByLabelText, getByText } = await render(<NativeBetaNotice />);

    expect(getByText('SkateQuest Android is still in beta.')).toBeTruthy();
    fireEvent.press(getByLabelText(/Email SkateQuest support at/));

    await waitFor(() =>
      expect(Linking.openURL).toHaveBeenCalledWith(
        'mailto:support@skatequest.me?subject=SkateQuest%20Android%20beta%20issue'
      )
    );
  });

  it('does not render the native notice on iOS', async () => {
    Object.defineProperty(Platform, 'OS', { configurable: true, value: 'ios' });
    const { queryByText } = await render(<NativeBetaNotice />);
    expect(queryByText('SkateQuest Android is still in beta.')).toBeNull();
  });

  it('can be dismissed for the current app session', async () => {
    const { getByLabelText, queryByText } = await render(<NativeBetaNotice />);
    fireEvent.press(getByLabelText('Dismiss beta notice'));
    await waitFor(() => expect(queryByText('SkateQuest Android is still in beta.')).toBeNull());
  });

  it('shows a useful fallback when no email app can open', async () => {
    (Linking.openURL as jest.Mock).mockRejectedValueOnce(new Error('No mail app'));
    const { getByLabelText } = await render(<NativeBetaNotice />);

    fireEvent.press(getByLabelText(/Email SkateQuest support at/));

    await waitFor(() =>
      expect(Alert.alert).toHaveBeenCalledWith(
        'Could not open email',
        expect.stringMatching(/^Email .+ directly to report the issue\.$/)
      )
    );
  });

  it('renders and dismisses the web beta notice', async () => {
    const { getByLabelText, getByText, queryByText } = await render(<WebBetaNotice />);
    await waitFor(() => expect(getByText('SkateQuest Beta')).toBeTruthy());
    fireEvent.press(getByLabelText('Dismiss beta notice'));
    await waitFor(() => expect(queryByText('SkateQuest Beta')).toBeNull());
  });
});
