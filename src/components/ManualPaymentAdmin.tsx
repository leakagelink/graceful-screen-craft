import { useCallback, useEffect, useState, type ChangeEvent } from 'react';
import { Building2, CheckCircle2, Clock3, CreditCard, Landmark, QrCode, Save, Smartphone, Upload, Wallet, XCircle } from 'lucide-react';
import { supabase, type Booking, type Profile } from '@/lib/supabase';
import { Badge, Button, inputClass } from '@/components/ui';
import { formatCurrency } from '@/lib/fare';
import type { ManualPaymentMethod, ManualPaymentMethodKey, ManualPaymentRequest } from '@/lib/manual-payment';

const methodOrder: ManualPaymentMethodKey[] = ['upi', 'qr', 'bank'];
const methodIcons = { upi: Smartphone, qr: QrCode, bank: Landmark };

type MethodForm = {
  payee_name: string;
  upi_id: string;
  qr_image_url: string;
  bank_name: string;
  account_holder: string;
  account_number: string;
  ifsc: string;
};

function toForm(method: ManualPaymentMethod): MethodForm {
  return {
    payee_name: method.payee_name ?? '',
    upi_id: method.upi_id ?? '',
    qr_image_url: method.qr_image_url ?? '',
    bank_name: method.bank_name ?? '',
    account_holder: method.account_holder ?? '',
    account_number: method.account_number ?? '',
    ifsc: method.ifsc ?? '',
  };
}

