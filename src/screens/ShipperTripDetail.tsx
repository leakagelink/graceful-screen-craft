import { useState, useEffect, useCallback } from 'react';
import {
  ArrowLeft,
  Truck,
  MapPin,
  Package,
  Calendar,
  CheckCircle2,
  XCircle,
  MessageCircle,
  AlertCircle,
  TrendingUp,
  Wallet,
  Send,
  Phone,
  FileText,
  Star,
  Ban,
  AlertTriangle,
  Navigation,
} from 'lucide-react';
import { supabase, type Booking, type Offer, type Profile } from '@/lib/supabase';
import { PAYMENT_STATUS_LABELS, getPaymentInstructions } from '@/lib/payment-config';
import { useAuth } from '@/context/AuthContext';
import { getVehicle, formatCurrency } from '@/lib/fare';
import { calcCommissionFromSecondHalf, calcDriverPayout, calcPayout1, calcPayout2 } from '@/lib/commission';
import { Button, Badge, Field, inputClass } from '@/components/ui';
import { STATUS_META } from '@/components/BookingCard';
import { RatingModal } from '@/components/RatingModal';
import CancelReasonSheet from '@/components/CancelReasonSheet';

interface OfferWithDriver extends Offer {
  driver_name?: string;
}

interface Props {
  booking: Booking;
  onBack: () => void;
  onChat: (bookingId: string) => void;
}

