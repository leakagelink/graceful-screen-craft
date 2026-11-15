import { useEffect, useState, type FormEvent } from 'react';
import { X } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { Button, Field, inputClass } from '@/components/ui';
import {
  fetchSubscriptionEvents,
  fetchSubscriptionPayments,
  getSubscriptionStatus,
  SUBSCRIPTION_STATUS_LABELS,
  type ShipperSubscription,
  type SubscriptionEvent,
  type SubscriptionPayment,
  type SubscriptionPlan,
} from '@/lib/subscription';
import { formatCurrency } from '@/lib/fare';

interface ShipperInfo {
  id: string;
  full_name: string | null;
  business_name: string | null;
  email: string | null;
  phone: string | null;
}

interface Props {
  shipper: ShipperInfo;
  subscription: ShipperSubscription | null;
  plans: SubscriptionPlan[];
  onClose: () => void;
  onChanged: () => void;
}

const EVENT_LABELS: Record<string, string> = {
  subscription_created: 'Plan activated',
  subscription_updated: 'Plan changed',
  payment_recorded: 'Payment recorded',
  payment_status_changed: 'Payment status changed',
};

const METHOD_OPTIONS: SubscriptionPayment['payment_method'][] = ['manual', 'upi', 'bank_transfer', 'razorpay'];

function addDays(base: Date, days: number): Date {
  return new Date(base.getTime() + days * 24 * 60 * 60 * 1000);
}

