import { useCallback, useEffect, useState } from 'react';
import { Bell, CheckCheck, Inbox } from 'lucide-react';
import { supabase, type Notification } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { Spinner } from '@/components/ui';
import { useLang } from '@/context/LangContext';

export default function ShipperNotifications() {
  const { t } = useLang();
  const { user } = useAuth();
  const [items, setItems] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    const { data, error: dbError } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50);
    setLoading(false);
    if (dbError) {
      setError(t('notif.loadError'));
      return;
    }
    setItems((data as Notification[]) ?? []);
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  const unread = items.filter((n) => !n.read).length;

  async function markAllRead() {
    if (!user || unread === 0) return;
    const { error: dbError } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('user_id', user.id)
      .eq('read', false);
    if (dbError) {
      setError(t('notif.markError'));
      return;
    }
    setItems((prev) => prev.map((n) => ({ ...n, read: true })));
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-28">
      <div className="bg-gradient-to-br from-primary-700 to-primary-900 text-white">
        <div className="max-w-md mx-auto px-4 pt-6 pb-8 flex items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">{t('notif.title')}</h1>
            <p className="text-sm text-primary-200 mt-1">
              {unread > 0 ? `${unread} ${t('notif.unread')}` : t('notif.caughtUp')}
            </p>
          </div>
          {unread > 0 && (
            <button
              onClick={markAllRead}
              className="flex items-center gap-1.5 text-xs font-semibold bg-white/15 hover:bg-white/25 rounded-lg px-3 py-2 transition-colors"
            >
              <CheckCheck className="w-4 h-4" /> {t('notif.markAllRead')}
            </button>
          )}
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 -mt-4 space-y-3">
        {error && (
          <div className="text-sm text-red-600 bg-red-50 rounded-xl px-4 py-3 font-medium">{error}</div>
        )}

        {loading ? (
          <div className="flex flex-col items-center py-16 text-slate-400">
            <Spinner className="w-7 h-7 text-primary-500" />
            <p className="text-sm mt-3">{t('notif.loading')}</p>
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center text-center py-16 px-6">
            <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
              <Inbox className="w-8 h-8 text-slate-400" />
            </div>
            <p className="font-semibold text-slate-700">{t('notif.empty')}</p>
            <p className="text-sm text-slate-400 mt-1">{t('notif.emptyHint')}</p>
          </div>
        ) : (
          items.map((n) => (
            <div
              key={n.id}
              className={`bg-white rounded-2xl border p-4 shadow-sm flex gap-3 ${
                n.read ? 'border-slate-200' : 'border-primary-200 bg-primary-50/40'
              }`}
            >
              <div className="w-9 h-9 rounded-xl bg-primary-100 text-primary-700 flex items-center justify-center shrink-0">
                <Bell className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-slate-900 text-sm">{n.title}</p>
                <p className="text-sm text-slate-600 mt-0.5">{n.body}</p>
                <p className="text-[11px] text-slate-400 mt-1.5">
                  {new Date(n.created_at).toLocaleString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
