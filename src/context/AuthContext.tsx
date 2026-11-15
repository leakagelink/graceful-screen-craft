// @ts-nocheck -- ported from original app; stricter project tsconfig
import {
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { AuthError, type User } from '@supabase/supabase-js';
import { supabase, type Profile } from '@/lib/supabase';
import { AuthContext, type AuthContextValue, type AuthState } from './auth-state';

function logAuthError(label: string, err: unknown) {
  if (err instanceof AuthError) {
    console.error(`[auth] ${label}`, {
      name: err.name,
      message: err.message,
      code: err.code,
      status: err.status,
    });
    return;
  }
  console.error(`[auth] ${label}`, {
    name: err instanceof Error ? err.name : 'UnknownError',
    message: err instanceof Error ? err.message : String(err),
  });
}

function displayNameFor(user: User): string {
  const meta = user.user_metadata ?? {};
  const name = meta.full_name || meta.name;
  if (typeof name === 'string' && name.trim()) return name.trim();
  return (user.email ?? 'Shipper').split('@')[0];
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    session: null,
    profile: null,
    profileError: null,
    loading: true,
  });

  async function fetchProfile(userId: string) {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();
    if (error) {
      console.error('[auth] Failed to load profile:', error.message);
      return { profile: null, error: `Could not load your profile: ${error.message}` };
    }
    return { profile: (data as Profile | null) ?? null, error: null };
  }

  async function loadProfile(userId: string) {
    const { profile } = await fetchProfile(userId);
    return profile;
  }

  async function ensureProfile(
    user: User
  ): Promise<{ profile: Profile | null; error: string | null }> {
    const existing = await fetchProfile(user.id);
    if (existing.error || existing.profile) return existing;
    const { error } = await supabase.from('profiles').insert({
      id: user.id,
      role: 'shipper',
      full_name: displayNameFor(user),
    });
    if (error && error.code !== '23505') {
      console.error('[auth] Failed to create profile:', error.message);
      return { profile: null, error: `Could not create your profile: ${error.message}` };
    }
    const created = await fetchProfile(user.id);
    if (!created.error && !created.profile) {
      return { profile: null, error: 'Your profile could not be found after signing in.' };
    }
    return created;
  }

  async function resolveSessionProfile(user: User | null) {
    if (!user) return { profile: null, error: null };
    return ensureProfile(user);
  }

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(async ({ data }) => {
      if (!mounted) return;
      const session = data.session;
      const { profile, error } = await resolveSessionProfile(session?.user ?? null);
      if (!mounted) return;
      setState({
        user: session?.user ?? null,
        session,
        profile,
        profileError: error,
        loading: false,
      });
    });

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      (async () => {
        const { profile, error } = await resolveSessionProfile(session?.user ?? null);
        if (!mounted) return;
        if (event === 'SIGNED_OUT') {
          setState({
            user: null,
            session: null,
            profile: null,
            profileError: null,
            loading: false,
          });
        } else {
          setState({
            user: session?.user ?? null,
            session,
            profile,
            profileError: error,
            loading: false,
          });
        }
      })();
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const signUp: AuthContextValue['signUp'] = async (
    email,
    password,
    fullName,
    phone,
    referralCode
  ) => {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) return { error: error.message };
    const user = data.user;
    if (!user) return { error: 'Sign up failed. Please try again.' };

    const { error: profileError } = await supabase.from('profiles').insert({
      id: user.id,
      role: 'shipper',
      full_name: fullName,
      phone: phone || null,
      referred_by: referralCode?.trim() || null,
    });
    if (profileError) {
      return {
        error:
          profileError.code === '23505'
            ? 'An account with this email already exists.'
            : profileError.message,
      };
    }
    return { error: null };
  };

  const signIn: AuthContextValue['signIn'] = async (email, password) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) {
        logAuthError('Sign-in failed', error);
        return { error: error.message };
      }
      return { error: null };
    } catch (err) {
      logAuthError('Sign-in threw an exception', err);
      return { error: err instanceof Error ? err.message : 'Unexpected error while signing in.' };
    }
  };

  const signInWithGoogle: AuthContextValue['signInWithGoogle'] = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: window.location.origin },
      });
      if (error) {
        logAuthError('Google sign-in failed', error);
        return { error: error.message };
      }
      return { error: null };
    } catch (err) {
      logAuthError('Google sign-in threw an exception', err);
      return { error: err instanceof Error ? err.message : 'Unexpected error while signing in with Google.' };
    }
  };

  const refreshProfile = async () => {
    const userId = state.user?.id;
    if (!userId) return;
    const profile = await loadProfile(userId);
    setState((prev) => ({ ...prev, profile }));
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider
      value={{
        ...state,
        signUp,
        signIn,
        signInWithGoogle,
        signOut,
        refreshProfile,
        loadProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
