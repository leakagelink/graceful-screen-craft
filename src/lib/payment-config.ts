/**
 * Payment Gateway Configuration
 *
 * RAZORPAY IS NOT ACTIVATED YET.
 * The app operates in MANUAL PAYMENT MODE.
 *
 * To activate Razorpay later:
 * 1. Add these secrets as Supabase Edge Function secrets (never in frontend):
 *    - RAZORPAY_KEY_ID
 *    - RAZORPAY_KEY_SECRET
 *    - RAZORPAY_WEBHOOK_SECRET
 * 2. Set ENABLE_RAZORPAY to true in the razorpay-order edge function
 * 3. Add the Razorpay checkout script to index.html
 * 4. Update BookingSummary to call the razorpay-order edge function
 *
 * Payment Flow (when activated):
 * - Trip total = 100%
 * - First 50% → Driver, 0% Vahakam commission
 * - After Delivery OTP, final 50% becomes payable
 * - Final 50% → 5% Vahakam commission + 95% Driver
 *
 * NEVER expose secret keys in frontend code.
 * NEVER hardcode real credentials.
 */

export const PAYMENT_MODE = 'manual' as const;

export const PAYMENT_STATUS_LABELS: Record<string, string> = {
  NOT_REQUIRED: 'Not Required',
  PENDING: 'Pending',
  MANUAL_PAYMENT: 'Manual Payment',
  PAID: 'Paid',
  FAILED: 'Failed',
  REFUNDED: 'Refunded',
};

export const PAYMENT_STATUS_COLORS: Record<string, string> = {
  NOT_REQUIRED: 'slate',
  PENDING: 'amber',
  MANUAL_PAYMENT: 'amber',
  PAID: 'green',
  FAILED: 'red',
  REFUNDED: 'slate',
};

export function isRazorpayEnabled(): boolean {
  return false;
}

export function getPaymentInstructions(status: string): string | null {
  switch (status) {
    case 'MANUAL_PAYMENT':
      return 'Pay the driver directly in cash or via UPI after delivery. The admin will verify the payment once confirmed.';
    case 'PENDING':
      return 'Payment is pending. Please coordinate with the driver to complete the payment.';
    case 'PAID':
      return 'Payment has been confirmed and completed.';
    case 'FAILED':
      return 'A payment attempt failed. Please retry or contact support.';
    case 'REFUNDED':
      return 'A refund has been processed.';
    default:
      return null;
  }
}
