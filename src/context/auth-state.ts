import { createContext } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import type { Profile } from '@/lib/supabase';

export interface AuthState {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  profileError: string | null;
  loading: boolean;
  registrationRequired: boolean;
}

export interface AuthContextValue extends AuthState {
  signUp: (email: string, password: string, fullName: string, phone: string, referralCode?: string, role?: 'shipper' | 'driver') => Promise<{ error: string | null; confirmationRequired?: boolean }>;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  completeRegistration: (role: 'shipper' | 'driver') => Promise<{ error: string | null }>;
  signInWithLovable: () => Promise<{ error: string | null }>;
  signInWithGoogle: () => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  loadProfile: (userId: string) => Promise<Profile | null>;
}

// Keep the context identity outside the component Fast Refresh boundary.
export const AuthContext = createContext<AuthContextValue | undefined>(undefined);