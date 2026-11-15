import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import * as authState from '@/context/auth-state';
import { supabase } from '@/lib/supabase';

vi.mock('@/integrations/lovable', () => ({ lovable: { auth: { signInWithOAuth: vi.fn() } } }));

vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
      signUp: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
    },
  },
}));

afterEach(cleanup);

describe('Authentication context', () => {
  it('passes the selected driver account type and waits for email confirmation', async () => {
    let auth: ReturnType<typeof useAuth> | undefined;
    function Consumer() { auth = useAuth(); return null; }
    render(<AuthProvider><Consumer /></AuthProvider>);
    await waitFor(() => expect(auth?.loading).toBe(false));
    if (!auth) throw new Error('Missing auth context');
    const result = await auth.signUp('driver@example.com', 'test-password', 'Driver Test', '9876543210', '', 'driver');
    expect(supabase.auth.signUp).toHaveBeenCalledWith(expect.objectContaining({ options: expect.objectContaining({ data: expect.objectContaining({ account_type: 'driver', full_name: 'Driver Test' }) }) }));
    expect(result.confirmationRequired).toBe(true);
    expect(auth.user).toBeNull();
  });

  it('shares the same context after the provider module is reloaded', async () => {
    function Consumer() {
      const { loading, user } = useAuth();
      return <output data-testid="auth-state">{loading ? 'loading' : user ? 'signed-in' : 'signed-out'}</output>;
    }
    const { rerender } = render(<AuthProvider><Consumer /></AuthProvider>);
    await waitFor(() => expect(screen.getByTestId('auth-state')).toHaveTextContent('signed-out'));

    // Fast Refresh re-evaluates the changed provider, not its unchanged dependency.
    vi.doMock('@/context/auth-state', () => authState);
    vi.resetModules();
    const refreshed = await import('@/context/AuthContext');
    function RefreshedConsumer() {
      const { loading, user } = refreshed.useAuth();
      return <output data-testid="auth-state">{loading ? 'loading' : user ? 'signed-in' : 'signed-out'}</output>;
    }
    rerender(<AuthProvider><RefreshedConsumer /></AuthProvider>);
    expect(screen.getByTestId('auth-state')).toHaveTextContent('signed-out');
  });

  it('still rejects a consumer without a provider', () => {
    function Orphan() {
      useAuth();
      return null;
    }
    const errorLog = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      expect(() => render(<Orphan />)).toThrow('useAuth must be used within AuthProvider');
    } finally {
      errorLog.mockRestore();
    }
  });
});