import { supabase } from './supabase';

function webCallbackUrl() {
  if (typeof window === 'undefined') return undefined;
  const pathname = window.location.pathname;
  const projectBase = pathname.startsWith('/SkateQuest-Mobile/') ? '/SkateQuest-Mobile' : '';
  return `${window.location.origin}${projectBase}/`;
}

export async function signInWithGoogle() {
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
