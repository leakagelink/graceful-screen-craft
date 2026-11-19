import { useCallback, useEffect, useRef, useState } from 'react';

interface VahakamHistoryState<Snapshot> {
  vahakamSession: string;
  vahakamIndex: number;
  vahakamSnapshot: Snapshot;
}

function isVahakamHistoryState<Snapshot>(value: unknown, session: string): value is VahakamHistoryState<Snapshot> {
  if (!value || typeof value !== 'object') return false;
  const state = value as Record<string, unknown>;
  return state['vahakamSession'] === session && Number.isInteger(state['vahakamIndex']) && 'vahakamSnapshot' in state;
}

export function useAppBackNavigation<Snapshot>(snapshot: Snapshot, restore: (snapshot: Snapshot) => void) {
  const snapshotRef = useRef(snapshot);
  const initialSnapshotRef = useRef(snapshot);
  const sessionRef = useRef('');
  const indexRef = useRef(0);
  const exitPromptRef = useRef(false);
  const nativeExitRef = useRef<(() => void) | null>(null);
  const [exitPrompt, setExitPrompt] = useState(false);
  snapshotRef.current = snapshot;
  exitPromptRef.current = exitPrompt;

  const goBack = useCallback(() => {
    if (indexRef.current > 0) window.history.back();
  }, []);

  const navigate = useCallback((next: Snapshot) => {
    const index = indexRef.current + 1;
    indexRef.current = index;
    restore(next);
    window.history.pushState({
      ...window.history.state,
      vahakamSession: sessionRef.current,
      vahakamIndex: index,
      vahakamSnapshot: next,
    } satisfies VahakamHistoryState<Snapshot>, '', window.location.href);
  }, [restore]);

  const cancelExit = useCallback(() => setExitPrompt(false), []);
  const confirmExit = useCallback(() => {
    setExitPrompt(false);
    nativeExitRef.current?.();
  }, []);

  useEffect(() => {
    const session = globalThis.crypto?.randomUUID?.() ?? `vahakam-${Date.now()}-${Math.random()}`;
    sessionRef.current = session;
    indexRef.current = 0;
    let disposed = false;
    let nativeListener: { remove: () => void | Promise<void> } | null = null;

    const rootState = {
      ...window.history.state,
      vahakamSession: session,
      vahakamIndex: 0,
      vahakamSnapshot: initialSnapshotRef.current,
    } satisfies VahakamHistoryState<Snapshot>;
    window.history.replaceState({ ...window.history.state, vahakamGuard: session }, '', window.location.href);
    window.history.pushState(rootState, '', window.location.href);

    const onPopState = (event: PopStateEvent) => {
      setExitPrompt(false);
      if (isVahakamHistoryState<Snapshot>(event.state, session)) {
        indexRef.current = event.state.vahakamIndex;
        restore(event.state.vahakamSnapshot);
        return;
      }

      // A browser Back at the first app screen must not leave Vahakam.
      indexRef.current = 0;
      restore(initialSnapshotRef.current);
      window.history.pushState(rootState, '', window.location.href);
    };

    const onNativeBack = () => {
      if (exitPromptRef.current) {
        setExitPrompt(false);
        return;
      }
      if (indexRef.current > 0) window.history.back();
      else setExitPrompt(true);
    };

    window.addEventListener('popstate', onPopState);
    void Promise.all([import('@capacitor/core'), import('@capacitor/app')]).then(async ([{ Capacitor }, { App }]) => {
      if (disposed || !Capacitor.isNativePlatform()) return;
      nativeExitRef.current = () => App.exitApp();
      nativeListener = await App.addListener('backButton', onNativeBack);
      if (disposed) await nativeListener.remove();
    }).catch(() => {
      // Browser deployments do not provide native Capacitor plugins.
    });

    return () => {
      disposed = true;
      window.removeEventListener('popstate', onPopState);
      if (nativeListener) void nativeListener.remove();
      nativeExitRef.current = null;
    };
  }, [restore]);

  return { navigate, goBack, exitPrompt, cancelExit, confirmExit };
}
