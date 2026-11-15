import { useState, useEffect, useRef } from 'react';
import { Bell } from 'lucide-react';
import { supabase, type Notification } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';

// ─── Push Notification Integration Point ──────────────────────────────
// To enable real push notifications (FCM/APNs) later:
//  1. Add @capacitor/push-notifications plugin
//  2. Register the device token with your push service on sign-in
//  3. In the Supabase trigger `notify_online_drivers_new_load`,
//     also dispatch a push via an edge function that calls FCM.
//  4. Replace the browser Notification fallback below with the
//     Capacitor PushNotifications listener.
//
// For now we use the Web Notifications API as a local fallback so
// drivers get a visible alert even without a push service configured.
// ──────────────────────────────────────────────────────────────────────

function showLocalNotification(title: string, body: string) {
  try {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, { body, icon: '/icon.png' });
    }
  } catch {
    // Silent fail — the in-app bell badge still updates
  }
}

export function NotificationsBell() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) return;
    loadNotifications();

    // Request permission once for web notifications
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {});
    }

    const channel = supabase
      .channel(`notifications:${user.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` },
        (payload) => {
          const n = payload.new as Notification;
          setNotifications((prev) => [n, ...prev]);
          // Fire local notification + vibration as fallback for push
          showLocalNotification(n.title, n.body);
          if ('vibrate' in navigator) navigator.vibrate(200);
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  async function loadNotifications() {
    if (!user) return;
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20);
    if (data) setNotifications(data as Notification[]);
  }

  async function markAllRead() {
    if (!user) return;
    await supabase.from('notifications').update({ read: true }).eq('user_id', user.id).eq('read', false);
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }

  const unread = notifications.filter((n) => !n.read).length;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => { setOpen(!open); if (!open && unread > 0) markAllRead(); }}
        className="relative w-9 h-9 rounded-full flex items-center justify-center bg-white/10 hover:bg-white/20 transition-colors"
      >
        <Bell className="w-4 h-4" />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-accent-500 text-white text-[10px] font-bold flex items-center justify-center animate-scale-in">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1.5 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 min-w-[280px] max-w-[320px] z-50 animate-scale-in max-h-96 overflow-y-auto">
          {notifications.length === 0 ? (
            <p className="text-center text-sm text-slate-400 py-6 px-4">No notifications yet</p>
          ) : (
            notifications.map((n) => (
              <div key={n.id} className={`px-3.5 py-2.5 border-b border-slate-100 last:border-0 ${!n.read ? 'bg-primary-50/50' : ''}`}>
                <p className="text-sm font-semibold text-slate-900">{n.title}</p>
                <p className="text-xs text-slate-500 mt-0.5">{n.body}</p>
                <p className="text-[10px] text-slate-400 mt-1">
                  {new Date(n.created_at).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
