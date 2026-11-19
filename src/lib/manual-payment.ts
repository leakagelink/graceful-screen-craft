export type ManualPaymentMethodKey = 'upi' | 'qr' | 'bank';
export type ManualPaymentRequestStatus = 'pending' | 'approved' | 'rejected';

export interface ManualPaymentMethod {
  key: ManualPaymentMethodKey;
  label: string;
  enabled: boolean;
  is_demo: boolean;
  payee_name: string | null;
  upi_id: string | null;
  qr_image_url: string | null;
  bank_name: string | null;
  account_holder: string | null;
  account_number: string | null;
  ifsc: string | null;
  updated_by: string | null;
  updated_at: string;
}

export interface ManualPaymentRequest {
  id: string;
  booking_id: string;
  shipper_id: string;
  method_key: ManualPaymentMethodKey;
  amount: number;
  transaction_reference: string;
  status: ManualPaymentRequestStatus;
  admin_note: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
}

export function normalizeTransactionReference(value: string): string {
  return value.trim().toUpperCase();
}

export function isValidTransactionReference(value: string): boolean {
  return /^[A-Z0-9][A-Z0-9_-]{5,63}$/.test(normalizeTransactionReference(value));
}

export function buildUpiUri(method: Pick<ManualPaymentMethod, 'upi_id' | 'payee_name'>, amount: number, bookingId: string): string {
  if (!method.upi_id) return '';
  const params = [
    `pa=${encodeURIComponent(method.upi_id)}`,
    `pn=${encodeURIComponent(method.payee_name || 'Vahakam')}`,
    `am=${amount.toFixed(2)}`,
    'cu=INR',
    `tn=${encodeURIComponent(`Vahakam booking ${bookingId.slice(0, 8)}`)}`,
  ];
  return `upi://pay?${params.join('&')}`;
}
