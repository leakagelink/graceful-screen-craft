import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { MapPin, Camera, Bell } from 'lucide-react';
import { getCurrentDevicePosition, getDeviceLocationErrorKind, getDeviceLocationErrorMessage, getDeviceLocationPermission } from '@/lib/device-location';

type State = 'prompt' | 'granted' | 'denied' | 'unsupported';
export default function DriverPermissions() {
  const [states, setStates] = useState<Record<string, State>>({ location: 'prompt', camera: 'prompt', notifications: 'prompt' });
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    setStates(s => ({ ...s, notifications: 'Notification' in window ? Notification.permission === 'default' ? 'prompt' : Notification.permission : 'unsupported', camera: typeof navigator.mediaDevices?.getUserMedia === 'function' ? 'prompt' : 'unsupported' }));
    void getDeviceLocationPermission().then(location => setStates(s => ({ ...s, location })));
    navigator.permissions?.query({ name: 'camera' as PermissionName }).then(result => setStates(s => ({ ...s, camera: result.state }))).catch(() => {});
  }, []);
  async function request(key: string) {
    setBusy(key); setError('');
    try {
      if (key === 'location') await getCurrentDevicePosition();
      if (key === 'camera') { const stream = await navigator.mediaDevices.getUserMedia({ video: true }); stream.getTracks().forEach(track => track.stop()); }
      if (key === 'notifications') { const result = await Notification.requestPermission(); setStates(s => ({ ...s, [key]: result === 'default' ? 'prompt' : result })); return; }
      setStates(s => ({ ...s, [key]: 'granted' }));
    } catch (err) {
      if (key === 'location') {
        const kind = getDeviceLocationErrorKind(err);
        if (kind === 'denied') setStates(s => ({ ...s, location: 'denied' }));
        setError(getDeviceLocationErrorMessage(err));
      } else {
        const denied = err instanceof DOMException && err.name === 'NotAllowedError';
        if (denied) setStates(s => ({ ...s, [key]: 'denied' }));
        setError(denied ? 'Permission blocked. Change this app’s permission in your phone settings.' : 'Device unavailable. Please try again.');
      }
    } finally { setBusy(null); }
  }
  return <section className="border-t border-border pt-5 space-y-3"><h2 className="font-semibold">Device permissions</h2>{[['location', 'Location', MapPin], ['camera', 'Camera', Camera], ['notifications', 'Notifications', Bell]].map(([key, label, Icon]) => {
    const id = String(key); const Symbol = Icon as typeof MapPin;
    return <div key={id} className="flex items-center gap-3 py-2"><Symbol className="size-5 text-muted-foreground" /><div className="flex-1"><p className="text-sm font-medium">{String(label)}</p><p className="text-xs text-muted-foreground capitalize">{states[id]}</p></div><Button variant="outline" size="sm" disabled={busy !== null || states[id] !== 'prompt'} onClick={() => request(id)}>Allow</Button></div>;
  })}{error && <p role="alert" className="text-sm text-destructive">{error}</p>}</section>;
}