import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAppBackNavigation } from '@/hooks/use-app-back-navigation';

const native = vi.hoisted(() => ({
  listener: null as null | (() => void),
  exitApp: vi.fn(),
}));

vi.mock('@capacitor/core', () => ({ Capacitor: { isNativePlatform: () => true } }));
vi.mock('@capacitor/app', () => ({
  App: {
    addListener: vi.fn(async (_event: string, listener: () => void) => {
      native.listener = listener;
      return { remove: vi.fn() };
    }),
    exitApp: native.exitApp,
  },
}));

type Snapshot = { screen: 'home' | 'orders' | 'trip' | 'chat' };
const home: Snapshot = { screen: 'home' };

describe('In-app Back navigation', () => {
  beforeEach(() => {
    window.history.replaceState(null, '', '/');
    native.listener = null;
    native.exitApp.mockClear();
  });

  it('Android Back restores chat to trip and trip to the previous tab, then asks before exiting', async () => {
    const restore = vi.fn();
    const { result } = renderHook(() => useAppBackNavigation<Snapshot>(home, restore));
    await waitFor(() => expect(native.listener).not.toBeNull());

    act(() => result.current.navigate({ screen: 'orders' }));
    act(() => result.current.navigate({ screen: 'trip' }));
    act(() => result.current.navigate({ screen: 'chat' }));
    expect(window.history.state.vahakamIndex).toBe(3);

    act(() => native.listener?.());
    await waitFor(() => expect(restore).toHaveBeenLastCalledWith({ screen: 'trip' }));
    act(() => native.listener?.());
    await waitFor(() => expect(restore).toHaveBeenLastCalledWith({ screen: 'orders' }));
    act(() => native.listener?.());
    await waitFor(() => expect(restore).toHaveBeenLastCalledWith(home));

    act(() => native.listener?.());
    expect(result.current.exitPrompt).toBe(true);
    expect(native.exitApp).not.toHaveBeenCalled();
    act(() => result.current.confirmExit());
    expect(native.exitApp).toHaveBeenCalledOnce();
  });

  it('browser Back cannot leave the app from its first screen', async () => {
    const restore = vi.fn();
    renderHook(() => useAppBackNavigation<Snapshot>(home, restore));
    await waitFor(() => expect(window.history.state.vahakamIndex).toBe(0));

    act(() => window.history.back());
    await waitFor(() => expect(restore).toHaveBeenCalledWith(home));
    expect(window.location.pathname).toBe('/');
    expect(window.history.state.vahakamIndex).toBe(0);
    expect(native.exitApp).not.toHaveBeenCalled();
  });
});
