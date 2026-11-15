// @ts-nocheck -- ported from original app; stricter project tsconfig
import { useState } from 'react';
import {
  ArrowLeft,
  CheckCircle2,
  Truck,
  MapPin,
  Package,
  Calendar,
  Receipt,
  ShieldCheck,
  Check,
  AlertCircle,
  Sparkles,
} from 'lucide-react';
import type { Booking } from '@/lib/supabase';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { getVehicle, formatCurrency } from '@/lib/fare';
import { calcCommissionFromSecondHalf, calcDriverPayout } from '@/lib/commission';
import { Badge, Button, Spinner } from '@/components/ui';
import { STATUS_META } from '@/components/BookingCard';

interface Props {
  booking: Booking;
  onBack: () => void;
  onDone: () => void;
  justCreated?: boolean;
}

export default function BookingSummary({
  booking,
  onBack,
  onDone,
  justCreated,
}: Props) {
  const vehicle = getVehicle(booking.vehicle_type);
  const status = STATUS_META[booking.status];
  const tripDate = new Date(booking.trip_date).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
  const kmCharge = booking.per_km_rate * booking.distance_km;
  const commission = calcCommissionFromSecondHalf(Number(booking.total_fare));
  const driverShare = calcDriverPayout(Number(booking.total_fare));

  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const isPublished = booking.status === 'available' || booking.status === 'paid' ||
    booking.status === 'offer_made' || booking.status === 'assigned' ||
    booking.status === 'in_progress' || booking.status === 'otp_sent' ||
    booking.status === 'delivered' || booking.status === 'completed';

  async function handlePublish() {
    if (publishing) return;
    setError(null);
    setPublishing(true);
    const { error: err } = await supabase
      .from('bookings')
      .update({ status: 'available' })
      .eq('id', booking.id);
    setPublishing(false);
    if (err) {
      setError('Could not publish your booking. Please try again.');
      return;
    }
    setShowSuccess(true);
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-28">
      <div className="sticky top-0 z-10 bg-white/90 backdrop-blur border-b border-slate-200">
        <div className="max-w-md mx-auto px-4 py-3.5 flex items-center gap-3">
          <button
            onClick={onBack}
            className="w-9 h-9 rounded-full flex items-center justify-center text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="font-bold text-slate-900 leading-tight">
              Booking Summary
            </h1>
            <p className="text-xs text-slate-400">बुकिंग सारांश</p>
          </div>
        </div>
      </div>

      <div className="px-4 py-5 space-y-5 max-w-md mx-auto">
        {justCreated && (
          <div className="flex items-center gap-3 bg-accent-50 border border-accent-200 rounded-xl p-3.5 animate-fade-in-up">
            <CheckCircle2 className="w-6 h-6 text-accent-600 flex-shrink-0" />
            <div>
              <p className="font-semibold text-accent-800 text-sm">
                Booking created
              </p>
              <p className="text-xs text-accent-700">
                Publish it now to make it visible to nearby drivers — completely free.
              </p>
            </div>
          </div>
        )}

        {isPublished && booking.status !== 'available' && (
          <div className="flex items-center gap-3 bg-accent-50 border border-accent-200 rounded-xl p-3.5 animate-fade-in-up">
            <ShieldCheck className="w-6 h-6 text-accent-600 flex-shrink-0" />
            <div>
              <p className="font-semibold text-accent-800 text-sm">
                Booking is live
              </p>
              <p className="text-xs text-accent-700">
                This booking is visible to drivers.
              </p>
            </div>
          </div>
        )}

        {/* Free trial banner */}
        <div className="flex items-center gap-3 bg-gradient-to-r from-primary-50 to-accent-50 border border-primary-100 rounded-xl p-3.5 animate-fade-in-up">
          <Sparkles className="w-5 h-5 text-primary-600 flex-shrink-0" />
          <div>
            <p className="font-semibold text-primary-800 text-sm">
              100% Free for Shippers & Drivers
            </p>
            <p className="text-xs text-primary-600">
              No payment required. Post loads and find trips without any charges.
            </p>
          </div>
        </div>

        {/* Trip card */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 animate-fade-in-up">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-primary-50 flex items-center justify-center">
                <Truck className="w-5 h-5 text-primary-600" />
              </div>
              <div>
                <p className="font-semibold text-slate-900 text-sm">
                  {vehicle.label}
                </p>
                <p className="text-xs text-slate-400">{vehicle.capacity}</p>
              </div>
            </div>
            <Badge color={status.color}>{status.label}</Badge>
          </div>

          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="flex flex-col items-center pt-1">
                <span className="w-2.5 h-2.5 rounded-full bg-accent-500" />
                <span className="w-0.5 h-7 bg-slate-200 my-1" />
                <span className="w-2.5 h-2.5 rounded-full bg-error-500" />
              </div>
              <div className="flex-1 space-y-3 text-sm">
                <div>
                  <p className="text-xs text-slate-400">Pickup</p>
                  <p className="font-medium text-slate-900">
                    {booking.pickup_location}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-400">Drop</p>
                  <p className="font-medium text-slate-900">
                    {booking.drop_location}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t border-slate-100">
            <Info icon={<Package className="w-3.5 h-3.5" />} label="Material">
              {booking.material_type}
            </Info>
            <Info icon={<Calendar className="w-3.5 h-3.5" />} label="Date">
              {tripDate}
            </Info>
            <Info icon={<MapPin className="w-3.5 h-3.5" />} label="Distance">
              {booking.distance_km} km
            </Info>
          </div>

          {booking.weight_kg && (
            <div className="mt-2 text-xs text-slate-500">
              Weight: {booking.weight_kg} kg
            </div>
          )}

          {booking.notes && (
            <div className="mt-3 bg-slate-50 rounded-lg p-3 text-xs text-slate-600">
              <span className="font-semibold text-slate-700">Notes: </span>
              {booking.notes}
            </div>
          )}
        </div>

        {/* Fare breakdown */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 animate-fade-in-up">
          <div className="flex items-center gap-2 mb-4">
            <Receipt className="w-5 h-5 text-primary-600" />
            <h3 className="font-bold text-slate-900 text-sm">Fare breakdown</h3>
          </div>
          <div className="space-y-2.5 text-sm">
            <FareRow
              label={`Base fare (${vehicle.label})`}
              value={formatCurrency(booking.base_fare)}
            />
            <FareRow
              label={`${formatCurrency(booking.per_km_rate)} × ${booking.distance_km} km`}
              value={formatCurrency(kmCharge)}
            />
            <div className="h-px bg-slate-100 my-1" />
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-900">Total fare</span>
              <span className="text-2xl font-bold text-primary-700">
                {formatCurrency(booking.total_fare)}
              </span>
            </div>
          </div>
        </div>

        {/* Payout info */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 animate-fade-in-up">
          <div className="flex items-center gap-2 mb-4">
            <ShieldCheck className="w-5 h-5 text-primary-600" />
            <h3 className="font-bold text-slate-900 text-sm">Fare distribution</h3>
          </div>
          <div className="space-y-2.5 text-sm">
            <FareRow
              label="Vahakam commission (5% of 2nd half)"
              value={formatCurrency(commission)}
            />
            <FareRow
              label="Driver payout (97.5%)"
              value={formatCurrency(driverShare)}
            />
          </div>
          <p className="text-xs text-slate-400 mt-3">
            The driver receives 97.5% of the fare. Vahakam takes a small 5% commission only on the second half. Payment is settled directly between shipper and driver.
          </p>
          <div className="mt-3 bg-amber-50 rounded-lg p-3 text-xs text-amber-700">
            Payment Gateway integration point is ready — Razorpay edge function exists at /functions/v1/razorpay-order. Enable it later when you want to accept online payments.
          </div>
        </div>

        {error && (
          <div className="bg-error-500/10 border border-error-500/20 rounded-xl p-3.5 flex items-start gap-3 animate-scale-in">
            <AlertCircle className="w-5 h-5 text-error-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-error-700 font-medium">{error}</p>
          </div>
        )}

        {/* Published confirmation */}
        {booking.status !== 'available' && isPublished && (
          <div className="bg-accent-50 border border-accent-200 rounded-2xl p-5 text-center animate-scale-in">
            <div className="w-14 h-14 rounded-full bg-accent-500 mx-auto flex items-center justify-center mb-3">
              <Check className="w-7 h-7 text-white" strokeWidth={3} />
            </div>
            <p className="font-bold text-accent-800">Booking is live</p>
            <p className="text-sm text-accent-700 mt-1">
              Your booking is visible to nearby drivers.
            </p>
          </div>
        )}
      </div>

      {/* Sticky publish / done bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur border-t border-slate-200 p-4 max-w-md mx-auto">
        {isPublished ? (
          <Button size="lg" variant="primary" className="w-full" onClick={onDone}>
            View active bookings
          </Button>
        ) : (
          <Button
            size="lg"
            variant="accent"
            className="w-full shadow-lg shadow-accent-900/20"
            onClick={handlePublish}
            loading={publishing}
            disabled={publishing}
          >
            {publishing ? (
              <>
                <Spinner className="w-4 h-4" /> Publishing…
              </>
            ) : (
              <>Publish — Free for everyone</>
            )}
          </Button>
        )}
      </div>

      {/* Success modal */}
      {showSuccess && (
        <SuccessModal
          onClose={onDone}
        />
      )}
    </div>
  );
}

function SuccessModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl max-w-sm w-full p-6 text-center animate-scale-in shadow-2xl">
        <div className="w-16 h-16 rounded-full bg-accent-500 mx-auto flex items-center justify-center mb-4">
          <Check className="w-8 h-8 text-white" strokeWidth={3} />
        </div>
        <h2 className="text-lg font-bold text-slate-900">Booking Published!</h2>
        <p className="text-sm text-slate-500 mt-1.5">
          Your booking is now active and visible to nearby drivers. You will receive
          offers from drivers shortly.
        </p>
        <Button
          size="lg"
          variant="primary"
          className="w-full mt-5"
          onClick={onClose}
        >
          View Active Bookings
        </Button>
      </div>
    </div>
  );
}

function Info({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="text-xs text-slate-400 flex items-center gap-1 mb-0.5">
        {icon}
        {label}
      </p>
      <p className="text-xs font-medium text-slate-700 truncate">{children}</p>
    </div>
  );
}

function FareRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-slate-600">{label}</span>
      <span className="font-medium text-slate-900">{value}</span>
    </div>
  );
}
