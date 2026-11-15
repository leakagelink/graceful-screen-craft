import { MapPin, Package, Calendar, Truck } from 'lucide-react';
import type { Booking } from '@/lib/supabase';
import { getVehicle, formatCurrency } from '@/lib/fare';
import { Badge } from '@/components/ui';

export const VEHICLE_LABELS: Record<string, string> = {
  mini_truck: 'Mini Truck',
  eicher_14ft: '14ft Eicher',
  container_20ft: '20ft Container',
};

export const STATUS_META: Record<
  string,
  { label: string; color: 'blue' | 'green' | 'amber' | 'red' | 'slate' }
> = {
  available: { label: 'Available', color: 'amber' },
  paid: { label: 'Paid', color: 'green' },
  offer_made: { label: 'Offer Made', color: 'blue' },
  assigned: { label: 'Assigned', color: 'blue' },
  in_progress: { label: 'In Progress', color: 'blue' },
  otp_sent: { label: 'OTP Sent', color: 'amber' },
  delivered: { label: 'Delivered', color: 'green' },
  completed: { label: 'Completed', color: 'green' },
  cancelled: { label: 'Cancelled', color: 'red' },
};

export function BookingCard({
  booking,
  footer,
  onClick,
}: {
  booking: Booking;
  footer?: React.ReactNode;
  onClick?: () => void;
}) {
  const vehicle = getVehicle(booking.vehicle_type);
  const status = STATUS_META[booking.status];
  const tripDate = new Date(booking.trip_date).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  return (
    <button
      onClick={onClick}
      disabled={!onClick}
      className="w-full text-left bg-white rounded-2xl border border-slate-200 p-4 shadow-sm hover:shadow-md hover:border-primary-200 transition-all active:scale-[0.99] disabled:active:scale-100 disabled:cursor-default"
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-primary-50 flex items-center justify-center">
            <Truck className="w-5 h-5 text-primary-600" />
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-slate-900 truncate text-sm">
              {vehicle.label}
            </p>
            <p className="text-xs text-slate-400">{vehicle.capacity}</p>
          </div>
        </div>
        <Badge color={status.color}>{status.label}</Badge>
      </div>

      <div className="space-y-2 mb-3">
        <div className="flex items-start gap-2">
          <div className="flex flex-col items-center pt-1">
            <span className="w-2 h-2 rounded-full bg-accent-500" />
            <span className="w-0.5 h-5 bg-slate-200 my-0.5" />
            <span className="w-2 h-2 rounded-full bg-error-500" />
          </div>
          <div className="flex-1 min-w-0 text-sm">
            <p className="text-slate-900 font-medium truncate">
              {booking.pickup_location}
            </p>
            <p className="text-slate-600 truncate">{booking.drop_location}</p>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-slate-500 mb-3">
        <span className="inline-flex items-center gap-1">
          <Package className="w-3.5 h-3.5" />
          {booking.material_type}
        </span>
        <span className="inline-flex items-center gap-1">
          <Calendar className="w-3.5 h-3.5" />
          {tripDate}
        </span>
        <span className="inline-flex items-center gap-1">
          <MapPin className="w-3.5 h-3.5" />
          {booking.distance_km} km
        </span>
      </div>

      <div className="flex items-center justify-between pt-3 border-t border-slate-100">
        <span className="text-xs text-slate-400">Trip fare</span>
        <span className="font-bold text-primary-700 text-lg">
          {formatCurrency(booking.total_fare)}
        </span>
      </div>

      {footer && <div className="mt-3">{footer}</div>}
    </button>
  );
}
