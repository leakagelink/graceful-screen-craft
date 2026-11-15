import { supabase } from '@/lib/supabase';

export type TripAction = 'offer' | 'take' | 'accept' | 'reject' | 'counter' | 'accept_counter' | 'start' | 'request_delivery' | 'verify_delivery' | 'cancel';

export async function actOnTrip(bookingId: string, action: TripAction, options: { offerId?: string; amount?: number; otp?: string; reason?: string } = {}) {
  const { data, error } = await supabase.rpc('trip_action', {
    _booking_id: bookingId, _action: action,
    ...(options.offerId !== undefined ? { _offer_id: options.offerId } : {}),
    ...(options.amount !== undefined ? { _amount: options.amount } : {}),
    ...(options.otp !== undefined ? { _otp: options.otp } : {}),
    ...(options.reason !== undefined ? { _reason: options.reason } : {}),
  });
  if (error) return { error: error.message };
  if (data && typeof data === 'object' && !Array.isArray(data) && data['ok'] === false) {
    return { error: typeof data['error'] === 'string' ? data['error'] : 'Trip could not be updated.' };
  }
  return { error: null };
}