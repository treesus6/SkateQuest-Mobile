import { supabase } from './supabase';

function webCallbackUrl(returnTo = '/') {
  if (typeof window === 'undefined') return undefined;
  const pathname = window.location.pathname;
  const projectBase = pathname.startsWith('/SkateQuest-Mobile/') ? '/SkateQuest-Mobile' : '';
  const callback = new URL(`${projectBase}/callback`, window.location.origin);
  callback.searchParams.set('returnTo', returnTo);
  return callback.toString();
}

export async function signInWithGoogle(returnTo = '/') {
  const redirectTo = webCallbackUrl(returnTo);
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo,
      skipBrowserRedirect: false,
    },
  });
  return { data, error };
}
