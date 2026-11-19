// @ts-nocheck -- ported from original app; stricter project tsconfig
import { useState, useEffect, useCallback, useRef } from 'react';
import {
  ArrowLeft,
  Truck,
  MapPin,
  Package,
  Calendar,
  CheckCircle2,
  Clock,
  Wallet,
  Send,
  MessageCircle,
  AlertCircle,
  KeyRound,
  TrendingUp,
  FileText,
  Phone,
  Navigation,
  MapPin as LocationIcon,
} from 'lucide-react';
import { supabase, type Booking, type Offer, type Profile } from '@/lib/supabase';
import { PAYMENT_STATUS_LABELS, getPaymentInstructions } from '@/lib/payment-config';
import { useAuth } from '@/context/AuthContext';
import { getVehicle, formatCurrency } from '@/lib/fare';
import { calcCommissionFromSecondHalf, calcDriverPayout, calcPayout1, calcPayout2 } from '@/lib/commission';
import { Button, Badge, Spinner, Field, inputClass } from '@/components/ui';
import { STATUS_META } from '@/components/BookingCard';
import { RatingModal } from '@/components/RatingModal';
import { useAppSettings } from '@/lib/settings';
import TripConditions from '@/components/TripConditions';
import TripPaymentPanel from '@/components/TripPaymentPanel';
import DeliveryProofPanel from '@/components/DeliveryProofPanel';

import { actOnTrip } from '@/lib/trips';

interface Props {
  booking: Booking;
  onBack: () => void;
  onChat: (bookingId: string) => void;
  onCompleted: () => void;
}

