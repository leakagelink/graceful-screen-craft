import { useCallback, useEffect, useMemo, useState } from 'react';
import { Search, ChevronRight } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Spinner } from '@/components/ui';
import {
  getSubscriptionStatus,
  SUBSCRIPTION_STATUS_LABELS,
  type ShipperSubscription,
  type SubscriptionPlan,
  type SubscriptionStatus,
} from '@/lib/subscription';
import ShipperSubscriptionDetail from '@/components/ShipperSubscriptionDetail';

interface ShipperRow {
  id: string;
  full_name: string | null;
  phone: string | null;
  business_name: string | null;
  email: string | null;
}

const STATUS_STYLES: Record<SubscriptionStatus, string> = {
  free: 'bg-slate-100 text-slate-700',
  active: 'bg-emerald-100 text-emerald-700',
  expired: 'bg-amber-100 text-amber-800',
  locked: 'bg-red-100 text-red-700',
};

export default function ShipperSubscriptionAdmin() {
  const [shippers, setShippers] = useState<ShipperRow[]>([]);
  const [subs, setSubs] = useState<ShipperSubscription[]>([]);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    const [profilesRes, emailsRes, subsRes, plansRes, rolesRes] = await Promise.all([
      supabase.from('profiles').select('id, full_name, phone, business_name'),
      supabase.from('account_emails').select('id, email'),
      supabase.from('shipper_subscriptions').select('shipper_id, plan_id, start_date, expiry_date, is_active, is_locked'),
      supabase.from('subscription_plans').select('id, name, price_inr, duration_days, features, is_active, sort_order').order('sort_order'),
      supabase.from('user_roles').select('user_id').eq('role', 'shipper'),
    ]);
    const failed = profilesRes.error ?? emailsRes.error ?? subsRes.error ?? plansRes.error ?? rolesRes.error;
    if (failed) {
      setError(`Could not load subscription data: ${failed.message}`);
      setLoading(false);
      return;
    }
    const emailById = new Map((emailsRes.data ?? []).map((e) => [e.id as string, e.email as string]));
    setShippers(
      (profilesRes.data ?? []).filter(p => rolesRes.data?.some(r => r.user_id === p.id)).map((p) => ({
        id: p.id as string,
        full_name: p.full_name as string | null,
        phone: p.phone as string | null,
        business_name: p.business_name as string | null,
        email: emailById.get(p.id as string) ?? null,
      })),
    );
    setSubs((subsRes.data ?? []) as ShipperSubscription[]);
    setPlans((plansRes.data ?? []) as SubscriptionPlan[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const subById = useMemo(() => new Map(subs.map((s) => [s.shipper_id, s])), [subs]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return shippers;
    return shippers.filter((s) =>
      [s.email, s.phone, s.full_name, s.business_name].some((v) => v?.toLowerCase().includes(q)),
    );
  }, [shippers, query]);

  const selected = selectedId ? shippers.find((s) => s.id === selectedId) ?? null : null;

  if (loading) {
    return (
      <div className="flex flex-col items-center py-16 text-slate-400">
        <Spinner className="w-7 h-7 text-primary-500" />
        <p className="text-sm mt-3">Loading shippers...</p>
      </div>
    );
  }

  if (error) {
    return <div className="rounded-xl bg-red-50 border border-red-200 p-4 text-sm text-red-700">{error}</div>;
  }

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by email, phone or name"
          className="w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:border-primary-500"
        />
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-slate-500 text-center py-10">No shippers match your search.</p>
      ) : (
        <ul className="bg-white rounded-2xl border border-slate-200 shadow-sm divide-y divide-slate-100">
          {filtered.map((s) => {
            const status = getSubscriptionStatus(subById.get(s.id) ?? null);
            return (
              <li key={s.id}>
                <button
                  onClick={() => setSelectedId(s.id)}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-slate-50 transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-sm text-slate-900 truncate">
                      {s.business_name || s.full_name || 'Unnamed shipper'}
                    </p>
                    <p className="text-xs text-slate-500 truncate">{s.email ?? s.phone ?? 'No contact on file'}</p>
                  </div>
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${STATUS_STYLES[status]}`}>
                    {SUBSCRIPTION_STATUS_LABELS[status]}
                  </span>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {selected && (
        <ShipperSubscriptionDetail
          shipper={selected}
          subscription={subById.get(selected.id) ?? null}
          plans={plans}
          onClose={() => setSelectedId(null)}
          onChanged={load}
        />
      )}
    </div>
  );
}
