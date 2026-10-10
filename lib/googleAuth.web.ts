import { rememberAuthReturnPath } from './authReturnPath';
import { supabase } from './supabase';

function webCallbackUrl() {
  if (typeof window === 'undefined') return undefined;
  const pathname = window.location.pathname;
  const projectBase = pathname.startsWith('/SkateQuest-Mobile/') ? '/SkateQuest-Mobile' : '';
  return new URL(`${projectBase}/callback`, window.location.origin).toString();
}

export async function signInWithGoogle(returnTo = '/') {
  // Keep the destination in same-origin session storage instead of putting it in
  // the OAuth redirect URL. That gives Supabase one stable, exact callback URL
  // to validate in production while still returning users to the requested page.
  rememberAuthReturnPath(returnTo);
  const redirectTo = webCallbackUrl();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo,
      skipBrowserRedirect: false,
    },
  });
  return { data, error };
}
