import { useEffect, useState } from 'react';
import { Bell, Camera, MapPin, ShieldCheck, type LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  getDevicePermissionErrorMessage,
  getDevicePermissionStatus,
  getDevicePermissionStatuses,
  requestDevicePermission,
  type DevicePermissionKind,
  type DevicePermissionStates,
} from '@/lib/device-permissions';

const initialStates: DevicePermissionStates = { location: 'prompt', camera: 'prompt', notifications: 'prompt' };
const rows: Array<{ id: DevicePermissionKind; label: string; description: string; icon: LucideIcon }> = [
  { id: 'location', label: 'Location', description: 'Pickup, drop and live trip tracking', icon: MapPin },
  { id: 'camera', label: 'Camera', description: 'KYC documents and delivery proof', icon: Camera },
  { id: 'notifications', label: 'Notifications', description: 'Booking, payment and trip updates', icon: Bell },
];

export default function NativePermissionGate({ userId }: { userId: string }) {
  const [visible, setVisible] = useState(false);
  const [states, setStates] = useState<DevicePermissionStates>(initialStates);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const storageKey = `vahakam-native-permissions-v1-${userId}`;

  useEffect(() => {
    let active = true;
    async function prepare() {
      const { Capacitor } = await import('@capacitor/core');
      if (!Capacitor.isNativePlatform() || localStorage.getItem(storageKey) === 'seen') return;
      try {
        const next = await getDevicePermissionStatuses();
        if (!active) return;
        setStates(next);
        if (Object.values(next).some(state => state === 'prompt')) setVisible(true);
      } catch {
        if (active) {
          setError('We could not check the current permissions. Tap Allow permissions to try again.');
          setVisible(true);
        }
      }
    }
    void prepare().catch(() => {});
    return () => { active = false; };
  }, [storageKey]);

  function close() {
    localStorage.setItem(storageKey, 'seen');
    setVisible(false);
  }

  async function requestAll() {
    setBusy(true);
    setError('');
    const next = { ...states };
    let failed = false;
    for (const { id } of rows) {
      if (next[id] !== 'prompt') continue;
      try {
        next[id] = await requestDevicePermission(id);
        if (next[id] === 'denied') failed = true;
        setStates({ ...next });
      } catch (requestError) {
        failed = true;
        try { next[id] = await getDevicePermissionStatus(id); } catch { /* Keep the current state. */ }
        setStates({ ...next });
        setError(getDevicePermissionErrorMessage(id, requestError));
      }
    }
    setBusy(false);
    if (Object.values(next).every(state => state === 'granted' || state === 'unsupported')) {
      close();
    } else if (failed) {
      setError(current => current || 'Some permissions were denied. You can enable them later from Account → Device permissions.');
    }
  }

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-[90] flex items-end justify-center bg-primary-950/70 p-4 backdrop-blur-sm sm:items-center">
      <section role="dialog" aria-modal="true" aria-labelledby="permission-title" className="w-full max-w-sm rounded-3xl border border-border bg-card p-6 text-card-foreground shadow-3d animate-scale-in">
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary"><ShieldCheck className="h-6 w-6" /></div>
        <h2 id="permission-title" className="font-display text-2xl font-bold">Allow device permissions</h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">Android will show Allow/Deny for each permission. These features are needed for bookings, proof and trip updates.</p>
        <div className="mt-5 space-y-4">
          {rows.map(({ id, label, description, icon: Icon }) => (
            <div key={id} className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground"><Icon className="h-5 w-5" /></div>
              <div className="min-w-0 flex-1"><p className="text-sm font-semibold">{label}</p><p className="text-xs text-muted-foreground">{description}</p></div>
              <span className="text-xs font-medium capitalize text-muted-foreground">{states[id]}</span>
            </div>
          ))}
        </div>
        {error && <p role="alert" className="mt-4 rounded-xl bg-destructive/10 p-3 text-xs leading-5 text-destructive">{error}</p>}
        <Button className="mt-6 w-full" disabled={busy} onClick={requestAll}>{busy ? 'Requesting…' : 'Allow permissions'}</Button>
        <Button variant="ghost" className="mt-2 w-full" disabled={busy} onClick={close}>Not now</Button>
      </section>
    </div>
  );
}
