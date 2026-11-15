import type { Booking } from '@/lib/supabase';
import { calcDriverPayout } from '@/lib/commission';

export type DriverBooking = Booking & { pickup_lat?: number | null; pickup_lng?: number | null };
export function pickupDistance(booking: DriverBooking, coords: { lat: number; lng: number } | null) {
  if (!coords || booking.pickup_lat == null || booking.pickup_lng == null) return null;
  const rad = Math.PI / 180;
  const a = Math.sin((booking.pickup_lat - coords.lat) * rad / 2) ** 2 + Math.cos(coords.lat * rad) * Math.cos(booking.pickup_lat * rad) * Math.sin((booking.pickup_lng - coords.lng) * rad / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
export function driverEarnings(bookings: Booking[]) {
  const earned = bookings.filter(b => ['delivered', 'completed'].includes(b.status));
  const amount = (b: Booking) => Number(b.driver_total_payout ?? calcDriverPayout(Number(b.agreed_fare ?? b.total_fare)));
  return {
    earned: earned.reduce((sum, b) => sum + amount(b), 0),
    paid: bookings.reduce((sum, b) => sum + (b.payout_status === 'transferred' ? amount(b) : (b.payout_1_status === 'paid' ? Math.round(Number(b.agreed_fare ?? b.total_fare) / 2) : 0) + (b.payout_2_status === 'paid' ? amount(b) - Math.round(Number(b.agreed_fare ?? b.total_fare) / 2) : 0)), 0),
    completed: earned.length,
  };
}