export default function ShipperSubscriptionDetail({ shipper, subscription, plans, onClose, onChanged }: Props) {
  const { user } = useAuth();
  const activePlans = plans.filter((p) => p.is_active);
  const currentPlan = plans.find((p) => p.id === subscription?.plan_id) ?? null;
  const [planId, setPlanId] = useState(currentPlan?.id ?? activePlans[0]?.id ?? '');
  const [payments, setPayments] = useState<SubscriptionPayment[]>([]);
  const [events, setEvents] = useState<SubscriptionEvent[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState<SubscriptionPayment['payment_method']>('manual');
  const [reference, setReference] = useState('');
  const [paidOn, setPaidOn] = useState(new Date().toISOString().slice(0, 10));
  const [verifyNow, setVerifyNow] = useState(false);

  const status = getSubscriptionStatus(subscription);
  const selectedPlan = plans.find((p) => p.id === planId) ?? null;

  async function refreshHistory() {
    const [payRes, evRes] = await Promise.all([fetchSubscriptionPayments(shipper.id), fetchSubscriptionEvents(shipper.id)]);
    if (payRes.error || evRes.error) {
      setMessage({ type: 'error', text: `Could not load history: ${payRes.error ?? evRes.error}` });
      return;
    }
    setPayments(payRes.data);
    setEvents(evRes.data);
  }

  useEffect(() => {
    refreshHistory();
  }, [shipper.id]);

  function finish(text: string) {
    setMessage({ type: 'success', text });
    onChanged();
    refreshHistory();
  }

  async function activate() {
    if (!selectedPlan) return setMessage({ type: 'error', text: 'Choose a plan first.' });
    setBusy(true);
    setMessage(null);
    const now = new Date();
    const { data, error } = await supabase
      .from('shipper_subscriptions')
      .upsert(
        {
          shipper_id: shipper.id,
          plan_id: selectedPlan.id,
          start_date: now.toISOString(),
          expiry_date: addDays(now, selectedPlan.duration_days).toISOString(),
          is_active: true,
          is_locked: false,
          updated_at: now.toISOString(),
        },
        { onConflict: 'shipper_id' },
      )
      .select('shipper_id');
    setBusy(false);
    if (error || !data?.length) return setMessage({ type: 'error', text: error?.message ?? 'The plan was not saved. Check admin access.' });
    finish(`${selectedPlan.name} activated.`);
  }

  async function extend() {
    if (!subscription || !currentPlan) return setMessage({ type: 'error', text: 'No plan to extend.' });
    setBusy(true);
    setMessage(null);
    const now = new Date();
    const currentExpiry = new Date(subscription.expiry_date);
    const base = currentExpiry > now ? currentExpiry : now;
    const { data, error } = await supabase
      .from('shipper_subscriptions')
      .update({ expiry_date: addDays(base, currentPlan.duration_days).toISOString(), updated_at: now.toISOString() })
      .eq('shipper_id', shipper.id)
      .select('shipper_id');
    setBusy(false);
    if (error || !data?.length) return setMessage({ type: 'error', text: error?.message ?? 'The plan was not extended. Check admin access.' });
    finish(`Extended by ${currentPlan.duration_days} days.`);
  }

  async function setLocked(locked: boolean) {
    if (!subscription) return;
    setBusy(true);
    setMessage(null);
    const { data, error } = await supabase
      .from('shipper_subscriptions')
      .update({ is_locked: locked, updated_at: new Date().toISOString() })
      .eq('shipper_id', shipper.id)
      .select('shipper_id');
    setBusy(false);
    if (error || !data?.length) return setMessage({ type: 'error', text: error?.message ?? 'The lock status was not saved.' });
    finish(locked ? 'Subscription locked.' : 'Subscription unlocked.');
  }

  async function recordPayment(e: FormEvent) {
    e.preventDefault();
    const amountNumber = Number(amount);
    if (!Number.isFinite(amountNumber) || amountNumber < 0) return setMessage({ type: 'error', text: 'Enter a valid amount.' });
    if (!reference.trim()) return setMessage({ type: 'error', text: 'Enter the payment reference.' });
    if (!user) return setMessage({ type: 'error', text: 'Your admin session has expired. Sign in again.' });
    setBusy(true);
    setMessage(null);
    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from('subscription_payments')
      .insert({
        shipper_id: shipper.id,
        plan_id: planId || null,
        amount_inr: amountNumber,
        payment_method: method,
        payment_reference: reference.trim(),
        paid_on: paidOn,
        verification_status: verifyNow ? 'verified' : 'pending',
        recorded_by: user.id,
        verified_at: verifyNow ? now : null,
      })
      .select('id');
    setBusy(false);
    if (error || !data?.length) return setMessage({ type: 'error', text: error?.message ?? 'The payment was not recorded.' });
    setAmount('');
    setReference('');
    setVerifyNow(false);
    setShowPaymentForm(false);
    finish('Payment recorded.');
  }

  async function setPaymentStatus(id: string, verification_status: 'verified' | 'rejected') {
    setBusy(true);
    setMessage(null);
    const { data, error } = await supabase
      .from('subscription_payments')
      .update({ verification_status, verified_at: new Date().toISOString() })
      .eq('id', id)
      .select('id');
    setBusy(false);
    if (error || !data?.length) return setMessage({ type: 'error', text: error?.message ?? 'The payment status was not saved.' });
    finish(`Payment marked ${verification_status}.`);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/50 animate-fade-in" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Shipper subscription"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[90vh] overflow-y-auto animate-fade-in-up"
      >
        <div className="sticky top-0 bg-white border-b border-slate-100 px-5 py-4 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="font-bold text-slate-900 truncate">{shipper.business_name || shipper.full_name || 'Shipper'}</p>
            <p className="text-xs text-slate-500 truncate">{shipper.email ?? 'No email on file'}</p>
            {shipper.phone && <p className="text-xs text-slate-500">{shipper.phone}</p>}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-slate-100 text-slate-700">{SUBSCRIPTION_STATUS_LABELS[status]}</span>
            <button onClick={onClose} aria-label="Close" className="p-1.5 rounded-full hover:bg-slate-100 text-slate-500">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-5 space-y-5">
          {subscription && (
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="rounded-xl bg-slate-50 p-3">
                <p className="text-xs text-slate-500">Plan</p>
                <p className="font-semibold text-slate-900">{currentPlan?.name ?? 'Custom'}</p>
              </div>
              <div className="rounded-xl bg-slate-50 p-3">
                <p className="text-xs text-slate-500">Expires on</p>
                <p className="font-semibold text-slate-900">{new Date(subscription.expiry_date).toLocaleDateString('en-IN')}</p>
              </div>
            </div>
          )}

          {message && (
            <div
              role="status"
              className={`rounded-xl px-4 py-3 text-sm ${message.type === 'error' ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'}`}
            >
              {message.text}
            </div>
          )}

          <section className="space-y-3">
            <p className="text-sm font-bold text-slate-900">Plan actions</p>
            {status === 'free' ? (
              <>
                <Field label="Plan">
                  <select className={inputClass} value={planId} onChange={(e) => setPlanId(e.target.value)}>
                    {activePlans.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} - {formatCurrency(p.price_inr)} for {p.duration_days} days
                      </option>
                    ))}
                  </select>
                </Field>
                <Button className="w-full" onClick={activate} loading={busy} disabled={busy || !selectedPlan}>
                  Activate plan
                </Button>
              </>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <Button variant="secondary" onClick={extend} disabled={busy}>
                  Extend
                </Button>
                {subscription?.is_locked ? (
                  <Button variant="secondary" onClick={() => setLocked(false)} disabled={busy}>
                    Unlock
                  </Button>
                ) : (
                  <Button variant="danger" onClick={() => setLocked(true)} disabled={busy}>
                    Lock
                  </Button>
                )}
              </div>
            )}
          </section>

          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-bold text-slate-900">Manual payments</p>
              <Button variant="secondary" size="sm" onClick={() => setShowPaymentForm((v) => !v)}>
                {showPaymentForm ? 'Cancel' : 'Record payment'}
              </Button>
            </div>

            {showPaymentForm && (
              <form onSubmit={recordPayment} className="space-y-3 rounded-2xl bg-slate-50 p-4">
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Amount (INR)">
                    <input type="number" min="0" step="0.01" className={inputClass} value={amount} onChange={(e) => setAmount(e.target.value)} required />
                  </Field>
                  <Field label="Paid on">
                    <input type="date" className={inputClass} value={paidOn} onChange={(e) => setPaidOn(e.target.value)} required />
                  </Field>
                </div>
                <Field label="Method">
                  <select className={inputClass} value={method} onChange={(e) => setMethod(e.target.value as SubscriptionPayment['payment_method'])}>
                    {METHOD_OPTIONS.map((m) => (
                      <option key={m} value={m}>{m.replace('_', ' ')}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Payment reference (UTR / transaction ID)">
                  <input className={inputClass} value={reference} onChange={(e) => setReference(e.target.value)} required />
                </Field>
                <label className="flex items-center gap-2 text-sm text-slate-700">
                  <input type="checkbox" checked={verifyNow} onChange={(e) => setVerifyNow(e.target.checked)} />
                  I have verified this payment in my bank or UPI account
                </label>
                <Button type="submit" className="w-full" loading={busy} disabled={busy}>
                  Save payment
                </Button>
              </form>
            )}

            {payments.length === 0 ? (
              <p className="text-sm text-slate-500">No payments recorded yet.</p>
            ) : (
              <ul className="divide-y divide-slate-100 text-sm">
                {payments.map((p) => (
                  <li key={p.id} className="py-3 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-slate-900">{formatCurrency(p.amount_inr)}</span>
                      <span className="text-xs font-semibold capitalize text-slate-600">{p.verification_status}</span>
                    </div>
                    <p className="text-xs text-slate-500">
                      Ref {p.payment_reference} · {p.payment_method.replace('_', ' ')} · {new Date(p.paid_on).toLocaleDateString('en-IN')}
                    </p>
                    {p.verification_status === 'pending' && (
                      <div className="flex gap-2">
                        <Button size="sm" variant="secondary" onClick={() => setPaymentStatus(p.id, 'rejected')} disabled={busy}>
                          Reject
                        </Button>
                        <Button size="sm" onClick={() => setPaymentStatus(p.id, 'verified')} disabled={busy}>
                          Mark verified
                        </Button>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="space-y-3">
            <p className="text-sm font-bold text-slate-900">History</p>
            {events.length === 0 ? (
              <p className="text-sm text-slate-500">No changes yet.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {events.map((ev) => (
                  <li key={ev.id} className="rounded-xl bg-slate-50 px-3 py-2">
                    <p className="font-semibold text-slate-800">{EVENT_LABELS[ev.action] ?? ev.action}</p>
                    <p className="text-xs text-slate-500">{new Date(ev.created_at).toLocaleString('en-IN')}</p>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
