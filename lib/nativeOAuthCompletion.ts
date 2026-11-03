/**
 * A native PKCE callback is successful only after exchanging *this* OAuth
 * authorization code for a session. An existing cached session may belong to
 * another user, so it must never be used to bypass a failed/new callback.
 */
type ExchangeResult = {
  data: { session: unknown | null } | null;
  error: { message: string } | null;
};

export type NativeOAuthCompletion =
  | { ok: true }
  | { ok: false; message: string };

export async function completeNativeOAuthCallback(
  code: string | undefined,
  exchangeCodeForSession: (code: string) => Promise<ExchangeResult>
): Promise<NativeOAuthCompletion> {
  if (!code?.trim()) {
    return { ok: false, message: 'Google did not return an authorization code. Please sign in again.' };
  }

  try {
    const { data, error } = await exchangeCodeForSession(code);
    if (error) return { ok: false, message: error.message };
    if (!data?.session) {
      return { ok: false, message: 'Google sign-in did not create a session. Please sign in again.' };
    }
    return { ok: true };
  } catch (cause) {
    return { ok: false, message: cause instanceof Error ? cause.message : 'Sign-in failed.' };
  }
}
