import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { Alert } from 'react-native';
import { createClient, SupabaseClient, Session, User } from '@supabase/supabase-js';

const SUPABASEURL = process.env.EXPO_PUBLIC_SUPABASE_URL as string;
const SUPABASEANONKEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY as string;

let supabase: SupabaseClient | null = null;
if (SUPABASEURL && SUPABASEANONKEY) {
  supabase = createClient(SUPABASEURL, SUPABASEANONKEY);
}

type AuthContextValue = {
  user: User | null;
  loading: boolean;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  supabase: SupabaseClient | null;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

type Props = { children: ReactNode };

export default function AuthProvider({ children }: Props) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    // v2: getSession returns { data }
    supabase.auth.getSession().then(({ data }: any) => {
      setUser(data.session?.user ?? null);
      setLoading(false);
    });

    const { data: subscription } = supabase.auth.onAuthStateChange((event, session) => {
      setUser((session as any)?.user ?? null);
    });

    return () => {
      // unsubscribe if available
      // @ts-ignore
      subscription?.subscription?.unsubscribe?.();
    };
  }, []);

  const signInWithEmail = async (email: string, password: string) => {
    if (!supabase) return;
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      Alert.alert('Sign in failed', error.message);
    }
  };

  const signUpWithEmail = async (email: string, password: string) => {
    if (!supabase) return;
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) {
      Alert.alert('Sign up failed', error.message);
    } else {
      Alert.alert('Check your email', 'Confirm your account to finish sign up.');
    }
  };

  const signOut = async () => {
    if (!supabase) return;
    const { error } = await supabase.auth.signOut();
    if (error) {
      Alert.alert('Sign out failed', error.message);
    }
  };

  const value: AuthContextValue = {
    user,
    loading,
    signInWithEmail,
    signUpWithEmail,
    signOut,
    supabase,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}
import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import * as Sentry from '@sentry/react-native';
import { supabase } from '../lib/supabase';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: any }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Set a timeout to stop loading after 10 seconds if Supabase doesn't respond
    const timeout = setTimeout(() => {
      setLoading(false);
    }, 10000);

    supabase.auth.getSession().then(({ data: { session } }) => {
      clearTimeout(timeout);
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    }).catch((error) => {
      clearTimeout(timeout);
      console.error('Supabase session error:', error);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);

      // Set Sentry user context for error tracking
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
  }, []);

  const signUp = async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({ email, password });
    return { error };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    return { error };
  };

  const value = { user, session, loading, signUp, signIn, signOut, resetPassword };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
