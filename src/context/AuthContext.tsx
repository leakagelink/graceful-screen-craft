// @ts-nocheck -- ported from original app; stricter project tsconfig
import {
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { AuthError, type User } from '@supabase/supabase-js';
import { supabase, type Profile } from '@/lib/supabase';
import { lovable } from '@/integrations/lovable';
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
    registrationRequired: false,
  });

  async function fetchProfile(userId: string) {
    const [{ data, error }, { data: roles, error: roleError }, { data: consent, error: consentError }] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', userId).maybeSingle(),
      supabase.from('user_roles').select('role').eq('user_id', userId).maybeSingle(),
      supabase.from('consents').select('user_id').eq('user_id', userId).maybeSingle(),
    ]);
    const failure = error || roleError || consentError;
    if (failure) return { profile: null, error: failure.message, registrationRequired: true };
    return { profile: data ? { ...data, role: roles?.role ?? null } as Profile : null, error: null, registrationRequired: !roles || !consent };
  }

  async function loadProfile(userId: string) {
    const { profile } = await fetchProfile(userId);
    return profile;
  }

  async function resolveSessionProfile(user: User | null) {
    if (!user) return { profile: null, error: null, registrationRequired: false };
    const pending = sessionStorage.getItem('vahakam-registration-role');
    if (sessionStorage.getItem('vahakam-policies-accepted') === 'yes' && (pending === 'shipper' || pending === 'driver')) {
      const { error } = await supabase.rpc('initialize_account', { _role: pending });
      if (error) return { profile: null, error: error.message, registrationRequired: true };
      const { error: consentError } = await supabase.from('consents').upsert({ user_id: user.id, terms_version: '2026-11' }, { onConflict: 'user_id', ignoreDuplicates: true });
      if (consentError) return { profile: null, error: consentError.message, registrationRequired: true };
      sessionStorage.removeItem('vahakam-policies-accepted');
      sessionStorage.removeItem('vahakam-registration-role');
    }
    return fetchProfile(user.id);
  }

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(async ({ data }) => {
      if (!mounted) return;
      const session = data.session;
      const { profile, error, registrationRequired } = await resolveSessionProfile(session?.user ?? null);
      if (!mounted) return;
      setState({
        user: session?.user ?? null,
        session,
        profile,
        profileError: error,
        registrationRequired,
        loading: false,
      });
    });

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      setTimeout(() => { void (async () => {
        const { profile, error, registrationRequired } = await resolveSessionProfile(session?.user ?? null);
        if (!mounted) return;
        if (event === 'SIGNED_OUT') {
          setState({
            user: null,
            session: null,
            profile: null,
            profileError: null,
            registrationRequired: false,
            loading: false,
          });
        } else {
          setState({
            user: session?.user ?? null,
            session,
            profile,
            profileError: error,
            registrationRequired,
            loading: false,
          });
        }
      })(); }, 0);
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
    referralCode,
    role = 'shipper'
  ) => {
    const { data, error } = await supabase.auth.signUp({ email, password, options: {
      emailRedirectTo: window.location.origin,
      data: { full_name: fullName, phone, referral_code: referralCode?.trim() || null, account_type: role },
    } });
    if (error) return { error: error.message };
    return { error: null, confirmationRequired: !data.session };
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

  async function socialSignIn(provider: 'google' | 'lovable') {
    try {
      const { error } = await lovable.auth.signInWithOAuth(provider, { redirect_uri: window.location.origin });
      return { error: error?.message ?? null };
    } catch (err) {
      return { error: err instanceof Error ? err.message : 'Could not sign in.' };
    }
  }
  const signInWithGoogle = () => socialSignIn('google');
  const signInWithLovable = () => socialSignIn('lovable');
  async function completeRegistration(role: 'shipper' | 'driver') {
    sessionStorage.setItem('vahakam-registration-role', role);
    sessionStorage.setItem('vahakam-policies-accepted', 'yes');
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) return { error: error?.message ?? 'Please sign in again.' };
    const result = await resolveSessionProfile(data.user);
    setState(prev => ({ ...prev, profile: result.profile, profileError: result.error, registrationRequired: result.registrationRequired }));
    return { error: result.error };
  }

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
        signInWithLovable,
        completeRegistration,
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
