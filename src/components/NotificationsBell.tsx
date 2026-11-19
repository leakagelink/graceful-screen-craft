import { useEffect, useRef, useState } from 'react';
import { Bell, CheckCheck } from 'lucide-react';
import { supabase, type Notification as AppNotification } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';

function showLocalNotification(title: string, body: string) {
  try {
    if ('Notification' in window && Notification.permission === 'granted') new Notification(title, { body, icon: '/icon.png' });
  } catch {
    // The realtime in-app alert remains available when device notifications are unsupported.
  }
}

export function NotificationsBell() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [open, setOpen] = useState(false);
  const [permissionMessage, setPermissionMessage] = useState('');
  const ref = useRef<HTMLDivElement>(null);
  const unread = notifications.filter((notification) => !notification.read).length;

  useEffect(() => {
    if (!user) return;
    void loadNotifications();
    const channel = supabase
      .channel(`notifications-bell:${user.id}:${Math.random().toString(36).slice(2)}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` }, (payload) => {
        const notification = payload.new as AppNotification;
        if (payload.eventType === 'INSERT') {
          setNotifications((current) => current.some((item) => item.id === notification.id) ? current : [notification, ...current].slice(0, 20));
          showLocalNotification(notification.title, notification.body);
          if ('vibrate' in navigator) navigator.vibrate(200);
        } else if (payload.eventType === 'UPDATE') {
          setNotifications((current) => current.map((item) => item.id === notification.id ? notification : item));
        }
      })
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [user]);

  useEffect(() => {
    function handleClick(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  async function loadNotifications() {
    if (!user) return;
    const { data } = await supabase.from('notifications').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(20);
    if (data) setNotifications(data as AppNotification[]);
  }

  async function markAllRead() {
    if (!user || unread === 0) return;
    await supabase.from('notifications').update({ read: true }).eq('user_id', user.id).eq('read', false);
    setNotifications((current) => current.map((notification) => ({ ...notification, read: true })));
  }

  async function enableDeviceAlerts() {
    setPermissionMessage('');
    if (!('Notification' in window)) { setPermissionMessage('Device alerts are not supported here. In-app Alerts will still update.'); return; }
    if (window.top !== window.self) { setPermissionMessage('Open Vahakam in its own tab or Android app to enable device alerts.'); return; }
    const permission = await Notification.requestPermission();
    setPermissionMessage(permission === 'granted' ? 'Device alerts are enabled.' : 'Device alerts are blocked. You can allow them in site settings.');
  }

  return (
    <div ref={ref} className="relative">
      <button aria-label={`Notifications${unread ? `, ${unread} unread` : ''}`} aria-expanded={open} onClick={() => setOpen((current) => !current)} className="relative flex h-9 w-9 items-center justify-center rounded-full bg-white/10 transition-colors hover:bg-white/20">
        <Bell className="h-4 w-4" />
        {unread > 0 && <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent-500 px-1 text-[10px] font-bold text-white animate-scale-in">{unread > 9 ? '9+' : unread}</span>}
      </button>
      {open && (
        <div role="dialog" aria-label="Recent notifications" className="absolute right-0 top-full z-50 mt-2 max-h-[28rem] w-[min(21rem,calc(100vw-2rem))] overflow-y-auto rounded-2xl border border-border bg-card py-2 text-card-foreground shadow-3d animate-scale-in">
          <div className="flex items-center justify-between border-b border-border px-4 pb-2">
            <p className="text-sm font-bold">Notifications</p>
            <button disabled={!unread} onClick={markAllRead} className="flex items-center gap-1 text-xs font-semibold text-primary-600 disabled:opacity-40"><CheckCheck className="h-3.5 w-3.5" />Mark all read</button>
          </div>
          {notifications.length === 0 ? <p className="px-4 py-6 text-center text-sm text-muted-foreground">No notifications yet</p> : notifications.map((notification) => (
            <article key={notification.id} className={`border-b border-border px-4 py-3 last:border-0 ${!notification.read ? 'bg-primary-50/60' : ''}`}>
              <div className="flex items-start gap-2">{!notification.read && <span aria-label="Unread" className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-accent-500" />}<div className="min-w-0"><p className="text-sm font-semibold">{notification.title}</p><p className="mt-0.5 whitespace-pre-wrap break-words text-xs text-muted-foreground">{notification.body}</p><p className="mt-1 text-[10px] text-muted-foreground">{new Date(notification.created_at).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</p></div></div>
            </article>
          ))}
          <div className="border-t border-border px-4 pt-3">
            <button onClick={enableDeviceAlerts} className="text-xs font-semibold text-primary-600">Enable device alerts</button>
            {permissionMessage && <p role="status" className="mt-1.5 text-[11px] leading-relaxed text-muted-foreground">{permissionMessage}</p>}
          </div>
        </div>
      )}
    </div>
  );
}