export default function ShipperTripDetail({ booking: initialBooking, onBack, onChat }: Props) {
  const { profile } = useAuth();
  const [booking, setBooking] = useState<Booking>(initialBooking);
  const [offers, setOffers] = useState<OfferWithDriver[]>([]);
  const [busy, setBusy] = useState(false);
  const [counterAmount, setCounterAmount] = useState<Record<string, string>>({});
  const [showCounter, setShowCounter] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [driverProfile, setDriverProfile] = useState<Profile | null>(null);
  const [showDispute, setShowDispute] = useState(false);
  const [disputeReason, setDisputeReason] = useState('');
  const [showCancel, setShowCancel] = useState(false);
  const [showRating, setShowRating] = useState(false);
  const [hasRated, setHasRated] = useState(false);

  const load = useCallback(async () => {
    const [{ data: bData }, { data: oData }] = await Promise.all([
      supabase.from('bookings').select('*').eq('id', initialBooking.id).maybeSingle(),
      supabase.from('offers').select('*').eq('booking_id', initialBooking.id).order('created_at', { ascending: false }),
    ]);
    if (bData) setBooking(bData as Booking);

    // Fetch driver profile if assigned
    const b = bData as Booking;
    if (b?.driver_id) {
      const { data: dData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', b.driver_id)
        .maybeSingle();
      if (dData) setDriverProfile(dData as Profile);
    } else {
      setDriverProfile(null);
    }

    if (oData && oData.length > 0) {
      const driverIds = [...new Set(oData.map((o) => o.driver_id))];
      const { data: drivers } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', driverIds);
      const driverMap = new Map<string, string>();
      (drivers as Profile[] | null)?.forEach((d) => driverMap.set(d.id, d.full_name));

      setOffers(
        oData.map((o) => ({
          ...(o as Offer),
          driver_name: driverMap.get(o.driver_id) ?? 'Driver',
        }))
      );
    } else {
      setOffers([]);
    }

    // Check if shipper has already rated
    if (b?.status === 'completed' && b?.driver_id && profile?.id) {
      const { data: existingRating } = await supabase
        .from('ratings')
        .select('id')
        .eq('booking_id', b.id)
        .eq('rater_id', profile.id)
        .maybeSingle();
      setHasRated(!!existingRating);
      if (!existingRating) setShowRating(true);
    } else {
      setShowRating(false);
      setHasRated(false);
    }
  }, [initialBooking.id, profile?.id]);

  useEffect(() => {
    load();
    const channel = supabase
      .channel(`shipper-booking:${initialBooking.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'bookings', filter: `id=eq.${initialBooking.id}` },
        () => load()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'offers', filter: `booking_id=eq.${initialBooking.id}` },
        () => load()
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [initialBooking.id, load]);

  const vehicle = getVehicle(booking.vehicle_type);
  const status = STATUS_META[booking.status] ?? STATUS_META['available'];
  const finalFare = Number(booking.agreed_fare ?? booking.total_fare);
  const commission = calcCommissionFromSecondHalf(finalFare);
  const driverTotal = calcDriverPayout(finalFare);
  const payout1 = calcPayout1(finalFare);
  const payout2 = calcPayout2(finalFare);

  const tripDate = new Date(booking.trip_date).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
  });

  const hasDriver = !!booking.driver_id;
  const pendingOffers = offers.filter((o) => o.status === 'pending' || o.status === 'countered');

  // --- Actions ---

  async function acceptDriverOffer(offer: OfferWithDriver) {
    setBusy(true);
    setMsg(null);
    const fare = Number(offer.offer_amount);
    const comm = calcCommissionFromSecondHalf(fare);
    const driverPayout = calcDriverPayout(fare);
    const { error } = await supabase
      .from('bookings')
      .update({
        driver_id: offer.driver_id,
        status: 'assigned',
        agreed_fare: fare,
        assigned_at: new Date().toISOString(),
        commission_amount: comm,
        driver_total_payout: driverPayout,
        payout_1_status: 'pending',
        payout_2_status: 'pending',
        payment_status: 'MANUAL_PAYMENT',
        payment_method: 'manual',
      })
      .eq('id', booking.id)
      .in('status', ['available', 'paid', 'offer_made']);
    if (error) {
      setBusy(false);
      setMsg({ type: 'error', text: 'Could not accept offer.' });
      return;
    }
    await supabase.from('offers').update({ status: 'accepted' }).eq('id', offer.id);
    // Reject all other offers
    await supabase.from('offers').update({ status: 'rejected' }).eq('booking_id', booking.id).neq('id', offer.id);
    setBusy(false);
    setMsg({ type: 'success', text: 'Offer accepted! Driver assigned.' });
    await load();
  }

  async function rejectOffer(offer: OfferWithDriver) {
    setBusy(true);
    setMsg(null);
    const { error } = await supabase.from('offers').update({ status: 'rejected' }).eq('id', offer.id);
    setBusy(false);
    if (error) {
      setMsg({ type: 'error', text: 'Could not reject offer.' });
      return;
    }
    setMsg({ type: 'success', text: 'Offer rejected.' });
    await load();
  }

  async function counterOffer(offer: OfferWithDriver) {
    const amount = Number(counterAmount[offer.id]);
    if (!amount || amount <= 0) return;
    setBusy(true);
    setMsg(null);
    const { error } = await supabase
      .from('offers')
      .update({ status: 'countered', counter_amount: amount })
      .eq('id', offer.id);
    setBusy(false);
    if (error) {
      setMsg({ type: 'error', text: 'Could not send counter offer.' });
      return;
    }
    setShowCounter(null);
    setMsg({ type: 'success', text: `Counter offer of ${formatCurrency(amount)} sent.` });
    await load();
  }

  async function acceptFixedFare() {
    setBusy(true);
    setMsg(null);
    setMsg({ type: 'success', text: 'Your load is still visible to drivers. Offers will appear here when drivers respond.' });
    setBusy(false);
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-28">
      <div className="sticky top-0 z-10 bg-white/90 backdrop-blur border-b border-slate-200">
        <div className="max-w-md mx-auto px-4 py-3.5 flex items-center gap-3">
          <button onClick={onBack} className="w-9 h-9 rounded-full flex items-center justify-center text-slate-600 hover:bg-slate-100 transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <h1 className="font-bold text-slate-900 leading-tight">Load Details</h1>
            <p className="text-xs text-slate-400">{vehicle.label} · {booking.distance_km} km</p>
          </div>
          <Badge color={status.color}>{status.label}</Badge>
        </div>
      </div>

      <div className="px-4 py-5 space-y-4 max-w-md mx-auto">
        {/* Load info card */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 animate-fade-in-up">
          <div className="flex items-center gap-2.5 mb-4">
            <div className="w-10 h-10 rounded-xl bg-primary-50 flex items-center justify-center">
              <Truck className="w-5 h-5 text-primary-600" />
            </div>
            <div>
              <p className="font-semibold text-slate-900 text-sm">{vehicle.label}</p>
              <p className="text-xs text-slate-400">{vehicle.capacity}</p>
            </div>
          </div>

          <div className="flex items-start gap-3 mb-4">
            <div className="flex flex-col items-center pt-1">
              <span className="w-2.5 h-2.5 rounded-full bg-accent-500" />
              <span className="w-0.5 h-7 bg-slate-200 my-1" />
              <span className="w-2.5 h-2.5 rounded-full bg-error-500" />
            </div>
            <div className="flex-1 space-y-3 text-sm">
              <div>
                <p className="text-xs text-slate-400">Pickup</p>
                <p className="font-medium text-slate-900">{booking.pickup_location}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400">Drop</p>
                <p className="font-medium text-slate-900">{booking.drop_location}</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 pt-4 border-t border-slate-100">
            <Info icon={<Package className="w-3.5 h-3.5" />} label="Material">{booking.material_type}</Info>
            <Info icon={<TrendingUp className="w-3.5 h-3.5" />} label="Weight">{booking.weight_kg ? `${booking.weight_kg} kg` : '—'}</Info>
            <Info icon={<Calendar className="w-3.5 h-3.5" />} label="Date">{tripDate}</Info>
          </div>

          {booking.notes && (
            <div className="mt-3 bg-slate-50 rounded-lg p-3 text-xs text-slate-600">
              <span className="font-semibold text-slate-700">Notes: </span>
              {booking.notes}
            </div>
          )}

          <div className="flex items-center justify-between pt-4 mt-4 border-t border-slate-100">
            <p className="text-xs text-slate-400">Your offered fare</p>
            <p className="text-2xl font-bold text-primary-700">{formatCurrency(Number(booking.total_fare))}</p>
          </div>
        </div>

        {/* Message banner */}
        {msg && (
          <div className={`rounded-xl p-3.5 flex items-start gap-3 animate-scale-in ${
            msg.type === 'success' ? 'bg-accent-50 border border-accent-200' : 'bg-error-500/10 border border-error-500/20'
          }`}>
            {msg.type === 'success'
              ? <CheckCircle2 className="w-5 h-5 text-accent-600 flex-shrink-0 mt-0.5" />
              : <AlertCircle className="w-5 h-5 text-error-600 flex-shrink-0 mt-0.5" />}
            <p className={`text-sm font-medium ${msg.type === 'success' ? 'text-accent-800' : 'text-error-700'}`}>{msg.text}</p>
          </div>
        )}

        {/* --- DRIVER OFFERS (shipper view) --- */}
        {!hasDriver && pendingOffers.length > 0 && (
          <div className="space-y-3">
            <h3 className="font-bold text-slate-900 text-sm px-1">Driver Offers ({pendingOffers.length})</h3>
            {pendingOffers.map((offer) => (
              <div key={offer.id} className="bg-white rounded-2xl border border-slate-200 p-4 animate-fade-in-up">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-primary-100 flex items-center justify-center">
                      <Truck className="w-4 h-4 text-primary-600" />
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900 text-sm">{offer.driver_name}</p>
                      <p className="text-xs text-slate-400">{offer.status === 'countered' ? 'Counter sent' : 'New offer'}</p>
                    </div>
                  </div>
                  <p className="text-xl font-bold text-primary-700">{formatCurrency(Number(offer.offer_amount))}</p>
                </div>

                {showCounter === offer.id ? (
                  <div className="space-y-3">
                    <Field label="Your counter amount (₹)">
                      <input
                        type="number"
                        min="1"
                        className={inputClass}
                        value={counterAmount[offer.id] ?? ''}
                        onChange={(e) =>
                          setCounterAmount((prev) => ({ ...prev, [offer.id]: e.target.value }))
                        }
                        placeholder="e.g. 4500"
                      />
                    </Field>
                    <div className="flex gap-2">
                      <Button variant="secondary" size="sm" className="flex-1" onClick={() => setShowCounter(null)}>Cancel</Button>
                      <Button variant="primary" size="sm" className="flex-1" onClick={() => counterOffer(offer)} disabled={busy} loading={busy}>
                        <Send className="w-3.5 h-3.5" /> Send Counter
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-2">
                    <Button variant="accent" size="sm" onClick={() => acceptDriverOffer(offer)} disabled={busy} loading={busy}>
                      <CheckCircle2 className="w-3.5 h-3.5" /> Accept
                    </Button>
                    <Button variant="secondary" size="sm" onClick={() => setShowCounter(offer.id)} disabled={busy}>
                      Counter
                    </Button>
                    <Button variant="danger" size="sm" onClick={() => rejectOffer(offer)} disabled={busy}>
                      <XCircle className="w-3.5 h-3.5" /> Reject
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* No offers yet */}
        {!hasDriver && pendingOffers.length === 0 && ['available', 'paid', 'offer_made'].includes(booking.status) && (
          <div className="bg-white rounded-2xl border border-slate-200 p-5 text-center animate-fade-in-up">
            <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center mx-auto mb-3">
              <Truck className="w-6 h-6 text-slate-400" />
            </div>
            <p className="font-semibold text-slate-700 text-sm">Waiting for driver offers</p>
            <p className="text-xs text-slate-400 mt-1">Your load is visible to nearby drivers. Offers will appear here.</p>
          </div>
        )}

        {/* --- ASSIGNED: trip progress + chat --- */}
        {hasDriver && (
          <>
            {/* Driver profile card */}
            {driverProfile && (
              <div className="bg-white rounded-2xl border border-slate-200 p-5 animate-fade-in-up">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-12 h-12 rounded-xl bg-primary-100 flex items-center justify-center">
                    <Truck className="w-6 h-6 text-primary-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-900 text-sm truncate">{driverProfile.full_name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      {driverProfile.vehicle_number && (
                        <span className="text-xs text-slate-500 font-medium">{driverProfile.vehicle_number}</span>
                      )}
                      {driverProfile.kyc_status === 'approved' && (
                        <span className="inline-flex items-center gap-0.5 text-xs text-accent-600 font-semibold">
                          <CheckCircle2 className="w-3 h-3" /> KYC Verified
                        </span>
                      )}
                    </div>
                  </div>
                  {driverProfile.phone && (
                    <a
                      href={`tel:${driverProfile.phone}`}
                      className="w-10 h-10 rounded-full bg-accent-500 text-white flex items-center justify-center hover:bg-accent-600 transition-colors flex-shrink-0"
                    >
                      <Phone className="w-4 h-4" />
                    </a>
                  )}
                </div>
                {driverProfile.license_number && (
                  <div className="text-xs text-slate-500 flex items-center gap-1">
                    <FileText className="w-3.5 h-3.5" /> License: {driverProfile.license_number}
                  </div>
                )}
              </div>
            )}

            <div className="bg-white rounded-2xl border border-slate-200 p-5 animate-fade-in-up">
              <h3 className="font-bold text-slate-900 text-sm mb-4">Trip Progress</h3>
              <TripStep label="Driver assigned" done={true} />
              <TripStep label="Trip started" done={['in_progress', 'otp_sent', 'delivered', 'completed'].includes(booking.status)} active={booking.status === 'in_progress'} />
              <TripStep label="Delivery OTP" done={['otp_sent', 'delivered', 'completed'].includes(booking.status)} active={booking.status === 'otp_sent'} />
              <TripStep label="Delivered & paid" done={booking.status === 'completed'} active={booking.status === 'delivered'} />
            </div>

            {/* Delivery OTP display for shipper */}
            {booking.status === 'otp_sent' && booking.delivery_otp && (
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 text-center animate-scale-in">
                <p className="text-sm font-semibold text-amber-800 mb-2">Delivery Verification OTP</p>
                <p className="text-4xl font-bold tracking-widest text-amber-900">{booking.delivery_otp}</p>
                <p className="text-xs text-amber-700 mt-2">Share this code with your driver to confirm delivery.</p>
              </div>
            )}

            {/* Payment status card */}
            {booking.payment_status && booking.payment_status !== 'NOT_REQUIRED' && (
              <div className="bg-white rounded-2xl border border-slate-200 p-5 animate-fade-in-up">
                <div className="flex items-center gap-2 mb-3">
                  <Wallet className="w-5 h-5 text-primary-600" />
                  <h3 className="font-bold text-slate-900 text-sm">Payment Status</h3>
                  <span className={`ml-auto px-2.5 py-1 rounded-full text-xs font-semibold ${
                    booking.payment_status === 'PAID' ? 'bg-accent-100 text-accent-700' :
                    booking.payment_status === 'FAILED' ? 'bg-error-100 text-error-700' :
                    booking.payment_status === 'REFUNDED' ? 'bg-slate-100 text-slate-700' :
                    'bg-amber-100 text-amber-700'
                  }`}>
                    {PAYMENT_STATUS_LABELS[booking.payment_status] ?? booking.payment_status}
                  </span>
                </div>
                {getPaymentInstructions(booking.payment_status) && (
                  <p className="text-xs text-slate-500 mt-1">{getPaymentInstructions(booking.payment_status)}</p>
                )}
                {booking.payment_verified_at && (
                  <p className="text-xs text-slate-400 mt-2">
                    Verified by admin on {new Date(booking.payment_verified_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </p>
                )}
              </div>
            )}

            {/* Payment split summary */}
            {['delivered', 'completed'].includes(booking.status) && (
              <div className="bg-white rounded-2xl border border-slate-200 p-5 animate-fade-in-up">
                <div className="flex items-center gap-2 mb-4">
                  <Wallet className="w-5 h-5 text-primary-600" />
                  <h3 className="font-bold text-slate-900 text-sm">Payment Split</h3>
                </div>
                <div className="space-y-2 text-sm">
                  <PayRow label="Final fare" value={formatCurrency(finalFare)} bold />
                  <PayRow label="First 50% — Driver (0% commission)" value={formatCurrency(payout1)} color="text-accent-600" />
                  <PayRow label="Second 50% — Vahakam commission (5%)" value={formatCurrency(commission)} color="text-error-600" />
                  <PayRow label="Second 50% — Driver (95%)" value={formatCurrency(payout2)} color="text-accent-600" />
                  <div className="h-px bg-slate-100 my-1" />
                  <PayRow label="Driver total payout (97.5%)" value={formatCurrency(driverTotal)} bold color="text-accent-600" />
                  <PayRow label="First payment" value={booking.payout_1_status === 'paid' ? 'Paid' : 'Pending'} color={booking.payout_1_status === 'paid' ? 'text-accent-600' : 'text-amber-600'} />
                  <PayRow label="Second payment" value={booking.payout_2_status === 'paid' ? 'Paid' : 'Pending'} color={booking.payout_2_status === 'paid' ? 'text-accent-600' : 'text-amber-600'} />
                </div>
              </div>
            )}

            {/* Driver live location */}
            {['assigned', 'in_progress', 'otp_sent', 'delivered'].includes(booking.status) && booking.driver_lat != null && booking.driver_lng != null && (
              <div className="bg-white rounded-2xl border border-slate-200 p-5 animate-fade-in-up">
                <div className="flex items-center gap-2 mb-3">
                  <Navigation className="w-4 h-4 text-accent-600 animate-pulse" />
                  <h3 className="font-bold text-slate-900 text-sm">Driver Live Location</h3>
                  {booking.driver_location_updated_at && (
                    <span className="ml-auto text-xs text-slate-400">
                      Updated {new Date(booking.driver_location_updated_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  )}
                </div>
                <a
                  href={`https://www.google.com/maps?q=${booking.driver_lat},${booking.driver_lng}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-center gap-2 text-sm font-semibold text-white bg-accent-500 hover:bg-accent-600 rounded-xl py-3 transition-colors"
                >
                  <Navigation className="w-4 h-4" /> View driver on map
                </a>
              </div>
            )}

            {/* Chat + Navigate buttons */}
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => onChat(booking.id)}
                className="flex items-center justify-center gap-2 text-sm font-semibold text-primary-700 bg-primary-50 hover:bg-primary-100 rounded-xl py-3 transition-colors"
              >
                <MessageCircle className="w-4 h-4" /> Message driver
              </button>
              <a
                href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(booking.drop_location)}`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-center gap-2 text-sm font-semibold text-primary-700 bg-primary-50 hover:bg-primary-100 rounded-xl py-3 transition-colors"
              >
                <Navigation className="w-4 h-4" /> Track route
              </a>
            </div>

            {/* POD download button */}
            {['delivered', 'completed'].includes(booking.status) && (
              <a
                href={`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-pod?bookingId=${booking.id}`}
                target="_blank"
                rel="noreferrer"
                className="w-full flex items-center justify-center gap-2 text-sm font-semibold text-accent-700 bg-accent-50 hover:bg-accent-100 rounded-xl py-3 transition-colors"
              >
                <FileText className="w-4 h-4" /> Download POD (Proof of Delivery)
              </a>
            )}

            {/* Cancel booking — only before assignment is locked */}
            {['available', 'paid', 'offer_made'].includes(booking.status) && !showCancel && (
              <button
                onClick={() => setShowCancel(true)}
                className="w-full flex items-center justify-center gap-2 text-sm font-semibold text-error-600 bg-error-500/5 hover:bg-error-500/10 rounded-xl py-2.5 transition-colors"
              >
                <Ban className="w-4 h-4" /> Cancel this booking
              </button>
            )}
            {showCancel && (
              <CancelReasonSheet
                busy={busy}
                onClose={() => setShowCancel(false)}
                onSubmit={async (reason) => {
                  setBusy(true);
                  const { error } = await supabase.from('bookings').update({
                    status: 'cancelled',
                    cancel_reason: reason,
                    cancelled_at: new Date().toISOString(),
                  }).eq('id', booking.id).in('status', ['available', 'paid', 'offer_made']);
                  setBusy(false);
                  if (error) { setMsg({ type: 'error', text: 'Could not cancel booking.' }); return; }
                  setShowCancel(false);
                  setMsg({ type: 'success', text: 'Booking cancelled.' });
                  await load();
                }}
              />
            )}

            {/* Raise dispute — only for assigned/in-progress/delivered */}
            {['assigned', 'in_progress', 'otp_sent', 'delivered', 'completed'].includes(booking.status) && !showDispute && (
              <button
                onClick={() => setShowDispute(true)}
                className="w-full flex items-center justify-center gap-2 text-sm font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 rounded-xl py-2.5 transition-colors"
              >
                <AlertTriangle className="w-4 h-4" /> Raise a Dispute
              </button>
            )}
            {showDispute && (
              <div className="bg-white rounded-2xl border border-amber-200 p-5 space-y-3 animate-scale-in">
                <div className="flex items-center gap-2 text-amber-700">
                  <AlertTriangle className="w-5 h-5" />
                  <h3 className="font-bold text-sm">Raise a Dispute</h3>
                </div>
                <Field label="Describe the issue">
                  <textarea
                    className={`${inputClass} resize-none`}
                    rows={3}
                    placeholder="e.g. Driver did not show up, goods damaged, overcharging"
                    value={disputeReason}
                    onChange={(e) => setDisputeReason(e.target.value)}
                  />
                </Field>
                <div className="flex gap-2">
                  <Button variant="secondary" size="sm" className="flex-1" onClick={() => setShowDispute(false)}>Cancel</Button>
                  <Button variant="primary" size="sm" className="flex-1" onClick={async () => {
                    if (!disputeReason.trim()) return;
                    setBusy(true);
                    const { error } = await supabase.from('disputes').insert({
                      booking_id: booking.id,
                      raised_by: profile?.id,
                      reason: disputeReason.trim(),
                    });
                    setBusy(false);
                    if (error) { setMsg({ type: 'error', text: 'Could not file dispute.' }); return; }
                    setShowDispute(false);
                    setDisputeReason('');
                    setMsg({ type: 'success', text: 'Dispute filed. Admin will review it shortly.' });
                  }} disabled={busy || !disputeReason.trim()} loading={busy}>Submit</Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {showRating && booking.status === 'completed' && booking.driver_id && profile?.id && !hasRated && (
        <RatingModal
          bookingId={booking.id}
          rateeId={booking.driver_id}
          rateeName={driverProfile?.full_name ?? 'Driver'}
          raterId={profile.id}
          raterRole="shipper"
          onDone={() => { setShowRating(false); setHasRated(true); setMsg({ type: 'success', text: 'Rating submitted!' }); }}
          onSkip={() => setShowRating(false)}
        />
      )}
    </div>
  );
}

function TripStep({ label, done, active = false }: { label: string; done: boolean; active?: boolean }) {
  return (
    <div className="flex items-center gap-3 py-1.5">
      <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${
        done ? 'bg-accent-500' : active ? 'bg-primary-500' : 'bg-slate-200'
      }`}>
        {done && <CheckCircle2 className="w-3 h-3 text-white" />}
        {active && !done && <span className="w-2 h-2 rounded-full bg-white animate-pulse" />}
      </div>
      <span className={`text-sm ${done ? 'text-slate-900 font-medium' : active ? 'text-primary-700 font-medium' : 'text-slate-400'}`}>{label}</span>
    </div>
  );
}

function Info({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs text-slate-400 flex items-center gap-1 mb-0.5">{icon}{label}</p>
      <p className="text-xs font-medium text-slate-700 truncate">{children}</p>
    </div>
  );
}

function PayRow({ label, value, bold, color }: { label: string; value: string; bold?: boolean; color?: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className={bold ? 'font-bold text-slate-900' : 'text-slate-600'}>{label}</span>
      <span className={`${bold ? 'font-bold' : 'font-medium'} ${color ?? 'text-slate-900'}`}>{value}</span>
    </div>
  );
}