export default function ManualPaymentAdmin({ bookings, profiles, onAction }: { bookings: Booking[]; profiles: Profile[]; onAction: () => void }) {
  const [methods, setMethods] = useState<ManualPaymentMethod[]>([]);
  const [requests, setRequests] = useState<ManualPaymentRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    const [{ data: methodData, error: methodError }, { data: requestData, error: requestError }] = await Promise.all([
      supabase.from('manual_payment_methods').select('*'),
      supabase.from('manual_payment_requests').select('*').order('created_at', { ascending: false }),
    ]);
    if (methodError || requestError) setError(methodError?.message || requestError?.message || 'Payment settings could not be loaded.');
    setMethods(((methodData ?? []) as ManualPaymentMethod[]).sort((a, b) => methodOrder.indexOf(a.key) - methodOrder.indexOf(b.key)));
    setRequests((requestData ?? []) as ManualPaymentRequest[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
    const channel = supabase.channel(`admin-manual-payments:${Math.random().toString(36).slice(2)}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'manual_payment_methods' }, () => void load())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'manual_payment_requests' }, () => void load())
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [load]);

  const changed = () => { void load(); onAction(); };
  const pending = requests.filter((request) => request.status === 'pending');
  const history = requests.filter((request) => request.status !== 'pending');
  const bookingMap = new Map(bookings.map((booking) => [booking.id, booking]));
  const profileMap = new Map(profiles.map((profile) => [profile.id, profile]));

  return <div className="space-y-6">
    <section className="space-y-3" aria-label="Payment verification requests">
      <div className="flex items-center gap-2"><Wallet className="w-5 h-5 text-primary" /><h2 className="font-bold">Payment verification</h2>{pending.length > 0 && <Badge color="amber">{pending.length} pending</Badge>}</div>
      {pending.length === 0 ? <div className="bg-card border border-border rounded-xl p-5 text-sm text-muted-foreground flex items-center gap-2"><CheckCircle2 className="w-5 h-5 text-primary" />Koi payment request pending nahi hai.</div> : pending.map((request) => <PaymentRequestCard key={request.id} request={request} booking={bookingMap.get(request.booking_id)} shipperName={profileMap.get(request.shipper_id)?.full_name} onChanged={changed} />)}
      {history.length > 0 && <details className="bg-card border border-border rounded-xl p-4"><summary className="cursor-pointer text-sm font-semibold">Review history ({history.length})</summary><div className="space-y-3 mt-4">{history.map((request) => <PaymentRequestCard key={request.id} request={request} booking={bookingMap.get(request.booking_id)} shipperName={profileMap.get(request.shipper_id)?.full_name} onChanged={changed} />)}</div></details>}
    </section>

    <section className="space-y-3" aria-label="Manual payment methods">
      <div><div className="flex items-center gap-2"><CreditCard className="w-5 h-5 text-primary" /><h2 className="font-bold">Payment methods</h2></div><p className="text-xs text-muted-foreground mt-1">Details save karte hi Demo badge hat jayega. Disabled method users ko nahi dikhega.</p></div>
      {loading ? <p className="text-sm text-muted-foreground">Payment settings load ho rahi hain…</p> : methods.map((method) => <MethodEditor key={method.key} method={method} onChanged={changed} />)}
    </section>
    {error && <p role="alert" className="text-sm text-destructive bg-destructive/5 rounded-lg p-3">{error}</p>}
  </div>;
}

function MethodEditor({ method, onChanged }: { method: ManualPaymentMethod; onChanged: () => void }) {
  const [form, setForm] = useState<MethodForm>(() => toForm(method));
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const Icon = methodIcons[method.key];

  useEffect(() => { setForm(toForm(method)); }, [method]);

  function set(field: keyof MethodForm, value: string) { setForm((current) => ({ ...current, [field]: value })); }

  async function toggle() {
    setBusy(true); setError(''); setMessage('');
    const { error: toggleError } = await supabase.rpc('admin_set_manual_payment_method_enabled', { _method_key: method.key, _enabled: !method.enabled });
    setBusy(false);
    if (toggleError) { setError(toggleError.message); return; }
    setMessage(!method.enabled ? 'Method enabled.' : 'Method disabled.');
    onChanged();
  }

  async function save() {
    setBusy(true); setError(''); setMessage('');
    const { error: saveError } = await supabase.rpc('admin_update_manual_payment_method', {
      _method_key: method.key,
      _payee_name: form.payee_name,
      _upi_id: form.upi_id,
      _qr_image_url: form.qr_image_url,
      _bank_name: form.bank_name,
      _account_holder: form.account_holder,
      _account_number: form.account_number,
      _ifsc: form.ifsc,
    });
    setBusy(false);
    if (saveError) { setError(saveError.message); return; }
    setMessage('Real payment details save ho gayi. Demo details ab users ko nahi dikhengi.');
    onChanged();
  }

  function uploadQr(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setError('');
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) { setError('QR image PNG, JPEG ya WebP honi chahiye.'); return; }
    if (file.size > 700 * 1024) { setError('QR image 700 KB se chhoti honi chahiye.'); return; }
    const reader = new FileReader();
    reader.onload = () => { if (typeof reader.result === 'string') set('qr_image_url', reader.result); };
    reader.onerror = () => setError('QR image read nahi ho payi.');
    reader.readAsDataURL(file);
  }

  return <article className="bg-card border border-border rounded-2xl p-5 space-y-4 shadow-3d">
    <div className="flex items-center gap-3">
      <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center"><Icon className="w-5 h-5" /></div>
      <div><h3 className="font-bold">{method.label}</h3><p className="text-xs text-muted-foreground">{method.is_demo ? 'Mock details visible to users' : 'Admin details visible to users'}</p></div>
      <div className="ml-auto flex items-center gap-2">{method.is_demo && <Badge color="amber">Demo</Badge>}<button type="button" role="switch" aria-checked={method.enabled} aria-label={`${method.label} enabled`} disabled={busy} onClick={toggle} className={`relative w-12 h-7 rounded-full transition-colors ${method.enabled ? 'bg-primary' : 'bg-muted'}`}><span className={`absolute top-1 w-5 h-5 rounded-full bg-card shadow transition-transform ${method.enabled ? 'translate-x-6' : 'translate-x-1'}`} /></button></div>
    </div>

    {method.key !== 'bank' ? <>
      <label className="block text-sm font-medium">Payee name<input className={`${inputClass} mt-1.5`} value={form.payee_name} onChange={(event) => set('payee_name', event.target.value)} placeholder="Vahakam Transport" /></label>
      <label className="block text-sm font-medium">UPI ID{method.key === 'qr' && <span className="font-normal text-muted-foreground"> (QR image ho to optional)</span>}<input className={`${inputClass} mt-1.5`} value={form.upi_id} onChange={(event) => set('upi_id', event.target.value)} placeholder="business@bank" /></label>
    </> : <>
      <label className="block text-sm font-medium">Account holder<input className={`${inputClass} mt-1.5`} value={form.account_holder} onChange={(event) => set('account_holder', event.target.value)} /></label>
      <label className="block text-sm font-medium">Bank name<input className={`${inputClass} mt-1.5`} value={form.bank_name} onChange={(event) => set('bank_name', event.target.value)} /></label>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3"><label className="block text-sm font-medium">Account number<input inputMode="numeric" className={`${inputClass} mt-1.5`} value={form.account_number} onChange={(event) => set('account_number', event.target.value)} /></label><label className="block text-sm font-medium">IFSC<input className={`${inputClass} mt-1.5 uppercase`} value={form.ifsc} onChange={(event) => set('ifsc', event.target.value.toUpperCase())} /></label></div>
    </>}

    {method.key === 'qr' && <div className="space-y-3 rounded-xl bg-muted/50 p-3">
      <label className="block text-sm font-medium">QR image URL<input className={`${inputClass} mt-1.5`} value={form.qr_image_url.startsWith('data:') ? '' : form.qr_image_url} onChange={(event) => set('qr_image_url', event.target.value)} placeholder="https://…" /></label>
      <label className="inline-flex items-center gap-2 text-sm font-semibold text-primary cursor-pointer"><Upload className="w-4 h-4" />Upload QR image<input type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={uploadQr} /></label>
      {form.qr_image_url && <div className="flex items-start gap-3"><img src={form.qr_image_url} alt="QR preview" className="w-24 h-24 rounded-lg border border-border bg-card object-contain p-1" /><Button type="button" size="sm" variant="ghost" onClick={() => set('qr_image_url', '')}>Remove image</Button></div>}
      <p className="text-xs text-muted-foreground">Image na ho to UPI ID se QR automatically banega.</p>
    </div>}

    {message && <p role="status" className="text-sm text-primary">{message}</p>}
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    <Button className="w-full" onClick={save} disabled={busy} loading={busy}><Save />Save real {method.label} details</Button>
  </article>;
}

function PaymentRequestCard({ request, booking, shipperName, onChanged }: { request: ManualPaymentRequest; booking?: Booking; shipperName?: string; onChanged: () => void }) {
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function review(status: 'approved' | 'rejected') {
    setBusy(true); setError('');
    const { error: reviewError } = await supabase.rpc('review_manual_payment', { _request_id: request.id, _status: status, _note: note });
    setBusy(false);
    if (reviewError) { setError(reviewError.message); return; }
    onChanged();
  }

  return <article className="bg-card border border-border rounded-xl p-4 space-y-3">
    <div className="flex items-start justify-between gap-3"><div><p className="font-semibold text-sm">{shipperName || 'Shipper'} · {formatCurrency(Number(request.amount))}</p><p className="text-xs text-muted-foreground">{booking ? `${booking.pickup_location} → ${booking.drop_location}` : `Booking ${request.booking_id.slice(0, 8)}`}</p></div><Badge color={request.status === 'approved' ? 'green' : request.status === 'rejected' ? 'red' : 'amber'}>{request.status}</Badge></div>
    <div className="grid grid-cols-2 gap-2 text-xs"><div><p className="text-muted-foreground">Method</p><p className="font-semibold uppercase">{request.method_key}</p></div><div><p className="text-muted-foreground">Submitted</p><p className="font-semibold">{new Date(request.created_at).toLocaleString('en-IN')}</p></div></div>
    <div className="rounded-lg bg-muted p-3"><p className="text-xs text-muted-foreground">Transaction ID / UTR</p><p className="font-bold break-all tracking-wide">{request.transaction_reference}</p></div>
    {request.admin_note && <p className="text-xs text-muted-foreground">Admin note: {request.admin_note}</p>}
    {request.status === 'pending' && <><input className={inputClass} value={note} onChange={(event) => setNote(event.target.value)} placeholder="Admin note (optional)" /><div className="flex gap-2"><Button variant="accent" size="sm" className="flex-1" disabled={busy} loading={busy} onClick={() => review('approved')}><CheckCircle2 />Confirm payment</Button><Button variant="danger" size="sm" className="flex-1" disabled={busy} onClick={() => review('rejected')}><XCircle />Reject</Button></div></>}
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
  </article>;
}
