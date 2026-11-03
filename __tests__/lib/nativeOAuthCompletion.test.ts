import { completeNativeOAuthCallback } from '../../lib/nativeOAuthCompletion';

describe('native Google OAuth callback', () => {
  it('requires an authorization code rather than treating an old session as success', async () => {
    const exchange = jest.fn(async (_code: string) => ({
      data: { session: { user: { id: 'new-user' } } },
      error: null,
    }));
    await expect(completeNativeOAuthCallback(undefined, exchange)).resolves.toEqual({
      ok: false,
      message: 'Google did not return an authorization code. Please sign in again.',
    });
    expect(exchange).not.toHaveBeenCalled();
  });

  it('exchanges the returned code and succeeds only with a new session', async () => {
    const exchange = jest.fn(async (_code: string) => ({
      data: { session: { user: { id: 'new-user' } } },
      error: null,
    }));
    await expect(completeNativeOAuthCallback('fresh-pkce-code', exchange)).resolves.toEqual({
      ok: true,
    });
    expect(exchange).toHaveBeenCalledWith('fresh-pkce-code');
    expect(exchange).toHaveBeenCalledTimes(1);
  });

  it('does not hide an invalid or consumed code behind an existing login', async () => {
    const exchange = jest.fn(async (_code: string) => ({
      data: { session: null },
      error: { message: 'Authorization code has expired' },
    }));
    await expect(completeNativeOAuthCallback('expired-code', exchange)).resolves.toEqual({
      ok: false,
      message: 'Authorization code has expired',
    });
  });

  it('rejects a response that has no session even without an exchange error', async () => {
    const exchange = jest.fn(async (_code: string) => ({
      data: { session: null },
      error: null,
    }));
    await expect(completeNativeOAuthCallback('code', exchange)).resolves.toEqual({
      ok: false,
      message: 'Google sign-in did not create a session. Please sign in again.',
    });
  });

  it('reports a failed exchange instead of navigating to the old account', async () => {
    const exchange = jest.fn(async (_code: string): Promise<never> => {
      throw new Error('Network unavailable');
    });
    await expect(completeNativeOAuthCallback('code', exchange)).resolves.toEqual({
      ok: false,
      message: 'Network unavailable',
    });
  });
});
