import { Banknote, PackageCheck, ShieldCheck } from 'lucide-react';
import { formatCurrency } from '@/lib/fare';
import { getTripPaymentAmounts } from '@/lib/trip-payment';

export default function TripConditions({ fare }: { fare: number }) {
  const amounts = getTripPaymentAmounts(fare);
  return (
    <section aria-labelledby="trip-conditions-title" className="rounded-2xl border border-primary/20 bg-primary/5 p-5 space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center"><ShieldCheck className="w-5 h-5" /></div>
        <div><h2 id="trip-conditions-title" className="font-bold">Transport & payment conditions</h2><p className="text-xs text-muted-foreground">Booking ki ye shartein dono parties par lagoo hongi</p></div>
      </div>
      <ol className="space-y-3 text-sm">
        <li className="flex gap-3"><PackageCheck className="w-5 h-5 text-primary shrink-0" /><span><strong>Loading shipper karega.</strong> Driver sirf maal lene aayega; maal load/unload karwana shipper/receiver ki zimmedari hogi.</span></li>
        <li className="flex gap-3"><Banknote className="w-5 h-5 text-primary shrink-0" /><span><strong>Pickup par 40% = {formatCurrency(amounts.pickup40)}.</strong> Shipper cash ya online seedha driver ko payment karega. Driver ki confirmation ke baad hi trip start hogi.</span></li>
        <li className="flex gap-3"><ShieldCheck className="w-5 h-5 text-primary shrink-0" /><span><strong>Delivery ke baad 60% = {formatCurrency(amounts.delivery60)}.</strong> POD photo upload aur delivery OTP verify hone ke baad ye payment due hoga; driver receive confirm karega.</span></li>
      </ol>
      <p className="text-xs text-muted-foreground border-t border-border pt-3">Online payment driver ke diye hue UPI/bank medium se direct karein. App payment record aur confirmation dikhata hai; OTP/POD ko payment proof na samjhein.</p>
    </section>
  );
}
