import { useCallback, useEffect, useMemo, useState } from 'react';
import QRCode from 'qrcode';
import { Building2, CheckCircle2, Copy, CreditCard, Landmark, QrCode, ShieldCheck, Smartphone, XCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Button, Badge, inputClass } from '@/components/ui';
import { formatCurrency } from '@/lib/fare';
import {
  buildUpiUri,
  isValidTransactionReference,
  normalizeTransactionReference,
  type ManualPaymentMethod,
  type ManualPaymentMethodKey,
  type ManualPaymentRequest,
} from '@/lib/manual-payment';

const methodOrder: ManualPaymentMethodKey[] = ['upi', 'qr', 'bank'];
const methodIcons = { upi: Smartphone, qr: QrCode, bank: Landmark };

export default function ManualPaymentPanel({ bookingId, amount, paymentStatus }: { bookingId: string; amount: number; paymentStatus?: string }) {
  const [methods, setMethods] = useState<ManualPaymentMethod[]>([]);
  const [paymentRequest, setPaymentRequest] = useState<ManualPaymentRequest | null>(null);
  const [selectedKey, setSelectedKey] = useState<ManualPaymentMethodKey>('upi');
  const [reference, setReference] = useState('');
  const [generatedQr, setGeneratedQr] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [copied, setCopied] = useState('');

  const load = useCallback(async () => {
    const [{ data: methodData, error: methodError }, { data: requestData, error: requestError }] = await Promise.all([
      supabase.from('manual_payment_methods').select('*'),
      supabase.from('manual_payment_requests').select('*').eq('booking_id', bookingId).order('created_at', { ascending: false }).limit(1),
    ]);
    if (methodError || requestError) setError(methodError?.message || requestError?.message || 'Payment details could not be loaded.');
    const rows = ((methodData ?? []) as ManualPaymentMethod[]).sort((a, b) => methodOrder.indexOf(a.key) - methodOrder.indexOf(b.key));
    setMethods(rows);
    const latestRequest = ((requestData ?? [])[0] as ManualPaymentRequest | undefined) ?? null;
    setPaymentRequest(latestRequest);
    if (latestRequest?.status === 'approved' || latestRequest?.status === 'rejected') setNotice('');
    setLoading(false);
  }, [bookingId]);

  useEffect(() => {
    void load();
    const suffix = Math.random().toString(36).slice(2);
    const channel = supabase
      .channel(`manual-payment:${bookingId}:${suffix}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'manual_payment_methods' }, () => void load())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'manual_payment_requests', filter: `booking_id=eq.${bookingId}` }, () => void load())
      .subscribe();
    // A method that becomes invisible under RLS may not emit an update event, so poll
    // while the payment panel is open to reflect admin enable/disable changes too.
    const refresh = window.setInterval(() => void load(), 5000);
    return () => { window.clearInterval(refresh); void supabase.removeChannel(channel); };
  }, [bookingId, load]);

  useEffect(() => {
    const firstMethod = methods[0];
    if (firstMethod && !methods.some((method) => method.key === selectedKey)) setSelectedKey(firstMethod.key);
  }, [methods, selectedKey]);

  const selectedMethod = useMemo(() => methods.find((method) => method.key === selectedKey) ?? null, [methods, selectedKey]);
  const upiUri = selectedMethod?.upi_id ? buildUpiUri(selectedMethod, amount, bookingId) : '';

  useEffect(() => {
    let active = true;
    setGeneratedQr('');
    if (selectedMethod?.key === 'qr' && !selectedMethod.qr_image_url && upiUri) {
      QRCode.toDataURL(upiUri, { width: 280, margin: 2, color: { dark: '#0c2340', light: '#ffffff' } })
        .then((url) => { if (active) setGeneratedQr(url); })
        .catch(() => { if (active) setError('QR code could not be generated.'); });
    }
    return () => { active = false; };
  }, [selectedMethod?.key, selectedMethod?.qr_image_url, upiUri]);

  async function copy(value: string, label: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(label);
      window.setTimeout(() => setCopied(''), 1600);
    } catch {
      setError('Copy nahi ho paya. Details manually select karein.');
    }
  }

  async function submit() {
    const normalized = normalizeTransactionReference(reference);
    setError('');
    setNotice('');
    if (!selectedMethod) { setError('Pehle payment method select karein.'); return; }
    if (!isValidTransactionReference(normalized)) {
      setError('Valid transaction ID / UTR dalein (6–64 letters, numbers, - ya _).');
      return;
    }
    setBusy(true);
    const { error: submitError } = await supabase.rpc('submit_manual_payment', {
      _booking_id: bookingId,
      _method_key: selectedMethod.key,
      _reference: normalized,
    });
    setBusy(false);
    if (submitError) { setError(submitError.message); return; }
    setReference('');
    setNotice('Payment request submit ho gayi. Admin verification ke baad status update hoga.');
    await load();
  }

  const requestStatus = paymentRequest?.status;
  const isPaid = paymentStatus === 'PAID' || requestStatus === 'approved';
  const showForm = !isPaid && requestStatus !== 'pending';

  return (
    <section aria-label="Manual payment" className="bg-card text-card-foreground rounded-2xl border border-border p-5 space-y-5 shadow-3d">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center"><CreditCard className="w-5 h-5" /></div>
        <div><h2 className="font-bold">Manual Payment</h2><p className="text-xs text-muted-foreground">UPI, QR ya bank transfer</p></div>
        <strong className="ml-auto text-primary">{formatCurrency(amount)}</strong>
      </div>

      {isPaid && (
        <div role="status" className="rounded-xl border border-accent bg-accent/50 p-4 flex items-start gap-3">
          <CheckCircle2 className="w-5 h-5 text-accent-foreground shrink-0 mt-0.5" />
          <div><p className="font-semibold text-sm">Payment confirmed</p><p className="text-xs text-muted-foreground mt-1">Admin ne aapka payment verify kar liya hai.</p></div>
        </div>
      )}

      {requestStatus === 'pending' && (
        <div role="status" className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-2">
          <div className="flex items-center gap-2"><ShieldCheck className="w-5 h-5 text-primary" /><p className="font-semibold text-sm">Admin verification pending</p><Badge color="amber">Pending</Badge></div>
          <p className="text-xs text-muted-foreground">Request ID / UTR: <span className="font-semibold text-foreground break-all">{paymentRequest?.transaction_reference}</span></p>
          <p className="text-xs text-muted-foreground">Admin confirm karte hi booking aur dashboard par payment status update ho jayega.</p>
        </div>
      )}

      {requestStatus === 'rejected' && !isPaid && (
        <div role="alert" className="rounded-xl border border-destructive/20 bg-destructive/5 p-4 flex items-start gap-3">
          <XCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
          <div><p className="font-semibold text-sm text-destructive">Payment request rejected</p><p className="text-xs text-muted-foreground mt-1">{paymentRequest?.admin_note || 'Transaction reference check karke dobara submit karein.'}</p></div>
        </div>
      )}

      {notice && <p role="status" className="rounded-lg bg-accent/60 px-3 py-2 text-sm text-accent-foreground">{notice}</p>}

      {showForm && !loading && (
        <>
          {methods.length === 0 ? (
            <p className="text-sm text-muted-foreground rounded-xl bg-muted p-4">Abhi koi payment method enabled nahi hai. Admin se contact karein.</p>
          ) : (
            <>
              <div className="grid grid-cols-3 gap-2" role="group" aria-label="Payment method">
                {methods.map((method) => {
                  const Icon = methodIcons[method.key];
                  const active = selectedKey === method.key;
                  return <button key={method.key} type="button" aria-pressed={active} onClick={() => { setSelectedKey(method.key); setError(''); }} className={`rounded-xl border px-2 py-3 text-xs font-semibold flex flex-col items-center gap-1.5 transition-colors ${active ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-background text-muted-foreground'}`}><Icon className="w-5 h-5" />{method.label}</button>;
                })}
              </div>

              {selectedMethod && (
                <div className="rounded-xl border border-border bg-background p-4 space-y-4">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-semibold text-sm">{selectedMethod.label} details</p>
                    {selectedMethod.is_demo ? <Badge color="amber">Demo details</Badge> : <Badge color="green">Admin updated</Badge>}
                  </div>
                  {selectedMethod.is_demo && <p className="text-xs rounded-lg bg-muted p-3 text-muted-foreground">Ye mock details hain. Admin apni real details save karte hi ye automatically replace ho jayengi.</p>}

                  {selectedMethod.key === 'upi' && (
                    <>
                      <DetailRow label="Payee" value={selectedMethod.payee_name || 'Vahakam'} />
                      <DetailRow label="UPI ID" value={selectedMethod.upi_id || '—'} onCopy={selectedMethod.upi_id ? () => copy(selectedMethod.upi_id!, 'UPI ID') : undefined} copied={copied === 'UPI ID'} />
                      {upiUri && <a href={upiUri} className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-primary text-primary-foreground px-4 py-2.5 text-sm font-semibold"><Smartphone className="w-4 h-4" />Open UPI app · {formatCurrency(amount)}</a>}
                    </>
                  )}

                  {selectedMethod.key === 'qr' && (
                    <div className="space-y-3 text-center">
                      {(selectedMethod.qr_image_url || generatedQr) ? <img src={selectedMethod.qr_image_url || generatedQr} alt={`${selectedMethod.payee_name || 'Vahakam'} payment QR`} className="w-56 h-56 max-w-full mx-auto rounded-xl border border-border bg-card object-contain p-2" /> : <p className="text-sm text-muted-foreground py-8">QR code taiyar ho raha hai…</p>}
                      <p className="text-sm font-medium">{selectedMethod.payee_name || 'Vahakam'}</p>
                      {selectedMethod.upi_id && <DetailRow label="UPI ID" value={selectedMethod.upi_id} onCopy={() => copy(selectedMethod.upi_id!, 'QR UPI ID')} copied={copied === 'QR UPI ID'} />}
                      <p className="text-xs text-muted-foreground">QR scan karke {formatCurrency(amount)} pay karein, phir neeche UTR submit karein.</p>
                    </div>
                  )}

                  {selectedMethod.key === 'bank' && (
                    <div className="space-y-3">
                      <DetailRow label="Account holder" value={selectedMethod.account_holder || '—'} />
                      <DetailRow label="Bank" value={selectedMethod.bank_name || '—'} />
                      <DetailRow label="Account number" value={selectedMethod.account_number || '—'} onCopy={selectedMethod.account_number ? () => copy(selectedMethod.account_number!, 'Account number') : undefined} copied={copied === 'Account number'} />
                      <DetailRow label="IFSC" value={selectedMethod.ifsc || '—'} onCopy={selectedMethod.ifsc ? () => copy(selectedMethod.ifsc!, 'IFSC') : undefined} copied={copied === 'IFSC'} />
                    </div>
                  )}
                </div>
              )}

              <div>
                <label htmlFor={`transaction-reference-${bookingId}`} className="text-sm font-semibold">Transaction ID / UTR</label>
                <input id={`transaction-reference-${bookingId}`} className={`${inputClass} mt-2 uppercase`} value={reference} maxLength={64} autoComplete="off" placeholder="Jaise: 412345678901" onChange={(event) => setReference(event.target.value)} />
                <p className="text-xs text-muted-foreground mt-1.5">Payment complete karne ke baad apne bank/UPI app se ye reference number dalein.</p>
              </div>
              <Button className="w-full" disabled={busy || !selectedMethod || !isValidTransactionReference(reference)} loading={busy} onClick={submit}><ShieldCheck />Submit for admin verification</Button>
            </>
          )}
        </>
      )}

      {loading && <p className="text-sm text-muted-foreground">Payment details load ho rahi hain…</p>}
      {error && <p role="alert" className="text-sm text-destructive rounded-lg bg-destructive/5 p-3">{error}</p>}
    </section>
  );
}

function DetailRow({ label, value, onCopy, copied }: { label: string; value: string; onCopy?: (() => void) | undefined; copied?: boolean | undefined }) {
  return <div className="flex items-center justify-between gap-3 text-sm"><span className="text-muted-foreground">{label}</span><span className="font-semibold text-right break-all">{value}</span>{onCopy && <button type="button" onClick={onCopy} className="shrink-0 inline-flex items-center gap-1 text-xs text-primary font-semibold" aria-label={`Copy ${label}`}><Copy className="w-3.5 h-3.5" />{copied ? 'Copied' : 'Copy'}</button>}</div>;
}
