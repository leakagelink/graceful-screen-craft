import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import * as authState from '@/context/auth-state';

vi.mock('@/integrations/lovable', () => ({ lovable: { auth: { signInWithOAuth: vi.fn() } } }));

vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
    },
  },
}));

afterEach(cleanup);

describe('Authentication context', () => {
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