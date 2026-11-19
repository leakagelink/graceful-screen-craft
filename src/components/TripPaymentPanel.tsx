import { useCallback, useEffect, useState } from 'react';
import { Banknote, CheckCircle2, Clock3, CreditCard, ShieldCheck } from 'lucide-react';
import { supabase, type Booking } from '@/lib/supabase';
import { Button, Badge, inputClass } from '@/components/ui';
import { formatCurrency } from '@/lib/fare';
import { confirmTripPayment, getTripPaymentAmounts, reportTripPayment, tripPaymentReferenceError, type TripPayment, type TripPaymentMethod, type TripPaymentStage } from '@/lib/trip-payment';

export default function TripPaymentPanel({ booking, role, onChanged }: { booking: Booking; role: 'shipper' | 'driver'; onChanged?: () => void | Promise<void> }) {
  const [payments, setPayments] = useState<TripPayment[]>([]);
  const [methods, setMethods] = useState<Record<TripPaymentStage, TripPaymentMethod>>({ pickup_40: 'cash', delivery_60: 'cash' });
  const [references, setReferences] = useState<Record<TripPaymentStage, string>>({ pickup_40: '', delivery_60: '' });
  const [busy, setBusy] = useState<TripPaymentStage | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [driverUpi, setDriverUpi] = useState('');
  const fare = Number(booking.agreed_fare ?? booking.total_fare);
  const amounts = getTripPaymentAmounts(fare);

  const load = useCallback(async () => {
    const { data, error: loadError } = await supabase.from('trip_payments').select('*').eq('booking_id', booking.id).order('created_at', { ascending: true });
    if (loadError) setError(loadError.message);
    else setPayments((data ?? []) as TripPayment[]);
  }, [booking.id]);

  useEffect(() => {
    if (role !== 'shipper' || !booking.driver_id) { setDriverUpi(''); return; }
    void supabase.rpc('driver_payment_details', { _booking_id: booking.id }).then(({ data }) => {
      setDriverUpi(data?.[0]?.upi_id ?? '');
    });
  }, [booking.driver_id, booking.id, role]);

  useEffect(() => {
    void load();
    const channel = supabase.channel(`trip-payments:${booking.id}:${Math.random().toString(36).slice(2)}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'trip_payments', filter: `booking_id=eq.${booking.id}` }, () => void load())
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [booking.id, load]);

  async function report(stage: TripPaymentStage) {
    setError(''); setNotice('');
    const method = methods[stage];
    const reference = references[stage];
    const validation = tripPaymentReferenceError(method, reference);
    if (validation) { setError(validation); return; }
    setBusy(stage);
    const result = await reportTripPayment(booking.id, stage, method, reference);
    setBusy(null);
    if (result.error) { setError(result.error); return; }
    setReferences(prev => ({ ...prev, [stage]: '' }));
    setNotice(`${stage === 'pickup_40' ? '40%' : '60%'} payment report ho gaya. Driver ki confirmation pending hai.`);
    await load();
    await onChanged?.();
  }

  async function confirm(payment: TripPayment) {
    setError(''); setNotice(''); setBusy(payment.stage);
    const result = await confirmTripPayment(payment.id);
    setBusy(null);
    if (result.error) { setError(result.error); return; }
    setNotice('Payment received confirm ho gaya.');
    await load();
    await onChanged?.();
  }

  return (
    <section aria-label="40 60 driver payments" className="bg-card text-card-foreground rounded-2xl border border-border p-5 space-y-4 shadow-3d">
      <div className="flex items-center gap-3"><div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center"><CreditCard className="w-5 h-5" /></div><div><h2 className="font-bold">Driver Payment · 40% / 60%</h2><p className="text-xs text-muted-foreground">Total agreed fare: {formatCurrency(fare)}</p></div></div>
      {(['pickup_40', 'delivery_60'] as const).map(stage => {
        const payment = payments.find(row => row.stage === stage);
        const amount = stage === 'pickup_40' ? amounts.pickup40 : amounts.delivery60;
        const due = stage === 'pickup_40' ? booking.status === 'assigned' : booking.status === 'completed';
        const title = stage === 'pickup_40' ? 'Pickup payment · 40%' : 'Delivery payment · 60%';
        return <div key={stage} className="rounded-xl border border-border bg-background p-4 space-y-3">
          <div className="flex items-start justify-between gap-3"><div><h3 className="font-semibold text-sm">{title}</h3><p className="text-xs text-muted-foreground mt-0.5">{stage === 'pickup_40' ? 'Trip start se pehle' : 'POD + verified OTP ke baad'}</p></div><strong className="text-primary">{formatCurrency(amount)}</strong></div>
          {payment?.status === 'confirmed' ? <div role="status" className="rounded-lg bg-accent/50 p-3 text-sm space-y-1"><p className="flex items-center gap-2 font-semibold text-accent-foreground"><CheckCircle2 className="w-4 h-4" />Driver ne payment confirm kiya</p><p className="text-xs text-muted-foreground capitalize">{payment.method}{payment.transaction_reference ? ` · ${payment.transaction_reference}` : ''}{payment.confirmed_at ? ` · ${new Date(payment.confirmed_at).toLocaleString('en-IN')}` : ''}</p></div> : payment ? <div className="space-y-3"><div role="status" className="rounded-lg bg-muted p-3 text-sm"><p className="flex items-center gap-2 font-semibold"><Clock3 className="w-4 h-4" />Driver confirmation pending</p><p className="text-xs text-muted-foreground mt-1 capitalize">{payment.method}{payment.transaction_reference ? ` · UTR: ${payment.transaction_reference}` : ''}</p></div>{role === 'driver' && <Button className="w-full" loading={busy === stage} disabled={busy !== null} onClick={() => confirm(payment)}><ShieldCheck />Payment receive hua — confirm karein</Button>}</div> : due && role === 'shipper' ? <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2" role="group" aria-label={`${title} method`}>{(['cash', 'online'] as const).map(method => <button key={method} type="button" aria-pressed={methods[stage] === method} onClick={() => { setMethods(prev => ({ ...prev, [stage]: method })); setError(''); }} className={`rounded-lg border px-3 py-2.5 text-sm font-semibold capitalize ${methods[stage] === method ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground'}`}><Banknote className="inline w-4 h-4 mr-1.5" />{method}</button>)}</div>
            {methods[stage] === 'online' && <div className="space-y-2">{driverUpi && <p className="rounded-lg bg-primary/5 border border-primary/20 p-3 text-sm">Driver UPI ID: <strong className="break-all">{driverUpi}</strong></p>}<label className="text-sm font-semibold" htmlFor={`${stage}-reference`}>Transaction ID / UTR</label><input id={`${stage}-reference`} className={`${inputClass} mt-2`} value={references[stage]} maxLength={64} onChange={event => setReferences(prev => ({ ...prev, [stage]: event.target.value }))} placeholder="Bank/UPI transaction reference" /><p className="text-xs text-muted-foreground mt-1">Online payment directly driver ko karne ke baad reference dalein.</p></div>}
            <Button className="w-full" loading={busy === stage} disabled={busy !== null} onClick={() => report(stage)}>{formatCurrency(amount)} payment report karein</Button>
          </div> : <p className="text-sm text-muted-foreground">{stage === 'pickup_40' ? booking.driver_id ? '40% payment abhi report nahi hua.' : 'Driver assign hone ke baad payment due hoga.' : 'POD photo aur delivery OTP verify hone ke baad 60% payment due hoga.'}</p>}
        </div>;
      })}
      {notice && <p role="status" className="rounded-lg bg-accent/50 px-3 py-2 text-sm text-accent-foreground">{notice}</p>}
      {error && <p role="alert" className="rounded-lg bg-destructive/5 px-3 py-2 text-sm text-destructive">{error}</p>}
      {!payments.length && booking.status === 'assigned' && <Badge color="amber">Trip start ke liye 40% confirmation zaroori hai</Badge>}
    </section>
  );
}
