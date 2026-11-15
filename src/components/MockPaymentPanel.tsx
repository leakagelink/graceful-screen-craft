import { useEffect, useState } from 'react';
import { FlaskConical, CreditCard, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/AuthContext';
import { formatCurrency } from '@/lib/fare';
import { createMockPayment, mockPaymentKey, readMockPayment, type MockOutcome, type MockPayment } from '@/lib/mock-payment';

export default function MockPaymentPanel({ bookingId, amount }: { bookingId: string; amount: number }) {
  const { user } = useAuth();
  const [payment, setPayment] = useState<MockPayment | null>(null);
  const [open, setOpen] = useState(false);
  const [outcome, setOutcome] = useState<MockOutcome>('success');
  const [error, setError] = useState('');
  const key = user ? mockPaymentKey(user.id, bookingId) : null;
  useEffect(() => {
    setPayment(null); setOpen(false); setError('');
    if (!key) return;
    try { setPayment(readMockPayment(localStorage.getItem(key))); } catch { setError('Demo storage unavailable.'); }
  }, [key]);
  function simulate() {
    if (!key) return;
    try {
      const next = createMockPayment(amount, outcome);
      localStorage.setItem(key, JSON.stringify(next)); setPayment(next); setOpen(false); setError('');
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not save mock payment.'); }
  }
  function reset() {
    if (!key) return;
    try { localStorage.removeItem(key); setPayment(null); setOpen(false); setError(''); }
    catch { setError('Could not reset mock payment.'); }
  }
  if (!user) return null;
  return <section aria-label="Mock payment" className="border-t border-border py-5 space-y-4 text-foreground">
    <div className="flex items-center gap-2"><FlaskConical className="size-5 text-primary" /><h2 className="font-semibold">Mock payment</h2><span className="ml-auto text-xs text-muted-foreground">Test only</span></div>
    <p className="text-xs text-muted-foreground">No money charged. Real payment, delivery and payout records stay unchanged.</p>
    <div className="flex justify-between items-center gap-3"><span className="text-sm">Demo amount</span><strong>{formatCurrency(amount)}</strong></div>
    {payment && <div role="status" className="space-y-1 text-sm"><p className={payment.status === 'failed' ? 'text-destructive' : 'text-foreground'}>{payment.status === 'success' ? 'Mock payment successful' : payment.status === 'failed' ? 'Mock payment failed — retry available' : 'Mock payment cancelled — no charge'}</p><p className="text-xs text-muted-foreground break-all">{payment.reference}</p><p className="text-xs text-muted-foreground">{formatCurrency(payment.amount)} · {new Date(payment.createdAt).toLocaleString('en-IN')}</p></div>}
    {open ? <div className="space-y-3"><label className="block text-sm">Test result<select aria-label="Test result" value={outcome} onChange={e => setOutcome(e.target.value as MockOutcome)} className="mt-2 h-10 w-full border border-input bg-background rounded-md px-3"><option value="success">Success</option><option value="failed">Failure</option><option value="cancelled">Cancelled</option></select></label><div className="flex flex-wrap gap-2"><Button onClick={simulate}><FlaskConical />Run mock payment</Button><Button variant="ghost" onClick={() => setOpen(false)}>Close</Button></div></div> : <Button disabled={!Number.isFinite(amount) || amount <= 0} onClick={() => setOpen(true)}><CreditCard />{payment ? 'Test again' : 'Mock checkout'}</Button>}
    {payment && <Button title="Reset mock payment" aria-label="Reset mock payment" size="icon" variant="ghost" onClick={reset}><RotateCcw /></Button>}
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
  </section>;
}