export default function DriverTripDetail({ booking: initialBooking, onBack, onChat, onCompleted }: Props) {
  const { profile } = useAuth();
  const [booking, setBooking] = useState<Booking>(initialBooking);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [myOffer, setMyOffer] = useState<number>(Number(initialBooking.total_fare));
  const [showOfferForm, setShowOfferForm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [otpInput, setOtpInput] = useState('');
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showRating, setShowRating] = useState(false);
  const [hasRated, setHasRated] = useState(false);
  const [shipperProfile, setShipperProfile] = useState<Profile | null>(null);
  const [tracking, setTracking] = useState(false);
  const watchIdRef = useRef<number | null>(null);
  const { settings } = useAppSettings();

  const isAssigned = booking.driver_id === profile?.id;
  const isMyTrip = isAssigned && !['available', 'paid', 'offer_made'].includes(booking.status);
  const isActiveTrip = isMyTrip && ['assigned', 'in_progress', 'otp_sent', 'delivered'].includes(booking.status);
  const canAcceptNewLoad = profile?.is_online === true;

  // --- Driver live location tracking ---
  // Starts when trip is active, stops when trip completes/cancels
  useEffect(() => {
    if (!isActiveTrip) {
      // Stop tracking if trip is no longer active
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      setTracking(false);
      return;
    }

    // Request permission and start watching position
    if (!('geolocation' in navigator)) return;

    const updateLocation = async (lat: number, lng: number) => {
      await supabase
        .from('bookings')
        .update({
          driver_lat: lat,
          driver_lng: lng,
          driver_location_updated_at: new Date().toISOString(),
        })
        .eq('id', initialBooking.id)
        .eq('driver_id', profile?.id);
    };

    const id = navigator.geolocation.watchPosition(
      (pos) => {
        setTracking(true);
        updateLocation(pos.coords.latitude, pos.coords.longitude);
      },
      () => setTracking(false),
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 30000 }
    );
    watchIdRef.current = id;

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      setTracking(false);
    };
  }, [isActiveTrip, initialBooking.id, profile?.id]);

  const load = useCallback(async () => {
    const [{ data: bData, error: bErr }, { data: oData, error: oErr }] = await Promise.all([
      supabase.from('bookings').select('*').eq('id', initialBooking.id).maybeSingle(),
      supabase.from('offers').select('*').eq('booking_id', initialBooking.id).order('created_at', { ascending: false }),
    ]);
    if (!bErr && bData) setBooking(bData as Booking);
    if (!oErr && oData) setOffers(oData as Offer[]);

    // Fetch shipper profile for call button
    const b = bData as Booking;
    if (b?.shipper_id) {
      const { data: contacts } = await supabase.rpc('trip_contact', { _booking_id: b.id, _person_id: b.shipper_id });
      const spData = contacts?.[0];
      if (spData) setShipperProfile(spData as Profile);
    }

    // Check if driver has already rated the shipper
    if (b?.status === 'completed' && b?.shipper_id && profile?.id) {
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
      .channel(`booking:${initialBooking.id}:${Math.random().toString(36).slice(2)}`)
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

  // --- Actions ---

  async function runAction(action, options = {}, success = '') {
    setBusy(true);
    setMsg(null);
    const { error } = await actOnTrip(booking.id, action, options);
    setBusy(false);
    if (error) { setMsg({ type: 'error', text: error }); return; }
    setShowOfferForm(false);
    if (success) setMsg({ type: 'success', text: success });
    await load();
  }
  async function acceptOffer() { await runAction('take', {}, 'Load accepted! Trip assigned to you.'); }
  async function submitOffer() { await runAction('offer', { amount: myOffer }, 'Offer sent to the shipper.'); }
  async function startTrip() { await runAction('start'); }
  async function completeTrip() { await runAction('request_delivery', {}, 'Delivery code is ready on the shipper’s Load Details page. Ask them after delivery.'); }
  async function verifyOtp() { await runAction('verify_delivery', { otp: otpInput.trim() }, 'Delivery verified with POD and OTP. The remaining 60% payment is now due.'); }

  const myOfferRow = offers.find((o) => o.driver_id === profile?.id);
  const hasMyOffer = !!myOfferRow;

  // --- Render ---

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
            <div>
              <p className="text-xs text-slate-400">{booking.agreed_fare != null ? 'Agreed fare' : "Shipper's fare"}</p>
              <p className="text-2xl font-bold text-primary-700">{formatCurrency(finalFare)}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-slate-400">Your earnings (97.5%)</p>
              <p className="text-lg font-bold text-accent-600">{formatCurrency(calcDriverPayout(finalFare))}</p>
            </div>
          </div>
        </div>

        <TripConditions fare={finalFare} />

        {/* My offer status */}
        {myOfferRow && !isAssigned && (
          <div className="bg-white rounded-2xl border border-slate-200 p-4 animate-fade-in-up">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-400">Your offer</p>
                <p className="text-xl font-bold text-slate-900">{formatCurrency(Number(myOfferRow.offer_amount))}</p>
              </div>
              <Badge color={myOfferRow.status === 'pending' ? 'amber' : myOfferRow.status === 'countered' ? 'blue' : myOfferRow.status === 'accepted' ? 'green' : 'red'}>
                {myOfferRow.status === 'countered' && myOfferRow.counter_amount
                  ? `Counter: ${formatCurrency(Number(myOfferRow.counter_amount))}`
                  : myOfferRow.status}
              </Badge>
            </div>
            {myOfferRow.status === 'countered' && myOfferRow.counter_amount && (
              <p className="text-xs text-slate-500 mt-2">
                Shipper countered with {formatCurrency(Number(myOfferRow.counter_amount))}.
              </p>
            )}
            {myOfferRow.status === 'countered' && (
              <Button className="w-full mt-3" disabled={busy || !canAcceptNewLoad} title={!canAcceptNewLoad ? 'Go online to accept this counter offer' : undefined} onClick={() => runAction('accept_counter', { offerId: myOfferRow.id }, 'Counter accepted. Trip assigned.')}>Accept Counter</Button>
            )}
          </div>
        )}

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

        {/* --- ACTION BUTTONS (available loads) --- */}
        {!isMyTrip && !isAssigned && ['available', 'paid', 'offer_made'].includes(booking.status) && !showOfferForm && !canAcceptNewLoad && (
          <div role="status" className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            You are offline. Go online from the driver Home screen to accept or offer on this load.
          </div>
        )}
        {!isMyTrip && !isAssigned && ['available', 'paid', 'offer_made'].includes(booking.status) && !showOfferForm && canAcceptNewLoad && (
          <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3 animate-fade-in-up">
            <div className="grid grid-cols-2 gap-3">
              <Button variant="primary" size="lg" onClick={acceptOffer} disabled={busy} loading={busy}>
                <CheckCircle2 className="w-4 h-4" /> Accept Offer
              </Button>
              <Button variant="secondary" size="lg" onClick={() => setShowOfferForm(true)} disabled={busy}>
                <Wallet className="w-4 h-4" /> Make Offer
              </Button>
            </div>
            {hasMyOffer && (
              <p className="text-xs text-slate-400 text-center">You already have an offer on this load.</p>
            )}
          </div>
        )}

        {/* Make offer form */}
        {showOfferForm && !isAssigned && canAcceptNewLoad && (
          <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4 animate-scale-in">
            <div>
              <h3 className="font-bold text-slate-900 text-sm mb-1">Make your offer</h3>
              <p className="text-xs text-slate-400">Enter the fare you want for this trip.</p>
            </div>
            <Field label="Your offer amount (₹)">
              <input
                type="number"
                min="1"
                className={inputClass}
                value={myOffer}
                onChange={(e) => setMyOffer(Number(e.target.value))}
                placeholder="e.g. 5000"
              />
            </Field>
            <div className="flex gap-3">
              <Button variant="secondary" className="flex-1" onClick={() => setShowOfferForm(false)}>Cancel</Button>
              <Button variant="primary" className="flex-1" onClick={submitOffer} disabled={busy || myOffer <= 0} loading={busy}>
                <Send className="w-4 h-4" /> Send Offer
              </Button>
            </div>
          </div>
        )}

        {/* --- ASSIGNED TRIP / ACTIVE TRIP --- */}
        {isMyTrip && (
          <>
            {/* Trip progress card */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 animate-fade-in-up">
              <h3 className="font-bold text-slate-900 text-sm mb-4 flex items-center gap-2">
                <Clock className="w-4 h-4 text-primary-600" /> Trip Status
              </h3>
              <TripStep label="Load assigned" done={true} />
              <TripStep label="Trip started" done={['in_progress', 'otp_sent', 'delivered', 'completed'].includes(booking.status)} active={booking.status === 'in_progress'} />
              <TripStep label="Complete trip (OTP)" done={['otp_sent', 'delivered', 'completed'].includes(booking.status)} active={booking.status === 'otp_sent'} />
              <TripStep label="Delivery confirmed" done={booking.status === 'completed'} active={booking.status === 'delivered'} />
            </div>

            <TripPaymentPanel booking={booking} role="driver" onChanged={load} />

            {/* Start trip button */}
            {booking.status === 'assigned' && (
              <div className="space-y-2">
                {booking.payout_1_status !== 'paid' && <p className="text-sm text-amber-700 text-center">Trip start karne se pehle 40% payment receive confirm karein.</p>}
                <Button variant="primary" size="lg" className="w-full" onClick={startTrip} disabled={busy || booking.payout_1_status !== 'paid'} loading={busy}>
                  Start Trip
                </Button>
              </div>
            )}

            <DeliveryProofPanel booking={booking} role="driver" onChanged={load} />

            {/* Active trip — complete trip button */}
            {booking.status === 'in_progress' && (
              <Button variant="accent" size="lg" className="w-full" onClick={completeTrip} disabled={busy} loading={busy}>
                <CheckCircle2 className="w-5 h-5" /> Complete Trip
              </Button>
            )}

            {/* OTP verification */}
            {booking.status === 'otp_sent' && (
              <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4 animate-scale-in">
                <div className="flex items-center gap-2">
                  <KeyRound className="w-5 h-5 text-primary-600" />
                  <h3 className="font-bold text-slate-900 text-sm">Delivery Verification</h3>
                </div>
                <p className="text-sm text-slate-500">
                  Ask the shipper for the {settings.trip_otp_length}-digit delivery OTP and enter it below to confirm delivery.
                </p>
                <Field label={`Delivery OTP (${settings.trip_otp_length} digits)`}>
                  <input
                    type="text"
                    maxLength={settings.trip_otp_length}
                    className={`${inputClass} text-center text-2xl tracking-widest font-bold`}
                    value={otpInput}
                    onChange={(e) => setOtpInput(e.target.value.replace(/\D/g, ''))}
                    placeholder={"0".repeat(settings.trip_otp_length)}
                  />
                </Field>
                <Button variant="accent" size="lg" className="w-full" onClick={verifyOtp} disabled={busy || otpInput.length !== settings.trip_otp_length} loading={busy}>
                  <CheckCircle2 className="w-5 h-5" /> Verify OTP
                </Button>
                <Button variant="secondary" className="w-full" disabled={busy} onClick={completeTrip}>Request new code</Button>
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
              </div>
            )}

            {/* Payment split — shown after delivery */}
            {(booking.status === 'delivered' || booking.status === 'completed') && (
              <div className="bg-white rounded-2xl border border-slate-200 p-5 animate-fade-in-up">
                <div className="flex items-center gap-2 mb-4">
                  <Wallet className="w-5 h-5 text-primary-600" />
                  <h3 className="font-bold text-slate-900 text-sm">Get Your Payment</h3>
                </div>
                <div className="space-y-2.5 text-sm">
                  <PayRow label="Final fare" value={formatCurrency(finalFare)} bold />
                  <PayRow label="Vahakam commission (5% of delivery 60%)" value={`− ${formatCurrency(commission)}`} color="text-error-600" />
                  <div className="h-px bg-slate-100 my-1" />
                  <PayRow label="Driver total payout (97%)" value={formatCurrency(driverTotal)} bold color="text-accent-600" />
                  <PayRow label="Pickup payment (40%, 0% commission)" value={formatCurrency(payout1)} />
                  <PayRow
                    label="First payment status"
                    value={booking.payout_1_status === 'paid' ? 'Paid' : booking.payout_1_status === 'failed' ? 'Failed' : 'Pending'}
                    color={booking.payout_1_status === 'paid' ? 'text-accent-600' : booking.payout_1_status === 'failed' ? 'text-error-600' : 'text-amber-600'}
                  />
                  <PayRow label="Delivery payment (60%, 5% commission)" value={formatCurrency(payout2)} />
                  <PayRow
                    label="Second payment status"
                    value={booking.payout_2_status === 'paid' ? 'Paid' : booking.payout_2_status === 'failed' ? 'Failed' : 'Pending'}
                    color={booking.payout_2_status === 'paid' ? 'text-accent-600' : booking.payout_2_status === 'failed' ? 'text-error-600' : 'text-amber-600'}
                  />
                </div>

                {booking.status === 'delivered' && booking.payout_2_status !== 'paid' && (
                  <div className="mt-4 bg-amber-50 border border-amber-200 rounded-lg px-3 py-3 text-sm text-amber-800">
                    <p className="font-semibold mb-1">Manual Payment Mode</p>
                    <p className="text-xs">The shipper will pay you directly. Confirm the payment above only after you receive it.</p>
                  </div>
                )}
                {booking.status === 'completed' && (
                  <div className="mt-4 flex items-center gap-2 text-sm text-accent-700 bg-accent-50 rounded-lg px-3 py-2.5">
                    <CheckCircle2 className="w-4 h-4" /> POD and OTP confirmed. The remaining 60% payment is now due.
                  </div>
                )}
              </div>
            )}

            {/* Live location tracking indicator */}
            {isActiveTrip && (
              <div className={`flex items-center gap-2 text-xs rounded-lg px-3 py-2 ${tracking ? 'bg-accent-50 text-accent-700' : 'bg-slate-100 text-slate-500'}`}>
                <LocationIcon className={`w-3.5 h-3.5 ${tracking ? 'animate-pulse text-accent-600' : 'text-slate-400'}`} />
                {tracking ? 'Sharing live location with shipper' : 'Location sharing inactive'}
              </div>
            )}

            {/* Call + Chat + Navigate buttons */}
            {['assigned', 'in_progress', 'otp_sent', 'delivered'].includes(booking.status) && (
              <div className="grid grid-cols-3 gap-2">
                {shipperProfile?.phone && (
                  <a
                    href={`tel:${shipperProfile.phone}`}
                    className="flex items-center justify-center gap-1.5 text-sm font-semibold text-accent-700 bg-accent-50 hover:bg-accent-100 rounded-xl py-3 transition-colors"
                  >
                    <Phone className="w-4 h-4" /> Call
                  </a>
                )}
                <button
                  onClick={() => onChat(booking.id)}
                  className="flex items-center justify-center gap-1.5 text-sm font-semibold text-primary-700 bg-primary-50 hover:bg-primary-100 rounded-xl py-3 transition-colors"
                >
                  <MessageCircle className="w-4 h-4" /> Chat
                </button>
                <a
                  href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(booking.drop_location)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-center gap-1.5 text-sm font-semibold text-primary-700 bg-primary-50 hover:bg-primary-100 rounded-xl py-3 transition-colors"
                >
                  <Navigation className="w-4 h-4" /> Navigate
                </a>
              </div>
            )}

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
          </>
        )}
      </div>

      {showRating && booking.status === 'completed' && booking.shipper_id && profile?.id && !hasRated && (
        <RatingModal
          bookingId={booking.id}
          rateeId={booking.shipper_id}
          rateeName="Shipper"
          raterId={profile.id}
          raterRole="driver"
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
      <span className={`text-sm ${done ? 'text-slate-900 font-medium' : active ? 'text-primary-700 font-medium' : 'text-slate-400'}`}>
        {label}
      </span>
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

export { Spinner };
