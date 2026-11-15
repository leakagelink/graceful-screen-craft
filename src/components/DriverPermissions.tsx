import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { MapPin, Camera, Bell } from 'lucide-react';

type State = 'prompt' | 'granted' | 'denied' | 'unsupported';
export default function DriverPermissions() {
  const [states, setStates] = useState<Record<string, State>>({ location: 'prompt', camera: 'prompt', notifications: 'prompt' });
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    setStates(s => ({ ...s, notifications: 'Notification' in window ? Notification.permission === 'default' ? 'prompt' : Notification.permission : 'unsupported', location: 'geolocation' in navigator ? 'prompt' : 'unsupported', camera: typeof navigator.mediaDevices?.getUserMedia === 'function' ? 'prompt' : 'unsupported' }));
    for (const name of ['geolocation', 'camera'] as const) {
      navigator.permissions?.query({ name: name as PermissionName }).then(result => setStates(s => ({ ...s, [name === 'geolocation' ? 'location' : name]: result.state }))).catch(() => {});
    }
  }, []);
  async function request(key: string) {
    setBusy(key); setError('');
    try {
      if (key === 'location') await new Promise<void>((resolve, reject) => navigator.geolocation.getCurrentPosition(() => resolve(), reject, { timeout: 10000 }));
      if (key === 'camera') { const stream = await navigator.mediaDevices.getUserMedia({ video: true }); stream.getTracks().forEach(track => track.stop()); }
      if (key === 'notifications') { const result = await Notification.requestPermission(); setStates(s => ({ ...s, [key]: result === 'default' ? 'prompt' : result })); return; }
      setStates(s => ({ ...s, [key]: 'granted' }));
    } catch (err) {
      const denied = (err instanceof DOMException && err.name === 'NotAllowedError') || (typeof err === 'object' && err !== null && 'code' in err && err.code === 1);
      if (denied) setStates(s => ({ ...s, [key]: 'denied' }));
      setError(denied ? 'Permission blocked. Change this site’s permission in your browser settings.' : 'Device unavailable. Please try again.');
    } finally { setBusy(null); }
  }
  return <section className="border-t border-border pt-5 space-y-3"><h2 className="font-semibold">Device permissions</h2>{[['location', 'Location', MapPin], ['camera', 'Camera', Camera], ['notifications', 'Notifications', Bell]].map(([key, label, Icon]) => {
    const id = String(key); const Symbol = Icon as typeof MapPin;
    return <div key={id} className="flex items-center gap-3 py-2"><Symbol className="size-5 text-muted-foreground" /><div className="flex-1"><p className="text-sm font-medium">{String(label)}</p><p className="text-xs text-muted-foreground capitalize">{states[id]}</p></div><Button variant="outline" size="sm" disabled={busy !== null || states[id] !== 'prompt'} onClick={() => request(id)}>Allow</Button></div>;
  })}{error && <p role="alert" className="text-sm text-destructive">{error}</p>}</section>;
}