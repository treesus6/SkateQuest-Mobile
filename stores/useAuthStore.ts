import { create } from 'zustand';
import { Session, User } from '@supabase/supabase-js';
import * as Sentry from '@sentry/react-native';
import { supabase } from '../lib/supabase';

interface AuthState {
  user: User | null;
  session: Session | null;
  loading: boolean;
  initialize: () => () => void;
  signUp: (email: string, password: string) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: any }>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  session: null,
  loading: true,

  initialize: () => {
    const timeout = setTimeout(() => {
      set({ loading: false });
    }, 10000);

    supabase.auth
      .getSession()
      .then(({ data: { session } }) => {
        clearTimeout(timeout);
        set({
          session,
          user: session?.user ?? null,
          loading: false,
        });
      })
      .catch((error) => {
        clearTimeout(timeout);
        console.error('Supabase session error:', error);
        set({ loading: false });
      });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      set({
        session,
        user: session?.user ?? null,
        loading: false,
      });

      if (session?.user) {
        Sentry.setUser({
          id: session.user.id,
          email: session.user.email,
        });
        Sentry.addBreadcrumb({
          category: 'auth',
          message: 'User logged in',
          level: 'info',
        });
      } else {
        Sentry.setUser(null);
        Sentry.addBreadcrumb({
          category: 'auth',
          message: 'User logged out',
          level: 'info',
        });
      }
    });

    return () => {
      clearTimeout(timeout);
      subscription.unsubscribe();
    };
  },

  signUp: async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({ email, password });
    return { error };
  },

  signIn: async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  },

  signOut: async () => {
    await supabase.auth.signOut();
  },

  resetPassword: async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    return { error };
  },
}));
