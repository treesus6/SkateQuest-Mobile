import { Alert } from 'react-native';
import * as Updates from 'expo-updates';
import { checkForOTAUpdate, getUpdateInfo } from '../../lib/otaUpdates';
import { Logger } from '../../lib/logger';

jest.mock('expo-updates', () => ({
  __esModule: true,
  checkForUpdateAsync: jest.fn(),
  fetchUpdateAsync: jest.fn(),
  reloadAsync: jest.fn(),
  updateId: 'test-update-id',
  channel: 'test-channel',
  runtimeVersion: '1.0.2',
  isEmbeddedLaunch: false,
  isEnabled: true,
}));

jest.mock('../../lib/logger', () => ({
  Logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

const mockCheckForUpdate = Updates.checkForUpdateAsync as jest.Mock;
const mockFetchUpdate = Updates.fetchUpdateAsync as jest.Mock;
const mockReload = Updates.reloadAsync as jest.Mock;
const mockWarn = Logger.warn as jest.Mock;
const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});

describe('checkForOTAUpdate', () => {
  const originalDev = (global as any).__DEV__;

  beforeEach(() => {
    jest.clearAllMocks();
    (Updates as any).isEnabled = true;
    (global as any).__DEV__ = false;
    mockCheckForUpdate.mockResolvedValue({ isAvailable: false });
    mockFetchUpdate.mockResolvedValue(undefined);
    mockReload.mockResolvedValue(undefined);
  });

  afterAll(() => {
    (global as any).__DEV__ = originalDev;
  });

  it('skips the check in development', async () => {
    (global as any).__DEV__ = true;

    await checkForOTAUpdate();

    expect(mockCheckForUpdate).not.toHaveBeenCalled();
  });

  it('skips the check when OTA updates are not enabled', async () => {
    (Updates as any).isEnabled = false;

    await checkForOTAUpdate();

    expect(mockCheckForUpdate).not.toHaveBeenCalled();
  });

  it('checks and fetches silently when updates are enabled and one is available', async () => {
    mockCheckForUpdate.mockResolvedValue({ isAvailable: true });

    await checkForOTAUpdate({ silent: true });

    expect(mockCheckForUpdate).toHaveBeenCalledTimes(1);
    expect(mockFetchUpdate).toHaveBeenCalledTimes(1);
    expect(mockReload).not.toHaveBeenCalled();
    expect(alertSpy).not.toHaveBeenCalled();
  });

  it('does nothing when no update is available', async () => {
    mockCheckForUpdate.mockResolvedValue({ isAvailable: false });

    await checkForOTAUpdate({ silent: true });

    expect(mockCheckForUpdate).toHaveBeenCalledTimes(1);
    expect(mockFetchUpdate).not.toHaveBeenCalled();
  });

  it('logs routine failures locally and does not throw', async () => {
    const failure = new Error('Network request failed');
    mockCheckForUpdate.mockRejectedValue(failure);

    await expect(checkForOTAUpdate({ silent: true })).resolves.toBeUndefined();

    expect(mockWarn).toHaveBeenCalledWith('OTA update check failed', failure);
  });

  it('asks the user when not silent and an update is available', async () => {
    mockCheckForUpdate.mockResolvedValue({ isAvailable: true });

    await checkForOTAUpdate();

    expect(mockFetchUpdate).toHaveBeenCalledTimes(1);
    expect(alertSpy).toHaveBeenCalledWith(
      expect.stringContaining('Update Available'),
      expect.any(String),
      expect.any(Array)
    );
    expect(mockReload).not.toHaveBeenCalled();
  });

  it('reloads immediately with forceReload when an update is available', async () => {
    mockCheckForUpdate.mockResolvedValue({ isAvailable: true });

    await checkForOTAUpdate({ forceReload: true });

    expect(mockFetchUpdate).toHaveBeenCalledTimes(1);
    expect(mockReload).toHaveBeenCalledTimes(1);
    expect(alertSpy).not.toHaveBeenCalled();
  });
});

describe('getUpdateInfo', () => {
  it('returns the current update metadata', () => {
    expect(getUpdateInfo()).toEqual({
      updateId: 'test-update-id',
      channel: 'test-channel',
      runtimeVersion: '1.0.2',
      isEmbeddedLaunch: false,
    });
  });
});
