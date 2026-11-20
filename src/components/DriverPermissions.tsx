import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { MapPin, Camera, Bell } from 'lucide-react';
import {
  getDevicePermissionErrorMessage,
  getDevicePermissionStatus,
  getDevicePermissionStatuses,
  requestDevicePermission,
  type DevicePermissionKind,
  type DevicePermissionState,
} from '@/lib/device-permissions';

const rows = [['location', 'Location', MapPin], ['camera', 'Camera', Camera], ['notifications', 'Notifications', Bell]] as const;

export default function DriverPermissions() {
  const [states, setStates] = useState<Record<DevicePermissionKind, DevicePermissionState>>({ location: 'prompt', camera: 'prompt', notifications: 'prompt' });
  const [busy, setBusy] = useState<DevicePermissionKind | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    void getDevicePermissionStatuses().then(next => { if (active) setStates(next); }).catch(() => {});
    return () => { active = false; };
  }, []);

  async function request(kind: DevicePermissionKind) {
    setBusy(kind);
    setError('');
    try {
      const result = await requestDevicePermission(kind);
      setStates(current => ({ ...current, [kind]: result }));
      if (result === 'denied') setError(getDevicePermissionErrorMessage(kind, new Error('Permission denied')));
    } catch (requestError) {
      setError(getDevicePermissionErrorMessage(kind, requestError));
      try {
        const result = await getDevicePermissionStatus(kind);
        setStates(current => ({ ...current, [kind]: result }));
      } catch { /* Keep the previous visible state. */ }
    } finally {
      setBusy(null);
    }
  }

  return <section className="border-t border-border pt-5 space-y-3"><h2 className="font-semibold">Device permissions</h2>{rows.map(([kind, label, Icon]) => <div key={kind} className="flex items-center gap-3 py-2"><Icon className="size-5 text-muted-foreground" /><div className="flex-1"><p className="text-sm font-medium">{label}</p><p className="text-xs text-muted-foreground capitalize">{states[kind]}</p></div><Button variant="outline" size="sm" disabled={busy !== null || states[kind] !== 'prompt'} onClick={() => request(kind)}>{busy === kind ? 'Requesting…' : 'Allow'}</Button></div>)}{error && <p role="alert" className="text-sm text-destructive">{error}</p>}</section>;
}
