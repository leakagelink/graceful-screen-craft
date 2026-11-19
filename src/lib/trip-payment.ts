import { supabase } from '@/lib/supabase';

export type TripPaymentStage = 'pickup_40' | 'delivery_60';
export type TripPaymentMethod = 'cash' | 'online';

export interface TripPayment {
  id: string;
  booking_id: string;
  stage: TripPaymentStage;
  amount: number;
  method: TripPaymentMethod;
  transaction_reference: string | null;
  status: 'pending_confirmation' | 'confirmed';
  reported_by: string;
  confirmed_by: string | null;
  created_at: string;
  confirmed_at: string | null;
}

export interface DeliveryProof {
  booking_id: string;
  driver_id: string;
  file_path: string;
  created_at: string;
}

export function getTripPaymentAmounts(fare: number) {
  const pickup40 = Math.round(fare * 0.4);
  return { pickup40, delivery60: fare - pickup40 };
}

export function tripPaymentReferenceError(method: TripPaymentMethod, reference: string) {
  if (method === 'cash') return '';
  const normalized = reference.trim();
  return /^[A-Za-z0-9_-]{6,64}$/.test(normalized) ? '' : 'Online payment ke liye valid transaction ID / UTR dalein (6–64 letters, numbers, - ya _).';
}

export async function reportTripPayment(bookingId: string, stage: TripPaymentStage, method: TripPaymentMethod, reference: string) {
  const referenceError = tripPaymentReferenceError(method, reference);
  if (referenceError) return { error: referenceError };
  const { data, error } = await supabase.rpc('report_trip_payment', {
    _booking_id: bookingId,
    _stage: stage,
    _method: method,
    ...(method === 'online' ? { _reference: reference.trim() } : {}),
  });
  const amount = data && typeof data === 'object' && !Array.isArray(data) && 'amount' in data && typeof data['amount'] === 'number'
    ? data['amount']
    : undefined;
  return { error: error?.message ?? null, amount };
}

export async function confirmTripPayment(paymentId: string) {
  const { error } = await supabase.rpc('confirm_trip_payment', { _payment_id: paymentId });
  return { error: error?.message ?? null };
}

export async function uploadDeliveryProof(bookingId: string, file: File) {
  if (!file.type.startsWith('image/')) throw new Error('POD ke liye photo image file select karein.');
  if (file.size > 5 * 1024 * 1024) throw new Error('POD photo 5 MB se chhoti honi chahiye.');
  const extension = file.name.split('.').pop()?.toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
  const filePath = `${bookingId}/${crypto.randomUUID()}.${extension}`;
  const { error: uploadError } = await supabase.storage.from('delivery-proofs').upload(filePath, file, { upsert: false });
  if (uploadError) throw new Error(uploadError.message);
  const { error: registerError } = await supabase.rpc('register_delivery_proof', { _booking_id: bookingId, _file_path: filePath });
  if (registerError) throw new Error(registerError.message);
  return filePath;
}
