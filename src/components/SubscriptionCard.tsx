import { useEffect, useState } from 'react';
import { CreditCard, Clock, AlertTriangle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import {
  fetchSubscriptionPayments,
  fetchMySubscription,
  getSubscriptionStatus,
  SUBSCRIPTION_STATUS_LABELS,
  type ShipperSubscription,
  type SubscriptionPayment,
  type SubscriptionStatus,
} from '@/lib/subscription';
import { formatCurrency } from '@/lib/fare';

const STATUS_STYLES: Record<SubscriptionStatus, string> = {
  free: 'bg-slate-100 text-slate-700',
  active: 'bg-emerald-100 text-emerald-700',
  expired: 'bg-amber-100 text-amber-800',
  locked: 'bg-red-100 text-red-700',
};

const STATUS_MESSAGES: Record<SubscriptionStatus, string> = {
  free: 'No paid plan is active. You can still manage your account.',
  active: 'Your plan is active. You can post loads as usual.',
  expired: 'Your plan has expired, so new bookings are paused. Contact Vahakam to renew.',
  locked: 'Your plan is locked, so new bookings are paused. Contact Vahakam for help.',
};

export default function SubscriptionCard({ shipperId }: { shipperId: string }) {
  const [sub, setSub] = useState<ShipperSubscription | null>(null);
  const [planName, setPlanName] = useState<string | null>(null);
  const [payments, setPayments] = useState<SubscriptionPayment[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [subRes, payRes] = await Promise.all([fetchMySubscription(shipperId), fetchSubscriptionPayments(shipperId)]);
      if (cancelled) return;
      if (subRes.error || payRes.error) {
        setLoadError(subRes.error ?? payRes.error);
        setLoading(false);
        return;
      }
      setSub(subRes.data);
      setPayments(payRes.data);
      if (subRes.data?.plan_id) {
        const { data } = await supabase
          .from('subscription_plans')
          .select('name')
          .eq('id', subRes.data.plan_id)
          .maybeSingle();
        if (!cancelled) setPlanName(data?.name ?? null);
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [shipperId]);

  if (loading) {
    return <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 text-sm text-slate-500">Loading plan status...</div>;
  }

  if (loadError) {
    return (
      <div className="bg-white rounded-2xl border border-red-200 shadow-sm p-4 flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-red-600 shrink-0" />
        <p className="text-sm text-red-700">Could not load your plan status: {loadError}</p>
      </div>
    );
  }

  const status = getSubscriptionStatus(sub);
  const pending = payments.filter((p) => p.verification_status === 'pending');

  return (
    <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <CreditCard className="w-4 h-4 text-primary-600" />
          <p className="font-semibold text-slate-900 text-sm">Subscription</p>
        </div>
        <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${STATUS_STYLES[status]}`}>
          {SUBSCRIPTION_STATUS_LABELS[status]}
        </span>
      </div>

      <p className="text-sm text-slate-600">{STATUS_MESSAGES[status]}</p>

      {sub && status !== 'free' && (
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="rounded-xl bg-slate-50 p-3">
            <p className="text-xs text-slate-500">Plan</p>
            <p className="font-semibold text-slate-900">{planName ?? 'Custom plan'}</p>
          </div>
          <div className="rounded-xl bg-slate-50 p-3">
            <p className="text-xs text-slate-500">Expires on</p>
            <p className="font-semibold text-slate-900">{new Date(sub.expiry_date).toLocaleDateString('en-IN')}</p>
          </div>
        </div>
      )}

      {pending.length > 0 && (
        <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 flex items-start gap-2">
          <Clock className="w-4 h-4 text-amber-700 mt-0.5 shrink-0" />
          <p className="text-sm text-amber-800">
            {pending.length} payment{pending.length > 1 ? 's are' : ' is'} pending manual verification by Vahakam.
          </p>
        </div>
      )}

      {payments.length > 0 && (
        <ul className="divide-y divide-slate-100 text-sm">
          {payments.slice(0, 5).map((p) => (
            <li key={p.id} className="flex items-center justify-between py-2">
              <span className="text-slate-600">
                {formatCurrency(p.amount_inr)} · Ref {p.payment_reference}
              </span>
              <span className="text-xs font-semibold text-slate-500 capitalize">{p.verification_status}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
